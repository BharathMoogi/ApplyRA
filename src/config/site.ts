export const siteConfig = {
  name: "Applyra",
  description:
    "AI-powered job application automation platform. Streamline your job search with intelligent automation.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    github: "https://github.com/yourusername/ai-job-agent",
  },
  creator: "Applyra Team",
  keywords: [
    "AI",
    "job application",
    "automation",
    "job search",
    "career",
    "resume",
    "cover letter",
  ],
} as const;

export const navConfig = {
  mainNav: [
    { title: "Features", href: "/#features" },
    { title: "Pricing", href: "/#pricing" },
    { title: "About", href: "/#about" },
  ],
  authNav: [
    { title: "Login", href: "/login" },
    { title: "Sign Up", href: "/register" },
  ],
} as const;
