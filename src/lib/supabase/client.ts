import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isValidUrl = url && (url.startsWith("http://") || url.startsWith("https://"));
  const supabaseUrl = isValidUrl ? url : "https://placeholder.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient(supabaseUrl, supabaseKey);
}
