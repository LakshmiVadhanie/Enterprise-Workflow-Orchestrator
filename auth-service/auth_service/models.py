import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class WorkflowUser(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    department = models.CharField(max_length=100, blank=True)
    job_title = models.CharField(max_length=100, blank=True)
    avatar_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'workflow_users'
        verbose_name = 'Workflow User'

    def __str__(self):
        return self.email


class Role(models.Model):
    ROLE_CHOICES = [
        ('ADMIN', 'Administrator'),
        ('MANAGER', 'Manager'),
        ('ANALYST', 'Analyst'),
        ('VIEWER', 'Viewer'),
        ('APPROVER', 'Approver'),
        ('DEVELOPER', 'Developer'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'roles'

    def __str__(self):
        return self.name


class UserRole(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(WorkflowUser, on_delete=models.CASCADE, related_name='user_roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='user_roles')
    granted_by = models.ForeignKey(WorkflowUser, on_delete=models.SET_NULL, null=True, related_name='granted_roles')
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'user_roles'
        unique_together = ('user', 'role')

    def __str__(self):
        return f"{self.user.email} -> {self.role.name}"


class Permission(models.Model):
    RESOURCE_CHOICES = [
        ('WORKFLOW', 'Workflow'),
        ('STEP', 'Step'),
        ('USER', 'User'),
        ('ROLE', 'Role'),
        ('REPORT', 'Report'),
        ('SETTINGS', 'Settings'),
    ]
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('READ', 'Read'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('APPROVE', 'Approve'),
        ('EXECUTE', 'Execute'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resource = models.CharField(max_length=50, choices=RESOURCE_CHOICES)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    roles = models.ManyToManyField(Role, related_name='role_permissions', blank=True)

    class Meta:
        db_table = 'permissions'
        unique_together = ('resource', 'action')

    def __str__(self):
        return f"{self.resource}:{self.action}"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(WorkflowUser, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} - {self.action} on {self.resource_type}"
