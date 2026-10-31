"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { classifyResumeOccupation } from "@/lib/ml/classifier";

export async function classifyResume(
  resumeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) return { success: false, error: "Profile not found" };

    // Verify ownership
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, profileId: profile.id },
    });
    if (!resume) return { success: false, error: "Resume not found" };

    // Build text to classify: prefer rawText, fall back to structured content
    const textToClassify =
      resume.rawText ||
      (() => {
        if (!resume.content) return "";
        try {
          const d = JSON.parse(resume.content);
          const parts: string[] = [];
          if (d.summary) parts.push(d.summary);
          (d.experience || []).forEach((e: { role?: string; company?: string; description?: string }) => {
            parts.push(`${e.role ?? ""} at ${e.company ?? ""}`);
            if (e.description) parts.push(e.description);
          });
          (d.skills || []).forEach((s: string) => parts.push(s));
          (d.projects || []).forEach((p: { name?: string; description?: string }) => {
            if (p.name) parts.push(p.name);
            if (p.description) parts.push(p.description);
          });
          return parts.join("\n");
        } catch {
          return "";
        }
      })();

    if (!textToClassify.trim()) {
      return {
        success: false,
        error: "No resume text available to classify",
      };
    }

    // Mark as PENDING
    await prisma.resume.update({
      where: { id: resumeId },
      data: { classificationStatus: "PENDING", classificationError: null },
    });

    const result = await classifyResumeOccupation(textToClassify);

    if (result.success) {
      await prisma.resume.update({
        where: { id: resumeId },
        data: {
          occupationCategory: result.data.predictedOccupation,
          occupationConfidence: result.data.confidence,
          occupationAlternatives: result.data.topPredictions as any,
          classificationStatus: "COMPLETED",
          classifiedAt: new Date(),
          classificationError: null,
        },
      });
    } else {
      await prisma.resume.update({
        where: { id: resumeId },
        data: {
          classificationStatus: result.notConfigured ? "NOT_RUN" : "FAILED",
          classificationError: result.error,
        },
      });
      return { success: false, error: result.error };
    }

    revalidatePath("/resumes");
    return { success: true };
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[classifyResume]", err);
    return { success: false, error: error.message ?? "Unknown error" };
  }
}
