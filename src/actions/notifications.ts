"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface DashboardNotification {
  id: string;
  type: "job" | "success" | "ats" | "interview" | "failure" | "reminder";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface DailySummaryData {
  totalSubmitted: number;
  newMatches: number;
  upcomingInterviewsCount: number;
  atsImprovementAverage: number;
  emailSentAddress: string;
}

// In-memory mock notification store that gets loaded for the session
let sessionNotifications: DashboardNotification[] = [
  {
    id: "notif-1",
    type: "interview",
    title: "Vercel Interview Scheduled",
    message: "Technical screening for Senior Frontend Engineer next Monday at 10 AM.",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "notif-2",
    type: "job",
    title: "New 94% Match Found",
    message: "Staff Developer Advocate position at Airbnb matches your primary skills.",
    time: "4 hours ago",
    read: false,
  },
  {
    id: "notif-3",
    type: "ats",
    title: "ATS score improved to 95%",
    message: "Stripe customized resume optimized. Added missing keywords 'Kubernetes' and 'AWS'.",
    time: "1 day ago",
    read: true,
  },
  {
    id: "notif-4",
    type: "success",
    title: "Agent applied successfully",
    message: "Autonomous submission confirmed at Stripe. Status tracked.",
    time: "2 days ago",
    read: true,
  },
];

export async function getUserNotifications(): Promise<{
  success: boolean;
  notifications: DashboardNotification[];
}> {
  return {
    success: true,
    notifications: sessionNotifications,
  };
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  sessionNotifications = sessionNotifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  return true;
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
  sessionNotifications = sessionNotifications.map((n) => ({ ...n, read: true }));
  return true;
}

/**
 * Triggers a compiled Daily Summary Email digest simulation.
 */
export async function triggerDailySummaryEmail(): Promise<{
  success: boolean;
  summary?: DailySummaryData;
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

    const totalApps = await prisma.jobApplication.count({
      where: { profileId: profile.id },
    });

    return {
      success: true,
      summary: {
        totalSubmitted: totalApps,
        newMatches: 8,
        upcomingInterviewsCount: 2,
        atsImprovementAverage: 92,
        emailSentAddress: user.email || "john.doe@gmail.com",
      },
    };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: err.message };
  }
}
