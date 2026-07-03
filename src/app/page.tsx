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
        <section className="container flex flex-col items-center justify-center gap-6 pb-8 pt-16 md:pt-24 lg:pt-32">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium">
            <span className="mr-2">🚀</span>
            <span>AI-Powered Job Application Automation</span>
          </div>

          <h1 className="max-w-4xl text-center text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Land your dream job with{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              AI Job Agent
            </span>
          </h1>

          <p className="max-w-2xl text-center text-lg text-muted-foreground sm:text-xl">
            Automate your job search, track applications, generate tailored
            resumes, and let AI handle the repetitive work so you can focus on
            what matters.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/register"
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              Sign In
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container py-16 md:py-24">
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
    <div className="group relative rounded-xl border bg-card p-6 transition-shadow hover:shadow-lg">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/10 to-indigo-600/10 text-violet-600 dark:text-violet-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
