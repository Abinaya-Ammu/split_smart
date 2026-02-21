package com.splitsmart.splitsmart_backend.controller;

import com.splitsmart.splitsmart_backend.dto.response.DashboardResponse;
import com.splitsmart.splitsmart_backend.service.impl.DashboardService;
import com.splitsmart.splitsmart_backend.util.ApiResponse;
import com.splitsmart.splitsmart_backend.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "User dashboard summary")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @Operation(summary = "Get dashboard for current user")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Dashboard loaded",
                dashboardService.getDashboard(userId)));
    }
}
