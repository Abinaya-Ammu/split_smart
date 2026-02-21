package com.splitsmart.splitsmart_backend.service.impl;

import com.splitsmart.splitsmart_backend.dto.response.SettlementResponse;
import com.splitsmart.splitsmart_backend.dto.response.UserResponse;
import com.splitsmart.splitsmart_backend.entity.*;
import com.splitsmart.splitsmart_backend.exception.ResourceNotFoundException;
import com.splitsmart.splitsmart_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SettlementService {

    private final SettlementRepository settlementRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ExpenseSplitRepository splitRepository;

    /**
     * ✅ CORE ALGORITHM: Minimize number of transactions using Heap-based approach.
     * Time Complexity: O(n log n)
     *
     * Steps:
     * 1. Calculate net balance for each member (total paid - total owed)
     * 2. Use two heaps: MaxHeap for creditors, MinHeap for debtors
     * 3. Greedily settle: Highest creditor receives from biggest debtor
     */
    @Transactional
    public void recalculateGroupSettlements(Long groupId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        List<GroupMember> members = groupMemberRepository.findByGroupIdAndIsActiveTrue(groupId);

        // Step 1: Calculate net balance per user
        Map<Long, BigDecimal> netBalance = new HashMap<>();

        for (GroupMember member : members) {
            Long userId = member.getUser().getId();
            BigDecimal paid = splitRepository.sumPaidByUserInGroup(userId, groupId) != null
                    ? splitRepository.sumPaidByUserInGroup(userId, groupId)
                    : BigDecimal.ZERO;
            BigDecimal owed = splitRepository.getTotalOwedByUserInGroup(userId, groupId) != null
                    ? splitRepository.getTotalOwedByUserInGroup(userId, groupId)
                    : BigDecimal.ZERO;
            netBalance.put(userId, paid.subtract(owed));
        }

        // Step 2: Separate into creditors (positive balance) and debtors (negative balance)
        // MaxHeap for creditors (highest credit first)
        PriorityQueue<long[]> creditors = new PriorityQueue<>((a, b) ->
                Long.compare(b[1], a[1])); // amount stored as paise (×100) to avoid BigDecimal in heap

        // MinHeap for debtors (highest debt first, stored as negative)
        PriorityQueue<long[]> debtors = new PriorityQueue<>((a, b) ->
                Long.compare(a[1], b[1]));

        for (Map.Entry<Long, BigDecimal> entry : netBalance.entrySet()) {
            long amountPaise = entry.getValue().multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP).longValue();
            if (amountPaise > 0) {
                creditors.offer(new long[]{entry.getKey(), amountPaise});
            } else if (amountPaise < 0) {
                debtors.offer(new long[]{entry.getKey(), amountPaise});
            }
        }

        // Step 3: Cancel existing pending settlements for this group
        List<Settlement> existing = settlementRepository.findByGroupIdAndStatus(groupId, Settlement.SettlementStatus.PENDING);
        settlementRepository.deleteAll(existing);

        // Step 4: Greedily match debtors with creditors
        List<Settlement> newSettlements = new ArrayList<>();

        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            long[] creditor = creditors.poll();
            long[] debtor = debtors.poll();

            long creditAmount = creditor[1];
            long debtAmount = -debtor[1]; // convert to positive

            long settledAmount = Math.min(creditAmount, debtAmount);

            User fromUser = userRepository.findById(debtor[0])
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            User toUser = userRepository.findById(creditor[0])
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));

            BigDecimal amount = BigDecimal.valueOf(settledAmount)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            newSettlements.add(Settlement.builder()
                    .group(group)
                    .fromUser(fromUser)
                    .toUser(toUser)
                    .amount(amount)
                    .status(Settlement.SettlementStatus.PENDING)
                    .build());

            // Requeue if balance remains
            if (creditAmount > debtAmount) {
                creditors.offer(new long[]{creditor[0], creditAmount - settledAmount});
            } else if (debtAmount > creditAmount) {
                debtors.offer(new long[]{debtor[0], -(debtAmount - settledAmount)});
            }
        }

        settlementRepository.saveAll(newSettlements);
    }

    @Transactional
    public SettlementResponse markSettled(Long settlementId, String paymentMethod, String transactionId) {
        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new ResourceNotFoundException("Settlement not found"));

        settlement.setStatus(Settlement.SettlementStatus.COMPLETED);
        settlement.setSettledAt(LocalDateTime.now());
        if (paymentMethod != null) {
            settlement.setPaymentMethod(ExpenseSplit.PaymentMethod.valueOf(paymentMethod));
        }
        settlement.setTransactionId(transactionId);
        settlementRepository.save(settlement);

        // Update reward points for early payer
        User fromUser = settlement.getFromUser();
        fromUser.setRewardPoints(fromUser.getRewardPoints() + 10);
        userRepository.save(fromUser);

        return mapToSettlementResponse(settlement);
    }

    public List<SettlementResponse> getPendingSettlements(Long userId) {
        return settlementRepository.findPendingSettlementsForUser(userId).stream()
                .map(this::mapToSettlementResponse)
                .collect(Collectors.toList());
    }

    public List<SettlementResponse> getGroupSettlements(Long groupId) {
        return settlementRepository.findByGroupIdAndStatus(groupId, Settlement.SettlementStatus.PENDING).stream()
                .map(this::mapToSettlementResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void sendReminder(Long settlementId) {
        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new ResourceNotFoundException("Settlement not found"));
        settlement.setReminderCount(settlement.getReminderCount() + 1);
        settlement.setLastRemindedAt(LocalDateTime.now());
        settlementRepository.save(settlement);
        // In a real app: send push notification or email here
    }

    private SettlementResponse mapToSettlementResponse(Settlement s) {
        // Generate UPI deep links
        String upiId = s.getToUser().getUpiId();
        String amount = s.getAmount().toPlainString();
        String name = s.getToUser().getName();
        String note = "SplitSmart+Payment";

        String googlePayLink = upiId != null ?
                "upi://pay?pa=" + upiId + "&pn=" + name + "&am=" + amount + "&tn=" + note + "&mc=0000" : null;
        String phonePeLink = upiId != null ?
                "phonepe://pay?pa=" + upiId + "&pn=" + name + "&am=" + amount : null;
        String paytmLink = upiId != null ?
                "paytmmp://pay?pa=" + upiId + "&pn=" + name + "&am=" + amount : null;

        return SettlementResponse.builder()
                .id(s.getId())
                .fromUser(mapUser(s.getFromUser()))
                .toUser(mapUser(s.getToUser()))
                .amount(s.getAmount())
                .status(s.getStatus())
                .groupName(s.getGroup().getName())
                .groupId(s.getGroup().getId())
                .createdAt(s.getCreatedAt())
                .settledAt(s.getSettledAt())
                .googlePayLink(googlePayLink)
                .phonePeLink(phonePeLink)
                .paytmLink(paytmLink)
                .build();
    }

    private UserResponse mapUser(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .profilePicture(user.getProfilePicture())
                .upiId(user.getUpiId())
                .build();
    }

    // Helper used by ExpenseService
    public BigDecimal sumPaidByUserInGroup(Long userId, Long groupId) {
        return splitRepository.sumPaidByUserInGroup(userId, groupId);
    }
}
