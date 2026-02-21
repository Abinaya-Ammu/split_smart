package com.splitsmart.splitsmart_backend.ai;

import com.splitsmart.splitsmart_backend.dto.response.AIInsightResponse;
import com.splitsmart.splitsmart_backend.entity.AIInsight;
import com.splitsmart.splitsmart_backend.entity.User;
import com.splitsmart.splitsmart_backend.repository.AIInsightRepository;
import com.splitsmart.splitsmart_backend.repository.ExpenseRepository;
import com.splitsmart.splitsmart_backend.repository.SettlementRepository;
import com.splitsmart.splitsmart_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIInsightEngine {

    private final AIInsightRepository insightRepository;
    private final ExpenseRepository expenseRepository;
    private final SettlementRepository settlementRepository;
    private final UserRepository userRepository;

    // ✅ Run AI analysis every day at midnight
    @Scheduled(cron = "0 0 0 * * ?")
    public void runDailyInsights() {
        log.info("🤖 Running AI Insight Engine...");
        List<User> users = userRepository.findAll();
        users.forEach(this::generateInsightsForUser);
    }

    public void generateInsightsForUser(User user) {
        detectHeavySpending(user);
        predictPaymentDelays(user);
        analyzeMonthlyTrend(user);
        suggestCostSavings(user);
    }

    // 🔹 Detect if user is spending more than 20% above their monthly average
    private void detectHeavySpending(User user) {
        List<Object[]> monthly = expenseRepository.getMonthlyExpenseTotals(user.getId(), Year.now().getValue());
        if (monthly.size() < 2) return;

        BigDecimal lastMonth = (BigDecimal) monthly.get(monthly.size() - 1)[1];
        BigDecimal prevMonth = (BigDecimal) monthly.get(monthly.size() - 2)[1];

        if (prevMonth.compareTo(BigDecimal.ZERO) > 0) {
            double increase = lastMonth.subtract(prevMonth)
                    .divide(prevMonth, 4, java.math.RoundingMode.HALF_UP)
                    .doubleValue() * 100;

            if (increase > 20) {
                saveInsight(user, AIInsight.InsightType.HEAVY_SPENDER,
                        String.format("⚠️ Your spending increased by %.1f%% compared to last month. " +
                                "Last month: ₹%.0f, This month: ₹%.0f", increase, prevMonth, lastMonth),
                        null);
            }
        }
    }

    // 🔹 Predict who delays payments using reminder count
    private void predictPaymentDelays(User user) {
        List<Object[]> delayers = settlementRepository.findFrequentDelayers();
        for (Object[] row : delayers) {
            Long userId = (Long) row[0];
            if (userId.equals(user.getId())) {
                saveInsight(user, AIInsight.InsightType.PAYMENT_DELAY_PREDICTION,
                        "💡 We've noticed you often delay settling debts. " +
                                "Setting up reminders can help maintain group trust and earn reward points!",
                        null);
                break;
            }
        }
    }

    // 🔹 Monthly trend analysis
    private void analyzeMonthlyTrend(User user) {
        List<Object[]> monthly = expenseRepository.getMonthlyExpenseTotals(user.getId(), Year.now().getValue());
        if (monthly.size() < 3) return;

        // Simple linear prediction for next month
        List<Double> amounts = monthly.stream()
                .map(row -> ((BigDecimal) row[1]).doubleValue())
                .collect(Collectors.toList());

        double avg = amounts.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double lastTwo = (amounts.get(amounts.size() - 1) + amounts.get(amounts.size() - 2)) / 2.0;
        double predicted = (avg + lastTwo) / 2.0;

        saveInsight(user, AIInsight.InsightType.EXPENSE_PREDICTION,
                String.format("📈 Based on your spending patterns, we predict your expenses " +
                        "next month will be around ₹%.0f. Plan accordingly!", predicted),
                String.format("{\"predicted\": %.2f, \"average\": %.2f}", predicted, avg));
    }

    // 🔹 Cost saving tips based on top category
    private void suggestCostSavings(User user) {
        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0);
        List<Object[]> categories = expenseRepository.getCategoryBreakdown(user.getId(), startOfMonth, LocalDateTime.now());

        if (categories.isEmpty()) return;

        // Find top category
        Object[] topCategory = categories.get(0);
        String category = topCategory[0].toString();
        BigDecimal amount = (BigDecimal) topCategory[1];

        String tip = switch (category) {
            case "FOOD" -> String.format("🍽️ You spent ₹%.0f on food this month. " +
                    "Try meal prepping to save up to 30%%!", amount);
            case "TRANSPORT" -> String.format("🚗 You spent ₹%.0f on transport. " +
                    "Consider carpooling with group members!", amount);
            case "ENTERTAINMENT" -> String.format("🎬 ₹%.0f on entertainment! " +
                    "Look for group discount plans to split costs.", amount);
            default -> String.format("💰 Your top spending category is %s (₹%.0f). " +
                    "Review if there are areas to cut back.", category, amount);
        };

        saveInsight(user, AIInsight.InsightType.COST_SAVING_TIP, tip, null);
    }

    public List<AIInsightResponse> getInsightsForUser(Long userId) {
        return insightRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void markInsightRead(Long insightId) {
        insightRepository.findById(insightId).ifPresent(insight -> {
            insight.setIsRead(true);
            insightRepository.save(insight);
        });
    }

    public long getUnreadCount(Long userId) {
        return insightRepository.countByUserIdAndIsReadFalse(userId);
    }

    private void saveInsight(User user, AIInsight.InsightType type, String message, String data) {
        insightRepository.save(AIInsight.builder()
                .user(user)
                .insightType(type)
                .message(message)
                .insightData(data)
                .isRead(false)
                .build());
    }

    private AIInsightResponse mapToResponse(AIInsight insight) {
        return AIInsightResponse.builder()
                .id(insight.getId())
                .insightType(insight.getInsightType())
                .message(insight.getMessage())
                .insightData(insight.getInsightData())
                .isRead(insight.getIsRead())
                .createdAt(insight.getCreatedAt())
                .build();
    }
}
