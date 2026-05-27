from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import WorkflowUser, Role, UserRole, AuditLog
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer, CreateUserSerializer,
    RoleSerializer, UserRoleSerializer, AuditLogSerializer
)


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = WorkflowUser.objects.get(email=request.data.get('email'))
            AuditLog.objects.create(
                user=user,
                action='LOGIN',
                resource_type='AUTH',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                payload={'method': 'email_password'},
            )
        return response


class UserViewSet(viewsets.ModelViewSet):
    queryset = WorkflowUser.objects.all().prefetch_related('user_roles__role')
    permission_classes = [AllowAny]  # Use IsAuthenticated in production

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserSerializer
        return UserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        department = self.request.query_params.get('department')
        is_active = self.request.query_params.get('is_active')
        role = self.request.query_params.get('role')
        if department:
            qs = qs.filter(department=department)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        if role:
            qs = qs.filter(user_roles__role__name=role)
        return qs


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [AllowAny]


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_token(request):
    """Validate a JWT token — called by other services to verify auth."""
    token_str = request.data.get('token') or request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token_str:
        return Response({'valid': False, 'error': 'No token provided'}, status=400)
    try:
        token = UntypedToken(token_str)
        user_id = token.payload.get('user_id')
        email = token.payload.get('email')
        roles = token.payload.get('roles', [])
        return Response({
            'valid': True,
            'user_id': str(user_id),
            'email': email,
            'roles': roles,
        })
    except (InvalidToken, TokenError) as e:
        return Response({'valid': False, 'error': str(e)}, status=401)


@api_view(['GET'])
@permission_classes([AllowAny])
def me(request):
    """Return current user's profile."""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=401)
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def assign_role(request, user_id):
    """Assign a role to a user."""
    try:
        user = WorkflowUser.objects.get(id=user_id)
        role = Role.objects.get(name=request.data.get('role'))
        user_role, created = UserRole.objects.get_or_create(user=user, role=role)
        return Response({
            'message': f"Role {role.name} {'assigned' if created else 'already assigned'} to {user.email}",
            'created': created,
        })
    except WorkflowUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    except Role.DoesNotExist:
        return Response({'error': 'Role not found'}, status=404)


@api_view(['GET'])
@permission_classes([AllowAny])
def check_permission(request):
    """Check if a user has a specific permission."""
    user_id = request.query_params.get('user_id')
    resource = request.query_params.get('resource')
    action = request.query_params.get('action')

    try:
        user = WorkflowUser.objects.get(id=user_id)
        roles = [ur.role for ur in user.user_roles.select_related('role').all()]
        role_names = [r.name for r in roles]
        has_permission = 'ADMIN' in role_names  # Admins have all permissions
        if not has_permission:
            for role in roles:
                perms = role.permissions or []
                if f"{resource}:{action}" in perms or f"{resource}:*" in perms:
                    has_permission = True
                    break
        return Response({'has_permission': has_permission, 'roles': role_names})
    except WorkflowUser.DoesNotExist:
        return Response({'has_permission': False, 'error': 'User not found'}, status=404)


class AuditLogListView(generics.ListAPIView):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        action = self.request.query_params.get('action')
        if user_id:
            qs = qs.filter(user_id=user_id)
        if action:
            qs = qs.filter(action=action)
        return qs


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return Response({'status': 'UP', 'service': 'auth-service', 'timestamp': timezone.now().isoformat()})
