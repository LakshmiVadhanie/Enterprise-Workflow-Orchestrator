from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='users')
router.register(r'roles', views.RoleViewSet, basename='roles')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include([
        path('auth/login/', views.LoginView.as_view(), name='login'),
        path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
        path('auth/validate/', views.validate_token, name='validate_token'),
        path('auth/me/', views.me, name='me'),
        path('users/<uuid:user_id>/assign-role/', views.assign_role, name='assign_role'),
        path('permissions/check/', views.check_permission, name='check_permission'),
        path('audit-logs/', views.AuditLogListView.as_view(), name='audit_logs'),
        path('health/', views.health, name='health'),
        path('schema/', SpectacularAPIView.as_view(), name='schema'),
        path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('', include(router.urls)),
    ])),
]
