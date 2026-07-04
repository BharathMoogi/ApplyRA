"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type StructuredResumeData } from "./resumes";
import { z } from 'zod';
import { ai } from '@/lib/ai';
import { ATSKeywordExtractor } from '@/lib/ai/keyword-extractor';
import { ATSScoringEngine, type ATSScoreDetails } from '@/lib/ai/ats-scorer';

export interface TailoredResumeResult {
  originalScore: number;
  optimizedScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  optimizedPoints: { original: string; optimized: string }[];
  tailoredData: StructuredResumeData;
  atsScoring?: ATSScoreDetails;
}

/**
 * Generates a customized resume by asking the AI for ONLY the small changes
 * (summary, extra skills, bullet improvements) then applying them to the master
 * resume programmatically. This keeps token usage minimal and avoids schema errors.
 */
export async function generateCustomizedResume(
  resumeId: string,
  jobDescription: string
): Promise<{ success: boolean; result?: TailoredResumeResult; error?: string }> {
  try {
    const sourceResume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!sourceResume || !sourceResume.content) {
      return { success: false, error: "Resume not found or has no content." };
    }

    const masterData = JSON.parse(sourceResume.content || "{}") as StructuredResumeData;

    // 1. Extract keywords from the Job Description
    const extractedKeywords = await ATSKeywordExtractor.extractKeywords(jobDescription);
    const atsKeywords = Array.from(new Set([
      ...extractedKeywords.technologies,
      ...extractedKeywords.skills,
      ...extractedKeywords.tools,
      ...extractedKeywords.importantKeywords
    ]));

    // 2. Calculate baseline ATS score from master resume
    const originalScoring = ATSScoringEngine.scoreResume(masterData, jobDescription, extractedKeywords);
    const originalScore = originalScoring.overallScore;

    // 3. Build a minimal skills + experience summary for the AI prompt
    const existingSkills = (masterData.skills || []).join(", ");
    const existingExperience = (masterData.experience || [])
      .slice(0, 3)
      .map((e: any) => `${e.role} at ${e.company}: ${(e.description || "").slice(0, 200)}`)
      .join("\n");
    const missingKeywordsForPrompt = atsKeywords
      .filter(k => !JSON.stringify(masterData).toLowerCase().includes(k.toLowerCase()))
      .slice(0, 15)
      .join(", ");

    // 4. Lightweight schema — only ask AI for what needs to change
    const OptimizationSchema = z.object({
      summary: z.string().describe("ATS-optimized professional summary, max 3 sentences"),
      additionalSkills: z.array(z.string()).describe("New skills from the JD that exist in candidate background, max 8"),
      improvedBullets: z.array(z.object({
        original: z.string(),
        improved: z.string()
      })).describe("Up to 5 experience bullet point improvements with keywords woven in naturally"),
    });

    const systemPrompt = `You are an expert ATS resume optimizer. Your job is to suggest targeted improvements to a resume based on a job description. NEVER invent experience, skills, or achievements that are not in the candidate's background. Only optimize and reframe existing information.`;

    const prompt = `
Job Description Keywords to target: ${missingKeywordsForPrompt || atsKeywords.slice(0, 10).join(", ")}

Candidate's existing skills: ${existingSkills}

Candidate's experience highlights:
${existingExperience}

Return a JSON object with:
1. "summary": A 2-3 sentence professional summary that naturally incorporates relevant keywords
2. "additionalSkills": Up to 8 skills from the job description that align with the candidate's background  
3. "improvedBullets": Up to 5 improved experience bullets that weave in keywords naturally (only reframe existing work, never invent)
`.trim();

    const response = await ai.active.generateObject<{ summary: string; additionalSkills: string[]; improvedBullets: { original: string; improved: string }[] }>({
      prompt,
      systemPrompt,
      schema: OptimizationSchema,
    });

    // 5. Apply AI suggestions to master resume programmatically
    const tailoredData: StructuredResumeData = {
      ...masterData,
      summary: response.success ? response.data.summary : (masterData.summary || ""),
      skills: response.success
        ? Array.from(new Set([...(masterData.skills || []), ...(response.data.additionalSkills || [])]))
        : (masterData.skills || []),
    };

    const optimizedPoints = response.success
      ? (response.data.improvedBullets || []).map(b => ({ original: b.original, optimized: b.improved }))
      : [];

    // 6. Calculate optimized ATS score
    const optimizedScoring = ATSScoringEngine.scoreResume(tailoredData, jobDescription, extractedKeywords);
    const optimizedScore = optimizedScoring.overallScore;

    const matchedKeywords = atsKeywords.filter(k => JSON.stringify(tailoredData).toLowerCase().includes(k.toLowerCase()));
    const missingKeywords = atsKeywords.filter(k => !JSON.stringify(tailoredData).toLowerCase().includes(k.toLowerCase()));

    return {
      success: true,
      result: {
        originalScore,
        optimizedScore,
        matchedKeywords,
        missingKeywords,
        optimizedPoints,
        tailoredData,
        atsScoring: optimizedScoring,
      }
    };
  } catch (err: any) {
    console.error("Error in generateCustomizedResume:", err);
    return { success: false, error: err.message };
  }
}
