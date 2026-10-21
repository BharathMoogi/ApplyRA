"use server";

import crypto from "crypto";
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

/**
 * Runs a single step of the autonomous AI Agent workflow:
 * Scans, analyzes matching keywords, generates tailored content,
 * checks threshold, and creates a database row if it passes.
 */
export interface PrepareStepResult {
  applicationId: string;
  jobId: string;
  title: string;
  company: string;
  atsScore: number;
  resumeId: string;
  coverLetterText: string;
  prefillLogs: string[];
  passed: boolean;
  logs: string[];
}

/**
 * Prepares the materials for a job application: analyzes keywords,
 * tailors the resume, generates the cover letter, calculates ATS score,
 * opens the page and pre-fills fields. Saves the progress as a DRAFT.
 */
export async function prepareAgentStep(
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    skills: string[];
    jobUrl: string;
    description?: string;
  },
  threshold: number
): Promise<{ success: boolean; result?: PrepareStepResult; error?: string }> {
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
      include: {
        resumes: {
          where: { isDefault: true }
        }
      }
    });

    if (!profile) {
      return { success: false, error: "User profile not found." };
    }

    const defaultResume = profile.resumes[0];

    if (!defaultResume) {
      return { success: false, error: "No primary master resume found. Please upload one first." };
    }

    const logs: string[] = [];
    const time = () => new Date().toLocaleTimeString("en-US", { hour12: false });

    logs.push(`[${time()}] [Info] Found job listing: "${job.title}" at ${job.company}`);
    logs.push(`[${time()}] [Analyze] Analyzing the complete Job Description...`);

    const fullJobDescription = job.description || `Job Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nSkills/Requirements:\n${job.skills.join("\n")}`;

    const extracted = await ATSKeywordExtractor.extractKeywords(fullJobDescription);

    logs.push(`[${time()}] [Analyze] Extracted required skills: ${(extracted.skills || []).slice(0, 5).join(", ")}`);
    logs.push(`[${time()}] [Analyze] Extracted qualifications: ${(extracted.qualifications || []).slice(0, 5).join(", ")}`);
    logs.push(`[${time()}] [Analyze] Extracted responsibilities: ${(extracted.responsibilities || []).slice(0, 3).join("; ")}`);
    logs.push(`[${time()}] [Analyze] Extracted ATS technologies/keywords: ${(extracted.technologies || []).slice(0, 8).join(", ")}`);

    logs.push(`[${time()}] [Optimizer] Starting live ATS keyword optimization loop...`);

    let tailoredData: any = null;
    let atsScore = 0;
    let passed = false;
    let matchedKeywords: string[] = [];
    let missingKeywords: string[] = [];
    let optimizedPoints: { original: string; optimized: string }[] = [];
    let coverLetterText = "";
    let attempts = 0;
    const maxAttempts = 1;

    while (attempts < maxAttempts) {
      attempts++;
      logs.push(`[${time()}] [Optimizer] Optimization Attempt ${attempts} of ${maxAttempts}...`);

      const tailoringRes = await generateCustomizedResume(
        defaultResume.id,
        fullJobDescription,
        profile.fullName || user.email || "Applicant",
        job.title,
        job.company,
        tailoredData || undefined,
        missingKeywords.length > 0 ? missingKeywords : undefined,
        extracted
      );

      if (!tailoringRes.success || !tailoringRes.result) {
        logs.push(`[${time()}] [Optimizer Error] Customizer failed on attempt ${attempts}: ${tailoringRes.error}`);
        return { success: false, error: tailoringRes.error || "Failed to customize resume" };
      }

      const res = tailoringRes.result;
      atsScore = res.optimizedScore;
      tailoredData = res.tailoredData;
      matchedKeywords = res.matchedKeywords;
      missingKeywords = res.missingKeywords;
      optimizedPoints = res.optimizedPoints;
      coverLetterText = res.coverLetterText;

      logs.push(`[${time()}] [ATS Score] Calculated score: ${atsScore}% (Target: >= ${threshold}%)`);

      if (atsScore >= threshold) {
        passed = true;
        logs.push(`[${time()}] [Success] Compatibility meets minimum threshold limit (>= ${threshold}%)`);
        break;
      } else {
        if (attempts < maxAttempts) {
          logs.push(`[${time()}] [Optimizer] Score (${atsScore}%) is below target (${threshold}%). Refining resume with missing keywords: ${missingKeywords.slice(0, 5).join(", ")}...`);
        }
      }
    }

    if (!passed) {
      logs.push(`[${time()}] [Skipped] Compatibility score (${atsScore}%) below threshold (${threshold}%) after ${attempts} attempts.`);
      return {
        success: true,
        result: {
          applicationId: "",
          jobId: job.id,
          title: job.title,
          company: job.company,
          atsScore,
          resumeId: "",
          coverLetterText: "",
          prefillLogs: [],
          passed: false,
          logs
        }
      };
    }

    logs.push(`[${time()}] [Optimizer] Customizing master resume to prioritize matched keywords...`);
    
    const resumeId = crypto.randomUUID();
    const fileUrl = `/api/resumes/${resumeId}/download`;
    const newResume = await prisma.resume.create({
      data: {
        id: resumeId,
        profileId: profile.id,
        title: `Tailored: ${job.company} - ${job.title}`,
        content: JSON.stringify(tailoredData),
        fileUrl,
        isDefault: false,
      }
    });
    logs.push(`[${time()}] [Database] Saved customized version as: "${newResume.title}" (PDF linked)`);
    
    logs.push(`[${time()}] [Headless Browser] Opening job application page: ${job.jobUrl}`);
    const prefillLogs = AutoApplyAgent.simulatePrefill(job.jobUrl, {
      fullName: profile.fullName || "Applicant",
      email: user.email!,
      phone: profile.bio ? "" : "",
      coverLetterText
    });
    logs.push(...prefillLogs);

    // Save as DRAFT in the database
    const metadata = {
      atsScore,
      resumeId: newResume.id,
      coverLetterText,
      portal: AutoApplyAgent.getPortal(job.jobUrl),
      isAssistedApply: true
    };
    const notesMessage = `[Assisted Apply Draft] ATS Match: ${atsScore}%. Metadata: ${JSON.stringify(metadata)}`;

    const existing = await prisma.jobApplication.findFirst({
      where: {
        profileId: profile.id,
        jobUrl: job.jobUrl,
      },
    });

    let application;
    if (existing) {
      application = await prisma.jobApplication.update({
        where: { id: existing.id },
        data: {
          status: "DRAFT",
          notes: notesMessage,
        },
      });
    } else {
      application = await prisma.jobApplication.create({
        data: {
          profileId: profile.id,
          companyName: job.company,
          jobTitle: job.title,
          jobUrl: job.jobUrl,
          location: job.location,
          salary: job.salary,
          status: "DRAFT",
          notes: notesMessage,
        },
      });
    }

    logs.push(`[${time()}] [Database] Created draft tracker entry under status: DRAFT`);
    logs.push(`[${time()}] [System] Pausing workflow before final submission. Explicit confirmation required.`);

    revalidatePath("/agent");
    revalidatePath("/dashboard");
    revalidatePath("/applications");

    return {
      success: true,
      result: {
        applicationId: application.id,
        jobId: job.id,
        title: job.title,
        company: job.company,
        atsScore,
        resumeId: newResume.id,
        coverLetterText,
        prefillLogs,
        passed: true,
        logs
      }
    };
  } catch (err: any) {
    console.error("Error in prepareAgentStep:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Confirms and completes a job application step.
 * If userConfirmed is true, submits the pre-filled application.
 * If false, marks the application as withdrawn/skipped.
 */
export async function confirmAgentStep(
  applicationId: string,
  userConfirmed: boolean
): Promise<{ success: boolean; logs: string[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, logs: [], error: "Unauthorized" };
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return { success: false, logs: [], error: "Application not found" };
    }

    const logs: string[] = [];
    const time = () => new Date().toLocaleTimeString("en-US", { hour12: false });

    // Parse metadata from notes if present
    let metadata: any = {};
    if (application.notes?.includes("Metadata:")) {
      const match = application.notes.match(/Metadata:\s*(\{.*\})/);
      if (match) {
        try {
          metadata = JSON.parse(match[1]);
        } catch (e) {
          // ignore
        }
      }
    }

    const atsScore = metadata.atsScore || 75;
    const resumeId = metadata.resumeId || "";
    const portal = metadata.portal || "Generic Board";

    if (userConfirmed) {
      logs.push(`[${time()}] [System] User confirmed application submission.`);
      const submitLogs = AutoApplyAgent.simulateSubmit(application.jobUrl || "");
      logs.push(...submitLogs);

      const notesMessage = `Auto-submitted by AI Agent via ${portal} (ATS Match: ${atsScore}%). Linked Resume ID: ${resumeId}`;

      await prisma.jobApplication.update({
        where: { id: applicationId },
        data: {
          status: "APPLIED",
          appliedAt: new Date(),
          notes: notesMessage,
        },
      });

      logs.push(`[${time()}] [Database] Updated tracker entry status to: APPLIED`);

      try {
        const profile = await prisma.profile.findUnique({
          where: { userId: user.id },
        });

        await sendApplicationEmail({
          toEmail: user.email!,
          userName: profile?.fullName || user.email || "User",
          jobTitle: application.jobTitle,
          company: application.companyName,
          location: application.location || "Remote",
          salary: application.salary || "N/A",
          atsScore,
          jobUrl: application.jobUrl || "",
        });
        logs.push(`[${time()}] [Email] Confirmation email sent to ${user.email}`);
      } catch (emailErr: any) {
        console.error("Failed to send email:", emailErr);
        logs.push(`[${time()}] [Email] Error: ${emailErr?.message || JSON.stringify(emailErr)}`);
      }
    } else {
      logs.push(`[${time()}] [System] User skipped application submission.`);
      
      const notesMessage = `Skipped by user during AI-Assisted Apply (ATS Match: ${atsScore}%). Linked Resume ID: ${resumeId}`;
      
      await prisma.jobApplication.update({
        where: { id: applicationId },
        data: {
          status: "WITHDRAWN",
          notes: notesMessage,
        },
      });

      logs.push(`[${time()}] [Database] Updated tracker entry status to: WITHDRAWN`);
    }

    revalidatePath("/agent");
    revalidatePath("/dashboard");
    revalidatePath("/applications");

    return {
      success: true,
      logs
    };
  } catch (err: any) {
    console.error("Error in confirmAgentStep:", err);
    return { success: false, logs: [], error: err.message };
  }
}

