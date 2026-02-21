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
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMe() {
        Long userId = SecurityUtil.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(ApiResponse.success("Profile fetched", toResponse(user)));
    }

    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(@RequestBody UpdateProfileRequest req) {
        Long userId = SecurityUtil.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (req.getName()  != null && !req.getName().isBlank())  user.setName(req.getName().trim());
        if (req.getPhone() != null) user.setPhone(req.getPhone().trim());
        if (req.getUpiId() != null) user.setUpiId(req.getUpiId().trim());
        if (req.getPlace() != null) user.setPlace(req.getPlace().trim());

        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Profile updated", toResponse(user)));
    }

    @PatchMapping("/me/upi")
    public ResponseEntity<ApiResponse<UserResponse>> updateUpi(@RequestBody UpiRequest req) {
        Long userId = SecurityUtil.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setUpiId(req.getUpiId() != null ? req.getUpiId().trim() : null);
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("UPI ID updated", toResponse(user)));
    }

    private UserResponse toResponse(User u) {
        return UserResponse.builder()
                .id(u.getId()).name(u.getName()).email(u.getEmail())
                .phone(u.getPhone()).place(u.getPlace())
                .profilePicture(u.getProfilePicture())
                .upiId(u.getUpiId())
                .rewardPoints(u.getRewardPoints() != null ? u.getRewardPoints() : 0)
                .zeroDebtStreak(u.getZeroDebtStreak() != null ? u.getZeroDebtStreak() : 0)
                .createdAt(u.getCreatedAt())
                .build();
    }

    @Data static class UpdateProfileRequest {
        private String name, phone, upiId, place;
    }
    @Data static class UpiRequest {
        private String upiId;
    }
}