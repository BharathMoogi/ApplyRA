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
  coverLetterText: string;
  atsScoring?: ATSScoreDetails;
}

/**
 * Generates a customized resume by asking the AI for ONLY the small changes
 * (summary, extra skills, bullet improvements) then applying them to the master
 * resume programmatically. This keeps token usage minimal and avoids schema errors.
 * Supports feedback loop to continuously refine the resume on subsequent attempts.
 */
export async function generateCustomizedResume(
  resumeId: string,
  jobDescription: string,
  profileName?: string,
  jobTitle?: string,
  companyName?: string,
  previouslyTailoredData?: StructuredResumeData,
  feedbackKeywords?: string[],
  preExtractedKeywords?: any
): Promise<{ success: boolean; result?: TailoredResumeResult; error?: string }> {
  try {
    const sourceResume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!sourceResume || !sourceResume.content) {
      return { success: false, error: "Resume not found or has no content." };
    }

    const masterData = JSON.parse(sourceResume.content || "{}") as StructuredResumeData;
    const currentResumeData = previouslyTailoredData || masterData;

    // 1. Extract keywords from the Job Description
    const extractedKeywords = preExtractedKeywords || await ATSKeywordExtractor.extractKeywords(jobDescription);
    const atsKeywords = Array.from(new Set([
      ...extractedKeywords.technologies,
      ...extractedKeywords.skills,
      ...extractedKeywords.tools,
      ...extractedKeywords.importantKeywords
    ]));

    // 2. Calculate baseline ATS score from master resume
    const originalScoring = ATSScoringEngine.scoreResume(masterData, jobDescription, extractedKeywords);
    const originalScore = originalScoring.overallScore;

    // 3. Build details for the AI prompt
    const existingSkills = (currentResumeData.skills || []).join(", ");
    
    // Format full candidate experience
    const existingExperience = (currentResumeData.experience || [])
      .map((e: any, idx: number) => `[Exp ${idx + 1}] ${e.role} at ${e.company} (${e.duration}):\n${e.description || ""}`)
      .join("\n\n");

    // Format candidate projects
    const existingProjects = (currentResumeData.projects || [])
      .map((p: any, idx: number) => `[Proj ${idx + 1}] ${p.name}${p.technologies?.length ? ` (Tech: ${p.technologies.join(", ")})` : ""}:\n${p.description || ""}`)
      .join("\n\n");

    // Format education and certifications for context
    const existingEducation = (currentResumeData.education || [])
      .map((ed: any) => `${ed.degree}${ed.fieldOfStudy ? ` in ${ed.fieldOfStudy}` : ""} from ${ed.school || "Institution"}${ed.year ? ` (${ed.year})` : ""}`)
      .join("; ");

    const existingCertifications = (currentResumeData.certifications || [])
      .map((c: any) => `${c.name} by ${c.issuer}`)
      .join("; ");

    // If feedback keywords are passed, focus strictly on them, otherwise get missing keywords
    const missingKeywords = atsKeywords.filter(k => !JSON.stringify(currentResumeData).toLowerCase().includes(k.toLowerCase()));
    const targetKeywordsList = feedbackKeywords && feedbackKeywords.length > 0
      ? feedbackKeywords
      : missingKeywords;

    const keywordsToTarget = targetKeywordsList.slice(0, 15).join(", ");

    // 4. Schema with strict constraints
    const OptimizationSchema = z.object({
      summary: z.string().describe("ATS-optimized professional summary, max 3 sentences, strictly truthful to candidate background"),
      additionalSkills: z.array(z.string()).describe("Legitimate technical skills from the JD that candidate demonstrably used in projects or experience, max 8"),
      improvedBullets: z.array(z.object({
        original: z.string().describe("Exact quote of the candidate's existing bullet point to improve"),
        improved: z.string().describe("ATS-optimized version of the bullet weaving in relevant keywords naturally without inventing facts")
      })).describe("Up to 5 experience or project bullet point improvements"),
      coverLetterText: z.string().describe("A professional, 3-paragraph tailored cover letter under 300 words, referencing specific verified candidate experience matching the JD")
    });

    const systemPrompt = `You are an expert ATS resume optimizer and career writer.
CRITICAL INTEGRITY RULES:
1. NEVER invent employers, job titles, degrees, universities, certifications, projects, dates, achievements, or performance metrics.
2. Only improve phrasing, clarity, active verbs, and ATS keyword relevance of candidate-provided work.
3. If the candidate is a fresher or student without full-time work experience, highlight their projects, education, and technical skills truthfully. Do not fabricate job experience.
4. "original" in improvedBullets MUST be an exact quote from the candidate's provided experience or projects.
5. Reframe existing information only. Do not claim qualifications or achievements the candidate does not have.`;

    const pName = profileName || currentResumeData.personal?.name || "Applicant";
    const jTitle = jobTitle || "Target Role";
    const cName = companyName || "Target Company";

    const prompt = `
Target Job Title: ${jTitle}
Target Company: ${cName}

Job Description:
${jobDescription}

Job Description Keywords to prioritize: ${keywordsToTarget || atsKeywords.slice(0, 10).join(", ")}

Candidate Verified Profile:
- Name: ${pName}
- Education: ${existingEducation || "Not specified"}
- Certifications: ${existingCertifications || "None"}
- Current Skills: ${existingSkills || "None"}

Candidate Real Work Experience / Internships:
${existingExperience || "None (Candidate is a fresher / student)"}

Candidate Real Projects:
${existingProjects || "None specified"}

Generate a JSON object with:
1. "summary": A compelling 2-3 sentence professional summary tailored to ${jTitle} at ${cName}, strictly grounded in candidate's real skills.
2. "additionalSkills": Up to 8 relevant skills from the JD that align with technologies used in candidate's experience or projects.
3. "improvedBullets": Up to 5 targeted bullet improvements. "original" must match an existing bullet from candidate's text. "improved" should use strong action verbs and target keywords without inventing unearned metrics.
4. "coverLetterText": A 3-paragraph professional cover letter under 300 words grounded strictly in verified candidate details.
`.trim();

    const response = await ai.active.generateObject<{ summary: string; additionalSkills: string[]; improvedBullets: { original: string; improved: string }[]; coverLetterText: string }>({
      prompt,
      systemPrompt,
      schema: OptimizationSchema,
    });

    // 5. Apply AI suggestions safely without duplicate content
    const tailoredData: StructuredResumeData = {
      ...currentResumeData,
      summary: response.success && response.data.summary ? response.data.summary.trim() : (currentResumeData.summary || ""),
      skills: response.success
        ? Array.from(new Set([...(currentResumeData.skills || []), ...(response.data.additionalSkills || [])]))
        : (currentResumeData.skills || []),
    };

    // Robust bullet point replacement: prevents duplicates, empty string matching, and cross-job copying
    const usedImprovements = new Set<number>();
    const optimizedPoints: { original: string; optimized: string }[] = [];

    if (response.success && response.data.improvedBullets && response.data.improvedBullets.length > 0) {
      const improvements = response.data.improvedBullets.filter(b => 
        b.original && b.original.trim().length >= 12 && b.improved && b.improved.trim().length >= 12
      );

      // Helper function to safely update bullet lines in a text block
      const applyImprovementsToText = (text: string): string => {
        const lines = text.split(/\n+/);
        const updatedLines = lines.map(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.length < 12) return line;

          // Check if any unused improvement matches this line
          for (let i = 0; i < improvements.length; i++) {
            if (usedImprovements.has(i)) continue;
            const imp = improvements[i];
            const origClean = imp.original.trim().toLowerCase();
            const lineClean = trimmedLine.toLowerCase().replace(/^[-*•–—\d.]+\s*/, '');

            // Exact match or high-confidence bidirectional containment with significant length
            const isMatch = lineClean === origClean ||
              (lineClean.includes(origClean) && origClean.length >= 20) ||
              (origClean.includes(lineClean) && lineClean.length >= 20);

            if (isMatch) {
              usedImprovements.add(i);
              optimizedPoints.push({ original: trimmedLine, optimized: imp.improved.trim() });
              // Preserve bullet prefix if present
              const bulletPrefixMatch = line.match(/^(\s*[-*•–—]\s*)/);
              const prefix = bulletPrefixMatch ? bulletPrefixMatch[1] : "";
              return `${prefix}${imp.improved.trim()}`;
            }
          }
          return line;
        });

        return updatedLines.join("\n");
      };

      // 1. Update experience bullets
      if (tailoredData.experience && tailoredData.experience.length > 0) {
        tailoredData.experience = tailoredData.experience.map(exp => ({
          ...exp,
          description: applyImprovementsToText(exp.description || "")
        }));
      }

      // 2. Update project bullets if any unused improvements remain
      if (tailoredData.projects && tailoredData.projects.length > 0) {
        tailoredData.projects = tailoredData.projects.map(proj => ({
          ...proj,
          description: applyImprovementsToText(proj.description || "")
        }));
      }
    }

    // 6. Calculate optimized ATS score
    const optimizedScoring = ATSScoringEngine.scoreResume(tailoredData, jobDescription, extractedKeywords);
    const optimizedScore = optimizedScoring.overallScore;

    const finalMatchedKeywords = atsKeywords.filter(k => JSON.stringify(tailoredData).toLowerCase().includes(k.toLowerCase()));
    const finalMissingKeywords = atsKeywords.filter(k => !JSON.stringify(tailoredData).toLowerCase().includes(k.toLowerCase()));

    return {
      success: true,
      result: {
        originalScore,
        optimizedScore,
        matchedKeywords: finalMatchedKeywords,
        missingKeywords: finalMissingKeywords,
        optimizedPoints,
        tailoredData,
        coverLetterText: response.success ? response.data.coverLetterText : "",
        atsScoring: optimizedScoring,
      }
    };
  } catch (err: any) {
    console.error("Error in generateCustomizedResume:", err);
    return { success: false, error: err.message };
  }
}
