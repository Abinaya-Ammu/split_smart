package com.splitsmart.splitsmart_backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private BigDecimal totalYouOwe;
    private BigDecimal totalYouGet;
    private Long activeGroups;
    private Long totalExpenses;
    private List<ExpenseResponse> recentExpenses;
    private List<SettlementResponse> pendingSettlements;
    private Map<String, BigDecimal> categoryBreakdown;
    private List<MonthlyData> monthlyTrend;
    private List<AIInsightResponse> aiInsights;
    private Integer rewardPoints;
    private Integer zeroDebtStreak;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyData {
        private String month;
        private BigDecimal amount;
    }
}
