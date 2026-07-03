import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = {
  title: "Forgot Password | AI Job Agent",
  description: "Reset your AI Job Agent account password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <Logo />
      <ForgotPasswordForm />
    </div>
  );
}
