export type ApplicationStatus =
  | "DRAFT"
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export interface Profile {
  id: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobApplication {
  id: string;
  profileId: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string | null;
  location: string | null;
  salary: string | null;
  status: ApplicationStatus;
  notes: string | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Resume {
  id: string;
  profileId: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
