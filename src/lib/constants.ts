export const APP_NAME = "Applyra";
export const APP_DESCRIPTION =
  "AI-powered job application automation platform";

export const AUTH_ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  CALLBACK: "/callback",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
} as const;

export const PROTECTED_ROUTES = {
  DASHBOARD: "/dashboard",
  APPLICATIONS: "/applications",
  PROFILE: "/profile",
  SETTINGS: "/settings",
} as const;

export const PUBLIC_ROUTES = [
  "/",
  AUTH_ROUTES.LOGIN,
  AUTH_ROUTES.REGISTER,
  AUTH_ROUTES.CALLBACK,
  AUTH_ROUTES.FORGOT_PASSWORD,
  AUTH_ROUTES.RESET_PASSWORD,
] as const;
