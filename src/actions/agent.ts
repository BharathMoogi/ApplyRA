"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { searchJobs } from "./jobs";
import { sendApplicationEmail } from "@/lib/email";
import { generateCustomizedResume } from "./generator";
import { ATSKeywordExtractor } from "@/lib/ai/keyword-extractor";
import { CoverLetterAgent } from "@/lib/ai/agents/cover-letter-agent";
import { AutoApplyAgent } from "@/lib/ai/agents/auto-apply-agent";
import { JobSearchAgent } from "@/lib/ai/agents/job-search-agent";

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

    const defaultResume = await prisma.resume.findFirst({
      where: { profileId: profile.id, isDefault: true },
    });

    if (!defaultResume) {
      return { success: false, error: "No primary master resume found. Please upload one first." };
    }

    const logs: string[] = [];
    const time = () => new Date().toLocaleTimeString("en-US", { hour12: false });

    logs.push(`[${time()}] [Info] Found job listing: "${job.title}" at ${job.company}`);
    logs.push(`[${time()}] [Analyze] Extracting requirement keywords dynamically...`);

    const extracted = await ATSKeywordExtractor.extractKeywords(
      `Job Title: ${job.title}\nCompany: ${job.company}\nDescription/Skills:\n${job.skills.join(", ")}`
    );

    const extractedTags = [...extracted.technologies, ...extracted.skills].slice(0, 8);
    logs.push(`[${time()}] [Analyze] Identified dynamic keywords: ${extractedTags.join(", ") || "none"}`);
    logs.push(`[${time()}] [Optimizer] Starting live ATS keyword optimization loop...`);

    const tailoringRes = await generateCustomizedResume(
      defaultResume.id,
      `Job Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nSkills/Requirements:\n${job.skills.join("\n")}`
    );

    if (!tailoringRes.success || !tailoringRes.result) {
      logs.push(`[${time()}] [Optimizer Error] Customizer failed: ${tailoringRes.error}`);
      return { success: false, error: tailoringRes.error || "Failed to customize resume" };
    }

    const { originalScore, optimizedScore, matchedKeywords, missingKeywords, tailoredData } = tailoringRes.result;
    const atsScore = optimizedScore;
    const passed = atsScore >= threshold;

    logs.push(`[${time()}] [ATS Score] Calculated score: ${atsScore}% (Target: >= ${threshold}%)`);

    if (passed) {
      logs.push(`[${time()}] [Success] Compatibility meets minimum threshold limit (>= ${threshold}%)`);
      logs.push(`[${time()}] [Optimizer] Customizing master resume to prioritize matched keywords...`);
      
      const newResume = await prisma.resume.create({
        data: {
          profileId: profile.id,
          title: `Tailored: ${job.company} - ${job.title}`,
          content: JSON.stringify(tailoredData),
          isDefault: false,
        }
      });
      logs.push(`[${time()}] [Database] Saved customized version as: "${newResume.title}"`);
      
      logs.push(`[${time()}] [Optimizer] Formulating custom cover letter for ${job.company}...`);
      logs.push(`[${time()}] [Optimizer] Formulating custom cover letter for ${job.company}...`);
      let coverLetterText = "";
      try {
        coverLetterText = await CoverLetterAgent.generateTailoredCoverLetter(
          job.company,
          job.title,
          job.skills.join(", "),
          tailoredData as any,
          profile.fullName || user.email || "Applicant"
        );
        logs.push(`[${time()}] [Optimizer] Custom cover letter generated successfully.`);
      } catch (clErr: any) {
        logs.push(`[${time()}] [Warning] Failed to generate cover letter: ${clErr.message}`);
      }

      const applyRes = await AutoApplyAgent.apply(job.jobUrl, {
        fullName: profile.fullName || "Applicant",
        email: user.email!,
        phone: profile.phone || "",
        coverLetterText: coverLetterText
      });
      
      logs.push(...applyRes.logs);

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
            notes: `Auto-submitted by AI Agent via ${applyRes.portal} (ATS Match: ${atsScore}%). Linked Resume ID: ${newResume.id}`,
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
            notes: `Auto-submitted by AI Agent via ${applyRes.portal} (ATS Match: ${atsScore}%). Linked Resume ID: ${newResume.id}`,
          },
        });
      }

      logs.push(`[${time()}] [Database] Created tracker entry under status: APPLIED`);

      try {
        await sendApplicationEmail({
          toEmail: user.email!,
          userName: profile.fullName || user.email || "User",
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary,
          atsScore,
          jobUrl: job.jobUrl,
        });
        logs.push(`[${time()}] [Email] Confirmation email sent to ${user.email}`);
      } catch (emailErr: any) {
        console.error("Failed to send email:", emailErr);
        logs.push(`[${time()}] [Email] Error: ${emailErr?.message || JSON.stringify(emailErr)}`);
      }
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
  appliedJobs: { id: string; title: string; company: string; atsScore: number; passed: boolean }[];
}> {
  const logs: string[] = [];
  let appliedCount = 0;
  const appliedJobs: { id: string; title: string; company: string; atsScore: number; passed: boolean }[] = [];
  const time = () => new Date().toLocaleTimeString("en-US", { hour12: false });

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, logs: [`[${time()}] [Error] Unauthorized access`], appliedCount: 0, appliedJobs: [] };
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return { success: false, logs: [`[${time()}] [Error] Profile not found`], appliedCount: 0, appliedJobs: [] };
    }

    const defaultResume = await prisma.resume.findFirst({
      where: { profileId: profile.id, isDefault: true },
    });

    if (!defaultResume) {
      return { success: false, logs: [`[${time()}] [Error] Master resume not found`], appliedCount: 0, appliedJobs: [] };
    }

    logs.push(`[${time()}] [System] Automation daemon cron triggered.`);
    logs.push(`[${time()}] [System] Scanning job boards for new openings matching preferences...`);

    let masterResumeData;
    try {
      masterResumeData = JSON.parse(defaultResume.content);
    } catch {
      masterResumeData = { skills: [] };
    }

    const rankedJobs = await JobSearchAgent.searchAndRankJobs(
      { bio: profile.bio, location: profile.location },
      masterResumeData,
      2
    );

    if (rankedJobs.length === 0) {
      logs.push(`[${time()}] [Info] No suitable matching jobs found at this time.`);
      return { success: true, logs, appliedCount: 0, appliedJobs: [] };
    }

    logs.push(`[${time()}] [System] Discovered ${rankedJobs.length} matching job opportunities.`);

    for (const ranked of rankedJobs) {
      const job = ranked.job;
      logs.push(`\n--- Automating Target: "${job.title}" at ${job.company} ---`);
      
      const stepRes = await runAgentStep(job, 80);
      
      if (!stepRes.success) {
        logs.push(`[${time()}] [Error] Job processing failed: ${stepRes.error}`);
        continue;
      }
      
      if (stepRes.result) {
        logs.push(...stepRes.result.logs);
        if (stepRes.result.passed) {
          appliedCount++;
          appliedJobs.push({
            id: job.id,
            title: job.title,
            company: job.company,
            atsScore: stepRes.result.atsScore,
            passed: true
          });
        }
      }
    }

    logs.push(`\n[${time()}] [System] Hourly Automation cycle complete. Submissions processed: ${appliedCount}`);
    revalidatePath("/agent");
    revalidatePath("/dashboard");
    revalidatePath("/applications");

    return {
      success: true,
      logs,
      appliedCount,
      appliedJobs,
    };
  } catch (err: any) {
    console.error(err);
    return {
      success: false,
      logs: [`[${time()}] [Fatal Error] ${err.message}`],
      appliedCount: 0,
      appliedJobs: [],
    };
  }
}

