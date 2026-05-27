package com.enterprise.workflow.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workflow_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "from_status")
    @Enumerated(EnumType.STRING)
    private Workflow.WorkflowStatus fromStatus;

    @Column(name = "to_status")
    @Enumerated(EnumType.STRING)
    private Workflow.WorkflowStatus toStatus;

    @Column(name = "actor_id")
    private String actorId;

    @Column(name = "actor_email")
    private String actorEmail;

    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload; // JSON

    @Column(name = "message")
    private String message;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
