package com.splitsmart.splitsmart_backend.controller;

import com.splitsmart.splitsmart_backend.dto.response.UserResponse;
import com.splitsmart.splitsmart_backend.entity.User;
import com.splitsmart.splitsmart_backend.exception.ResourceNotFoundException;
import com.splitsmart.splitsmart_backend.repository.UserRepository;
import com.splitsmart.splitsmart_backend.util.ApiResponse;
import com.splitsmart.splitsmart_backend.util.SecurityUtil;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Tag(name = "Profile")
@SecurityRequirement(name = "bearerAuth")
public class ProfileController {

    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<UserResponse>> getMe() {
        return ResponseEntity.ok(ApiResponse.success("OK", toResponse(currentUser())));
    }

    @PatchMapping
    public ResponseEntity<ApiResponse<UserResponse>> updateMe(@RequestBody UpdateRequest req) {
        User u = currentUser();
        if (req.getName()  != null && !req.getName().isBlank()) u.setName(req.getName().trim());
        if (req.getPhone() != null) u.setPhone(req.getPhone().trim());
        if (req.getPlace() != null) u.setPlace(req.getPlace().trim());
        if (req.getUpiId() != null) u.setUpiId(req.getUpiId().trim());
        userRepository.save(u);
        return ResponseEntity.ok(ApiResponse.success("Saved", toResponse(u)));
    }

    @PatchMapping("/upi")
    public ResponseEntity<ApiResponse<UserResponse>> updateUpi(@RequestBody UpiRequest req) {
        User u = currentUser();
        u.setUpiId(req.getUpiId() != null ? req.getUpiId().trim() : null);
        userRepository.save(u);
        return ResponseEntity.ok(ApiResponse.success("UPI saved", toResponse(u)));
    }

    private User currentUser() {
        return userRepository.findById(SecurityUtil.getCurrentUserId())
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
