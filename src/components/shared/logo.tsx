import Link from "next/link";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
        <Bot className="h-5 w-5" />
      </div>
      {showText && (
        <span className="font-bold text-lg tracking-tight">
          Applyra
        </span>
      )}
    </Link>
  );
}
