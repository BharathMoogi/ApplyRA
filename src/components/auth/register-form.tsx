"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { register } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(register, null);
  const isFormDisabled = isPending;

  return (
    <Card className="w-full max-w-md shadow-lg border-muted/50 backdrop-blur-sm bg-card/90">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Enter your details to get started with AI Job Agent
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4 animate-in fade-in-50">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}
        {state?.success && state?.message && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 p-3 rounded-lg mb-4 animate-in fade-in-50">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p>{state.message}</p>
          </div>
        )}
        
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="John Doe"
              required
              disabled={isFormDisabled}
            />
          </div>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              disabled={isFormDisabled}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isFormDisabled}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>


      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