export interface AgentStepResult {
  jobId: string;
  title: string;
  company: string;
  atsScore: number;
  passed: boolean;
  logs: string[];
}

/**
 * Runs a single step of the autonomous AI Agent workflow (backwards compatible).
 * Chained execution of prepare and confirm.
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
    description?: string;
  },
  threshold: number
): Promise<{ success: boolean; result?: AgentStepResult; error?: string }> {
  try {
    const prepareRes = await prepareAgentStep(job, threshold);
    if (!prepareRes.success || !prepareRes.result) {
      return { success: false, error: prepareRes.error || "Failed to prepare application" };
    }

    const prep = prepareRes.result;
    if (!prep.passed) {
      return {
        success: true,
        result: {
          jobId: prep.jobId,
          title: prep.title,
          company: prep.company,
          atsScore: prep.atsScore,
          passed: false,
          logs: prep.logs
        }
      };
    }

    // Auto-confirm for autonomous legacy compatibility
    const confirmRes = await confirmAgentStep(prep.applicationId, true);
    const finalLogs = [...prep.logs, ...confirmRes.logs];

    return {
      success: true,
      result: {
        jobId: prep.jobId,
        title: prep.title,
        company: prep.company,
        atsScore: prep.atsScore,
        passed: true,
        logs: finalLogs
      }
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
 * Under AI-Assisted flow, it scans, optimizes materials, and saves drafts to the dashboard.
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
      masterResumeData = JSON.parse(defaultResume.content || "{}");
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
      logs.push(`\n--- Pre-processing Target: "${job.title}" at ${job.company} ---`);
      
      const stepRes = await prepareAgentStep(job, 75);
      
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
          logs.push(`[${time()}] [System] Saved draft application for "${job.title}" at ${job.company} (ATS Match: ${stepRes.result.atsScore}%). Awaiting review on the dashboard.`);
        }
      }
    }

    logs.push(`\n[${time()}] [System] Hourly Automation cycle complete. Draft applications created: ${appliedCount}`);
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
