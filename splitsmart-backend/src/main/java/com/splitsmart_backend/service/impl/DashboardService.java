package com.splitsmart.splitsmart_backend.service.impl;

import com.splitsmart.splitsmart_backend.ai.AIInsightEngine;
import com.splitsmart.splitsmart_backend.dto.response.DashboardResponse;
import com.splitsmart.splitsmart_backend.entity.User;
import com.splitsmart.splitsmart_backend.exception.ResourceNotFoundException;
import com.splitsmart.splitsmart_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.Year;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UserRepository userRepository;
    private final SettlementRepository settlementRepository;
    private final GroupRepository groupRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseService expenseService;
    private final SettlementService settlementService;
    private final AIInsightEngine aiInsightEngine;

    public DashboardResponse getDashboard(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Total you owe (across all groups)
        BigDecimal totalYouOwe = settlementRepository.getTotalOwedByUser(userId);

        // Total others owe you
        BigDecimal totalYouGet = settlementRepository.getTotalOwedToUser(userId);

        // Active groups count
        Long activeGroups = groupRepository.countActiveGroupsByUserId(userId);

        // Recent 10 expenses
        var recentExpenses = expenseRepository
                .findRecentExpensesByUser(userId, PageRequest.of(0, 10))
                .map(e -> expenseService.getExpenseById(e.getId(), userId))
                .toList();

        // Pending settlements
        var pendingSettlements = settlementService.getPendingSettlements(userId);

        // Category breakdown for this month
        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0);
        List<Object[]> categoryData = expenseRepository.getCategoryBreakdown(userId, startOfMonth, LocalDateTime.now());
        Map<String, BigDecimal> categoryBreakdown = new LinkedHashMap<>();
        for (Object[] row : categoryData) {
            categoryBreakdown.put(row[0].toString(), (BigDecimal) row[1]);
        }

        // Monthly trend (this year)
        List<Object[]> monthlyData = expenseRepository.getMonthlyExpenseTotals(userId, Year.now().getValue());
        List<DashboardResponse.MonthlyData> monthlyTrend = monthlyData.stream()
                .map(row -> DashboardResponse.MonthlyData.builder()
                        .month(Month.of(((Number) row[0]).intValue()).name())
                        .amount((BigDecimal) row[1])
                        .build())
                .collect(Collectors.toList());

        // AI insights (top 5 unread)
        var aiInsights = aiInsightEngine.getInsightsForUser(userId).stream()
                .filter(i -> !i.getIsRead())
                .limit(5)
                .collect(Collectors.toList());

        return DashboardResponse.builder()
                .totalYouOwe(totalYouOwe != null ? totalYouOwe : BigDecimal.ZERO)
                .totalYouGet(totalYouGet != null ? totalYouGet : BigDecimal.ZERO)
                .activeGroups(activeGroups)
                .totalExpenses((long) recentExpenses.size())
                .recentExpenses(recentExpenses)
                .pendingSettlements(pendingSettlements)
                .categoryBreakdown(categoryBreakdown)
                .monthlyTrend(monthlyTrend)
                .aiInsights(aiInsights)
                .rewardPoints(user.getRewardPoints())
                .zeroDebtStreak(user.getZeroDebtStreak())
                .build();
    }
}
