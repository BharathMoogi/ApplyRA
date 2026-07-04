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
  {
    id: "job-7",
    title: "Software Developer",
    company: "TechNova Solutions",
    location: "Bangalore, Karnataka, India",
    salary: "₹8,00,000 - ₹12,00,000",
    experience: "Entry",
    remote: true,
    skills: ["JavaScript", "TypeScript", "React", "Node.js"],
    description: "We are hiring a passionate Software Developer to join our fully remote team based out of Bangalore. You will be building scalable web applications, writing automated tests, and collaborating with cross-functional teams. Great opportunity for entry-level developers to grow.",
    atsScore: 89,
    postedAt: "3 hours ago",
    source: "LinkedIn",
    jobUrl: "https://technova.com/careers/software-developer-blr",
  },
  {
    id: "job-8",
    title: "Frontend Software Engineer",
    company: "Global Innovations",
    location: "Bangalore, Karnataka, India",
    salary: "₹10,00,000 - ₹15,00,000",
    experience: "Mid",
    remote: false,
    skills: ["React", "Next.js", "Tailwind CSS"],
    description: "Looking for a Frontend Software Engineer to revamp our enterprise dashboard. You will be working closely with the design team in our Bangalore office to implement pixel-perfect user interfaces.",
    atsScore: 82,
    postedAt: "1 day ago",
    source: "Indeed",
    jobUrl: "https://globalinnovations.com/careers/frontend-engineer",
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
 * Searches and filters jobs (using JSearch API if API key is provided, otherwise mock data)
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
    const apiKey = process.env.JSEARCH_API_KEY;

    if (!apiKey) {
      // Graceful fallback to mock data search
      let filtered = [...mockJobs];

      if (query) {
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        filtered = filtered.filter((job) => {
          const searchableText = `${job.title} ${job.company} ${job.description} ${job.skills.join(" ")}`.toLowerCase();
          return terms.every(term => searchableText.includes(term));
        });
      }

      if (filters.location) {
        const loc = filters.location.toLowerCase();
        filtered = filtered.filter((job) => job.location.toLowerCase().includes(loc));
      }

      if (filters.experience && filters.experience !== "all") {
        filtered = filtered.filter(
          (job) => job.experience.toLowerCase() === filters.experience?.toLowerCase()
        );
      }

      if (filters.remote) {
        filtered = filtered.filter((job) => job.remote === true);
      }

      if (filters.company && filters.company !== "all") {
        filtered = filtered.filter(
          (job) => job.company.toLowerCase() === filters.company?.toLowerCase()
        );
      }

      if (filters.skills && filters.skills.length > 0) {
        filtered = filtered.filter((job) =>
          filters.skills?.every((s) => job.skills.includes(s))
        );
      }

      const totalCount = filtered.length;
      const startIndex = (page - 1) * pageSize;
      const paginated = filtered.slice(startIndex, startIndex + pageSize);
      const totalPages = Math.ceil(totalCount / pageSize) || 1;

      return {
        jobs: paginated,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
        },
      };
    }

    // --- JSearch API Search ---
    const url = new URL("https://jsearch.p.rapidapi.com/search-v2");
    const searchQuery = (query || "Software Engineer").trim();
    // Append location to query for best JSearch results
    const fullQuery = filters.location
      ? `${searchQuery} in ${filters.location}`
      : searchQuery;
    url.searchParams.set("query", fullQuery);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("num_pages", "1");
    url.searchParams.set("country", "in"); // default to India

    if (filters.remote) {
      url.searchParams.set("remote_jobs_only", "true");
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      throw new Error(`JSearch API failed with status: ${response.status}`);
    }

    const data = await response.json();
    let rawJobs = [];
    if (data.data && Array.isArray(data.data.jobs)) {
      rawJobs = data.data.jobs;
    } else if (Array.isArray(data.data)) {
      rawJobs = data.data; // fallback for older API format
    }

    let mappedJobs: JobListing[] = rawJobs.map((job: any) => {
      const location = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", ") || "Remote";
      const salary = job.job_min_salary && job.job_max_salary 
        ? `${job.job_salary_currency || "$"} ${job.job_min_salary.toLocaleString()} - ${job.job_max_salary.toLocaleString()}`
        : "Salary Undisclosed";

      let experience: "Entry" | "Mid" | "Senior" | "Lead" = "Mid";
      if (job.job_required_experience?.no_experience_required) {
        experience = "Entry";
      } else if (job.job_required_experience?.required_experience_in_months) {
        const months = job.job_required_experience.required_experience_in_months;
        if (months < 24) experience = "Entry";
        else if (months < 60) experience = "Mid";
        else if (months < 96) experience = "Senior";
        else experience = "Lead";
      }

      // Generate simulation-friendly random ATS score
      const atsScore = Math.floor(Math.random() * 20) + 70;

      return {
        id: job.job_id,
        title: job.job_title,
        company: job.employer_name,
        location,
        salary,
        experience,
        remote: job.job_is_remote || false,
        skills: ["React", "TypeScript", "Next.js", "Node.js", "Tailwind CSS"], // Demo keywords
        description: job.job_description || "",
        atsScore,
        postedAt: job.job_posted_at_datetime_utc 
          ? new Date(job.job_posted_at_datetime_utc).toLocaleDateString()
          : "Recently",
        source: "LinkedIn",
        jobUrl: job.job_apply_link || job.job_google_link || "https://google.com/jobs",
      };
    });

    // Secondary filter for experience on JSearch results
    if (filters.experience && filters.experience !== "all") {
      mappedJobs = mappedJobs.filter(
        (job) => job.experience.toLowerCase() === filters.experience?.toLowerCase()
      );
    }

    const totalCount = mappedJobs.length;
    const paginated = mappedJobs.slice(0, pageSize);
    const totalPages = totalCount >= pageSize ? page + 1 : page;

    return {
      jobs: paginated,
      pagination: {
        page,
        pageSize,
        totalCount: totalCount * page, // Estimated count since API page-based
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
export async function applyToBookmarkedJob(job: {
  title: string;
  company: string;
  location: string;
  salary: string;
  jobUrl: string;
}) {
  try {
    const profile = await getAuthenticatedProfile();

    const existing = await prisma.jobApplication.findFirst({
      where: {
        profileId: profile.id,
        jobUrl: job.jobUrl,
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
      await prisma.jobApplication.create({
        data: {
          profileId: profile.id,
          companyName: job.company,
          jobTitle: job.title,
          jobUrl: job.jobUrl,
          location: job.location,
          salary: job.salary,
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
