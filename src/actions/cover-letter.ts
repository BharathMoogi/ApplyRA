"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type StructuredResumeData } from "./resumes";

// Tech tags helper to match letter content details
const TECH_TERMS = [
  "React", "Next.js", "TypeScript", "JavaScript", "Node.js",
  "PostgreSQL", "Supabase", "Prisma", "Tailwind CSS", "Go", "Docker"
];

/**
 * Generates a tailored Cover Letter by pulling user profile details
 * and primary resume experiences, and matching them against the job description.
 */
export async function generateCoverLetter(
  companyName: string,
  jobTitle: string,
  jobDescription: string
): Promise<{ success: boolean; coverLetter?: string; error?: string }> {
  try {
    // 1. Fetch user profile
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return { success: false, error: "Profile not found." };
    }

    // 2. Fetch default resume details
    const defaultResume = await prisma.resume.findFirst({
      where: { profileId: profile.id, isDefault: true },
    });

    let skillsList = ["React", "TypeScript", "Next.js", "Tailwind CSS", "PostgreSQL"];
    let currentRole = "Software Engineer";
    let currentCompany = "Enterprise Software Labs";
    let currentDetails = "building responsive user interfaces and robust web APIs.";

    if (defaultResume && defaultResume.content) {
      try {
        const resumeData = JSON.parse(defaultResume.content) as StructuredResumeData;
        if (resumeData.skills && resumeData.skills.length > 0) {
          skillsList = resumeData.skills;
        }
        if (resumeData.experience && resumeData.experience.length > 0) {
          currentRole = resumeData.experience[0].role;
          currentCompany = resumeData.experience[0].company;
          currentDetails = resumeData.experience[0].description.split(".")[0] + ".";
        }
      } catch (err) {
        console.error("Failed to parse default resume content:", err);
      }
    }

    // 3. Scan job description for matching terms
    const descLower = jobDescription.toLowerCase();
    const matchingKeywords: string[] = [];
    TECH_TERMS.forEach((term) => {
      if (descLower.includes(term.toLowerCase()) && skillsList.some(s => s.toLowerCase() === term.toLowerCase())) {
        matchingKeywords.push(term);
      }
    });

    const skillsSentence = matchingKeywords.length > 0
      ? matchingKeywords.slice(0, 4).join(", ")
      : skillsList.slice(0, 4).join(", ");

    // 4. Assemble the cover letter structure
    const dateFormatted = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const userName = profile.fullName || "John Doe";
    const userLocation = profile.location || "San Francisco, CA";
    const userEmail = user.email || "john.doe@example.com";
    const userPhone = "+1 (555) 019-2834"; // mock contact detail

    const letterText = `${userName}
${userLocation}
${userEmail} | ${userPhone}

${dateFormatted}

Hiring Committee
${companyName}

Subject: Application for ${jobTitle}

Dear Hiring Team,

I am writing to express my strong interest in the ${jobTitle} position at ${companyName}, as advertised. With my solid background in full-stack web applications and hands-on experience utilizing modern technologies, I am confident that I can make a significant contribution to your development projects.

Currently, I serve as a ${currentRole} at ${currentCompany}, where my primary focus is on ${currentDetails.toLowerCase()} This experience has helped me refine my technical execution, particularly in architecting scalable layouts and maintaining high-performance codebases. 

Your job description highlights the need for expertise in tools that align perfectly with my skillset, including ${skillsSentence}. Throughout my career, I have consistently applied these frameworks to optimize user experiences, decrease build times, and scale transaction databases. I am excited to bring this same dedication and technical expertise to the engineering team at ${companyName}.

Thank you for your time and consideration. I welcome the opportunity to discuss how my qualifications, technical skills, and career achievements match your needs in a personal interview.

Sincerely,

${userName}`;

    return {
      success: true,
      coverLetter: letterText,
    };
  } catch (err: any) {
    console.error("Error in generateCoverLetter:", err);
    return { success: false, error: err.message };
  }
}
