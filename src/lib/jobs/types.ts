// Job types — these must be runtime-compatible for Turbopack app-rsc context
// (avoid pure interface-only modules; add at least one runtime export)

export type ExperienceLevel = "Fresher" | "Entry" | "Mid" | "Senior" | "Lead" | "Not Disclosed";

export type WorkMode = "Remote" | "Hybrid" | "On-site" | "All";

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  experience: ExperienceLevel;
  experienceYears?: string;
  workMode: "Remote" | "Hybrid" | "On-site" | "Not Disclosed";
  remote: boolean;
  skills: string[];
  description: string;
  atsScore: number;
  postedAt: string;
  source: string;
  jobUrl: string;
  matchingSkills?: string[];
  missingSkills?: string[];
  matchExplanation?: string;
}

export interface JobSearchFilters {
  location?: string;
  experience?: string;
  workMode?: WorkMode;
  remote?: boolean;
  company?: string;
  skills?: string[];
  minSalary?: number;
  minMatchScore?: number;
  datePosted?: "all" | "24h" | "7d" | "30d";
  source?: string;
  sortBy?: "best_match" | "newest" | "salary_high" | "salary_low";
}

export interface RawJobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string | null;
  experience?: ExperienceLevel;
  experienceYears?: string;
  workMode?: "Remote" | "Hybrid" | "On-site" | "Not Disclosed";
  remote?: boolean;
  skills?: string[];
  description: string;
  postedAt?: string;
  source: string;
  jobUrl: string;
}

export interface JobConnector {
  id: string;
  name: string;
  isAvailable: () => boolean;
  search(query: string, filters: JobSearchFilters, page?: number): Promise<RawJobListing[]>;
}

export interface ExtractedResumeSummary {
  resumeId: string;
  title: string;
  fullName?: string;
  targetRoles: string[];
  primaryCategory?: string;
  totalExperienceYears: number;
  experienceLevel: ExperienceLevel;
  skills: string[];
  topTechnologies: string[];
  educationDegrees: string[];
  certifications: string[];
  generatedQueries: string[];
}

// Runtime sentinel — required for Turbopack app-rsc to recognise this module's exports
export const JOB_TYPES_VERSION = "1" as const;
