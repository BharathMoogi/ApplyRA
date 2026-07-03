"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// structured data schema definition matching database JSON string
export interface ResumePersonalDetails {
  name: string;
  email: string;
  phone: string;
  website: string;
}

export interface ResumeWorkExperience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface ResumeEducation {
  school: string;
  degree: string;
  year: string;
}

export interface StructuredResumeData {
  personal: ResumePersonalDetails;
  experience: ResumeWorkExperience[];
  education: ResumeEducation[];
  skills: string[];
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
 * Simulates uploading and parsing a PDF/DOCX resume file.
 * Returns the created database resume record.
 */
export async function uploadResume(fileName: string, fileSize: number) {
  try {
    const profile = await getAuthenticatedProfile();

    // Check if it's the first resume, if so make it default
    const count = await prisma.resume.count({
      where: { profileId: profile.id },
    });
    const isDefault = count === 0;

    // Extract name from file, e.g. "Jane_Doe_CV.pdf" -> "Jane Doe"
    const cleanedName = fileName
      .replace(/\.[^/.]+$/, "") // remove extension
      .replace(/[_-]/g, " ") // replace underscores/dashes
      .trim();

    // Generate mock AI parsed structured details based on file name
    const mockParsedData: StructuredResumeData = {
      personal: {
        name: cleanedName || "John Doe",
        email: profile.fullName ? `${cleanedName.toLowerCase().replace(/\s+/g, ".")}@example.com` : "john.doe@example.com",
        phone: "+1 (555) 019-2834",
        website: `https://${cleanedName.toLowerCase().replace(/\s+/g, "") || "portfolio"}.dev`,
      },
      experience: [
        {
          company: "Enterprise Software Labs",
          role: "Senior Full Stack Engineer",
          duration: "2023 - Present",
          description: "Led development of core responsive UI using Next.js, Tailwind CSS and PostgreSQL. Boosted system performance by 35%.",
        },
        {
          company: "Interactive Agency Inc.",
          role: "Frontend Developer",
          duration: "2021 - 2023",
          description: "Engineered web applications utilizing React and TypeScript. Collaborated with designers to deliver modern interface visuals.",
        },
      ],
      education: [
        {
          school: "State University of Tech",
          degree: "B.S. in Computer Science",
          year: "2021",
        },
      ],
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js", "Prisma", "PostgreSQL", "Supabase", "Git"],
    };

    // Save record to DB
    const resume = await prisma.resume.create({
      data: {
        profileId: profile.id,
        title: fileName,
        fileUrl: `/uploads/${Date.now()}_${fileName}`,
        isDefault,
        content: JSON.stringify(mockParsedData),
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
