import { z } from 'zod';
import { ai } from './index';

export const ExtractedKeywordsSchema = z.object({
  skills: z.array(z.string()).describe("Core soft or domain skills required, ranked by importance"),
  technologies: z.array(z.string()).describe("Programming languages, frameworks, libraries, databases, ranked by importance"),
  tools: z.array(z.string()).describe("Software tools, developer tools, platforms, or systems, ranked by importance"),
  responsibilities: z.array(z.string()).describe("Key responsibilities/tasks highlighted in the job description"),
  qualifications: z.array(z.string()).describe("Required or preferred educational/professional qualifications"),
  actionVerbs: z.array(z.string()).describe("Strong action verbs aligned with the job role"),
  importantKeywords: z.array(z.string()).describe("General high-impact keywords mentioned in the job description")
});

export type ExtractedKeywords = z.infer<typeof ExtractedKeywordsSchema>;

export class ATSKeywordExtractor {
  static async extractKeywords(jobDescription: string): Promise<ExtractedKeywords> {
    const systemPrompt = `
      You are an expert ATS (Applicant Tracking System) parser and job analyzer.
      Your task is to analyze the provided Job Description and extract key skills, technologies, tools, responsibilities, qualifications, action verbs, and general high-impact keywords.
      Rank them strictly by importance and frequency within the job description.
      Return ONLY a valid JSON object matching the requested schema.
    `;

    const prompt = `
      Please extract and rank ATS keywords from this Job Description:
      
      ${jobDescription}
    `;

    console.log("[ATSKeywordExtractor] Calling active AI provider to extract keywords from JD...");
    
    try {
      const response = await ai.active.generateObject<ExtractedKeywords>({
        prompt,
        systemPrompt,
        schema: ExtractedKeywordsSchema
      });

      if (response.success) {
        return response.data;
      } else {
        console.warn("[ATSKeywordExtractor] Keyword extraction failed, returning empty structure. Error:", response.error);
        return this.getEmptyFallback();
      }
    } catch (error) {
      console.error("[ATSKeywordExtractor] Exception during keyword extraction:", error);
      return this.getEmptyFallback();
    }
  }

  private static getEmptyFallback(): ExtractedKeywords {
    return {
      skills: [],
      technologies: [],
      tools: [],
      responsibilities: [],
      qualifications: [],
      actionVerbs: [],
      importantKeywords: []
    };
  }
}
