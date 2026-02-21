package com.splitsmart.splitsmart_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String phone;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    private String place;

    @Column(name = "profile_picture")
    private String profilePicture;

    @Column(name = "preferred_language")
    @Enumerated(EnumType.STRING)
    private Language preferredLanguage = Language.ENGLISH;

    @Column(name = "upi_id")
    private String upiId;

    @Column(name = "reward_points")
    private Integer rewardPoints = 0;

    @Column(name = "zero_debt_streak")
    private Integer zeroDebtStreak = 0;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "email_verified")
    private Boolean emailVerified = false;

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    @Enumerated(EnumType.STRING)
    private Role role = Role.USER;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationships
    @OneToMany(mappedBy = "createdBy", cascade = CascadeType.ALL)
    private List<Group> createdGroups = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<GroupMember> groupMemberships = new ArrayList<>();

    @OneToMany(mappedBy = "paidBy", cascade = CascadeType.ALL)
    private List<Expense> paidExpenses = new ArrayList<>();

    public enum Language { ENGLISH, TAMIL, HINDI }
    public enum Role { USER, ADMIN }
}
