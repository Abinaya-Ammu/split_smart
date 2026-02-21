package com.splitsmart.splitsmart_backend.controller;

import com.splitsmart.splitsmart_backend.dto.response.GroupResponse;
import com.splitsmart.splitsmart_backend.dto.response.UserResponse;
import com.splitsmart.splitsmart_backend.entity.Group;
import com.splitsmart.splitsmart_backend.service.impl.GroupService;
import com.splitsmart.splitsmart_backend.util.ApiResponse;
import com.splitsmart.splitsmart_backend.util.SecurityUtil;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@Tag(name = "Groups")
@SecurityRequirement(name = "bearerAuth")
public class GroupController {

    private final GroupService groupService;

    @PostMapping
    public ResponseEntity<ApiResponse<GroupResponse>> createGroup(@RequestBody CreateGroupRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        GroupResponse group = groupService.createGroup(
                request.getName(), request.getDescription(),
                request.getIcon(), request.getThemeColor(),
                request.getType(), userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Group created", group));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<GroupResponse>>> getMyGroups() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Groups fetched",
                groupService.getUserGroups(userId)));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupResponse>> getGroupById(@PathVariable Long groupId) {
        return ResponseEntity.ok(ApiResponse.success("Group fetched",
                groupService.getGroupById(groupId)));
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<Void>> addMember(
            @PathVariable Long groupId, @RequestParam Long userId) {
        Long requesterId = SecurityUtil.getCurrentUserId();
        groupService.addMember(groupId, userId, requesterId);
        return ResponseEntity.ok(ApiResponse.success("Member added", null));
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getMembers(@PathVariable Long groupId) {
        return ResponseEntity.ok(ApiResponse.success("Members fetched",
                groupService.getGroupMembers(groupId)));
    }

    @PostMapping("/join/{inviteCode}")
    public ResponseEntity<ApiResponse<GroupResponse>> joinGroup(@PathVariable String inviteCode) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Joined group",
                groupService.joinByInviteCode(inviteCode, userId)));
    }

    @GetMapping("/search-users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> searchUsers(@RequestParam String q) {
        return ResponseEntity.ok(ApiResponse.success("Users found",
                groupService.searchUsers(q)));
    }

    @Data
    static class CreateGroupRequest {
        private String name;
        private String description;
        private String icon;
        private String themeColor;
        private Group.GroupType type;
    }
}
