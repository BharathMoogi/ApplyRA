"use client";

import { useActionState } from "react";
import Link from "next/link";
import { sendPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(sendPasswordReset, null);

  return (
    <Card className="w-full max-w-md shadow-lg border-muted/50 backdrop-blur-sm bg-card/90">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
        <CardDescription>
          Enter your email address and we will send you a password reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4 animate-in fade-in-50">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}
        {state?.success && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 p-3 rounded-lg mb-4 animate-in fade-in-50">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p>{state.message}</p>
          </div>
        )}
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              disabled={isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="text-primary hover:underline underline-offset-4 font-medium">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
