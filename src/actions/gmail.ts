"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface SyncEmailResult {
  id: string;
  from: string;
  subject: string;
  extractedStatus: string;
  companyName: string;
  actionTaken: string;
}

// Global flag simulation for OAuth (simulated in user session or DB metadata if needed)
let isGmailConnectedSimulated = false;

export async function getGmailConnectionStatus(): Promise<boolean> {
  return isGmailConnectedSimulated;
}

export async function toggleGmailConnection(connect: boolean): Promise<boolean> {
  isGmailConnectedSimulated = connect;
  return isGmailConnectedSimulated;
}

/**
 * Scans a simulated Gmail inbox for interview invites, OAs, rejections, and confirmations.
 * Updates matching tracked applications in the database.
 */
export async function syncGmailInbox(): Promise<{
  success: boolean;
  emailsProcessed?: SyncEmailResult[];
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

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return { success: false, error: "Profile not found." };
    }

    // Connect check
    if (!isGmailConnectedSimulated) {
      return { success: false, error: "Gmail is not integrated. Connect under Settings first." };
    }

    // Mock incoming emails representing portals confirmations
    const mockEmails = [
      {
        id: "email-1",
        from: "careers@google.com",
        subject: "Thank you for applying to Google!",
        companyName: "Google",
        extractedStatus: "Applied",
        dbStatus: "APPLIED",
        notes: "Auto-synced from Google Application confirmation email.",
      },
      {
        id: "email-2",
        from: "interview@vercel.com",
        subject: "Interview Invitation: Senior Frontend Engineer at Vercel",
        companyName: "Vercel",
        extractedStatus: "Interview",
        dbStatus: "INTERVIEW",
        notes: "Auto-synced: Vercel Technical Interview scheduled for next Monday at 10:00 AM.",
      },
      {
        id: "email-3",
        from: "tests@stripe.com",
        subject: "Stripe Online Assessment Invitation",
        companyName: "Stripe",
        extractedStatus: "OA",
        dbStatus: "SCREENING",
        notes: "[OA] Auto-synced: Stripe OA received. Please complete within 48 hours.",
      },
      {
        id: "email-4",
        from: "hr@supabase.com",
        subject: "AI Job Agent: Offer details from Supabase",
        companyName: "Supabase",
        extractedStatus: "Offer",
        dbStatus: "OFFER",
        notes: "Auto-synced: Supabase Offer received! $120k base compensation.",
      },
    ];

    const emailsProcessed: SyncEmailResult[] = [];

    for (const email of mockEmails) {
      // Find if we have this tracked application in database
      const existing = await prisma.jobApplication.findFirst({
        where: {
          profileId: profile.id,
          companyName: email.companyName,
        },
      });

      if (existing) {
        // Update existing application
        await prisma.jobApplication.update({
          where: { id: existing.id },
          data: {
            status: email.dbStatus as any,
            notes: email.notes,
            appliedAt: email.dbStatus === "APPLIED" ? new Date() : existing.appliedAt,
          },
        });

        emailsProcessed.push({
          id: email.id,
          from: email.from,
          subject: email.subject,
          extractedStatus: email.extractedStatus,
          companyName: email.companyName,
          actionTaken: `Updated status to "${email.extractedStatus}"`,
        });
      } else {
        // Create new application in DB
        await prisma.jobApplication.create({
          data: {
            profileId: profile.id,
            companyName: email.companyName,
            jobTitle: "Software Engineer",
            status: email.dbStatus as any,
            notes: email.notes,
            location: "Remote",
            salary: "$120,000",
            appliedAt: new Date(),
          },
        });

        emailsProcessed.push({
          id: email.id,
          from: email.from,
          subject: email.subject,
          extractedStatus: email.extractedStatus,
          companyName: email.companyName,
          actionTaken: `Created new application under "${email.extractedStatus}"`,
        });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/applications");
    return {
      success: true,
      emailsProcessed,
    };
  } catch (err: any) {
    console.error("Error in syncGmailInbox:", err);
    return { success: false, error: err.message };
  }
}
