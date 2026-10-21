import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isValidUrl = url && (url.startsWith("http://") || url.startsWith("https://"));

  if (!isValidUrl || url.includes("placeholder")) {
    return {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "mock-user-id",
              email: "mock@example.com",
              user_metadata: { full_name: "Mock Developer" }
            }
          },
          error: null
        }),
        getSession: async () => ({
          data: { session: { user: { id: "mock-user-id", email: "mock@example.com" } } },
          error: null
        }),
        signOut: async () => ({ error: null })
      }
    } as any;
  }

  const cookieStore = await cookies();
  const supabaseUrl = url;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
