import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUserProfile } from "@/lib/profile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Sync Google/OAuth user info to the public profiles table
      const user = data.user;
      await syncUserProfile(
        user.id,
        user.user_metadata?.full_name || user.user_metadata?.name || null,
        user.user_metadata?.avatar_url || null
      );
      
      // If we are resetting password, we need the session to update password
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
