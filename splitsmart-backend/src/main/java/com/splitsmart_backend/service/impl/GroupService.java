package com.splitsmart.splitsmart_backend.service.impl;

import com.splitsmart.splitsmart_backend.dto.response.GroupResponse;
import com.splitsmart.splitsmart_backend.dto.response.UserResponse;
import com.splitsmart.splitsmart_backend.entity.Group;
import com.splitsmart.splitsmart_backend.entity.GroupMember;
import com.splitsmart.splitsmart_backend.entity.User;
import com.splitsmart.splitsmart_backend.exception.BadRequestException;
import com.splitsmart.splitsmart_backend.exception.ResourceNotFoundException;
import com.splitsmart.splitsmart_backend.repository.GroupMemberRepository;
import com.splitsmart.splitsmart_backend.repository.GroupRepository;
import com.splitsmart.splitsmart_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public GroupResponse createGroup(String name, String description, String icon,
                                     String themeColor, Group.GroupType type, Long creatorId) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Group group = Group.builder()
                .name(name)
                .description(description)
                .groupIcon(icon)
                .themeColor(themeColor)
                .type(type != null ? type : Group.GroupType.GENERAL)
                .inviteCode(UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .createdBy(creator)
                .isActive(true)
                .build();

        group = groupRepository.save(group);

        // Add creator as admin member
        groupMemberRepository.save(GroupMember.builder()
                .group(group)
                .user(creator)
                .role(GroupMember.MemberRole.ADMIN)
                .isActive(true)
                .build());

        // 🔔 Notify creator that group was created
        notificationService.sendGroupCreatedNotif(creatorId, name, group.getId());

        return mapToResponse(group, 1);
    }

    @Transactional
    public void addMember(Long groupId, Long userId, Long requesterId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        if (!groupMemberRepository.existsByGroupIdAndUserIdAndIsActiveTrue(groupId, requesterId)) {
            throw new BadRequestException("You are not a member of this group");
        }
        if (groupMemberRepository.existsByGroupIdAndUserIdAndIsActiveTrue(groupId, userId)) {
            throw new BadRequestException("User is already a member of this group");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Requester not found"));

        groupMemberRepository.save(GroupMember.builder()
                .group(group)
                .user(user)
                .role(GroupMember.MemberRole.MEMBER)
                .isActive(true)
                .build());

        // 🔔 Notify the new member they were added
        notificationService.sendGroupInviteNotif(userId, requester.getName(), group.getName(), groupId);
    }

    @Transactional
    public GroupResponse joinByInviteCode(String inviteCode, Long userId) {
        Group group = groupRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid invite code"));

        if (groupMemberRepository.existsByGroupIdAndUserIdAndIsActiveTrue(group.getId(), userId)) {
            throw new BadRequestException("You are already a member of this group");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        groupMemberRepository.save(GroupMember.builder()
                .group(group)
                .user(user)
                .role(GroupMember.MemberRole.MEMBER)
                .isActive(true)
                .build());

        int count = groupMemberRepository.findByGroupIdAndIsActiveTrue(group.getId()).size();

        // 🔔 Notify group creator that someone joined
        if (group.getCreatedBy() != null) {
            notificationService.sendMemberJoinedNotif(
                group.getCreatedBy().getId(), user.getName(), group.getName(), group.getId());
        }

        return mapToResponse(group, count);
    }

    public List<GroupResponse> getUserGroups(Long userId) {
        return groupRepository.findGroupsByUserId(userId).stream()
                .map(g -> {
                    int count = groupMemberRepository.findByGroupIdAndIsActiveTrue(g.getId()).size();
                    return mapToResponse(g, count);
                })
                .collect(Collectors.toList());
    }

    public GroupResponse getGroupById(Long groupId) {
        Group g = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        int count = groupMemberRepository.findByGroupIdAndIsActiveTrue(g.getId()).size();
        return mapToResponse(g, count);
    }

    public List<UserResponse> getGroupMembers(Long groupId) {
        return groupMemberRepository.findByGroupIdAndIsActiveTrue(groupId).stream()
                .map(m -> UserResponse.builder()
                        .id(m.getUser().getId())
                        .name(m.getUser().getName())
                        .email(m.getUser().getEmail())
                        .profilePicture(m.getUser().getProfilePicture())
                        .upiId(m.getUser().getUpiId())
                        .build())
                .collect(Collectors.toList());
    }

    public List<UserResponse> searchUsers(String query) {
        return userRepository.searchUsers(query).stream()
                .map(u -> UserResponse.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .email(u.getEmail())
                        .profilePicture(u.getProfilePicture())
                        .build())
                .collect(Collectors.toList());
    }

    private GroupResponse mapToResponse(Group g, int memberCount) {
        return GroupResponse.builder()
                .id(g.getId())
                .name(g.getName())
                .description(g.getDescription())
                .groupIcon(g.getGroupIcon())
                .themeColor(g.getThemeColor())
                .type(g.getType() != null ? g.getType().name() : "GENERAL")
                .inviteCode(g.getInviteCode())
                .isActive(g.getIsActive())
                .memberCount(memberCount)
                .createdByName(g.getCreatedBy() != null ? g.getCreatedBy().getName() : "")
                .createdAt(g.getCreatedAt())
                .build();
    }
}
