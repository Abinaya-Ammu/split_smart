package com.splitsmart.splitsmart_backend.dto.response;

import com.splitsmart.splitsmart_backend.entity.Settlement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SettlementResponse {
    private Long id;
    private UserResponse fromUser;
    private UserResponse toUser;
    private BigDecimal amount;
    private Settlement.SettlementStatus status;
    private String groupName;
    private Long groupId;
    private LocalDateTime createdAt;
    private LocalDateTime settledAt;
    // Payment deep link for UPI apps
    private String googlePayLink;
    private String phonePeLink;
    private String paytmLink;
}
