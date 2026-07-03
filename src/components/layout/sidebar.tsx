"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { dashboardNav } from "@/config/dashboard";
import { Badge } from "@/components/ui/badge";
import { logout } from "@/actions/auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-muted/40">
      <div className="flex h-16 items-center border-b px-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {dashboardNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                item.disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
              {item.badge && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t p-4 flex flex-col gap-2 bg-background/50">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary overflow-hidden border shrink-0">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                (user.user_metadata?.full_name || user.email || "?")[0].toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate leading-none mb-1">
                {user.user_metadata?.full_name || "User"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate leading-none">
                {user.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground gap-2 h-9"
            onClick={async () => {
              await logout();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      )}
    </aside>
  );
}
