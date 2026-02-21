package com.splitsmart.splitsmart_backend.dto.response;

import com.splitsmart.splitsmart_backend.entity.AIInsight;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIInsightResponse {
    private Long id;
    private AIInsight.InsightType insightType;
    private String message;
    private String insightData;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
