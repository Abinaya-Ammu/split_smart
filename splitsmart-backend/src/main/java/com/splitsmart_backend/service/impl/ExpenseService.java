package com.splitsmart.splitsmart_backend.service.impl;

import com.splitsmart.splitsmart_backend.dto.request.ExpenseRequest;
import com.splitsmart.splitsmart_backend.dto.response.ExpenseResponse;
import com.splitsmart.splitsmart_backend.entity.*;
import com.splitsmart.splitsmart_backend.exception.BadRequestException;
import com.splitsmart.splitsmart_backend.exception.ResourceNotFoundException;
import com.splitsmart.splitsmart_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository splitRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final SettlementService settlementService;

    @Transactional
    public ExpenseResponse createExpense(ExpenseRequest request, Long currentUserId) {
        Group group = groupRepository.findById(request.getGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        if (!groupMemberRepository.existsByGroupIdAndUserIdAndIsActiveTrue(group.getId(), currentUserId)) {
            throw new BadRequestException("You are not a member of this group");
        }

        User paidBy = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Expense expense = Expense.builder()
                .description(request.getDescription())
                .amount(request.getAmount())
                .category(request.getCategory())
                .splitType(request.getSplitType())
                .group(group)
                .paidBy(paidBy)
                .receiptImage(request.getReceiptImage())
                .expenseDate(request.getExpenseDate() != null ? request.getExpenseDate() : LocalDateTime.now())
                .notes(request.getNotes())
                .billScanned(request.getReceiptImage() != null)
                .isSettled(false)
                .build();

        expense = expenseRepository.save(expense);

        // Calculate splits based on type
        List<ExpenseSplit> splits = calculateSplits(expense, request, currentUserId);
        splitRepository.saveAll(splits);
        expense.setSplits(splits);

        // Recalculate simplified settlements for the group
        settlementService.recalculateGroupSettlements(group.getId());

        return mapToExpenseResponse(expense, currentUserId);
    }

    private List<ExpenseSplit> calculateSplits(Expense expense, ExpenseRequest request, Long payerId) {
        return switch (request.getSplitType()) {
            case EQUAL ->
                calculateEqualSplit(expense, request.getParticipantIds(), payerId);
            case INDIVIDUAL ->
                calculateIndividualSplit(expense, request.getItems());
            case PARTIAL ->
                calculatePartialSplit(expense, request.getParticipantIds(), payerId);
            case PERCENTAGE ->
                calculatePercentageSplit(expense, request.getPercentageSplits());
            case CUSTOM ->
                calculateCustomSplit(expense, request.getCustomSplits());
        };
    }

    // ✅ EQUAL SPLIT: Total / N members
    private List<ExpenseSplit> calculateEqualSplit(Expense expense, List<Long> participantIds, Long payerId) {
        if (participantIds == null || participantIds.isEmpty()) {
            throw new BadRequestException("Participant IDs are required for equal split");
        }

        BigDecimal perPerson = expense.getAmount()
                .divide(BigDecimal.valueOf(participantIds.size()), 2, RoundingMode.HALF_UP);

        List<ExpenseSplit> splits = new ArrayList<>();
        for (Long userId : participantIds) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User " + userId + " not found"));

            splits.add(ExpenseSplit.builder()
                    .expense(expense)
                    .user(user)
                    .amount(perPerson)
                    .percentage(BigDecimal.valueOf(100.0 / participantIds.size()))
                    .isPaid(userId.equals(payerId)) // payer's share is already "paid"
                    .paidAt(userId.equals(payerId) ? LocalDateTime.now() : null)
                    .build());
        }
        return splits;
    }

    // ✅ INDIVIDUAL SPLIT: Each item assigned to specific users
    private List<ExpenseSplit> calculateIndividualSplit(Expense expense, List<ExpenseRequest.ItemSplit> items) {
        if (items == null || items.isEmpty()) {
            throw new BadRequestException("Items are required for individual split");
        }

        // Aggregate amounts per user across all items
        java.util.Map<Long, BigDecimal> userAmounts = new java.util.HashMap<>();

        for (ExpenseRequest.ItemSplit item : items) {
            BigDecimal perUser = item.getPrice()
                    .multiply(BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 1))
                    .divide(BigDecimal.valueOf(item.getAssignedUserIds().size()), 2, RoundingMode.HALF_UP);

            for (Long userId : item.getAssignedUserIds()) {
                userAmounts.merge(userId, perUser, BigDecimal::add);
            }
        }

        List<ExpenseSplit> splits = new ArrayList<>();
        for (java.util.Map.Entry<Long, BigDecimal> entry : userAmounts.entrySet()) {
            User user = userRepository.findById(entry.getKey())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            splits.add(ExpenseSplit.builder()
                    .expense(expense)
                    .user(user)
                    .amount(entry.getValue())
                    .isPaid(entry.getKey().equals(expense.getPaidBy().getId()))
                    .build());
        }
        return splits;
    }

    // ✅ PARTIAL SPLIT: Some people ate, only some paid
    // participantIds = people who consumed; payer is tracked separately
    private List<ExpenseSplit> calculatePartialSplit(Expense expense, List<Long> participantIds, Long payerId) {
        if (participantIds == null || participantIds.isEmpty()) {
            throw new BadRequestException("Participant IDs required for partial split");
        }

        BigDecimal perPerson = expense.getAmount()
                .divide(BigDecimal.valueOf(participantIds.size()), 2, RoundingMode.HALF_UP);

        List<ExpenseSplit> splits = new ArrayList<>();
        for (Long userId : participantIds) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            // Only mark as paid if this participant is also the payer
            boolean isPaid = userId.equals(payerId);
            splits.add(ExpenseSplit.builder()
                    .expense(expense)
                    .user(user)
                    .amount(perPerson)
                    .isPaid(isPaid)
                    .paidAt(isPaid ? LocalDateTime.now() : null)
                    .build());
        }
        return splits;
    }

    // ✅ PERCENTAGE SPLIT
    private List<ExpenseSplit> calculatePercentageSplit(Expense expense, List<ExpenseRequest.PercentageSplit> percentageSplits) {
        if (percentageSplits == null || percentageSplits.isEmpty()) {
            throw new BadRequestException("Percentage splits are required");
        }

        BigDecimal totalPercent = percentageSplits.stream()
                .map(ExpenseRequest.PercentageSplit::getPercentage)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalPercent.compareTo(new BigDecimal("100")) != 0) {
            throw new BadRequestException("Percentages must add up to 100%. Current total: " + totalPercent);
        }

        List<ExpenseSplit> splits = new ArrayList<>();
        for (ExpenseRequest.PercentageSplit ps : percentageSplits) {
            User user = userRepository.findById(ps.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            BigDecimal amount = expense.getAmount()
                    .multiply(ps.getPercentage())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            splits.add(ExpenseSplit.builder()
                    .expense(expense)
                    .user(user)
                    .amount(amount)
                    .percentage(ps.getPercentage())
                    .isPaid(ps.getUserId().equals(expense.getPaidBy().getId()))
                    .build());
        }
        return splits;
    }

    // ✅ CUSTOM SPLIT: Manual amounts
    private List<ExpenseSplit> calculateCustomSplit(Expense expense, List<ExpenseRequest.CustomSplit> customSplits) {
        if (customSplits == null || customSplits.isEmpty()) {
            throw new BadRequestException("Custom splits are required");
        }

        BigDecimal totalCustom = customSplits.stream()
                .map(ExpenseRequest.CustomSplit::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalCustom.compareTo(expense.getAmount()) != 0) {
            throw new BadRequestException("Custom amounts must sum to total expense amount: " + expense.getAmount());
        }

        List<ExpenseSplit> splits = new ArrayList<>();
        for (ExpenseRequest.CustomSplit cs : customSplits) {
            User user = userRepository.findById(cs.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            splits.add(ExpenseSplit.builder()
                    .expense(expense)
                    .user(user)
                    .amount(cs.getAmount())
                    .isPaid(cs.getUserId().equals(expense.getPaidBy().getId()))
                    .build());
        }
        return splits;
    }

    public Page<ExpenseResponse> getGroupExpenses(Long groupId, Long currentUserId, int page, int size) {
        return expenseRepository.findByGroupIdOrderByCreatedAtDesc(groupId, PageRequest.of(page, size))
                .map(e -> mapToExpenseResponse(e, currentUserId));
    }

    public ExpenseResponse getExpenseById(Long expenseId, Long currentUserId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        return mapToExpenseResponse(expense, currentUserId);
    }

    private ExpenseResponse mapToExpenseResponse(Expense expense, Long currentUserId) {
        List<ExpenseResponse.SplitDetail> splitDetails = expense.getSplits().stream()
                .map(split -> ExpenseResponse.SplitDetail.builder()
                .user(mapUser(split.getUser()))
                .amount(split.getAmount())
                .percentage(split.getPercentage())
                .isPaid(split.getIsPaid())
                .paymentMethod(split.getPaymentMethod())
                .build())
                .collect(Collectors.toList());

        BigDecimal yourShare = expense.getSplits().stream()
                .filter(s -> s.getUser().getId().equals(currentUserId))
                .map(ExpenseSplit::getAmount)
                .findFirst().orElse(BigDecimal.ZERO);

        return ExpenseResponse.builder()
                .id(expense.getId())
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .category(expense.getCategory())
                .splitType(expense.getSplitType())
                .paidBy(mapUser(expense.getPaidBy()))
                .groupName(expense.getGroup().getName())
                .groupId(expense.getGroup().getId())
                .isSettled(expense.getIsSettled())
                .receiptImage(expense.getReceiptImage())
                .expenseDate(expense.getExpenseDate())
                .createdAt(expense.getCreatedAt())
                .splits(splitDetails)
                .yourShare(yourShare)
                .build();
    }

    private com.splitsmart.splitsmart_backend.dto.response.UserResponse mapUser(User user) {
        return com.splitsmart.splitsmart_backend.dto.response.UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .profilePicture(user.getProfilePicture())
                .upiId(user.getUpiId())
                .build();
    }
}
