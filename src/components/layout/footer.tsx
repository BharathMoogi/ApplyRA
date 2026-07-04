import { Logo } from "@/components/shared/logo";

export function Footer() {
  return (
    <footer className="border-t py-8">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:flex-row">
        <Logo showText={false} />
        <p className="text-sm text-muted-foreground flex flex-col sm:flex-row items-center gap-1.5 leading-none">
          <span>&copy; {new Date().getFullYear()} Applyra. All rights reserved.</span>
          <span className="hidden sm:inline text-muted-foreground/30">|</span>
          <span>Founded by <span className="font-bold text-foreground">Moogi Bharath</span></span>
        </p>
      </div>
    </footer>
  );
}
