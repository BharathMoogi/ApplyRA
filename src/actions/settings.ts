"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface SettingsPreferences {
  preferredRoles: string[];
  salaryExpectations: string;
  preferredLocations: string[];
  skills: string[];
  experienceYears: number;
  remotePreferences: "Remote" | "Hybrid" | "Onsite" | "Hybrid/Remote";
  resumeTemplate: "Elegant Tech" | "Modern Creative" | "Minimalist Classic";
  openaiApiKey: string;
  emailDigest: boolean;
  pushNotifications: boolean;
  autoApplyScore: number;
  autoGenerateCoverLetter: boolean;
}

export interface UserSettingsResponse {
  fullName: string;
  website: string;
  linkedinUrl: string;
  githubUrl: string;
  preferences: SettingsPreferences;
}

const DEFAULT_PREFERENCES: SettingsPreferences = {
  preferredRoles: ["Senior Frontend Engineer", "React Developer", "UI Engineer"],
  salaryExpectations: "$130k - $160k",
  preferredLocations: ["San Francisco, CA", "Remote"],
  skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"],
  experienceYears: 5,
  remotePreferences: "Hybrid/Remote",
  resumeTemplate: "Elegant Tech",
  openaiApiKey: "sk-proj-simulated",
  emailDigest: true,
  pushNotifications: true,
  autoApplyScore: 85,
  autoGenerateCoverLetter: true,
};

/**
 * Fetches user profile columns and serializes the JSON metadata payload from the bio field.
 */
export async function getSettingsMetadata(): Promise<{
  success: boolean;
  settings?: UserSettingsResponse;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    let profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      // Auto-fallback syncer
      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          fullName: user.user_metadata?.full_name || "John Doe",
          location: "San Francisco, CA",
        },
      });
    }

    let parsedPreferences = { ...DEFAULT_PREFERENCES };

    if (profile.bio) {
      try {
        const json = JSON.parse(profile.bio);
        parsedPreferences = { ...DEFAULT_PREFERENCES, ...json };
      } catch (e) {
        // Bio is plain text, keep defaults
      }
    }

    return {
      success: true,
      settings: {
        fullName: profile.fullName || "",
        website: profile.website || "",
        linkedinUrl: profile.linkedinUrl || "",
        githubUrl: profile.githubUrl || "",
        preferences: parsedPreferences,
      },
    };
  } catch (err: any) {
    console.error("Error in getSettingsMetadata:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Commits profile columns directly and packs settings meta into the Profile.bio text field.
 */
export async function updateSettingsMetadata(data: {
  fullName: string;
  website: string;
  linkedinUrl: string;
  githubUrl: string;
  preferences: SettingsPreferences;
}): Promise<{ success: boolean; error?: string }> {
  try {
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
      return { success: false, error: "Profile not found" };
    }

    // Serialize preferences into bio
    const bioJsonString = JSON.stringify(data.preferences);

    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        fullName: data.fullName,
        website: data.website,
        linkedinUrl: data.linkedinUrl,
        githubUrl: data.githubUrl,
        bio: bioJsonString,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/profile");
    return { success: true };
  } catch (err: any) {
    console.error("Error in updateSettingsMetadata:", err);
    return { success: false, error: err.message };
  }
}
