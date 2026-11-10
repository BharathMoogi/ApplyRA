import type { ExtractedResumeSummary, ExperienceLevel } from "./types";

// Match only what we need from StructuredResumeData to avoid circular import
interface LocalResumeSkills {
  languages?: string[];
  frameworks?: string[];
  databases?: string[];
  tools?: string[];
  cloud?: string[];
  other?: string[];
}

interface LocalWorkExperience {
  company?: string;
  role?: string;
  duration?: string;
  location?: string;
  employmentType?: string;
  description?: string;
}

interface LocalEducation {
  school?: string;
  degree?: string;
  year?: string;
  fieldOfStudy?: string;
}

interface LocalCertification {
  name?: string;
  issuer?: string;
}

interface LocalStructuredResumeData {
  personal?: { name?: string };
  experience?: LocalWorkExperience[];
  education?: LocalEducation[];
  skills?: string[] | LocalResumeSkills; // support both shapes
  categorizedSkills?: LocalResumeSkills;
  certifications?: LocalCertification[];
  summary?: string;
}

/**
 * Parses duration strings like "2021 - 2024", "Jun 2022 - Present", "2 years"
 * to compute estimated total years of professional experience.
 */
function estimateExperienceYears(experiences: LocalWorkExperience[] | undefined): number {
  if (!experiences || experiences.length === 0) return 0;

  let totalMonths = 0;
  const currentYear = new Date().getFullYear();

  for (const exp of experiences) {
    const text = (exp.duration || "").toLowerCase();
    
    // Look for explicit "X years" / "X mos"
    const yrMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:yrs?|years?)/i);
    const moMatch = text.match(/(\d+)\s*(?:mos?|months?)/i);
    if (yrMatch) {
      totalMonths += Math.round(parseFloat(yrMatch[1]) * 12);
      continue;
    }
    if (moMatch) {
      totalMonths += parseInt(moMatch[1], 10);
      continue;
    }

    // Look for year ranges like "2021 - 2024" or "2022 - Present"
    const years = text.match(/\b(19\d\d|20\d\d)\b/g);
    if (years && years.length >= 2) {
      const start = parseInt(years[0], 10);
      const end = parseInt(years[1], 10);
      if (end >= start) {
        totalMonths += (end - start) * 12;
      }
    } else if (years && years.length === 1 && (text.includes("present") || text.includes("current"))) {
      const start = parseInt(years[0], 10);
      totalMonths += Math.max(12, (currentYear - start) * 12);
    } else {
      // Default guess per listed role: 12 months
      totalMonths += 12;
    }
  }

  return Math.min(30, Math.round((totalMonths / 12) * 10) / 10);
}

function mapYearsToLevel(years: number): ExperienceLevel {
  if (years <= 0.5) return "Fresher";
  if (years <= 2) return "Entry";
  if (years <= 5) return "Mid";
  if (years <= 8) return "Senior";
  return "Lead";
}

/**
 * Extracts all unique skills from the structured resume data.
 * Handles both string[] and categorized object formats.
 */
export function extractAllSkills(structured: LocalStructuredResumeData): string[] {
  const set = new Set<string>();

  // Handle flat string[] format for `skills`
  if (Array.isArray(structured.skills)) {
    for (const s of structured.skills) {
      if (typeof s === "string" && s.trim().length > 1) set.add(s.trim());
    }
  } else if (structured.skills && typeof structured.skills === "object") {
    // Object format (older parser output)
    const obj = structured.skills as LocalResumeSkills;
    const listAll = [
      ...(obj.languages || []),
      ...(obj.frameworks || []),
      ...(obj.databases || []),
      ...(obj.tools || []),
      ...(obj.cloud || []),
      ...(obj.other || []),
    ];
    for (const item of listAll) {
      if (typeof item === "string" && item.trim().length > 1) set.add(item.trim());
    }
  }

  // Also read categorizedSkills if present
  if (structured.categorizedSkills) {
    const cat = structured.categorizedSkills;
    const catAll = [
      ...(cat.languages || []),
      ...(cat.frameworks || []),
      ...(cat.databases || []),
      ...(cat.tools || []),
      ...(cat.cloud || []),
      ...(cat.other || []),
    ];
    for (const item of catAll) {
      if (typeof item === "string" && item.trim().length > 1) set.add(item.trim());
    }
  }

  return Array.from(set);
}

