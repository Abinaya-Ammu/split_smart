package com.splitsmart.splitsmart_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "expense_items")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ExpenseItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @Column(nullable = false)
    private String itemName;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    private Integer quantity = 1;

    @Column(name = "ai_suggested")
    private Boolean aiSuggested = false;

    // Users assigned to this item (JSON stored as string for simplicity)
    @Column(name = "assigned_user_ids", length = 500)
    private String assignedUserIds; // comma-separated user IDs
}
