"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import mammoth from "mammoth";

export interface ResumePersonalDetails {
  name: string;
  email: string;
  phone: string;
  website: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  location?: string;
}

export interface ResumeWorkExperience {
  company: string;
  role: string;
  duration: string;
  description: string;
  location?: string;
  employmentType?: string;
}

export interface ResumeEducation {
  school: string;
  degree: string;
  year: string;
  fieldOfStudy?: string;
  grade?: string;
  startDate?: string;
  endDate?: string;
  coursework?: string[];
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies?: string[];
  duration?: string;
  githubUrl?: string;
  liveUrl?: string;
}

export interface ResumeSkills {
  languages: string[];
  frameworks: string[];
  databases: string[];
  tools: string[];
  cloud: string[];
  other: string[];
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialUrl?: string;
}

export interface ResumeAchievement {
  title: string;
  category: "Award" | "Leadership" | "Competition" | "Sport" | "Publication" | "Extracurricular" | "Other";
  description: string;
  date?: string;
}

export interface StructuredResumeData {
  personal: ResumePersonalDetails;
  experience: ResumeWorkExperience[];
  education: ResumeEducation[];
  skills: string[];
  summary?: string;
  projects?: ResumeProject[];
  categorizedSkills?: ResumeSkills;
  certifications?: ResumeCertification[];
  achievements?: ResumeAchievement[];
}

// Helper to get authenticated profile
async function getAuthenticatedProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  return profile;
}

/**
 * Fetch all resumes for the authenticated user profile
 */
export async function getResumes() {
  try {
    const profile = await getAuthenticatedProfile();
    return await prisma.resume.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error in getResumes:", error);
    return [];
  }
}

/**
 * Uploads and parses a PDF/DOCX resume file using simple heuristics.
 * Returns the created database resume record.
 */
export async function uploadResume(formData: FormData) {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }
    const fileName = file.name;
    const profile = await getAuthenticatedProfile();

    // Check if it's the first resume, if so make it default
    const count = await prisma.resume.count({
      where: { profileId: profile.id },
    });
    const isDefault = count === 0;

    // Extract text from file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let parsedText = "";

    if (fileName.toLowerCase().endsWith(".pdf")) {
      parsedText = await new Promise<string>((resolve, reject) => {
        try {
          const PDFParser = require("pdf2json");
          const pdfParser = new PDFParser(null, 1);
          pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
          pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
          pdfParser.parseBuffer(buffer);
        } catch (e) {
          reject(e);
        }
      });
    } else if (fileName.toLowerCase().endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      parsedText = result.value;
    } else {
      return { success: false, error: "Unsupported file type." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const authName = user?.user_metadata?.full_name || profile.fullName || "Your Name";

    // Call the hybrid AI parser
    const { parseResumeHybrid } = await import('@/lib/parser');
    const parsedData = await parseResumeHybrid(parsedText, authName);

    // Fallback default image for website if empty
    if (!parsedData.personal.website) {
      parsedData.personal.website = "";
    }

    // Save record to DB
    const resume = await prisma.resume.create({
      data: {
        profileId: profile.id,
        title: fileName,
        fileUrl: `/uploads/${Date.now()}_${fileName}`,
        isDefault,
        content: JSON.stringify(parsedData),
      },
    });

    revalidatePath("/resumes");
    return { success: true, resume };
  } catch (error: any) {
    console.error("Error in uploadResume:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Switches the primary (default) resume for the user
 */
export async function setPrimaryResume(resumeId: string) {
  try {
    const profile = await getAuthenticatedProfile();

    // Run updates in transaction
    await prisma.$transaction([
      // Set all user's resumes to false
      prisma.resume.updateMany({
        where: { profileId: profile.id },
        data: { isDefault: false },
      }),
      // Set target to true
      prisma.resume.update({
        where: { id: resumeId },
        data: { isDefault: true },
      }),
    ]);

    revalidatePath("/resumes");
    return { success: true };
  } catch (error: any) {
    console.error("Error in setPrimaryResume:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a resume record
 */
export async function deleteResume(resumeId: string) {
  try {
    const profile = await getAuthenticatedProfile();

    // Fetch details to check if deleting the default one
    const target = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!target) {
      return { success: false, error: "Resume not found" };
    }

    await prisma.resume.delete({
      where: { id: resumeId },
    });

    // If we deleted the default one and there are remaining, pick one and make it default
    if (target.isDefault) {
      const firstRemaining = await prisma.resume.findFirst({
        where: { profileId: profile.id },
      });
      if (firstRemaining) {
        await prisma.resume.update({
          where: { id: firstRemaining.id },
          data: { isDefault: true },
        });
      }
    }

    revalidatePath("/resumes");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteResume:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Saves modified resume structured details back to content
 */
export async function updateResumeStructuredData(resumeId: string, structuredData: StructuredResumeData) {
  try {
    await getAuthenticatedProfile(); // verify authorization

    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        content: JSON.stringify(structuredData),
      },
    });

    revalidatePath("/resumes");
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateResumeStructuredData:", error);
    return { success: false, error: error.message };
  }
}
