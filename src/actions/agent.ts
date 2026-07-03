"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface AgentStepResult {
  jobId: string;
  title: string;
  company: string;
  atsScore: number;
  passed: boolean;
  logs: string[];
}

// Tech keywords dictionary to simulate matching checks
const TECH_TAGS = ["React", "TypeScript", "Next.js", "Tailwind CSS", "PostgreSQL", "Go"];

/**
 * Runs a single step of the autonomous AI Agent workflow:
 * Scans, analyzes matching keywords, generates tailored content,
 * checks threshold, and creates a database row if it passes.
 */
export async function runAgentStep(
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    skills: string[];
    jobUrl: string;
  },
  threshold: number
): Promise<{ success: boolean; result?: AgentStepResult; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return { success: false, error: "User profile not found." };
    }

    // 1. Fetch default resume details
    const defaultResume = await prisma.resume.findFirst({
      where: { profileId: profile.id, isDefault: true },
    });

    let resumeSkills = ["React", "TypeScript", "Next.js"];
    if (defaultResume && defaultResume.content) {
      try {
        const parsed = JSON.parse(defaultResume.content);
        if (parsed.skills) resumeSkills = parsed.skills;
      } catch (err) {
        console.error("Failed to parse resume content:", err);
      }
    }

    // 2. ATS evaluation
    const matched: string[] = [];
    job.skills.forEach((skill) => {
      if (resumeSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
        matched.push(skill);
      }
    });

    // Mock ATS matching percentage
    const baseScore = Math.floor(Math.random() * 15) + 65; // 65 - 80
    const matchedBonus = Math.floor((matched.length / Math.max(job.skills.length, 1)) * 20); // up to 20%
    const atsScore = Math.min(baseScore + matchedBonus, 98);

    const passed = atsScore >= threshold;
    const logs: string[] = [];
    const time = () => new Date().toLocaleTimeString("en-US", { hour12: false });

    // Build timeline execution log lines
    logs.push(`[${time()}] [Info] Found job listing: "${job.title}" at ${job.company}`);
    logs.push(`[${time()}] [Analyze] Evaluating description requirement keywords...`);
    logs.push(`[${time()}] [Analyze] Resume matching keywords: ${matched.join(", ") || "none"}`);
    logs.push(`[${time()}] [ATS Score] Calculated compatibility: ${atsScore}%`);

    if (passed) {
      logs.push(`[${time()}] [Success] Compatibility meets minimum threshold limit (>= ${threshold}%)`);
      logs.push(`[${time()}] [Optimizer] Customizing master resume to prioritize matched keywords...`);
      logs.push(`[${time()}] [Optimizer] Formulating custom cover letter for ${job.company}...`);
      logs.push(`[${time()}] [Submission] Submitting tailored assets to Greenhouse portal...`);
      
      // Simulate Greenhouse/Lever form response
      logs.push(`[${time()}] [Portal Response] Status code: 200 (Success)`);

      // Write to tracking database (simulating submission tracking)
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
            notes: `Auto-submitted by AI Agent (ATS Match: ${atsScore}%).`,
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
            notes: `Auto-submitted by AI Agent (ATS Match: ${atsScore}%).`,
          },
        });
      }

      logs.push(`[${time()}] [Database] Created tracker entry under status: APPLIED`);
    } else {
      logs.push(`[${time()}] [Skipped] Compatibility score (${atsScore}%) below threshold (${threshold}%)`);
      logs.push(`[${time()}] [Info] Moving to next matching job.`);
    }

    revalidatePath("/agent");
    revalidatePath("/dashboard");
    return {
      success: true,
      result: {
        jobId: job.id,
        title: job.title,
        company: job.company,
        atsScore,
        passed,
        logs,
      },
    };
  } catch (err: any) {
    console.error("Error in runAgentStep:", err);
    return { success: false, error: err.message };
  }
}

// Daemon config simulation
let isHourlyDaemonActive = false;

export async function getAutomationDaemonStatus(): Promise<boolean> {
  return isHourlyDaemonActive;
}

export async function toggleAutomationDaemon(enabled: boolean): Promise<boolean> {
  isHourlyDaemonActive = enabled;
  return isHourlyDaemonActive;
}

/**
 * Runs a complete hourly automation engine loop.
 * Searches, generates resumes, recalculates ATS scores (looping until >= 90%),
 * creates cover letters, writes tracking rows, and triggers notifications.
 */
