package com.splitsmart.splitsmart_backend.repository;

import com.splitsmart.splitsmart_backend.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);
    List<GroupMember> findByGroupIdAndIsActiveTrue(Long groupId);
    boolean existsByGroupIdAndUserIdAndIsActiveTrue(Long groupId, Long userId);
}