/**
 * Derives 3 to 5 targeted search queries from resume roles, skills, and classification.
 */
export function generateSearchQueries(
  targetRoles: string[],
  category: string | undefined,
  skills: string[]
): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();

  const addQuery = (q: string) => {
    const clean = q.trim();
    const key = clean.toLowerCase();
    if (clean.length > 2 && !seen.has(key)) {
      seen.add(key);
      queries.push(clean);
    }
  };

  // 1. Cleaned explicit roles
  for (const role of targetRoles) {
    // Strip seniority prefixes for broader search if needed
    addQuery(role);
    const cleanedRole = role.replace(/\b(Senior|Junior|Lead|Principal|Associate|Staff)\b/gi, "").trim();
    if (cleanedRole && cleanedRole !== role) {
      addQuery(cleanedRole);
    }
  }

  // 2. Occupation category mappings
  if (category) {
    addQuery(category);
    const catLower = category.toLowerCase();
    if (catLower.includes("ai") || catLower.includes("machine learning") || catLower.includes("data science")) {
      addQuery("AI Engineer");
      addQuery("Machine Learning Engineer");
      addQuery("Generative AI Engineer");
    } else if (catLower.includes("frontend") || catLower.includes("web developer")) {
      addQuery("Frontend Developer");
      addQuery("React Developer");
    } else if (catLower.includes("full stack") || catLower.includes("software engineer")) {
      addQuery("Full Stack Engineer");
      addQuery("Software Engineer");
    }
  }

  // 3. Top skill + role combinations (e.g. "Python Developer", "React Developer")
  const primarySkills = skills.slice(0, 5);
  for (const skill of primarySkills) {
    const sLower = skill.toLowerCase();
    if (["python", "react", "node.js", "next.js", "java", "golang", "flutter", "aws"].includes(sLower)) {
      addQuery(`${skill} Developer`);
    }
  }

  // Fallback if empty
  if (queries.length === 0) {
    queries.push("Software Engineer");
  }

  // Return at most 5 distinct queries
  return queries.slice(0, 5);
}

/**
 * Analyzes resume database record and returns a comprehensive summary
 * with extracted keywords, experience, and generated search queries.
 */
export function extractResumeSummary(
  resume: {
    id: string;
    title: string;
    content: string | null;
    rawText?: string | null;
    occupationCategory?: string | null;
  }
): ExtractedResumeSummary {
  let structured: LocalStructuredResumeData = {
    personal: { name: "" },
    experience: [],
    education: [],
    skills: [],
    certifications: [],
  };

  if (resume.content) {
    try {
      structured = JSON.parse(resume.content);
    } catch {
      // Content may be plain text or corrupt
    }
  }

  // Extract roles from work experience
  const roles: string[] = [];
  if (structured.experience && Array.isArray(structured.experience)) {
    for (const exp of structured.experience) {
      if (exp.role && !roles.includes(exp.role.trim())) {
        roles.push(exp.role.trim());
      }
    }
  }

  const allSkills = extractAllSkills(structured);
  const years = estimateExperienceYears(structured.experience);
  const level = mapYearsToLevel(years);

  const degrees: string[] = [];
  if (structured.education && Array.isArray(structured.education)) {
    for (const edu of structured.education) {
      if (edu.degree) {
        degrees.push(`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}`.trim());
      }
    }
  }

  const certifications: string[] = [];
  if (structured.certifications && Array.isArray(structured.certifications)) {
    for (const cert of structured.certifications) {
      if (cert.name) certifications.push(cert.name.trim());
    }
  }

  const generatedQueries = generateSearchQueries(
    roles,
    resume.occupationCategory || undefined,
    allSkills
  );

  return {
    resumeId: resume.id,
    title: resume.title,
    fullName: structured.personal?.name,
    targetRoles: roles.length > 0 ? roles : [resume.occupationCategory || "Software Engineer"],
    primaryCategory: resume.occupationCategory || undefined,
    totalExperienceYears: years,
    experienceLevel: level,
    skills: allSkills,
    topTechnologies: allSkills.slice(0, 10),
    educationDegrees: degrees,
    certifications,
    generatedQueries,
  };
}
