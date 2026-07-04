import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 transition-transform hover:scale-105 duration-300 overflow-hidden shrink-0">
        <Image
          src="/applyra-logo.png"
          alt="Applyra Logo"
          width={36}
          height={36}
          className="object-contain"
        />
      </div>
      {showText && (
        <span className="font-heading font-extrabold text-lg tracking-tight text-foreground flex items-center">
          Apply<span className="text-accent">ra</span>
        </span>
      )}
    </Link>
  );
}