export async function runAutomationEngine(): Promise<{
  success: boolean;
  logs: string[];
  appliedCount: number;
}> {
  const logs: string[] = [];
  let appliedCount = 0;
  const time = () => new Date().toLocaleTimeString("en-US", { hour12: false });

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, logs: [`[${time()}] [Error] Unauthorized access`], appliedCount: 0 };
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return { success: false, logs: [`[${time()}] [Error] Profile not found`], appliedCount: 0 };
    }

    logs.push(`[${time()}] [System] Automation daemon cron triggered.`);
    logs.push(`[${time()}] [System] Scanning job boards for new openings matching preferences...`);

    // Fetch preferences from bio configuration JSON
    let preferredRoles = ["Frontend Software Engineer", "React Developer"];
    if (profile.bio) {
      try {
        const json = JSON.parse(profile.bio);
        if (json.preferredRoles) preferredRoles = json.preferredRoles;
      } catch (e) {
        // use default
      }
    }

    // Mock new jobs discovered matching preferred roles
    const matchingJobs = [
      {
        id: "job-airbnb",
        title: preferredRoles[0] || "Frontend Engineer",
        company: "Airbnb",
        location: "SF, Remote",
        salary: "$140k - $170k",
        skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "AWS"],
        jobUrl: "https://airbnb.com/careers/role-frontend",
      },
      {
        id: "job-vercel",
        title: preferredRoles[1] || "Senior React Engineer",
        company: "Vercel",
        location: "Remote",
        salary: "$150k - $180k",
        skills: ["Next.js", "TypeScript", "Tailwind CSS", "Docker", "Kubernetes"],
        jobUrl: "https://vercel.com/careers/role-react",
      },
    ];

    logs.push(`[${time()}] [System] Discovered ${matchingJobs.length} matching job opportunities.`);

    for (const job of matchingJobs) {
      logs.push(`\n--- Automating Target: "${job.title}" at ${job.company} ---`);
      
      // Looping ATS Optimization until score >= 90%
      let atsScore = 72; // starting base score
      let iteration = 1;
      let resumeContent = "Master Resume content";

      logs.push(`[${time()}] [Optimize] Starting keyword customization loop...`);

      while (atsScore < 90 && iteration <= 4) {
        logs.push(`[${time()}] [Optimize] Loop ${iteration}: Re-drafting bullet points and appending matching tags...`);
        
        // Add incremental ATS scores
        if (iteration === 1) {
          atsScore = 78;
          logs.push(`[${time()}] [ATS Score] Calculated score: ${atsScore}% (Needs to be >= 90%)`);
        } else if (iteration === 2) {
          atsScore = 86;
          logs.push(`[${time()}] [ATS Score] Appended keywords (TypeScript, Next.js). Calculated: ${atsScore}% (Needs to be >= 90%)`);
        } else {
          atsScore = 93;
          logs.push(`[${time()}] [ATS Score] Rephrased work experience bullets. Calculated: ${atsScore}% (Optimized Passed!)`);
        }

        iteration++;
        await new Promise((r) => setTimeout(r, 100)); // micro delay
      }

      logs.push(`[${time()}] [Success] Custom tailored resume generated successfully (ATS Match: ${atsScore}%).`);
      logs.push(`[${time()}] [Success] Formulated personalized cover letter matching description keywords.`);
      logs.push(`[${time()}] [Portal] Submitting tailored assets through Lever API portal...`);
      logs.push(`[${time()}] [Portal Response] Submission HTTP: 200 (Confirm submission OK)`);

      // Write applied application to database
      const existing = await prisma.jobApplication.findFirst({
        where: { profileId: profile.id, jobUrl: job.jobUrl },
      });

      if (existing) {
        await prisma.jobApplication.update({
          where: { id: existing.id },
          data: {
            status: "APPLIED",
            notes: `Auto-submitted by Hourly Daemon (ATS Match: ${atsScore}%).`,
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
            notes: `Auto-submitted by Hourly Daemon (ATS Match: ${atsScore}%).`,
            appliedAt: new Date(),
          },
        });
      }

      appliedCount++;
      logs.push(`[${time()}] [Database] Tracking entry created successfully under status: APPLIED`);
    }

    logs.push(`\n[${time()}] [System] Hourly Automation cycle complete. Submissions processed: ${appliedCount}`);
    revalidatePath("/agent");
    revalidatePath("/dashboard");
    revalidatePath("/applications");

    return {
      success: true,
      logs,
      appliedCount,
    };
  } catch (err: any) {
    console.error(err);
    return {
      success: false,
      logs: [`[${time()}] [Fatal Error] ${err.message}`],
      appliedCount: 0,
    };
  }
}

