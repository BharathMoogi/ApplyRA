import { generateObject } from 'ai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import {
  PersonalDetailsSchema,
  WorkExperienceSchema,
  EducationSchema,
  SkillsSchema,
  FullResumeSchema,
} from './schemas';

/**
 * Shared helper to retry generating object
 */
async function generateObjectWithRetry<T>(
  prompt: string,
  schema: any,
  retries = 2
): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const { object } = await generateObject({
        model: google('gemini-1.5-flash'), // fast and capable
        schema: schema,
        prompt: prompt,
      });
      return object as T;
    } catch (error) {
      attempt++;
      console.warn(`AI Parse attempt ${attempt} failed:`, error);
      if (attempt > retries) {
        throw error;
      }
    }
  }
  throw new Error("Failed to parse after retries.");
}

export async function extractPersonalDetails(text: string, fallbackName: string) {
  const prompt = `
    Extract the personal contact details from the following resume text.
    If the name is not clearly present, use "${fallbackName}".
    
    Resume Text:
    ${text}
  `;
  return generateObjectWithRetry(prompt, PersonalDetailsSchema);
}

export async function extractExperience(text: string) {
  if (text.trim().length === 0) return [];
  const prompt = `
    Extract only the work experience from the following text.
    Do not include education, skills, or generic achievements unless tied to a specific role.
    If there are no clear roles, return an empty array.
    
    Resume Text:
    ${text}
  `;
  const result = await generateObjectWithRetry<{ experience: any[] }>(
    prompt,
    z.object({ experience: z.array(WorkExperienceSchema) })
  );
  return result.experience;
}

export async function extractEducation(text: string) {
  if (text.trim().length === 0) return [];
  const prompt = `
    Extract the educational background from the following text.
    Do not include work experience or unrelated courses.
    
    Resume Text:
    ${text}
  `;
  const result = await generateObjectWithRetry<{ education: any[] }>(
    prompt,
    z.object({ education: z.array(EducationSchema) })
  );
  return result.education;
}

export async function extractSkills(text: string) {
  if (text.trim().length === 0) return [];
  const prompt = `
    Extract a flat list of professional and technical skills from the following text.
    Return them as an array of strings.
    
    Resume Text:
    ${text}
  `;
  const result = await generateObjectWithRetry<{ skills: string[] }>(prompt, SkillsSchema);
  return result.skills;
}

export async function extractFullResumeAsFallback(text: string, fallbackName: string) {
  const prompt = `
    Extract all resume details from the following raw text into a structured JSON format.
    Use "${fallbackName}" if the name is missing.
    
    Resume Text:
    ${text}
  `;
  return generateObjectWithRetry(prompt, FullResumeSchema);
}
