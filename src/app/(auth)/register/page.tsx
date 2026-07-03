import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = {
  title: "Sign Up | AI Job Agent",
  description: "Create your AI Job Agent account",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <Logo />
      <RegisterForm />
    </div>
  );
}
