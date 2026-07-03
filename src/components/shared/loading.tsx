import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  className?: string;
  text?: string;
}

export function Loading({ className, text = "Loading..." }: LoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
