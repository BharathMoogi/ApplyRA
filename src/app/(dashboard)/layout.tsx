import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { HeaderNotifications } from "@/components/layout/header-notifications";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { syncUserProfile } from "@/lib/profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Ensure user profile is synced in public schema
  await syncUserProfile(
    user.id,
    user.user_metadata?.full_name || user.user_metadata?.name || null,
    user.user_metadata?.avatar_url || null
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
          <MobileNav />
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <HeaderNotifications />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
