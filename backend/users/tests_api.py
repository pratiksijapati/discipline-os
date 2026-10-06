from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import User

STRONG = "Steady-Morning-42"


class AuthApiTests(APITestCase):
    def setUp(self):
        cache.clear()  # reset login throttling between tests
        self.user = User.objects.create_user(email="pratik@example.com", password=STRONG, first_name="Pratik")

    def login(self, email="pratik@example.com", password=STRONG):
        return self.client.post(reverse("auth-login"), {"email": email, "password": password}, format="json")

    def auth(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    # ---------- register ----------

    def test_register_returns_tokens_and_user(self):
        res = self.client.post(
            reverse("auth-register"),
            {"email": "New@Example.com", "password": STRONG, "first_name": "Dikshya"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["email"], "new@example.com")
        self.assertEqual(res.data["user"]["timezone"], "Asia/Kathmandu")
        self.assertEqual(res.data["user"]["settings"]["theme"], "system")

    def test_new_account_starts_setup_and_can_finish_it(self):
        res = self.client.post(
            reverse("auth-register"),
            {"email": "fresh@example.com", "password": STRONG, "first_name": "Fresh"},
            format="json",
        )
        self.assertFalse(res.data["user"]["settings"]["onboarding_completed"])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        res = self.client.patch(reverse("user-settings"), {"onboarding_completed": True}, format="json")
        self.assertTrue(res.data["onboarding_completed"])
        self.assertTrue(self.client.get(reverse("auth-me")).data["settings"]["onboarding_completed"])

    def test_register_duplicate_email_is_case_insensitive(self):
        res = self.client.post(
            reverse("auth-register"),
            {"email": "PRATIK@example.com", "password": STRONG, "first_name": "X"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.data["errors"])

    def test_register_rejects_weak_password_with_consistent_error_shape(self):
        res = self.client.post(
            reverse("auth-register"),
            {"email": "weak@example.com", "password": "123", "first_name": "W"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("detail", res.data)
        self.assertIn("password", res.data["errors"])

    def test_register_rejects_invalid_timezone(self):
        res = self.client.post(
            reverse("auth-register"),
            {"email": "tz@example.com", "password": STRONG, "first_name": "T", "timezone": "Mars/Base"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("timezone", res.data["errors"])

    # ---------- login ----------

    def test_login_with_any_email_case(self):
        res = self.login(email="  PRATIK@Example.COM")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["user"]["first_name"], "Pratik")

    def test_login_wrong_password(self):
        res = self.login(password="wrong-password")
        self.assertEqual(res.status_code, 401)
        self.assertIn("detail", res.data)

    # ---------- me ----------

    def test_me_requires_authentication(self):
        res = self.client.get(reverse("auth-me"))
        self.assertEqual(res.status_code, 401)

    def test_me_get_and_patch(self):
        self.auth(self.login().data["access"])
        res = self.client.get(reverse("auth-me"))
        self.assertEqual(res.data["email"], "pratik@example.com")

        res = self.client.patch(reverse("auth-me"), {"last_name": "Sijapati", "email": "hack@x.com"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["last_name"], "Sijapati")
        self.assertEqual(res.data["email"], "pratik@example.com")  # email is read-only

        res = self.client.patch(reverse("auth-me"), {"timezone": "Not/AZone"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_settings_patch(self):
        self.auth(self.login().data["access"])
        res = self.client.patch(reverse("user-settings"), {"theme": "dark"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["theme"], "dark")
        self.assertEqual(self.client.get(reverse("auth-me")).data["settings"]["theme"], "dark")

    # ---------- refresh / logout ----------

    def test_refresh_rotates_and_old_token_stops_working(self):
        old_refresh = self.login().data["refresh"]
        res = self.client.post(reverse("auth-refresh"), {"refresh": old_refresh}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertNotEqual(res.data["refresh"], old_refresh)

        res = self.client.post(reverse("auth-refresh"), {"refresh": old_refresh}, format="json")
        self.assertEqual(res.status_code, 401)

    def test_refresh_for_a_deleted_account_is_401_not_a_crash(self):
        refresh = self.login().data["refresh"]
        User.objects.get(email="pratik@example.com").delete()
        res = self.client.post(reverse("auth-refresh"), {"refresh": refresh}, format="json")
        self.assertEqual(res.status_code, 401)
        self.assertIn("log in again", res.data["detail"])

    def test_logout_blacklists_refresh(self):
        refresh = self.login().data["refresh"]
        res = self.client.post(reverse("auth-logout"), {"refresh": refresh}, format="json")
        self.assertEqual(res.status_code, 200)
        res = self.client.post(reverse("auth-refresh"), {"refresh": refresh}, format="json")
        self.assertEqual(res.status_code, 401)

    # ---------- change password ----------

    def test_change_password_wrong_current(self):
        self.auth(self.login().data["access"])
        res = self.client.post(
            reverse("auth-change-password"),
            {"current_password": "nope", "new_password": "Another-Strong-77"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("current_password", res.data["errors"])

    def test_change_password_logs_out_other_devices(self):
        other_device = self.login().data["refresh"]
        self.auth(self.login().data["access"])
        res = self.client.post(
            reverse("auth-change-password"),
            {"current_password": STRONG, "new_password": "Another-Strong-77"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("refresh", res.data)

        # The old device's refresh token no longer works…
        res = self.client.post(reverse("auth-refresh"), {"refresh": other_device}, format="json")
        self.assertEqual(res.status_code, 401)
        # …and the new password does.
        self.client.credentials()
        self.assertEqual(self.login(password="Another-Strong-77").status_code, 200)
