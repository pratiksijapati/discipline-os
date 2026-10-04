"""Django admin forms. The built-in ones assume a 'username' field, which our User doesn't have."""

from django.contrib.auth.forms import AdminUserCreationForm, UserChangeForm

from .models import User, normalize_login_email


class UserCreateForm(AdminUserCreationForm):
    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "timezone")

    def clean_email(self):
        return normalize_login_email(self.cleaned_data["email"])


class UserEditForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"
        field_classes = {}

    def clean_email(self):
        return normalize_login_email(self.cleaned_data["email"])
