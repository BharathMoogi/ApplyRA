import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { navConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden md:flex items-center gap-6">
            {navConfig.mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Login
            </Link>
            <Link
              href="/register"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
