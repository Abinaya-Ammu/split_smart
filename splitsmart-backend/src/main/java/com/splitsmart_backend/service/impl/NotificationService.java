package com.splitsmart.splitsmart_backend.service.impl;

import com.splitsmart.splitsmart_backend.dto.response.NotificationResponse;
import com.splitsmart.splitsmart_backend.entity.Notification;
import com.splitsmart.splitsmart_backend.entity.User;
import com.splitsmart.splitsmart_backend.repository.NotificationRepository;
import com.splitsmart.splitsmart_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    // ── Group created (notify creator) ──
    public void sendGroupCreatedNotif(Long toUserId, String groupName, Long groupId) {
        save(toUserId, "Group created! 🎉",
            "Your group \"" + groupName + "\" is ready. Add members and start splitting!",
            Notification.NotifType.GROUP_INVITE, groupId, null, null, null, null, null);
    }

    // ── Member added to group ──
    public void sendGroupInviteNotif(Long toUserId, String inviterName, String groupName, Long groupId) {
        save(toUserId, "Added to group 👥",
            inviterName + " added you to \"" + groupName + "\". Tap to view the group.",
            Notification.NotifType.GROUP_INVITE, groupId, null, null, null, null, null);
    }

    // ── Someone joined via invite code ──
    public void sendMemberJoinedNotif(Long toUserId, String memberName, String groupName, Long groupId) {
        save(toUserId, "New member joined 👋",
            memberName + " joined \"" + groupName + "\" via invite link.",
            Notification.NotifType.GROUP_INVITE, groupId, null, null, null, null, null);
    }

    // ── New expense added ──
    public void sendExpenseNotif(Long toUserId, String paidByName, String expenseDesc,
                                  BigDecimal yourShare, Long groupId, Long expenseId) {
        save(toUserId, "New expense added 💰",
            paidByName + " paid for \"" + expenseDesc + "\". Your share: ₹" + yourShare.toPlainString(),
            Notification.NotifType.EXPENSE_ADDED, groupId, expenseId, null, yourShare, null, null);
    }

    // ── Payment due with UPI links ──
    public void sendPaymentDueNotif(Long toUserId, String creditorName, BigDecimal amount,
                                     String groupName, Long settlementId, String creditorUpiId) {
        String gpay = null, phonepe = null, paytm = null;
        if (creditorUpiId != null && !creditorUpiId.isBlank()) {
            String encoded = creditorName.replace(" ", "%20");
            String amt     = amount.toPlainString();
            gpay    = "upi://pay?pa=" + creditorUpiId + "&pn=" + encoded + "&am=" + amt + "&tn=SplitSmart%20Payment&cu=INR&mc=0000";
            phonepe = "phonepe://pay?pa=" + creditorUpiId + "&pn=" + encoded + "&am=" + amt + "&tn=SplitSmart";
            paytm   = "paytmmp://pay?pa=" + creditorUpiId + "&pn=" + encoded + "&am=" + amt;
        }
        save(toUserId, "Payment due 🔔",
            "You owe " + creditorName + " ₹" + amount.toPlainString() + " for " + groupName + ". Tap to pay now.",
            Notification.NotifType.PAYMENT_DUE, null, null, settlementId, amount, gpay, phonepe);

        // Also save paytm link separately — store in second save if needed
        // For now gpay and phonepe are in the notification; paytm link stored on settlement itself
    }

    // ── Payment received ──
    public void sendPaymentReceivedNotif(Long toUserId, String payerName, BigDecimal amount, String groupName) {
        save(toUserId, "Payment received ✅",
            payerName + " paid you ₹" + amount.toPlainString() + " for " + groupName + ". All settled!",
            Notification.NotifType.PAYMENT_RECEIVED, null, null, null, amount, null, null);
    }

    // ─── Queries ───

    public List<NotificationResponse> getForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public Long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAllRead(Long userId) {
        notificationRepository.markAllReadForUser(userId);
    }

    @Transactional
    public void markRead(Long notifId) {
        notificationRepository.findById(notifId).ifPresent(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
        });
    }

    // ─── Private helpers ───

    private void save(Long toUserId, String title, String message, Notification.NotifType type,
                      Long groupId, Long expenseId, Long settlementId,
                      BigDecimal amount, String gpay, String phonepe) {
        try {
            userRepository.findById(toUserId).ifPresent(user ->
                notificationRepository.save(Notification.builder()
                    .user(user)
                    .title(title)
                    .message(message)
                    .type(type)
                    .groupId(groupId)
                    .expenseId(expenseId)
                    .settlementId(settlementId)
                    .amount(amount)
                    .googlePayLink(gpay)
                    .phonePeLink(phonepe)
                    .isRead(false)
                    .build())
            );
        } catch (Exception e) {
            // Never let notification failure break the main flow
        }
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
            .id(n.getId())
            .title(n.getTitle())
            .message(n.getMessage())
            .type(n.getType() != null ? n.getType().name() : "GENERAL")
            .groupId(n.getGroupId())
            .settlementId(n.getSettlementId())
            .expenseId(n.getExpenseId())
            .amount(n.getAmount())
            .googlePayLink(n.getGooglePayLink())
            .phonePeLink(n.getPhonePeLink())
            .paytmLink(n.getPaytmLink())
            .isRead(n.getIsRead())
            .createdAt(n.getCreatedAt())
            .build();
    }
}
