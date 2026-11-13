import type { JobConnector, RawJobListing, JobSearchFilters } from "../types";

export const MOCK_JOB_LISTINGS: RawJobListing[] = [
  {
    id: "job-1",
    title: "Senior Frontend Engineer",
    company: "Vercel",
    location: "San Francisco, CA",
    salary: "$140,000 - $180,000",
    experience: "Senior",
    experienceYears: "5+ yrs",
    workMode: "Remote",
    remote: true,
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
    description: "We are looking for a Senior Frontend Engineer to help us build the future of the Web. You will design, develop, and deploy highly performant web applications using Next.js and Vercel. Ideal candidates have deep expertise in React internals, performance rendering, and web standards.",
    postedAt: "2 hours ago",
    source: "GitHub Jobs",
    jobUrl: "https://vercel.com/careers/senior-frontend-engineer",
  },
  {
    id: "job-2",
    title: "AI Integration Lead",
    company: "OpenAI",
    location: "San Francisco, CA",
    salary: "$200,000 - $250,000",
    experience: "Lead",
    experienceYears: "8+ yrs",
    workMode: "On-site",
    remote: false,
    skills: ["Python", "Node.js", "TypeScript", "LLMs", "OpenAI API"],
    description: "Join the team building state-of-the-art AI technologies. In this role, you will lead the integration of language models into developer APIs and consumer platforms. Experience with NLP pipelines, vector databases, and multi-agent coordination is highly desired.",
    postedAt: "1 day ago",
    source: "LinkedIn",
    jobUrl: "https://openai.com/careers/ai-integration-lead",
  },
  {
    id: "job-3",
    title: "Full Stack Developer",
    company: "Supabase",
    location: "Singapore",
    salary: "$110,000 - $140,000",
    experience: "Mid",
    experienceYears: "3-5 yrs",
    workMode: "Remote",
    remote: true,
    skills: ["React", "TypeScript", "PostgreSQL", "Supabase", "Go"],
    description: "Supabase is an open-source Firebase alternative. We are seeking a Full Stack Developer to enhance our Dashboard UI and core backend integrations. You will work extensively with PostgreSQL, Go APIs, and React features.",
    postedAt: "2 days ago",
    source: "LinkedIn",
    jobUrl: "https://supabase.com/careers/fullstack-developer",
  },
  {
    id: "job-4",
    title: "Product Engineer",
    company: "Figma",
    location: "New York, NY",
    salary: "$130,000 - $165,000",
    experience: "Mid",
    experienceYears: "2-4 yrs",
    workMode: "Hybrid",
    remote: false,
    skills: ["React", "TypeScript", "C++", "WebGL"],
    description: "Figma is looking for a Product Engineer to build collaborative interface tools. You will implement features, improve multiplayer editor workflows, and optimize Canvas renders.",
    postedAt: "3 days ago",
    source: "Indeed",
    jobUrl: "https://figma.com/careers/product-engineer",
  },
  {
    id: "job-5",
    title: "AI & Machine Learning Engineer",
    company: "Anthropic",
    location: "San Francisco, CA",
    salary: "$190,000 - $240,000",
    experience: "Senior",
    experienceYears: "4-6 yrs",
    workMode: "Hybrid",
    remote: false,
    skills: ["Python", "PyTorch", "LLMs", "Transformers", "Distributed Systems"],
    description: "Build reliable and steering-capable AI systems. Research and deploy safety alignment techniques, fine-tuning infrastructure, and agent workflows across large clusters.",
    postedAt: "4 days ago",
    source: "LinkedIn",
    jobUrl: "https://anthropic.com/careers/ml-engineer",
  },
  {
    id: "job-6",
    title: "Generative AI Developer (Fresher / Junior)",
    company: "Scale AI",
    location: "Remote",
    salary: "$90,000 - $115,000",
    experience: "Fresher",
    experienceYears: "0-1 yr",
    workMode: "Remote",
    remote: true,
    skills: ["Python", "FastAPI", "Prompt Engineering", "LangChain", "OpenAI"],
    description: "Seeking a motivated AI Developer with strong Python fundamentals and passion for LLMs. You will help build benchmark evaluations, prompt tuning pipelines, and customer agent demos.",
    postedAt: "5 days ago",
    source: "Glassdoor",
    jobUrl: "https://scale.com/careers/junior-ai-dev",
  },
  {
    id: "job-7",
    title: "Software Engineer (Backend & Cloud)",
    company: "Datadog",
    location: "Bengaluru, Karnataka, India",
    salary: "Not Disclosed",
    experience: "Entry",
    experienceYears: "1-2 yrs",
    workMode: "Hybrid",
    remote: false,
    skills: ["Python", "Go", "Docker", "AWS", "Kubernetes"],
    description: "Join the Datadog APM ingestion team. Design high-throughput APIs capable of processing billions of distributed traces per minute.",
    postedAt: "1 week ago",
    source: "LinkedIn",
    jobUrl: "https://datadog.com/careers/software-engineer",
  },
  {
    id: "job-8",
    title: "Full Stack Engineer (AI Platforms)",
    company: "DeepMind",
    location: "London, England, United Kingdom",
    salary: "£95,000 - £125,000",
    experience: "Mid",
    experienceYears: "3-5 yrs",
    workMode: "Hybrid",
    remote: false,
    skills: ["TypeScript", "React", "Python", "GCP", "PyTorch"],
    description: "Build user-facing interfaces and experimentation platforms for advanced machine learning models at Google DeepMind London.",
    postedAt: "3 days ago",
    source: "LinkedIn",
    jobUrl: "https://deepmind.google/careers/fullstack-engineer-london",
  },
  {
    id: "job-9",
    title: "Cloud Software Engineer",
    company: "Microsoft",
    location: "Hyderabad, Telangana, India",
    salary: "₹18,00,000 - ₹28,00,000",
    experience: "Mid",
    experienceYears: "2-4 yrs",
    workMode: "Hybrid",
    remote: false,
    skills: ["C#", ".NET", "Azure", "React", "SQL"],
    description: "Join Microsoft IDC in Hyderabad. Collaborate on mission-critical Azure cloud services and enterprise infrastructure products.",
    postedAt: "2 days ago",
    source: "LinkedIn",
    jobUrl: "https://careers.microsoft.com/us/en/job/hyderabad-cloud-dev",
  },
];

