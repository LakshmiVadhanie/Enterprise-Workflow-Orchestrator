package com.enterprise.workflow.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workflows")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Workflow {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkflowStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkflowType type;

    @Column(name = "owner_id", nullable = false)
    private String ownerId;

    @Column(name = "owner_email")
    private String ownerEmail;

    @Column(name = "current_step")
    private Integer currentStep;

    @Column(name = "total_steps")
    private Integer totalSteps;

    @Column(name = "priority")
    @Enumerated(EnumType.STRING)
    private Priority priority;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata; // JSON string

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<WorkflowStep> steps = new ArrayList<>();

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<WorkflowEvent> events = new ArrayList<>();

    public enum WorkflowStatus {
        DRAFT, PENDING, RUNNING, PAUSED, COMPLETED, FAILED, CANCELLED, WAITING_APPROVAL
    }

    public enum WorkflowType {
        APPROVAL, DATA_PIPELINE, DEPLOYMENT, ONBOARDING, COMPLIANCE, INTEGRATION, CUSTOM
    }

    public enum Priority {
        LOW, MEDIUM, HIGH, CRITICAL
    }
}
