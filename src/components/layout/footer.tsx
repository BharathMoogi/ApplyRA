import { Logo } from "@/components/shared/logo";

export function Footer() {
  return (
    <footer className="border-t py-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <Logo showText={false} />
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} AI Job Agent. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
