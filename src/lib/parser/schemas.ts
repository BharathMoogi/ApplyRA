import { z } from "zod";

export const PersonalDetailsSchema = z.object({
  name: z.string().describe("The full name of the person"),
  email: z.string().email().optional().describe("The email address of the person"),
  phone: z.string().optional().describe("The phone number of the person"),
  website: z.string().optional().describe("A personal website or URL"),
  linkedin: z.string().optional().describe("LinkedIn profile URL"),
  github: z.string().optional().describe("GitHub profile URL"),
  portfolio: z.string().optional().describe("Portfolio URL"),
  location: z.string().optional().describe("Location, e.g. City, State or Country")
});

export const WorkExperienceSchema = z.object({
  company: z.string().describe("The name of the company or organization"),
  role: z.string().describe("The job title or role"),
  duration: z.string().describe("The time period worked (e.g., 'Jan 2020 - Present')"),
  description: z.string().describe("A detailed description of the responsibilities and achievements in this role"),
  location: z.string().optional().describe("Location of the job"),
  employmentType: z.string().optional().describe("E.g. Full-time, Part-time, Contract, Internship")
});

export const EducationSchema = z.object({
  school: z.string().describe("The name of the educational institution"),
  degree: z.string().describe("The degree received (e.g. B.Tech, M.S.)"),
  year: z.string().describe("The graduation year or duration"),
  fieldOfStudy: z.string().optional().describe("Field of study / major"),
  grade: z.string().optional().describe("CGPA or percentage grade"),
  startDate: z.string().optional().describe("Start date"),
  endDate: z.string().optional().describe("End date or expected graduation"),
  coursework: z.array(z.string()).optional().describe("Relevant coursework list")
});

export const ProjectSchema = z.object({
  name: z.string().describe("Project name"),
  description: z.string().describe("Project description"),
  technologies: z.array(z.string()).optional().describe("Technologies used in project"),
  duration: z.string().optional().describe("Duration of the project"),
  githubUrl: z.string().optional().describe("GitHub repository URL"),
  liveUrl: z.string().optional().describe("Live demo URL")
});

export const CertificationSchema = z.object({
  name: z.string().describe("Certification name"),
  issuer: z.string().describe("Issuing organization"),
  issueDate: z.string().optional().describe("Issue date"),
  expiryDate: z.string().optional().describe("Expiry date if any"),
  credentialUrl: z.string().optional().describe("Credential URL")
});

export const AchievementSchema = z.object({
  title: z.string().describe("Achievement title"),
  category: z.enum(["Award", "Leadership", "Competition", "Sport", "Publication", "Extracurricular", "Other"]).describe("Category of achievement"),
  description: z.string().describe("Details of the achievement"),
  date: z.string().optional().describe("Date of achievement")
});

export const CustomSectionSchema = z.object({
  name: z.string().describe("Custom section name (e.g. Languages, Hobbies)"),
  content: z.array(z.string()).describe("Bullet points or content list for this section")
});

export const SkillsSchema = z.object({
  skills: z.array(z.string()).describe("A list of individual skills (e.g., 'JavaScript', 'Project Management')"),
});

export const FullResumeSchema = z.object({
  personal: PersonalDetailsSchema,
  summary: z.string().optional().describe("Professional summary or career objective"),
  experience: z.array(WorkExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(z.string()),
  projects: z.array(ProjectSchema).optional(),
  certifications: z.array(CertificationSchema).optional(),
  achievements: z.array(AchievementSchema).optional(),
  customSections: z.array(CustomSectionSchema).optional().describe("Any miscellaneous sections not fitting elsewhere")
});
