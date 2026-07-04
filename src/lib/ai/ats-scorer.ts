import { type StructuredResumeData } from '@/actions/resumes';
import { type ExtractedKeywords } from './keyword-extractor';

export interface ATSScoreDetails {
  keywordMatchScore: number;
  formattingQualityScore: number;
  sectionCompletenessScore: number;
  actionVerbUsageScore: number;
  readabilityScore: number;
  overallScore: number;
  suggestions: string[];
}

export class ATSScoringEngine {
  static scoreResume(
    resume: StructuredResumeData,
    jobDescription: string,
    extractedKeywords: ExtractedKeywords
  ): ATSScoreDetails {
    const resumeText = JSON.stringify(resume).toLowerCase();
    const targetKeywords = [
      ...extractedKeywords.technologies,
      ...extractedKeywords.skills,
      ...extractedKeywords.tools,
      ...extractedKeywords.importantKeywords
    ];

    let matchedCount = 0;
    for (const kw of targetKeywords) {
      if (resumeText.includes(kw.toLowerCase())) {
        matchedCount++;
      }
    }

    const keywordMatchScore = targetKeywords.length > 0 
      ? Math.round((matchedCount / targetKeywords.length) * 100) 
      : 85;

    let formattingPoints = 100;
    const suggestions: string[] = [];

    if (!resume.personal.email) {
      formattingPoints -= 15;
      suggestions.push("Add an email address to your contact information.");
    }
    if (!resume.personal.phone) {
      formattingPoints -= 15;
      suggestions.push("Add a phone number to your contact details so recruiters can contact you.");
    }
    if (!resume.personal.linkedin && !resume.personal.github && !resume.personal.website) {
      formattingPoints -= 10;
      suggestions.push("Consider adding professional social profiles (e.g. LinkedIn or GitHub portfolio).");
    }

    const hasConsistentDates = resume.experience.every(exp => exp.duration.includes('-') || exp.duration.includes('–'));
    if (!hasConsistentDates && resume.experience.length > 0) {
      formattingPoints -= 10;
      suggestions.push("Ensure your work experience dates are in a consistent 'Start - End' format.");
    }

    const formattingQualityScore = Math.max(0, formattingPoints);

    let completenessPoints = 100;
    if (resume.experience.length === 0) {
      completenessPoints -= 30;
      suggestions.push("Add work experiences. Resumes without employment records are rejected by ATS.");
    }
    if (resume.education.length === 0) {
      completenessPoints -= 20;
      suggestions.push("Add an education section showing your degrees or coursework.");
    }
    if (resume.skills.length === 0) {
      completenessPoints -= 20;
      suggestions.push("Include a skills list to trigger recruiter database query matches.");
    }
    if (!resume.projects || resume.projects.length === 0) {
      completenessPoints -= 15;
      suggestions.push("List relevant side projects or open-source repositories.");
    }
    if (!resume.summary) {
      completenessPoints -= 15;
      suggestions.push("Provide a brief professional summary at the top of the resume.");
    }

    const sectionCompletenessScore = Math.max(0, completenessPoints);

    const STANDARD_ACTION_VERBS = [
      "led", "directed", "managed", "created", "built", "implemented", "developed", 
      "optimized", "streamlined", "designed", "engineered", "integrated", "automated",
      "accelerated", "maximized", "reduced", "delivered", "coordinated", "collaborated"
    ];
    
    let verbMatches = 0;
    resume.experience.forEach(exp => {
      const descLower = exp.description.toLowerCase();
      STANDARD_ACTION_VERBS.forEach(verb => {
        if (descLower.includes(verb)) {
          verbMatches++;
        }
      });
    });

    const expectedVerbsCount = Math.max(1, resume.experience.length * 2);
    const actionVerbUsageScore = Math.min(100, Math.round((verbMatches / expectedVerbsCount) * 100));
    if (actionVerbUsageScore < 60 && resume.experience.length > 0) {
      suggestions.push("Begin work experience bullet points with strong action verbs (e.g. 'Optimized', 'Engineered', 'Led').");
    }

    let readabilityPoints = 100;
    resume.experience.forEach(exp => {
      const sentences = exp.description.split(/[.!?]+/);
      sentences.forEach(s => {
        const words = s.trim().split(/\s+/).length;
        if (words > 25) {
          readabilityPoints -= 5;
        }
      });
    });

    const readabilityScore = Math.max(50, readabilityPoints);
    if (readabilityScore < 80) {
      suggestions.push("Shorten long sentences in your experience bullet points (keep under 25 words per bullet) for better readability.");
    }

    const overallScore = Math.round(
      (keywordMatchScore * 0.40) +
      (actionVerbUsageScore * 0.20) +
      (sectionCompletenessScore * 0.15) +
      (formattingQualityScore * 0.15) +
      (readabilityScore * 0.10)
    );

    if (suggestions.length === 0) {
      suggestions.push("Your resume is extremely well-optimized! Keep matching it regularly against targeted roles.");
    }

    return {
      keywordMatchScore,
      formattingQualityScore,
      sectionCompletenessScore,
      actionVerbUsageScore,
      readabilityScore,
      overallScore,
      suggestions: suggestions.slice(0, 5)
    };
  }
}
