package com.splitsmart.splitsmart_backend.service.impl;

import com.splitsmart.splitsmart_backend.dto.request.AuthRequest;
import com.splitsmart.splitsmart_backend.dto.response.AuthResponse;
import com.splitsmart.splitsmart_backend.dto.response.UserResponse;
import com.splitsmart.splitsmart_backend.entity.User;
import com.splitsmart.splitsmart_backend.exception.BadRequestException;
import com.splitsmart.splitsmart_backend.exception.ResourceNotFoundException;
import com.splitsmart.splitsmart_backend.repository.UserRepository;
import com.splitsmart.splitsmart_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final EmailService emailService;

    public AuthResponse register(AuthRequest.Register request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered. Please login.");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .isActive(true)
                // ✅ FIX: Always set these so loadUserByUsername never gets NPE
                .role(User.Role.USER)
                .rewardPoints(0)
                .zeroDebtStreak(0)
                .preferredLanguage(User.Language.ENGLISH)
                .build();

        userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String accessToken = jwtUtil.generateToken(userDetails);
        String refreshToken = jwtUtil.generateRefreshToken(userDetails);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(mapToUserResponse(user))
                .build();
    }

    public AuthResponse login(AuthRequest.Login request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // ✅ FIX: Repair any legacy users with null role at login time
        boolean dirty = false;
        if (user.getRole() == null)           { user.setRole(User.Role.USER);                dirty = true; }
        if (user.getRewardPoints() == null)   { user.setRewardPoints(0);                     dirty = true; }
        if (user.getZeroDebtStreak() == null) { user.setZeroDebtStreak(0);                   dirty = true; }
        if (user.getIsActive() == null)       { user.setIsActive(true);                      dirty = true; }
        if (user.getPreferredLanguage() == null) { user.setPreferredLanguage(User.Language.ENGLISH); dirty = true; }
        if (dirty) userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String accessToken = jwtUtil.generateToken(userDetails);
        String refreshToken = jwtUtil.generateRefreshToken(userDetails);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(mapToUserResponse(user))
                .build();
    }

    public void forgotPassword(AuthRequest.ForgotPassword request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("No account found with this email"));

        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);
        emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), token);
    }

    public void resetPassword(AuthRequest.ResetPassword request) {
        User user = userRepository.findByResetToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));

        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Reset token has expired. Please request a new one.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .dateOfBirth(user.getDateOfBirth())
                .place(user.getPlace())
                .profilePicture(user.getProfilePicture())
                .preferredLanguage(user.getPreferredLanguage())
                .upiId(user.getUpiId())
                .rewardPoints(user.getRewardPoints() != null ? user.getRewardPoints() : 0)
                .zeroDebtStreak(user.getZeroDebtStreak() != null ? user.getZeroDebtStreak() : 0)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
