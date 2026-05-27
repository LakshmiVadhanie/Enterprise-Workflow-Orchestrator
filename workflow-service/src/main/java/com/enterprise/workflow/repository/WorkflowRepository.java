package com.enterprise.workflow.repository;

import com.enterprise.workflow.model.Workflow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkflowRepository extends JpaRepository<Workflow, UUID> {

    Page<Workflow> findByOwnerId(String ownerId, Pageable pageable);

    Page<Workflow> findByStatus(Workflow.WorkflowStatus status, Pageable pageable);

    Page<Workflow> findByTypeAndStatus(Workflow.WorkflowType type, Workflow.WorkflowStatus status, Pageable pageable);

    List<Workflow> findByStatusIn(List<Workflow.WorkflowStatus> statuses);

    @Query("SELECT w FROM Workflow w WHERE w.ownerId = :ownerId AND w.status IN :statuses")
    List<Workflow> findByOwnerAndStatuses(@Param("ownerId") String ownerId,
                                          @Param("statuses") List<Workflow.WorkflowStatus> statuses);

    @Query("SELECT COUNT(w) FROM Workflow w WHERE w.status = :status")
    long countByStatus(@Param("status") Workflow.WorkflowStatus status);

    @Query("SELECT w.type, COUNT(w) FROM Workflow w GROUP BY w.type")
    List<Object[]> countByType();

    @Query("SELECT w FROM Workflow w WHERE w.dueDate < :now AND w.status NOT IN ('COMPLETED', 'CANCELLED', 'FAILED')")
    List<Workflow> findOverdueWorkflows(@Param("now") LocalDateTime now);

    @Query("SELECT w FROM Workflow w WHERE w.createdAt >= :since ORDER BY w.createdAt DESC")
    List<Workflow> findRecentWorkflows(@Param("since") LocalDateTime since);

    @Query("""
        SELECT w FROM Workflow w
        WHERE (:status IS NULL OR w.status = :status)
        AND (:type IS NULL OR w.type = :type)
        AND (:ownerId IS NULL OR w.ownerId = :ownerId)
        ORDER BY w.createdAt DESC
    """)
    Page<Workflow> findWithFilters(
            @Param("status") Workflow.WorkflowStatus status,
            @Param("type") Workflow.WorkflowType type,
            @Param("ownerId") String ownerId,
            Pageable pageable
    );
}