export class MockJobConnector implements JobConnector {
  id = "mock";
  name = "Verified Job Network";

  isAvailable(): boolean {
    return true;
  }

  async search(query: string, filters: JobSearchFilters): Promise<RawJobListing[]> {
    let filtered = [...MOCK_JOB_LISTINGS];

    if (query) {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      filtered = filtered.filter((job) => {
        const searchableText = `${job.title} ${job.company} ${job.description} ${(job.skills || []).join(" ")}`.toLowerCase();
        return terms.some((term) => searchableText.includes(term));
      });
    }

    if (filters.location && filters.location.trim().length > 0) {
      const loc = filters.location.toLowerCase().trim();
      const segments = loc.split(",").map((s) => s.trim()).filter((s) => s.length >= 2);
      const expandedTerms = new Set<string>([loc, ...segments]);
      if (loc.includes("bengaluru") || loc.includes("bangalore")) {
        expandedTerms.add("bengaluru");
        expandedTerms.add("bangalore");
      }
      if (loc.includes("united states") || loc.includes("usa") || loc.includes("u.s.")) {
        expandedTerms.add("united states");
        expandedTerms.add("usa");
      }
      if (loc.includes("united kingdom") || loc.includes("uk") || loc.includes("u.k.")) {
        expandedTerms.add("united kingdom");
        expandedTerms.add("uk");
      }

      filtered = filtered.filter((j) => {
        const jLoc = j.location.toLowerCase();
        if (jLoc.includes(loc) || loc.includes(jLoc)) return true;
        for (const term of expandedTerms) {
          if (term.length >= 3 && jLoc.includes(term)) return true;
        }
        return false;
      });
    }

    if (filters.remote || filters.workMode === "Remote") {
      filtered = filtered.filter((j) => j.remote);
    }

    return filtered;
  }
}
