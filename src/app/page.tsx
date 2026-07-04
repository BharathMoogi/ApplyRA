import Link from "next/link";
import { ArrowRight, Bot, Briefcase, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto flex flex-col items-center justify-center gap-6 pb-8 pt-16 md:pt-24 lg:pt-32">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium">
            <span className="mr-2">🚀</span>
            <span>AI-Powered Job Application Automation</span>
          </div>

          <h1 className="max-w-5xl text-center text-3xl font-black tracking-widest sm:text-4xl md:text-5xl lg:text-6xl uppercase font-mono leading-tight">
            LAND YOUR DREAM JOB WITH{" "}
            <span className="bg-gradient-to-r from-primary via-emerald-400 to-accent bg-clip-text text-transparent">
              APPLYRA
            </span>
          </h1>

          <p className="max-w-2xl text-center text-lg text-muted-foreground sm:text-xl">
            Automate your job search, track applications, generate tailored
            resumes, and let AI handle the repetitive work so you can focus on
            what matters.
          </p>

          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted/40 border border-muted/50 rounded-full px-4 py-1.5 transition-transform hover:scale-105 duration-300">
            Founded by <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-black">Moogi Bharath</span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/register"
              className={cn(buttonVariants({ size: "lg" }), "gap-2 hover:bg-accent hover:text-accent-foreground border-transparent transition-all")}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "hover:bg-accent/5 hover:text-accent border-muted-foreground/20")}
            >
              Sign In
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto py-16 md:py-24">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
            Everything you need to automate your job search
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={Bot}
              title="AI-Powered Automation"
              description="Let our AI agent handle job applications, follow-ups, and responses automatically."
            />
            <FeatureCard
              icon={Briefcase}
              title="Application Tracking"
              description="Track every application from submission to offer with a beautiful, intuitive dashboard."
            />
            <FeatureCard
              icon={Zap}
              title="Smart Resume Builder"
              description="Generate tailored resumes and cover letters optimized for each job listing."
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative rounded-xl border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:border-accent/30 hover:-translate-y-1">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent transition-all duration-300 group-hover:bg-accent group-hover:text-accent-foreground">
        <Icon className="h-6 w-6 animate-pulse group-hover:animate-none" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
