package com.enterprise.workflow.controller;

import com.enterprise.workflow.model.Workflow;
import com.enterprise.workflow.service.WorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/workflows")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class WorkflowController {

    private final WorkflowService workflowService;

    @PostMapping
    public ResponseEntity<Workflow> createWorkflow(@Valid @RequestBody Workflow workflow) {
        Workflow created = workflowService.createWorkflow(workflow);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<Page<Workflow>> getWorkflows(
            @RequestParam(required = false) Workflow.WorkflowStatus status,
            @RequestParam(required = false) Workflow.WorkflowType type,
            @RequestParam(required = false) String ownerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("ASC")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        PageRequest pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(workflowService.getWorkflows(status, type, ownerId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Workflow> getWorkflow(@PathVariable UUID id) {
        return ResponseEntity.ok(workflowService.getWorkflowById(id));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<Workflow> startWorkflow(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Actor-Id", defaultValue = "system") String actorId,
            @RequestHeader(value = "X-Actor-Email", defaultValue = "system@company.com") String actorEmail) {
        return ResponseEntity.ok(workflowService.startWorkflow(id, actorId, actorEmail));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<Workflow> pauseWorkflow(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Actor-Id", defaultValue = "system") String actorId,
            @RequestHeader(value = "X-Actor-Email", defaultValue = "system@company.com") String actorEmail) {
        return ResponseEntity.ok(workflowService.pauseWorkflow(id, actorId, actorEmail));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Workflow> cancelWorkflow(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-Actor-Id", defaultValue = "system") String actorId,
            @RequestHeader(value = "X-Actor-Email", defaultValue = "system@company.com") String actorEmail) {
        String reason = body.getOrDefault("reason", "Cancelled by user");
        return ResponseEntity.ok(workflowService.cancelWorkflow(id, actorId, actorEmail, reason));
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<Workflow> retryWorkflow(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Actor-Id", defaultValue = "system") String actorId,
            @RequestHeader(value = "X-Actor-Email", defaultValue = "system@company.com") String actorEmail) {
        return ResponseEntity.ok(workflowService.retryWorkflow(id, actorId, actorEmail));
    }

    @PostMapping("/{workflowId}/steps/{stepId}/approve")
    public ResponseEntity<Workflow> approveStep(
            @PathVariable UUID workflowId,
            @PathVariable UUID stepId,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-Actor-Id", defaultValue = "system") String actorId,
            @RequestHeader(value = "X-Actor-Email", defaultValue = "system@company.com") String actorEmail) {
        String comment = body.getOrDefault("comment", "Approved");
        return ResponseEntity.ok(workflowService.approveStep(workflowId, stepId, actorId, actorEmail, comment));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        return ResponseEntity.ok(workflowService.getDashboardStats());
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "workflow-service"));
    }
}
