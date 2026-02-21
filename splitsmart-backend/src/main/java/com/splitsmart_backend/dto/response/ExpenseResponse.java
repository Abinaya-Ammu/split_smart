package com.splitsmart.splitsmart_backend.dto.response;

import com.splitsmart.splitsmart_backend.entity.Expense;
import com.splitsmart.splitsmart_backend.entity.ExpenseSplit;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseResponse {
    private Long id;
    private String description;
    private BigDecimal amount;
    private Expense.Category category;
    private Expense.SplitType splitType;
    private UserResponse paidBy;
    private String groupName;
    private Long groupId;
    private Boolean isSettled;
    private String receiptImage;
    private LocalDateTime expenseDate;
    private LocalDateTime createdAt;
    private List<SplitDetail> splits;
    private BigDecimal yourShare; // calculated for current user

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SplitDetail {
        private UserResponse user;
        private BigDecimal amount;
        private BigDecimal percentage;
        private Boolean isPaid;
        private ExpenseSplit.PaymentMethod paymentMethod;
    }
}
