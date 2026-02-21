package com.splitsmart.splitsmart_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @Enumerated(EnumType.STRING)
    private NotifType type;

    private Long groupId;
    private Long settlementId;
    private Long expenseId;
    private BigDecimal amount;

    @Column(name = "google_pay_link", length = 500)
    private String googlePayLink;

    @Column(name = "phone_pe_link", length = 500)
    private String phonePeLink;

    @Column(name = "paytm_link", length = 500)
    private String paytmLink;

    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum NotifType {
        GROUP_INVITE, EXPENSE_ADDED, PAYMENT_DUE, PAYMENT_RECEIVED, REMINDER, GENERAL
    }
}
