package com.splitsmart.splitsmart_backend.repository;

import com.splitsmart.splitsmart_backend.entity.AIInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AIInsightRepository extends JpaRepository<AIInsight, Long> {
    List<AIInsight> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<AIInsight> findByUserIdAndIsReadFalse(Long userId);
    long countByUserIdAndIsReadFalse(Long userId);
}
