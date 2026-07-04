import { ai } from '../index';
import { type StructuredResumeData } from '@/actions/resumes';

export class CoverLetterAgent {
  static async generateTailoredCoverLetter(
    companyName: string,
    jobTitle: string,
    jobDescription: string,
    resume: StructuredResumeData,
    profileName: string
  ): Promise<string> {
    console.log(`[CoverLetterAgent] Generating custom cover letter for ${jobTitle} at ${companyName}...`);

    const systemPrompt = `
      You are an elite, persuasive career consultant and copywriter.
      Your task is to write a highly professional, tailored cover letter for a candidate.
      
      Guidelines:
      1. Reference specific skills and experiences from the candidate's resume that align with the job description.
      2. Keep it under 350 words, structured into 3-4 clean paragraphs.
      3. Maintain a confident, professional, and authentic tone.
      4. DO NOT invent or hallucinate achievements, metrics, or roles. Only draw from the provided resume.
      5. End with a polite call to action requesting an interview.
    `;

    const prompt = `
      Candidate Name: ${profileName}
      Target Job Title: ${jobTitle}
      Target Company: ${companyName}
      
      Candidate Resume JSON:
      ${JSON.stringify(resume, null, 2)}
      
      Job Description:
      ${jobDescription}
    `;

    const response = await ai.active.generateText({
      prompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 1500
    });

    if (response.success) {
      return response.data;
    } else {
      throw new Error(`Cover Letter Generation failed: ${response.error}`);
    }
  }
}
