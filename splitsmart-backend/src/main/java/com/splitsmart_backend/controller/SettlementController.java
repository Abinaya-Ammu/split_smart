package com.splitsmart.splitsmart_backend.controller;

import com.splitsmart.splitsmart_backend.dto.response.SettlementResponse;
import com.splitsmart.splitsmart_backend.service.impl.SettlementService;
import com.splitsmart.splitsmart_backend.util.ApiResponse;
import com.splitsmart.splitsmart_backend.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/settlements")
@RequiredArgsConstructor
@Tag(name = "Settlements", description = "Debt settlement with minimize-transactions algorithm")
@SecurityRequirement(name = "bearerAuth")
public class SettlementController {

    private final SettlementService settlementService;

    @GetMapping("/pending")
    @Operation(summary = "Get all pending settlements for current user")
    public ResponseEntity<ApiResponse<List<SettlementResponse>>> getPending() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Settlements fetched",
                settlementService.getPendingSettlements(userId)));
    }

    @GetMapping("/group/{groupId}")
    @Operation(summary = "Get all settlements for a group")
    public ResponseEntity<ApiResponse<List<SettlementResponse>>> getGroupSettlements(
            @PathVariable Long groupId) {
        return ResponseEntity.ok(ApiResponse.success("Group settlements fetched",
                settlementService.getGroupSettlements(groupId)));
    }

    @PostMapping("/{settlementId}/settle")
    @Operation(summary = "Mark a settlement as paid")
    public ResponseEntity<ApiResponse<SettlementResponse>> settle(
            @PathVariable Long settlementId,
            @RequestBody(required = false) SettleRequest request) {
        String method = request != null ? request.getPaymentMethod() : null;
        String txId = request != null ? request.getTransactionId() : null;
        return ResponseEntity.ok(ApiResponse.success("Settlement completed! 🎉",
                settlementService.markSettled(settlementId, method, txId)));
    }

    @PostMapping("/{settlementId}/remind")
    @Operation(summary = "Send payment reminder")
    public ResponseEntity<ApiResponse<Void>> remind(@PathVariable Long settlementId) {
        settlementService.sendReminder(settlementId);
        return ResponseEntity.ok(ApiResponse.success("Reminder sent", null));
    }

    @Data
    static class SettleRequest {
        private String paymentMethod;
        private String transactionId;
    }
}
