package com.splitsmart.splitsmart_backend.controller;

import com.splitsmart.splitsmart_backend.dto.request.AuthRequest;
import com.splitsmart.splitsmart_backend.dto.response.AuthResponse;
import com.splitsmart.splitsmart_backend.dto.response.UserResponse;
import com.splitsmart.splitsmart_backend.entity.User;
import com.splitsmart.splitsmart_backend.exception.ResourceNotFoundException;
import com.splitsmart.splitsmart_backend.repository.UserRepository;
import com.splitsmart.splitsmart_backend.service.impl.AuthService;
import com.splitsmart.splitsmart_backend.util.ApiResponse;
import com.splitsmart.splitsmart_backend.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody AuthRequest.Register request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registered successfully", authService.register(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest.Login request) {
        return ResponseEntity.ok(ApiResponse.success("Login successful", authService.login(request)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody AuthRequest.ForgotPassword request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Reset email sent", null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody AuthRequest.ResetPassword request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully", null));
    }

    // ── Profile endpoints (kept here so no new file needed) ──────────────────

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get current user profile")
    public ResponseEntity<ApiResponse<UserResponse>> getMe() {
        User u = getUser();
        return ResponseEntity.ok(ApiResponse.success("Profile fetched", toResponse(u)));
    }

    @PatchMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update profile (name, phone, place, upiId)")
    public ResponseEntity<ApiResponse<UserResponse>> updateMe(@RequestBody UpdateRequest req) {
        User u = getUser();
        if (req.getName()  != null && !req.getName().isBlank())  u.setName(req.getName().trim());
        if (req.getPhone() != null) u.setPhone(req.getPhone().trim());
        if (req.getPlace() != null) u.setPlace(req.getPlace().trim());
        if (req.getUpiId() != null) u.setUpiId(req.getUpiId().trim());
        userRepository.save(u);
        return ResponseEntity.ok(ApiResponse.success("Profile updated", toResponse(u)));
    }

    @PatchMapping("/me/upi")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update UPI ID only")
    public ResponseEntity<ApiResponse<UserResponse>> updateUpi(@RequestBody UpiRequest req) {
        User u = getUser();
        u.setUpiId(req.getUpiId() != null ? req.getUpiId().trim() : null);
        userRepository.save(u);
        return ResponseEntity.ok(ApiResponse.success("UPI ID saved", toResponse(u)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    private User getUser() {
        Long id = SecurityUtil.getCurrentUserId();
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private UserResponse toResponse(User u) {
        return UserResponse.builder()
                .id(u.getId()).name(u.getName()).email(u.getEmail())
                .phone(u.getPhone()).place(u.getPlace())
                .profilePicture(u.getProfilePicture()).upiId(u.getUpiId())
                .rewardPoints(u.getRewardPoints() != null ? u.getRewardPoints() : 0)
                .zeroDebtStreak(u.getZeroDebtStreak() != null ? u.getZeroDebtStreak() : 0)
                .createdAt(u.getCreatedAt()).build();
    }

    @Data static class UpdateRequest { private String name, phone, place, upiId; }
    @Data static class UpiRequest    { private String upiId; }
}