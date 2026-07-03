import type { User } from "@supabase/supabase-js";

export type AuthUser = User;

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  fullName: string;
}
