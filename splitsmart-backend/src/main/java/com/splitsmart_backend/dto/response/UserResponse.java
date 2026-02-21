package com.splitsmart.splitsmart_backend.dto.response;

import com.splitsmart.splitsmart_backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private LocalDate dateOfBirth;
    private String place;
    private String profilePicture;
    private User.Language preferredLanguage;
    private String upiId;
    private Integer rewardPoints;
    private Integer zeroDebtStreak;
    private LocalDateTime createdAt;
}
