import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = {
  title: "Reset Password | AI Job Agent",
  description: "Set a new password for your AI Job Agent account",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <Logo />
      <ResetPasswordForm />
    </div>
  );
}
