"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type StructuredResumeData } from "./resumes";

export interface TailoredResumeResult {
  originalScore: number;
  optimizedScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  optimizedPoints: { original: string; optimized: string }[];
  tailoredData: StructuredResumeData;
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
    // 1. Fetch master resume
    const sourceResume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!sourceResume || !sourceResume.content) {
      return { success: false, error: "Resume not found or has no content." };
    }

    const masterData = JSON.parse(sourceResume.content) as StructuredResumeData;
    const descLower = jobDescription.toLowerCase();

    // 2. Scan job description for matched & missing keywords
    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];

    KEYWORD_DICTIONARY.forEach((keyword) => {
      if (descLower.includes(keyword.toLowerCase())) {
        if (masterData.skills.some((s) => s.toLowerCase() === keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
        } else {
          missingKeywords.push(keyword);
        }
      }
    });

    // 3. Tailor the skills: append missing skills found in the job description to mock AI-tailoring!
    const tailoredSkills = [...masterData.skills];
    // Mocking adding the top 2 missing skills to the tailored resume to demonstrate AI keywords enrichment
    const skillsToInject = missingKeywords.slice(0, 2);
    skillsToInject.forEach((s) => {
      if (!tailoredSkills.includes(s)) {
        tailoredSkills.push(s);
      }
    });

    // 4. Optimize work experience bullet points
    // We rewrite experience bullet descriptions to incorporate keywords from the description
    const optimizedPoints: { original: string; optimized: string }[] = [];
    const tailoredExperience = masterData.experience.map((exp, index) => {
      let optimizedDesc = exp.description;
      const originalDesc = exp.description;

      if (index === 0) {
        // First/current job experience optimization
        const targetKeyword = skillsToInject[0] || "CI/CD pipelines";
        optimizedDesc = `${originalDesc} Integrated ${targetKeyword} practices to automate UI builds and streamline deployments.`;
        optimizedPoints.push({
          original: originalDesc,
          optimized: optimizedDesc,
        });
      } else if (index === 1) {
        // Second job experience optimization
        const targetKeyword = skillsToInject[1] || "unit testing standards";
        optimizedDesc = `${originalDesc} Implemented strict ${targetKeyword} ensuring 90% codebase test coverage.`;
        optimizedPoints.push({
          original: originalDesc,
          optimized: optimizedDesc,
        });
      }

      return {
        ...exp,
        description: optimizedDesc,
      };
    });

    // 5. Structure tailored data
    const tailoredData: StructuredResumeData = {
      ...masterData,
      skills: tailoredSkills,
      experience: tailoredExperience,
    };

    // Calculate match scores
    const originalScore = Math.floor(Math.random() * 15) + 65; // mock 65-80
    const optimizedScore = Math.min(originalScore + Math.floor(Math.random() * 10) + 12, 98); // mock 85-98

    return {
      success: true,
      result: {
        originalScore,
        optimizedScore,
        matchedKeywords,
        missingKeywords,
        optimizedPoints,
        tailoredData,
      },
    };
  } catch (err: any) {
    console.error("Error in generateCustomizedResume:", err);
    return { success: false, error: err.message };
  }
}
