import { prisma } from "@/lib/prisma";

/**
 * Ensures that a user profile exists in the public.profiles database table
 * corresponding to the authenticated Supabase user ID.
 * Returns the existing or newly created profile.
 */
export async function syncUserProfile(
  userId: string,
  fullName?: string | null,
  avatarUrl?: string | null
) {
  try {
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      // Profile exists. Update default properties if missing
      const updateData: { fullName?: string; avatarUrl?: string } = {};
      if (!existingProfile.fullName && fullName) {
        updateData.fullName = fullName;
      }
      if (!existingProfile.avatarUrl && avatarUrl) {
        updateData.avatarUrl = avatarUrl;
      }

      if (Object.keys(updateData).length > 0) {
        return await prisma.profile.update({
          where: { userId },
          data: updateData,
        });
      }
      return existingProfile;
    }

    // Create a new profile record
    return await prisma.profile.create({
      data: {
        userId,
        fullName: fullName || null,
        avatarUrl: avatarUrl || null,
      },
    });
  } catch (error) {
    console.error("Error in syncUserProfile:", error);
    return null;
  }
}
