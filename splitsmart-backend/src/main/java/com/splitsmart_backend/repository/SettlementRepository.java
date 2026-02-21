package com.splitsmart.splitsmart_backend.repository;

import com.splitsmart.splitsmart_backend.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    List<Settlement> findByGroupIdAndStatus(Long groupId, Settlement.SettlementStatus status);

    // Total you owe (you are fromUser)
    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM Settlement s " +
           "WHERE s.fromUser.id = :userId AND s.status = 'PENDING'")
    BigDecimal getTotalOwedByUser(Long userId);

    // Total others owe you (you are toUser)
    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM Settlement s " +
           "WHERE s.toUser.id = :userId AND s.status = 'PENDING'")
    BigDecimal getTotalOwedToUser(Long userId);

    // Pending settlements for a user in both directions
    @Query("SELECT s FROM Settlement s WHERE (s.fromUser.id = :userId OR s.toUser.id = :userId) " +
           "AND s.status = 'PENDING' ORDER BY s.createdAt DESC")
    List<Settlement> findPendingSettlementsForUser(Long userId);

    // For AI: users who delay payments
    @Query("SELECT s.fromUser.id, COUNT(s) FROM Settlement s " +
           "WHERE s.status = 'PENDING' AND s.reminderCount > 2 " +
           "GROUP BY s.fromUser.id ORDER BY COUNT(s) DESC")
    List<Object[]> findFrequentDelayers();
}
