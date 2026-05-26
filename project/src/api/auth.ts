import { apiRequest } from "./client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  cellNumber: string;
  hospital?: string;
  sancNr: string;
  role: string;
  password: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  hospital: string;
  sancNr: string;
}

export interface AuthUser {
  id?: string | number;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  [key: string]: unknown;
}

export interface RegisterResponse {
  message?: string;
  user?: AuthUser;
  [key: string]: unknown;
}

export interface MeResponse {
  user?: AuthUser;
  [key: string]: unknown;
}

export interface HealthResponse {
  status?: string;
  message?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface UpdateProfileResponse {
  id?: string | number;
  fullName?: string;
  email?: string;
  role?: string;
  phone?: string;
  hospital?: string;
  sancNr?: string;
  message?: string;
}

export const authApi = {
  login(payload: LoginRequest) {
    return apiRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  register(payload: RegisterRequest) {
    return apiRequest<RegisterResponse>("/api/auth/register", {
      method: "POST",
      body: payload,
    });
  },

  me(token: string) {
    return apiRequest<MeResponse>("/api/auth/me", { token });
  },

  health() {
    return apiRequest<HealthResponse>("/api/auth/health");
  },

  updateProfile(payload: UpdateProfileRequest, token: string) {
    return apiRequest<UpdateProfileResponse>("/api/auth/profile", {
      method: "PUT",
      body: payload,
      token,
    });
  },
};