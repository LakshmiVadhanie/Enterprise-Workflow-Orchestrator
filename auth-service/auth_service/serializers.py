from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import WorkflowUser, Role, UserRole, Permission, AuditLog


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['username'] = user.username
        token['department'] = user.department
        token['roles'] = [ur.role.name for ur in user.user_roles.select_related('role').all()]
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = {
            'id': str(user.id),
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'department': user.department,
            'job_title': user.job_title,
            'avatar_url': user.avatar_url,
            'roles': [ur.role.name for ur in user.user_roles.select_related('role').all()],
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowUser
        fields = ['id', 'email', 'username', 'first_name', 'last_name',
                  'full_name', 'department', 'job_title', 'avatar_url',
                  'is_active', 'created_at', 'updated_at', 'roles']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_roles(self, obj):
        return [ur.role.name for ur in obj.user_roles.select_related('role').all()]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    roles = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    class Meta:
        model = WorkflowUser
        fields = ['email', 'username', 'password', 'first_name', 'last_name',
                  'department', 'job_title', 'roles']

    def create(self, validated_data):
        roles_data = validated_data.pop('roles', [])
        user = WorkflowUser.objects.create_user(**validated_data)
        for role_name in roles_data:
            try:
                role = Role.objects.get(name=role_name)
                UserRole.objects.create(user=user, role=role)
            except Role.DoesNotExist:
                pass
        return user


class RoleSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'user_count', 'created_at']

    def get_user_count(self, obj):
        return obj.user_roles.count()


class UserRoleSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UserRole
        fields = ['id', 'user', 'user_email', 'role', 'role_name', 'granted_at', 'expires_at']


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'resource', 'action', 'roles']


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True, default='system')

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_email', 'action', 'resource_type',
                  'resource_id', 'ip_address', 'payload', 'created_at']


class ValidateTokenSerializer(serializers.Serializer):
    token = serializers.CharField()
    user_id = serializers.CharField(read_only=True)
    email = serializers.CharField(read_only=True)
    roles = serializers.ListField(read_only=True)
    valid = serializers.BooleanField(read_only=True)
