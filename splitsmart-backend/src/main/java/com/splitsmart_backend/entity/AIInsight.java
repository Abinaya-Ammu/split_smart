package com.splitsmart.splitsmart_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_insights")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AIInsight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "insight_type", nullable = false)
    private InsightType insightType;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(name = "insight_data", length = 2000)
    private String insightData; // JSON data

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "action_taken")
    private Boolean actionTaken = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum InsightType {
        HEAVY_SPENDER,
        MONTHLY_TREND,
        PAYMENT_DELAY_PREDICTION,
        UNUSUAL_SPENDING,
        COST_SAVING_TIP,
        FOOD_PREFERENCE,
        EXPENSE_PREDICTION,
        STREAK_ACHIEVEMENT,
        REWARD_EARNED
    }
}
