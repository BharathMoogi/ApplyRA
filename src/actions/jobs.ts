"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  experience: "Entry" | "Mid" | "Senior" | "Lead";
  remote: boolean;
  skills: string[];
  description: string;
  atsScore: number;
  postedAt: string;
  source: "LinkedIn" | "Indeed" | "GitHub Jobs";
  jobUrl: string;
}

// ─── Mock Database of Job Listings ──────────────────────────────────────────
const mockJobs: JobListing[] = [
  {
    id: "job-1",
    title: "Senior Frontend Engineer",
    company: "Vercel",
    location: "San Francisco, CA",
    salary: "$140,000 - $180,000",
    experience: "Senior",
    remote: true,
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
    description: "We are looking for a Senior Frontend Engineer to help us build the future of the Web. You will design, develop, and deploy highly performant web applications using Next.js and Vercel. Ideal candidates have deep expertise in React internals, performance rendering, and web standards.",
    atsScore: 92,
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
    remote: false,
    skills: ["Python", "Node.js", "TypeScript", "LLMs", "OpenAI API"],
    description: "Join the team building state-of-the-art AI technologies. In this role, you will lead the integration of language models into developer APIs and consumer platforms. Experience with NLP pipelines, vector databases, and multi-agent coordination is highly desired.",
    atsScore: 87,
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
    remote: true,
    skills: ["React", "TypeScript", "PostgreSQL", "Supabase", "Go"],
    description: "Supabase is an open-source Firebase alternative. We are seeking a Full Stack Developer to enhance our Dashboard UI and core backend integrations. You will work extensively with PostgreSQL, Go APIs, and React features. Contributing to open-source is a major part of this role.",
    atsScore: 84,
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
    remote: false,
    skills: ["React", "TypeScript", "C++", "WebGL"],
    description: "Figma is looking for a Product Engineer to build collaborative interface tools. You will implement features, improve multiplayer editor workflows, and optimize Canvas renders. Experience with graphics rendering, high-performance canvas systems, and design systems is helpful.",
    atsScore: 79,
    postedAt: "3 days ago",
    source: "Indeed",
    jobUrl: "https://figma.com/careers/product-engineer",
  },
  {
    id: "job-5",
    title: "Staff Database Engineer",
    company: "Stripe",
    location: "Seattle, WA",
    salary: "$180,000 - $220,000",
    experience: "Lead",
    remote: true,
    skills: ["PostgreSQL", "Go", "Ruby", "Prisma", "Distributed Systems"],
    description: "Stripe is the infrastructure for the internet economy. Our storage team is hiring a Database Engineer to optimize global schema migrations, replica configurations, and transaction latencies. Deep understanding of PostgreSQL engines, transaction isolation levels, and data security is crucial.",
    atsScore: 68,
    postedAt: "5 days ago",
    source: "GitHub Jobs",
    jobUrl: "https://stripe.com/careers/staff-database-engineer",
  },
  {
    id: "job-6",
    title: "React Developer (Junior)",
    company: "StartUp Inc",
    location: "Austin, TX",
    salary: "$70,000 - $90,000",
    experience: "Entry",
    remote: false,
    skills: ["React", "JavaScript", "CSS", "Git"],
    description: "Looking for an energetic Junior React Developer to help us prototype customer dashboard features. You will write clean JSX/TSX elements, integrate REST APIs, and debug frontend assets. We provide active mentorship and rapid learning structures.",
    atsScore: 71,
    postedAt: "1 week ago",
    source: "Indeed",
    jobUrl: "https://startup.com/careers/react-developer",
  },
];

// Helper to get authenticated profile
async function getAuthenticatedProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  return profile;
}

/**
 * Searches and filters mock jobs
 */
