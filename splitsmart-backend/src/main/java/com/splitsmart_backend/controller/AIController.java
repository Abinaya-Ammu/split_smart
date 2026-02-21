package com.splitsmart.splitsmart_backend.controller;

import com.splitsmart.splitsmart_backend.ai.AIInsightEngine;
import com.splitsmart.splitsmart_backend.dto.response.AIInsightResponse;
import com.splitsmart.splitsmart_backend.entity.User;
import com.splitsmart.splitsmart_backend.exception.ResourceNotFoundException;
import com.splitsmart.splitsmart_backend.repository.UserRepository;
import com.splitsmart.splitsmart_backend.util.ApiResponse;
import com.splitsmart.splitsmart_backend.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI Insights", description = "Smart AI-powered spending insights and predictions")
@SecurityRequirement(name = "bearerAuth")
public class AIController {

    private final AIInsightEngine aiInsightEngine;
    private final UserRepository userRepository;

    @GetMapping("/insights")
    @Operation(summary = "Get all AI insights for current user")
    public ResponseEntity<ApiResponse<List<AIInsightResponse>>> getInsights() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Insights fetched",
                aiInsightEngine.getInsightsForUser(userId)));
    }

    @GetMapping("/insights/unread-count")
    @Operation(summary = "Get unread insights count (for badge)")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        Long userId = SecurityUtil.getCurrentUserId();
        long count = aiInsightEngine.getUnreadCount(userId);
        return ResponseEntity.ok(ApiResponse.success("Count fetched", Map.of("unreadCount", count)));
    }

    @PatchMapping("/insights/{insightId}/read")
    @Operation(summary = "Mark an insight as read")
    public ResponseEntity<ApiResponse<Void>> markRead(@PathVariable Long insightId) {
        aiInsightEngine.markInsightRead(insightId);
        return ResponseEntity.ok(ApiResponse.success("Marked as read", null));
    }

    @PostMapping("/analyze")
    @Operation(summary = "Trigger AI analysis for current user manually")
    public ResponseEntity<ApiResponse<Void>> triggerAnalysis() {
        Long userId = SecurityUtil.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        aiInsightEngine.generateInsightsForUser(user);
        return ResponseEntity.ok(ApiResponse.success("AI analysis complete! Check your insights.", null));
    }
}
