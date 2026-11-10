"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { defaultJobAggregator } from "@/lib/jobs/connectors/aggregator";
import { extractResumeSummary } from "@/lib/jobs/query-generator";
import {
  JobListing,
  JobSearchFilters,
  ExtractedResumeSummary,
  ExperienceLevel,
  WorkMode,
} from "@/lib/jobs/types";

export type { JobListing, JobSearchFilters, ExtractedResumeSummary, ExperienceLevel, WorkMode };

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
 * Resume-driven job discovery action.
 * Analyzes resume, derives targeted job queries, searches across modular connectors,
 * deduplicates, calculates genuine estimated fit scores, and returns paginated results.
 */
export async function discoverJobsWithResume(
  resumeId?: string,
  query?: string,
  filters: JobSearchFilters = {},
  page: number = 1,
  pageSize: number = 6
): Promise<{
  jobs: JobListing[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  resumeSummary?: ExtractedResumeSummary;
}> {
  try {
    let resumeSummary: ExtractedResumeSummary | undefined = undefined;
    let queries: string[] = [];

    if (resumeId) {
      const profile = await getAuthenticatedProfile();
      const resume = await prisma.resume.findFirst({
        where: {
          id: resumeId,
          profileId: profile.id, // Enforce Supabase auth user isolation
        },
      });

      if (resume) {
        resumeSummary = extractResumeSummary(resume);
        queries = [...resumeSummary.generatedQueries];
      }
    }

    // If user typed an explicit query, prepend or prioritize it
    if (query && query.trim().length > 0) {
      queries = [query.trim(), ...queries.filter((q) => q.toLowerCase() !== query.trim().toLowerCase())];
    }

    if (queries.length === 0) {
      queries = ["Software Engineer"];
    }

    // Run discovery across modular connectors
    const allMatchingJobs = await defaultJobAggregator.searchAcrossSources(
      queries.slice(0, 4),
      filters,
      resumeSummary
    );

    const totalCount = allMatchingJobs.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = allMatchingJobs.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return {
      jobs: paginated,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
      resumeSummary,
    };
  } catch (error: any) {
    console.error("Error in discoverJobsWithResume:", error);
    return {
      jobs: [],
      pagination: { page: 1, pageSize, totalCount: 0, totalPages: 0 },
    };
  }
}

/**
 * Standard search action preserved for backward compatibility
 */
export async function searchJobs(
  query: string = "",
  filters: JobSearchFilters = {},
  page: number = 1,
  pageSize: number = 6
) {
  return discoverJobsWithResume(undefined, query, filters, page, pageSize);
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
        salary: job.salary || "Not Disclosed",
        status: "DRAFT",
        notes: "Bookmarked from Job Search board.",
      },
    });

    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    revalidatePath("/applications");
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
          salary: job.salary || "Not Disclosed",
          status: "APPLIED",
          appliedAt: new Date(),
          notes: "Applied directly via Job Search board.",
        },
      });
    }

    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    revalidatePath("/applications");
    return { success: true };
  } catch (error: any) {
    console.error("Error in applyToBookmarkedJob:", error);
    return { success: false, error: error.message };
  }
}
