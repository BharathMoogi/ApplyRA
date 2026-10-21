import { type StructuredResumeData } from "@/actions/resumes";

export interface ValidationIssue {
  type: "error" | "warning";
  section: "contact" | "summary" | "skills" | "experience" | "projects" | "education" | "certifications" | "general";
  message: string;
}

export interface ValidationReport {
  isValid: boolean;
  canExport: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const PLACEHOLDER_PATTERNS = [
  /\bverified\s+university\b/i,
  /\bproject\s+name\b/i,
  /^company$/i,
  /^role$/i,
  /^degree$/i,
  /\blorem\s+ipsum\b/i,
  /\bplaceholder\b/i,
];

/**
 * Validates structured resume data before export/download.
 * Flags placeholders, duplicate bullets, missing contact info, and formatting anomalies.
 */
export function validateResumeForExport(
  data: StructuredResumeData,
  originalData?: StructuredResumeData
): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 1. Contact Information Checks
  if (!data.personal?.name || data.personal.name.trim().length < 2) {
    errors.push({
      type: "error",
      section: "contact",
      message: "Candidate full name is missing or invalid.",
    });
  }

  if (!data.personal?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personal.email.trim())) {
    warnings.push({
      type: "warning",
      section: "contact",
      message: "A valid email address is recommended for ATS contact parsing.",
    });
  }

  // 2. Check for Placeholder Texts
  const checkPlaceholders = (text: string, section: ValidationIssue["section"], label: string) => {
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(text)) {
        errors.push({
          type: "error",
          section,
          message: `Detected placeholder text "${text.trim()}" in ${label}. Please verify candidate information.`,
        });
        break;
      }
    }
  };

  // Education Placeholders & Integrity
  if (data.education && data.education.length > 0) {
    data.education.forEach((edu, idx) => {
      checkPlaceholders(edu.school || "", "education", `Education #${idx + 1} School`);
      checkPlaceholders(edu.degree || "", "education", `Education #${idx + 1} Degree`);
      if (!edu.school || edu.school.trim().length === 0) {
        warnings.push({
          type: "warning",
          section: "education",
          message: `Education entry #${idx + 1} (${edu.degree || "Degree"}) is missing the institution name.`,
        });
      }
    });
  } else {
    warnings.push({
      type: "warning",
      section: "education",
      message: "No education entries detected. Most ATS screeners expect an Education section.",
    });
  }

  // Project Placeholders & Integrity
  if (data.projects && data.projects.length > 0) {
    data.projects.forEach((proj, idx) => {
      if (!proj.name || proj.name.trim().length === 0) {
        errors.push({
          type: "error",
          section: "projects",
          message: `Project entry #${idx + 1} is missing a title.`,
        });
      } else {
        // Placeholder check for projects is a warning (not blocking error)
        // because "Project Name" may appear in legacy stored data
        for (const pattern of PLACEHOLDER_PATTERNS) {
          if (pattern.test(proj.name)) {
            warnings.push({
              type: "warning",
              section: "projects",
              message: `Project #${idx + 1} has a placeholder title "${proj.name.trim()}". Please update it with the real project name in the Resume Editor.`,
            });
            break;
          }
        }
      }
    });
  }

  // Experience Placeholders & Integrity
  if (data.experience && data.experience.length > 0) {
    data.experience.forEach((exp, idx) => {
      checkPlaceholders(exp.company || "", "experience", `Experience #${idx + 1} Company`);
      checkPlaceholders(exp.role || "", "experience", `Experience #${idx + 1} Role`);
    });
  } else if (!data.projects || data.projects.length === 0) {
    // If neither work experience nor projects exist, flag as critical
    errors.push({
      type: "error",
      section: "general",
      message: "Resume contains neither work experience nor projects.",
    });
  }

  // 3. Duplicate Bullet Points Detection
  const seenBullets = new Map<string, string>(); // normalized text -> location

  const scanBullets = (description: string, location: string, section: ValidationIssue["section"]) => {
    const lines = description
      .split("\n")
      .map((l) => l.replace(/^[-*•·–—\d.]+\s*/, "").trim())
      .filter((l) => l.length > 15);

    lines.forEach((line) => {
      const normalized = line.toLowerCase();
      if (seenBullets.has(normalized)) {
        warnings.push({
          type: "warning",
          section,
          message: `Duplicate bullet detected: "${line.slice(0, 50)}..." appears in both ${seenBullets.get(normalized)} and ${location}.`,
        });
      } else {
        seenBullets.set(normalized, location);
      }
    });
  };

  data.experience?.forEach((exp) => {
    scanBullets(exp.description || "", `${exp.role} at ${exp.company}`, "experience");
  });

  data.projects?.forEach((proj) => {
    scanBullets(proj.description || "", `Project: ${proj.name}`, "projects");
  });

  // 4. Skills Section Check
  if (!data.skills || data.skills.length === 0) {
    warnings.push({
      type: "warning",
      section: "skills",
      message: "No technical skills listed. ATS keyword matching requires skills.",
    });
  }

  // 5. Verification against original data (check for unsupported invented employers)
  if (originalData?.experience) {
    const originalCompanies = new Set(
      originalData.experience.map((e) => e.company.toLowerCase().trim()).filter(Boolean)
    );

    data.experience?.forEach((exp) => {
      const compLower = exp.company.toLowerCase().trim();
      if (compLower && !originalCompanies.has(compLower)) {
        warnings.push({
          type: "warning",
          section: "experience",
          message: `Company "${exp.company}" was not found in candidate source profile. Ensure this is supported by candidate history.`,
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    canExport: errors.length === 0,
    errors,
    warnings,
  };
}
