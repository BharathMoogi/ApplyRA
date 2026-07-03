"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword } from "@/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, null);

  if (state?.success) {
    return (
      <Card className="w-full max-w-md shadow-lg border-muted/50 bg-card/90 animate-in fade-in-50 duration-300">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Password Reset Complete</CardTitle>
          <CardDescription>
            Your password has been successfully updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          You can now sign in to your AI Job Agent account with your new password.
        </CardContent>
        <CardFooter>
          <Link href="/login" className={cn(buttonVariants({ className: "w-full" }))}>
            Go to Sign In
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-muted/50 backdrop-blur-sm bg-card/90">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          Enter a new password for your account below
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4 animate-in fade-in-50">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              disabled={isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Need to go back?{" "}
          <Link href="/login" className="text-primary hover:underline underline-offset-4 font-medium">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
