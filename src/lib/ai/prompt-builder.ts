import { type StructuredResumeData } from '@/actions/resumes';

export interface TailoringPromptOptions {
  masterResume: StructuredResumeData;
  jobDescription: string;
  targetRole?: string;
  atsKeywords?: string[];
  userProfile?: {
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    preferences?: string[];
  };
}

export class ResumePromptBuilder {
  static buildTailoringPrompt(options: TailoringPromptOptions): { systemPrompt: string; prompt: string } {
    const { masterResume, jobDescription, targetRole, atsKeywords = [], userProfile } = options;

    const keywordsList = atsKeywords.length > 0
      ? `Target Keywords: ${atsKeywords.join(', ')}`
      : 'Analyze job description for key skills';

    const systemPrompt = `
      You are an expert ATS (Applicant Tracking System) optimization algorithm and elite professional resume writer.
      Your task is to optimize the user's master resume for a target job description.
      
      CRITICAL INSTRUCTIONS (DO NOT VIOLATE):
      1. NEVER invent, hallucinate, or add fake credentials, job experience, previous employer names, project names, certifications, degrees, schools, or start/end dates.
      2. You may optimize and rephrase existing work experience description bullet points to highlight skills, responsibilities, and achievements that align with the job description.
      3. Maintain personal contact info, school names, degrees, company names, dates, project names, and certification issuers exactly as they are in the master resume.
      4. Ensure all output fits into the correct sections. Never place education details in experience, or achievements in education.
      5. Identify matched skills and missing target keywords from the job description, and weave missing skills naturally into the rephrased bullets.
      6. Return ONLY a valid JSON object matching the requested schema. Do not output markdown code fences or conversational text.
    `;

    const prompt = `
      You are optimizing the following resume.
      
      ${targetRole ? `Target Role: ${targetRole}` : ''}
      ${keywordsList}
      
      User Profile Customizations:
      ${userProfile ? JSON.stringify(userProfile, null, 2) : 'None'}

      Master Resume JSON:
      ${JSON.stringify(masterResume, null, 2)}
      
      Target Job Description:
      ${jobDescription}
      
      Please optimize the experience bullet points and match keywords to improve ATS scoring. Return the output following the predefined schema format.
    `;

    return { systemPrompt, prompt };
  }
}
