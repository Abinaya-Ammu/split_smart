package com.splitsmart.splitsmart_backend.dto.request;

import com.splitsmart.splitsmart_backend.entity.Expense;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ExpenseRequest {

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotNull(message = "Group ID is required")
    private Long groupId;

    @NotNull(message = "Split type is required")
    private Expense.SplitType splitType;

    private Expense.Category category = Expense.Category.GENERAL;

    private LocalDateTime expenseDate;

    private String notes;

    private String receiptImage; // base64 or file path

    // For EQUAL split: just provide participantIds
    private List<Long> participantIds;

    // For INDIVIDUAL / PARTIAL split
    private List<ItemSplit> items;

    // For PERCENTAGE split
    private List<PercentageSplit> percentageSplits;

    // For CUSTOM split
    private List<CustomSplit> customSplits;

    @Data
    public static class ItemSplit {
        private String itemName;
        private BigDecimal price;
        private Integer quantity;
        private List<Long> assignedUserIds;
    }

    @Data
    public static class PercentageSplit {
        private Long userId;
        private BigDecimal percentage;
    }

    @Data
    public static class CustomSplit {
        private Long userId;
        private BigDecimal amount;
    }
}