export async function searchJobs(
  query: string = "",
  filters: {
    location?: string;
    experience?: string;
    salary?: string;
    remote?: boolean;
    company?: string;
    skills?: string[];
  } = {},
  page: number = 1,
  pageSize: number = 4
) {
  try {
    let filtered = [...mockJobs];

    // Query filter (matches title, company, skills, or description)
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          job.description.toLowerCase().includes(q) ||
          job.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Location filter
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      filtered = filtered.filter((job) => job.location.toLowerCase().includes(loc));
    }

    // Experience filter
    if (filters.experience && filters.experience !== "all") {
      filtered = filtered.filter(
        (job) => job.experience.toLowerCase() === filters.experience?.toLowerCase()
      );
    }

    // Remote filter
    if (filters.remote) {
      filtered = filtered.filter((job) => job.remote === true);
    }

    // Company filter
    if (filters.company && filters.company !== "all") {
      filtered = filtered.filter(
        (job) => job.company.toLowerCase() === filters.company?.toLowerCase()
      );
    }

    // Skills filter
    if (filters.skills && filters.skills.length > 0) {
      filtered = filtered.filter((job) =>
        filters.skills?.every((s) => job.skills.includes(s))
      );
    }

    // Pagination
    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      jobs: paginated,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Error in searchJobsServer:", error);
    return {
      jobs: [],
      pagination: { page: 1, pageSize, totalCount: 0, totalPages: 0 },
    };
  }
}

/**
 * Toggles a job bookmark (creates a DRAFT JobApplication or deletes it)
 */
export async function toggleBookmarkJob(job: {
  title: string;
  company: string;
  location: string;
  salary: string;
  jobUrl: string;
}) {
  try {
    const profile = await getAuthenticatedProfile();

    // Check if already bookmarked / exists as application
    const existing = await prisma.jobApplication.findFirst({
      where: {
        profileId: profile.id,
        jobUrl: job.jobUrl,
      },
    });

    if (existing) {
      // Unbookmark: Delete from DB
      await prisma.jobApplication.delete({
        where: { id: existing.id },
      });
      revalidatePath("/jobs");
      revalidatePath("/dashboard");
      return { success: true, bookmarked: false };
    }

    // Bookmark: Create DRAFT application
    await prisma.jobApplication.create({
      data: {
        profileId: profile.id,
        companyName: job.company,
        jobTitle: job.title,
        jobUrl: job.jobUrl,
        location: job.location,
        salary: job.salary,
        status: "DRAFT",
        notes: "Bookmarked from Job Search board.",
      },
    });

    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    return { success: true, bookmarked: true };
  } catch (error: any) {
    console.error("Error in toggleBookmarkJob:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Returns a list of all job URLs that have been bookmarked/tracked
 */
export async function getBookmarkedJobUrls() {
  try {
    const profile = await getAuthenticatedProfile();
    const bookmarks = await prisma.jobApplication.findMany({
      where: { profileId: profile.id },
      select: { jobUrl: true },
    });
    return bookmarks.map((b) => b.jobUrl).filter(Boolean) as string[];
  } catch (error) {
    console.error("Error in getBookmarkedJobUrls:", error);
    return [];
  }
}

/**
 * Promotes a bookmarked job to APPLIED status in the database
 */
export async function applyToBookmarkedJob(jobUrl: string) {
  try {
    const profile = await getAuthenticatedProfile();

    const existing = await prisma.jobApplication.findFirst({
      where: {
        profileId: profile.id,
        jobUrl,
      },
    });

    if (existing) {
      await prisma.jobApplication.update({
        where: { id: existing.id },
        data: {
          status: "APPLIED",
          appliedAt: new Date(),
        },
      });
    } else {
      // Find job from mock set
      const match = mockJobs.find((j) => j.jobUrl === jobUrl);
      if (!match) throw new Error("Job not found");

      await prisma.jobApplication.create({
        data: {
          profileId: profile.id,
          companyName: match.company,
          jobTitle: match.title,
          jobUrl: match.jobUrl,
          location: match.location,
          salary: match.salary,
          status: "APPLIED",
          appliedAt: new Date(),
          notes: "Applied directly via Job Search board.",
        },
      });
    }

    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error in applyToBookmarkedJob:", error);
    return { success: false, error: error.message };
  }
}
