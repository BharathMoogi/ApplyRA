import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
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
        onAuthStateChange: (callback: any) => {
          callback("SIGNED_IN", { user: { id: "mock-user-id", email: "mock@example.com" } });
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signOut: async () => ({ error: null })
      }
    } as any;
  }

  const supabaseUrl = url;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return createBrowserClient(supabaseUrl, supabaseKey);
}
