"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { login } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2 } from "lucide-react";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, null);
  const [isGooglePending, setIsGooglePending] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGooglePending(true);
    const supabase = createClient();
    const origin = window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/callback`,
      },
    });

    if (error) {
      console.error("Google login error:", error.message);
      setIsGooglePending(false);
    }
  };

  const isFormDisabled = isPending || isGooglePending;

  return (
    <Card className="w-full max-w-md shadow-lg border-muted/50 backdrop-blur-sm bg-card/90">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>
          Enter your credentials to sign in to your account
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              disabled={isFormDisabled}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isFormDisabled}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isFormDisabled}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={isFormDisabled}
        >
          {isGooglePending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.339 0 3.398 2.68 1.488 6.577l3.778 3.188z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.272 0 6.014-1.082 8.02-2.927l-3.882-3.11c-1.127.755-2.564 1.21-4.138 1.21-3.19 0-5.89-2.155-6.855-5.064L1.356 17.29A11.968 11.968 0 0 0 12 24z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.273c0-.818-.073-1.609-.208-2.373H12v4.582h6.445c-.277 1.486-1.11 2.745-2.373 3.59l3.882 3.11C22.218 19.345 23.49 16.127 23.49 12.273z"
              />
              <path
                fill="#FBBC05"
                d="M5.145 14.818A7.126 7.126 0 0 1 4.773 12c0-.982.164-1.927.464-2.818L1.47 5.99A11.97 11.97 0 0 0 0 12c0 2.218.6 4.3 1.636 6.1l3.51-2.91-1-.372z"
              />
            </svg>
          )}
          Google
        </Button>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary underline-offset-4 hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
