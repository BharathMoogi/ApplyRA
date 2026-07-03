import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = {
  title: "Login | AI Job Agent",
  description: "Sign in to your AI Job Agent account",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <Logo />
      <LoginForm />
    </div>
  );
}
