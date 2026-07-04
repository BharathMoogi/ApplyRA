"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type StructuredResumeData } from "./resumes";
import { z } from 'zod';
import { ai } from '@/lib/ai';
import { ResumePromptBuilder } from '@/lib/ai/prompt-builder';
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

// Tech keywords dictionary to scan job description for
const KEYWORD_DICTIONARY = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Tailwind CSS",
  "PostgreSQL",
  "Prisma",
  "Supabase",
  "Kubernetes",
  "Docker",
  "CI/CD",
  "AWS",
  "GraphQL",
  "REST APIs",
  "Redux",
  "Zustand",
  "Figma",
  "Unit Testing",
  "Jest",
  "Playwright",
];

/**
 * Mocks AI Resume Customization by parsing a master resume,
 * scanning a pasted job description, optimizing bullet points,
 * and mapping keywords.
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

    const masterData = JSON.parse(sourceResume.content) as StructuredResumeData;

    // Define Zod validation schema - lenient enough for fast LLMs like Groq
    const TailoredResumeResultSchema = z.object({
      originalScore: z.number().min(0).max(100).default(0),
      optimizedScore: z.number().min(0).max(100).default(0),
      matchedKeywords: z.array(z.string()).default([]),
      missingKeywords: z.array(z.string()).default([]),
      optimizedPoints: z.array(
        z.union([
          z.object({ original: z.string(), optimized: z.string() }),
          z.string().transform(s => ({ original: s, optimized: s }))
        ])
      ).default([]),
      tailoredData: z.object({
        personal: z.object({
          name: z.string().default(""),
          email: z.string().default(""),
          phone: z.string().default(""),
          website: z.string().default(""),
          linkedin: z.string().optional(),
          github: z.string().optional(),
          portfolio: z.string().optional(),
          location: z.string().optional()
        }),
        experience: z.array(z.object({
          company: z.string().default(""),
          role: z.string().default(""),
          duration: z.string().default(""),
          description: z.string().default(""),
          location: z.string().optional(),
          employmentType: z.string().optional()
        })).default([]),
        education: z.array(z.object({
          school: z.string().default(""),
          degree: z.string().default(""),
          year: z.string().default(""),
          fieldOfStudy: z.string().optional(),
          grade: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          coursework: z.array(z.string()).optional()
        })).default([]),
        skills: z.array(z.string()).default([]),
        summary: z.string().optional(),
        projects: z.array(z.object({
          name: z.string().default(""),
          description: z.string().default(""),
          technologies: z.array(z.string()).optional(),
          duration: z.string().optional(),
          githubUrl: z.string().optional(),
          liveUrl: z.string().optional()
        })).optional().default([]),
        certifications: z.array(z.object({
          name: z.string().default(""),
          issuer: z.string().default(""),
          issueDate: z.string().optional(),
          expiryDate: z.string().optional(),
          credentialUrl: z.string().optional()
        })).optional().default([]),
        achievements: z.array(z.object({
          title: z.string().default(""),
          category: z.string().default("Other"),
          description: z.string().default(""),
          date: z.string().optional()
        })).optional().default([])
      })
    });

    const calculateKeywordCoverage = (
      tailored: typeof masterData,
      jobKeywords: string[]
    ) => {
      const resumeText = JSON.stringify(tailored).toLowerCase();
      const matched: string[] = [];
      const missing: string[] = [];

      for (const kw of jobKeywords) {
        if (resumeText.includes(kw.toLowerCase())) {
          matched.push(kw);
        } else {
          missing.push(kw);
        }
      }

      const coverage = jobKeywords.length > 0 ? matched.length / jobKeywords.length : 1.0;
      return { coverage, matched, missing };
    };

    // 1. Extract keywords from Job Description using the AI service
    const extractedKeywords = await ATSKeywordExtractor.extractKeywords(jobDescription);
    const atsKeywords = Array.from(new Set([
      ...extractedKeywords.technologies,
      ...extractedKeywords.skills,
      ...extractedKeywords.tools,
      ...extractedKeywords.importantKeywords
    ]));

    // Calculate original master resume ATS score using scorer
    const originalScoring = ATSScoringEngine.scoreResume(masterData, jobDescription, extractedKeywords);
    const originalScore = originalScoring.overallScore;

    let attempts = 0;
    const maxAttempts = 3;
    const targetScore = 80;
    let targetMissingKeywords: string[] = [];
    let finalResult: any = null;

    // 2. Loop until overall ATS Score meets target threshold (80/100) or maxAttempts reached
    while (attempts < maxAttempts) {
      console.log(`[AI Customizer] Optimization attempt ${attempts + 1} for resume ${resumeId}. Active provider: ${ai.active.name}...`);
      
      const { systemPrompt, prompt } = ResumePromptBuilder.buildTailoringPrompt({
        masterResume: masterData,
        jobDescription,
        atsKeywords,
        userProfile: targetMissingKeywords.length > 0 ? {
          preferences: [`CRITICAL: Boost ATS score. Weave these specific missing keywords naturally: ${targetMissingKeywords.join(', ')}`]
        } : undefined
      });

      const response = await ai.active.generateObject<TailoredResumeResult>({
        prompt,
        systemPrompt,
        schema: TailoredResumeResultSchema
      });

      if (!response.success) {
        return { success: false, error: response.error };
      }

      const result = response.data;
      
      // Compute comprehensive ATS Score details
      const scoringDetails = ATSScoringEngine.scoreResume(
        result.tailoredData,
        jobDescription,
        extractedKeywords
      );

      console.log(`[AI Customizer] Attempt ${attempts + 1} complete. ATS Score: ${scoringDetails.overallScore}/100. (Keywords: ${scoringDetails.keywordMatchScore}%, Verbs: ${scoringDetails.actionVerbUsageScore}%)`);

      finalResult = {
        ...result,
        originalScore,
        optimizedScore: scoringDetails.overallScore,
        matchedKeywords: atsKeywords.filter(k => JSON.stringify(result.tailoredData).toLowerCase().includes(k.toLowerCase())),
        missingKeywords: atsKeywords.filter(k => !JSON.stringify(result.tailoredData).toLowerCase().includes(k.toLowerCase())),
        tailoredData: result.tailoredData,
        atsScoring: scoringDetails
      };

      if (scoringDetails.overallScore >= targetScore || finalResult.missingKeywords.length === 0) {
        break;
      }

      targetMissingKeywords = finalResult.missingKeywords;
      attempts++;
    }

    return {
      success: true,
      result: finalResult
    };
  } catch (err: any) {
    console.error("Error in generateCustomizedResume:", err);
    return { success: false, error: err.message };
  }
}
