package com.splitsmart.splitsmart_backend.controller;

import com.splitsmart.splitsmart_backend.dto.request.ExpenseRequest;
import com.splitsmart.splitsmart_backend.dto.response.ExpenseResponse;
import com.splitsmart.splitsmart_backend.service.impl.ExpenseService;
import com.splitsmart.splitsmart_backend.util.ApiResponse;
import com.splitsmart.splitsmart_backend.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
@Tag(name = "Expenses", description = "Expense management with smart splitting")
@SecurityRequirement(name = "bearerAuth")
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping
    @Operation(summary = "Create expense (equal/individual/partial/percentage/custom split)")
    public ResponseEntity<ApiResponse<ExpenseResponse>> createExpense(
            @Valid @RequestBody ExpenseRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Expense created",
                        expenseService.createExpense(request, userId)));
    }

    @GetMapping("/group/{groupId}")
    @Operation(summary = "Get expenses for a group (paginated)")
    public ResponseEntity<ApiResponse<Page<ExpenseResponse>>> getGroupExpenses(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Expenses fetched",
                expenseService.getGroupExpenses(groupId, userId, page, size)));
    }

    @GetMapping("/{expenseId}")
    @Operation(summary = "Get expense by ID")
    public ResponseEntity<ApiResponse<ExpenseResponse>> getExpense(@PathVariable Long expenseId) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Expense fetched",
                expenseService.getExpenseById(expenseId, userId)));
    }
}
