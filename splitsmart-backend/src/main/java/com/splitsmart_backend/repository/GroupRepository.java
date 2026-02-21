package com.splitsmart.splitsmart_backend.repository;

import com.splitsmart.splitsmart_backend.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {
    Optional<Group> findByInviteCode(String inviteCode);

    @Query("SELECT g FROM Group g JOIN g.members m WHERE m.user.id = :userId AND m.isActive = true AND g.isActive = true")
    List<Group> findGroupsByUserId(Long userId);

    @Query("SELECT COUNT(g) FROM Group g JOIN g.members m WHERE m.user.id = :userId AND m.isActive = true")
    Long countActiveGroupsByUserId(Long userId);
}
