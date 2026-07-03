"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncUserProfile } from "@/lib/profile";

export interface ActionState {
  error: string | null;
  success: boolean;
  message?: string | null;
}

export async function login(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required.", success: false };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  if (data.user) {
    await syncUserProfile(
      data.user.id,
      data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
      data.user.user_metadata?.avatar_url || null
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function register(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  if (!email || !password || !fullName) {
    return { error: "All fields are required.", success: false };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message, success: false };
  }

  if (data.user) {
    await syncUserProfile(
      data.user.id,
      fullName,
      data.user.user_metadata?.avatar_url || null
    );
  }

  // Supabase sign-up might require email verification depending on project config.
  // If email confirmation is enabled, user may not have an active session yet.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  } else {
    return {
      error: null,
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
    };
  }
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function sendPasswordReset(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required.", success: false };
  }

  // Get site origin URL to dynamic reset callback redirect
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return {
    error: null,
    success: true,
    message: "Password reset link sent! Check your inbox.",
  };
}

export async function updatePassword(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "Both password fields are required.", success: false };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", success: false };
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return {
    error: null,
    success: true,
    message: "Password updated successfully. You can now log in.",
  };
}
