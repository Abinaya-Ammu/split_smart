package com.splitsmart.splitsmart_backend.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String title;
    private String message;
    private String type;
    private Long groupId;
    private Long settlementId;
    private Long expenseId;
    private BigDecimal amount;
    private String googlePayLink;
    private String phonePeLink;
    private String paytmLink;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
