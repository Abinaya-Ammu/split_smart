package com.splitsmart.splitsmart_backend.repository;

import com.splitsmart.splitsmart_backend.entity.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    Page<Expense> findByGroupIdOrderByCreatedAtDesc(Long groupId, Pageable pageable);

    List<Expense> findByGroupIdAndIsSettledFalse(Long groupId);

    // Get all expenses where this user is involved (paid or has a split)
    @Query("SELECT DISTINCT e FROM Expense e LEFT JOIN e.splits s " +
           "WHERE (e.paidBy.id = :userId OR s.user.id = :userId) AND e.group.id = :groupId " +
           "ORDER BY e.createdAt DESC")
    List<Expense> findExpensesByUserAndGroup(Long userId, Long groupId);

    // Dashboard: recent expenses across all groups of user
    @Query("SELECT DISTINCT e FROM Expense e JOIN e.group g JOIN g.members m " +
           "WHERE m.user.id = :userId AND m.isActive = true " +
           "ORDER BY e.createdAt DESC")
    Page<Expense> findRecentExpensesByUser(Long userId, Pageable pageable);

    // Total amount paid by a user in a group
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.paidBy.id = :userId AND e.group.id = :groupId")
    BigDecimal sumPaidByUserInGroup(Long userId, Long groupId);

    // Monthly expense totals for analytics
    @Query("SELECT MONTH(e.createdAt), SUM(e.amount) FROM Expense e " +
           "JOIN e.splits s WHERE s.user.id = :userId AND YEAR(e.createdAt) = :year " +
           "GROUP BY MONTH(e.createdAt)")
    List<Object[]> getMonthlyExpenseTotals(Long userId, int year);

    // Category breakdown
    @Query("SELECT e.category, SUM(s.amount) FROM Expense e " +
           "JOIN e.splits s WHERE s.user.id = :userId " +
           "AND e.createdAt BETWEEN :startDate AND :endDate " +
           "GROUP BY e.category")
    List<Object[]> getCategoryBreakdown(Long userId, LocalDateTime startDate, LocalDateTime endDate);
}
