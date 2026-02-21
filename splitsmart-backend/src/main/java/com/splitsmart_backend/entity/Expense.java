package com.splitsmart.splitsmart_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "expenses")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    private Category category = Category.GENERAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "split_type", nullable = false)
    private SplitType splitType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paid_by", nullable = false)
    private User paidBy;

    @Column(name = "receipt_image")
    private String receiptImage;

    @Column(name = "bill_scanned")
    private Boolean billScanned = false;

    @Column(name = "is_settled")
    private Boolean isSettled = false;

    @Column(name = "expense_date")
    private LocalDateTime expenseDate;

    @Column(name = "notes")
    private String notes;

    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExpenseItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExpenseSplit> splits = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum SplitType {
        EQUAL,          // Divide equally
        INDIVIDUAL,     // Each picks their item
        PARTIAL,        // Some people pay, some don't
        PERCENTAGE,     // By percentage
        CUSTOM          // Custom amounts
    }

    public enum Category {
        GENERAL, FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING,
        UTILITIES, MEDICAL, TRAVEL, RENT, EDUCATION, OTHER
    }
}
