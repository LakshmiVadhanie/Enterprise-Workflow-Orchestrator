package com.enterprise.workflow.service;

import com.enterprise.workflow.model.Workflow;
import com.enterprise.workflow.model.WorkflowEvent;
import com.enterprise.workflow.model.WorkflowStep;
import com.enterprise.workflow.repository.WorkflowRepository;
import com.enterprise.workflow.websocket.WorkflowWebSocketHandler;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowService {

    private final WorkflowRepository workflowRepository;
    private final WorkflowWebSocketHandler webSocketHandler;
    private final ObjectMapper objectMapper;

    @Transactional
    public Workflow createWorkflow(Workflow workflow) {
        workflow.setStatus(Workflow.WorkflowStatus.PENDING);
        workflow.setCurrentStep(0);
        if (workflow.getSteps() != null) {
            workflow.setTotalSteps(workflow.getSteps().size());
            workflow.getSteps().forEach(step -> {
                step.setWorkflow(workflow);
                step.setStatus(WorkflowStep.StepStatus.PENDING);
            });
        }

        Workflow saved = workflowRepository.save(workflow);
        recordEvent(saved, "CREATED", null, Workflow.WorkflowStatus.PENDING,
                workflow.getOwnerId(), workflow.getOwnerEmail(), "Workflow created");

        broadcastUpdate(saved);
        log.info("Created workflow: {} [{}]", saved.getName(), saved.getId());
        return saved;
    }

    @Transactional
    public Workflow startWorkflow(UUID workflowId, String actorId, String actorEmail) {
        Workflow workflow = getWorkflowOrThrow(workflowId);
        validateTransition(workflow.getStatus(), Workflow.WorkflowStatus.RUNNING);

        Workflow.WorkflowStatus oldStatus = workflow.getStatus();
        workflow.setStatus(Workflow.WorkflowStatus.RUNNING);
        workflow.setStartedAt(LocalDateTime.now());

        if (!workflow.getSteps().isEmpty()) {
            WorkflowStep firstStep = workflow.getSteps().stream()
                    .min(Comparator.comparingInt(WorkflowStep::getStepOrder))
                    .orElseThrow();
            firstStep.setStatus(WorkflowStep.StepStatus.RUNNING);
            firstStep.setStartedAt(LocalDateTime.now());
        }

        Workflow saved = workflowRepository.save(workflow);
        recordEvent(saved, "STARTED", oldStatus, Workflow.WorkflowStatus.RUNNING,
                actorId, actorEmail, "Workflow started");

        broadcastUpdate(saved);
        executeNextStep(saved);
        return saved;
    }

    @Transactional
    public Workflow approveStep(UUID workflowId, UUID stepId, String actorId,
                                 String actorEmail, String comment) {
        Workflow workflow = getWorkflowOrThrow(workflowId);
        WorkflowStep step = workflow.getSteps().stream()
                .filter(s -> s.getId().equals(stepId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Step not found: " + stepId));

        step.setStatus(WorkflowStep.StepStatus.COMPLETED);
        step.setCompletedAt(LocalDateTime.now());
        step.setOutput("{\"approved\": true, \"comment\": \"" + comment + "\"}");

        advanceToNextStep(workflow, step, actorId, actorEmail);
        Workflow saved = workflowRepository.save(workflow);
        broadcastUpdate(saved);
        return saved;
    }

    @Transactional
    public Workflow pauseWorkflow(UUID workflowId, String actorId, String actorEmail) {
        Workflow workflow = getWorkflowOrThrow(workflowId);
        Workflow.WorkflowStatus oldStatus = workflow.getStatus();
        workflow.setStatus(Workflow.WorkflowStatus.PAUSED);

        Workflow saved = workflowRepository.save(workflow);
        recordEvent(saved, "PAUSED", oldStatus, Workflow.WorkflowStatus.PAUSED,
                actorId, actorEmail, "Workflow paused by user");
        broadcastUpdate(saved);
        return saved;
    }

    @Transactional
    public Workflow cancelWorkflow(UUID workflowId, String actorId, String actorEmail, String reason) {
        Workflow workflow = getWorkflowOrThrow(workflowId);
        Workflow.WorkflowStatus oldStatus = workflow.getStatus();
        workflow.setStatus(Workflow.WorkflowStatus.CANCELLED);
        workflow.setCompletedAt(LocalDateTime.now());
        workflow.setErrorMessage(reason);

        Workflow saved = workflowRepository.save(workflow);
        recordEvent(saved, "CANCELLED", oldStatus, Workflow.WorkflowStatus.CANCELLED,
                actorId, actorEmail, "Workflow cancelled: " + reason);
        broadcastUpdate(saved);
        return saved;
    }

    @Transactional
    public Workflow retryWorkflow(UUID workflowId, String actorId, String actorEmail) {
        Workflow workflow = getWorkflowOrThrow(workflowId);
        if (workflow.getStatus() != Workflow.WorkflowStatus.FAILED) {
            throw new IllegalStateException("Only failed workflows can be retried");
        }

        Workflow.WorkflowStatus oldStatus = workflow.getStatus();
        workflow.setStatus(Workflow.WorkflowStatus.RUNNING);
        workflow.setErrorMessage(null);

        // Reset failed steps
        workflow.getSteps().stream()
                .filter(s -> s.getStatus() == WorkflowStep.StepStatus.FAILED)
                .forEach(s -> {
                    s.setStatus(WorkflowStep.StepStatus.PENDING);
                    s.setRetryCount(s.getRetryCount() + 1);
                });

        Workflow saved = workflowRepository.save(workflow);
        recordEvent(saved, "RETRIED", oldStatus, Workflow.WorkflowStatus.RUNNING,
                actorId, actorEmail, "Workflow retried");
        broadcastUpdate(saved);
        return saved;
    }

    public Page<Workflow> getWorkflows(Workflow.WorkflowStatus status, Workflow.WorkflowType type,
                                       String ownerId, Pageable pageable) {
        return workflowRepository.findWithFilters(status, type, ownerId, pageable);
    }

    public Workflow getWorkflowById(UUID id) {
        return getWorkflowOrThrow(id);
    }

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", workflowRepository.count());
        stats.put("running", workflowRepository.countByStatus(Workflow.WorkflowStatus.RUNNING));
        stats.put("pending", workflowRepository.countByStatus(Workflow.WorkflowStatus.PENDING));
        stats.put("completed", workflowRepository.countByStatus(Workflow.WorkflowStatus.COMPLETED));
        stats.put("failed", workflowRepository.countByStatus(Workflow.WorkflowStatus.FAILED));
        stats.put("waitingApproval", workflowRepository.countByStatus(Workflow.WorkflowStatus.WAITING_APPROVAL));

        List<Workflow> overdue = workflowRepository.findOverdueWorkflows(LocalDateTime.now());
        stats.put("overdue", overdue.size());

        List<Workflow> recent = workflowRepository.findRecentWorkflows(LocalDateTime.now().minusDays(7));
        stats.put("recentCount", recent.size());

        List<Object[]> byType = workflowRepository.countByType();
        Map<String, Long> typeBreakdown = new HashMap<>();
        byType.forEach(row -> typeBreakdown.put(row[0].toString(), (Long) row[1]));
        stats.put("byType", typeBreakdown);

        return stats;
    }

    // ─── Private Helpers ────────────────────────────────────────────────────────

    private void advanceToNextStep(Workflow workflow, WorkflowStep completedStep,
                                   String actorId, String actorEmail) {
        Optional<WorkflowStep> nextStep = workflow.getSteps().stream()
                .filter(s -> s.getStepOrder() > completedStep.getStepOrder() &&
                             s.getStatus() == WorkflowStep.StepStatus.PENDING)
                .min(Comparator.comparingInt(WorkflowStep::getStepOrder));

        workflow.setCurrentStep(completedStep.getStepOrder());

        if (nextStep.isPresent()) {
            WorkflowStep next = nextStep.get();
            next.setStatus(WorkflowStep.StepStatus.RUNNING);
            next.setStartedAt(LocalDateTime.now());
            if (next.getType() == WorkflowStep.StepType.HUMAN_APPROVAL) {
                workflow.setStatus(Workflow.WorkflowStatus.WAITING_APPROVAL);
            }
        } else {
            // All steps done
            workflow.setStatus(Workflow.WorkflowStatus.COMPLETED);
            workflow.setCompletedAt(LocalDateTime.now());
            workflow.setCurrentStep(workflow.getTotalSteps());
            recordEvent(workflow, "COMPLETED", Workflow.WorkflowStatus.RUNNING,
                    Workflow.WorkflowStatus.COMPLETED, actorId, actorEmail, "All steps completed");
        }
    }

    @Async
    protected void executeNextStep(Workflow workflow) {
        // Simulate async step execution
        workflow.getSteps().stream()
                .filter(s -> s.getStatus() == WorkflowStep.StepStatus.RUNNING &&
                             s.getType() == WorkflowStep.StepType.AUTOMATED_TASK)
                .findFirst()
                .ifPresent(step -> {
                    log.info("Executing automated step: {} for workflow: {}", step.getName(), workflow.getId());
                    // In real scenario, dispatch to execution engine
                });
    }

    private void validateTransition(Workflow.WorkflowStatus from, Workflow.WorkflowStatus to) {
        Map<Workflow.WorkflowStatus, List<Workflow.WorkflowStatus>> allowed = Map.of(
                Workflow.WorkflowStatus.PENDING, List.of(Workflow.WorkflowStatus.RUNNING, Workflow.WorkflowStatus.CANCELLED),
                Workflow.WorkflowStatus.RUNNING, List.of(Workflow.WorkflowStatus.PAUSED, Workflow.WorkflowStatus.COMPLETED,
                        Workflow.WorkflowStatus.FAILED, Workflow.WorkflowStatus.CANCELLED, Workflow.WorkflowStatus.WAITING_APPROVAL),
                Workflow.WorkflowStatus.PAUSED, List.of(Workflow.WorkflowStatus.RUNNING, Workflow.WorkflowStatus.CANCELLED),
                Workflow.WorkflowStatus.FAILED, List.of(Workflow.WorkflowStatus.RUNNING, Workflow.WorkflowStatus.CANCELLED),
                Workflow.WorkflowStatus.WAITING_APPROVAL, List.of(Workflow.WorkflowStatus.RUNNING, Workflow.WorkflowStatus.CANCELLED)
        );

        List<Workflow.WorkflowStatus> allowedTransitions = allowed.getOrDefault(from, List.of());
        if (!allowedTransitions.contains(to)) {
            throw new IllegalStateException("Invalid transition: " + from + " -> " + to);
        }
    }

    private void recordEvent(Workflow workflow, String eventType, Workflow.WorkflowStatus fromStatus,
                              Workflow.WorkflowStatus toStatus, String actorId, String actorEmail, String message) {
        WorkflowEvent event = WorkflowEvent.builder()
                .workflow(workflow)
                .eventType(eventType)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .actorId(actorId)
                .actorEmail(actorEmail)
                .message(message)
                .build();
        workflow.getEvents().add(event);
    }

    private void broadcastUpdate(Workflow workflow) {
        try {
            Map<String, Object> update = Map.of(
                    "type", "WORKFLOW_UPDATE",
                    "workflowId", workflow.getId().toString(),
                    "status", workflow.getStatus().name(),
                    "name", workflow.getName(),
                    "currentStep", workflow.getCurrentStep() != null ? workflow.getCurrentStep() : 0,
                    "totalSteps", workflow.getTotalSteps() != null ? workflow.getTotalSteps() : 0,
                    "timestamp", LocalDateTime.now().toString()
            );
            String message = objectMapper.writeValueAsString(update);
            webSocketHandler.broadcastToAll(message);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize WebSocket message", e);
        }
    }

    private Workflow getWorkflowOrThrow(UUID id) {
        return workflowRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Workflow not found: " + id));
    }
}
