/**
 * Heuristic-based text chunker to segment a raw resume into logical sections
 * This prevents the AI from mixing up "achievements" with "experience".
 */

export interface ResumeChunks {
  contactInfo: string;
  experience: string;
  education: string;
  skills: string;
  raw: string; // The whole text just in case
}

export function chunkResume(rawText: string): ResumeChunks {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  const chunks: ResumeChunks = {
    contactInfo: "",
    experience: "",
    education: "",
    skills: "",
    raw: rawText
  };

  let currentSection = "contactInfo"; // Default first section

  const sectionHeaders = {
    experience: /^(experience|work experience|employment history|professional experience|career history|work history)$/i,
    education: /^(education|academic background|academic history|qualifications)$/i,
    skills: /^(skills|technical skills|core competencies|expertise)$/i,
  };

  for (const line of lines) {
    const cleanLine = line.replace(/[^a-zA-Z\s]/g, "").trim().toLowerCase();
    
    if (sectionHeaders.experience.test(cleanLine)) {
      currentSection = "experience";
      chunks.experience += line + "\n";
      continue;
    }
    
    if (sectionHeaders.education.test(cleanLine)) {
      currentSection = "education";
      chunks.education += line + "\n";
      continue;
    }
    
    if (sectionHeaders.skills.test(cleanLine)) {
      currentSection = "skills";
      chunks.skills += line + "\n";
      continue;
    }

    // Append line to current section
    chunks[currentSection as keyof ResumeChunks] += line + "\n";
  }

  return chunks;
}
