package com.enterprise.workflow.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workflow_steps")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowStep {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private Workflow workflow;

    @Column(name = "step_order", nullable = false)
    private Integer stepOrder;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StepStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StepType type;

    @Column(name = "assignee_id")
    private String assigneeId;

    @Column(name = "assignee_email")
    private String assigneeEmail;

    @Column(name = "config", columnDefinition = "TEXT")
    private String config; // JSON

    @Column(name = "output", columnDefinition = "TEXT")
    private String output; // JSON

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "max_retries")
    @Builder.Default
    private Integer maxRetries = 3;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "timeout_seconds")
    @Builder.Default
    private Integer timeoutSeconds = 3600;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum StepStatus {
        PENDING, RUNNING, COMPLETED, FAILED, SKIPPED, WAITING
    }

    public enum StepType {
        HUMAN_APPROVAL, AUTOMATED_TASK, NOTIFICATION, CONDITION, PARALLEL, WEBHOOK, SCRIPT
    }
}
