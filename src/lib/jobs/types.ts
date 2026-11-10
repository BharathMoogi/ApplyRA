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
  atsScore: number; // 0 - 100 estimated relevance score
  postedAt: string;
  source: string; // e.g. "LinkedIn", "Indeed", "Glassdoor", "JSearch"
  jobUrl: string;
  matchingSkills?: string[];
  missingSkills?: string[];
  matchExplanation?: string;
}

export interface JobSearchFilters {
  location?: string;
  experience?: string; // "all" | "Fresher" | "0-1" | "1-3" | "3-5" | "5+"
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
