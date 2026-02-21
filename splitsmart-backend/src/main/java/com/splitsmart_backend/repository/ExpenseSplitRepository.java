package com.splitsmart.splitsmart_backend.repository;

import com.splitsmart.splitsmart_backend.entity.ExpenseSplit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplit, Long> {

    List<ExpenseSplit> findByExpenseId(Long expenseId);

    List<ExpenseSplit> findByUserIdAndIsPaidFalse(Long userId);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM ExpenseSplit s "
            + "WHERE s.user.id = :userId AND s.isPaid = false AND s.expense.group.id = :groupId")
    BigDecimal getTotalOwedByUserInGroup(Long userId, Long groupId);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM ExpenseSplit s "
            + "WHERE s.user.id = :userId AND s.isPaid = false")
    BigDecimal getTotalOwedByUser(Long userId);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM ExpenseSplit s "
            + "WHERE s.expense.paidBy.id = :userId AND s.expense.group.id = :groupId")
    BigDecimal sumPaidByUserInGroup(Long userId, Long groupId);
}
