from django.contrib.auth.models import update_last_login
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenBlacklistView, TokenObtainPairView, TokenRefreshView

from .models import UserSettings
from .serializers import ChangePasswordSerializer, RegisterSerializer, UserSerializer, UserSettingsSerializer
from .tokens import revoke_all_refresh_tokens, tokens_for_user


class RegisterView(generics.CreateAPIView):
    """POST email, password, first_name → creates the account and logs in."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        update_last_login(None, user)
        return Response({**tokens_for_user(user), "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    """POST email + password → {access, refresh, user}."""

    serializer_class = LoginSerializer
    throttle_scope = "auth"


class RefreshView(TokenRefreshView):
    """POST refresh → {access, refresh}. The old refresh token is blacklisted (rotation)."""

    throttle_scope = "auth_refresh"


class LogoutView(TokenBlacklistView):
    """POST refresh → blacklists it. Works even if the access token has already expired."""


class MeView(generics.RetrieveUpdateAPIView):
    """GET / PATCH the logged-in user's profile."""

    serializer_class = UserSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """POST current_password + new_password. Logs out other devices, returns fresh tokens."""

    throttle_scope = "auth"

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        revoke_all_refresh_tokens(user)
        return Response({"detail": "Password changed.", **tokens_for_user(user)})


class UserSettingsView(generics.RetrieveUpdateAPIView):
    """GET / PATCH the logged-in user's preferences."""

    serializer_class = UserSettingsSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return UserSettings.for_user(self.request.user)
