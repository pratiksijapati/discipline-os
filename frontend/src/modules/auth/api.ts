import { api } from "../../api/client";
import type {
  AuthResponse,
  AuthTokens,
  ChangePasswordPayload,
  LoginPayload,
  ProfileUpdate,
  RegisterPayload,
  User,
} from "../../types/auth";

export const authApi = {
  login: (payload: LoginPayload) => api.post<AuthResponse>("/auth/login/", payload).then((r) => r.data),

  register: (payload: RegisterPayload) => api.post<AuthResponse>("/auth/register/", payload).then((r) => r.data),

  me: () => api.get<User>("/auth/me/").then((r) => r.data),

  updateMe: (payload: ProfileUpdate) => api.patch<User>("/auth/me/", payload).then((r) => r.data),

  logout: (refresh: string) => api.post("/auth/logout/", { refresh }),

  changePassword: (payload: ChangePasswordPayload) =>
    api.post<AuthTokens & { detail: string }>("/auth/change-password/", payload).then((r) => r.data),
};
