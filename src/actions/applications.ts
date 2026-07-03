"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type UIStatus =
  | "Applied"
  | "Under Review"
  | "OA"
  | "Interview"
  | "HR Round"
  | "Offer"
  | "Rejected"
  | "Withdrawn";

export interface JobApplicationUI {
  id: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string | null;
  location: string | null;
  salary: string | null;
  status: UIStatus;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Mapper Functions ────────────────────────────────────────────────────────

function mapDbToUI(app: any): JobApplicationUI {
  const notes = app.notes || "";
  let uiStatus: UIStatus = "Applied";

  if (app.status === "APPLIED") {
    uiStatus = "Applied";
  } else if (app.status === "SCREENING") {
    if (notes.includes("[OA]")) {
      uiStatus = "OA";
    } else {
      uiStatus = "Under Review";
    }
  } else if (app.status === "INTERVIEW") {
    if (notes.includes("[HR]")) {
      uiStatus = "HR Round";
    } else {
      uiStatus = "Interview";
    }
  } else if (app.status === "OFFER") {
    uiStatus = "Offer";
  } else if (app.status === "REJECTED") {
    uiStatus = "Rejected";
  } else if (app.status === "WITHDRAWN") {
    uiStatus = "Withdrawn";
  }

  // Remove helper tags from UI notes to keep it clean
  const cleanNotes = notes
    .replace("[OA] ", "")
    .replace("[OA]", "")
    .replace("[HR] ", "")
    .replace("[HR]", "")
    .trim();

  return {
    id: app.id,
    companyName: app.companyName,
    jobTitle: app.jobTitle,
    jobUrl: app.jobUrl,
    location: app.location,
    salary: app.salary,
    status: uiStatus,
    notes: cleanNotes || null,
    appliedAt: app.appliedAt ? app.appliedAt.toISOString().split("T")[0] : null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

function mapUIToDb(uiStatus: UIStatus, rawNotes: string | null): { status: any; notes: string } {
  const clean = rawNotes || "";
  if (uiStatus === "Applied") {
    return { status: "APPLIED", notes: clean };
  }
  if (uiStatus === "Under Review") {
    return { status: "SCREENING", notes: clean };
  }
  if (uiStatus === "OA") {
    return { status: "SCREENING", notes: `[OA] ${clean}`.trim() };
  }
  if (uiStatus === "Interview") {
    return { status: "INTERVIEW", notes: clean };
  }
  if (uiStatus === "HR Round") {
    return { status: "INTERVIEW", notes: `[HR] ${clean}`.trim() };
  }
  if (uiStatus === "Offer") {
    return { status: "OFFER", notes: clean };
  }
  if (uiStatus === "Rejected") {
    return { status: "REJECTED", notes: clean };
  }
  if (uiStatus === "Withdrawn") {
    return { status: "WITHDRAWN", notes: clean };
  }
  return { status: "APPLIED", notes: clean };
}

// Helper to get authenticated profile
async function getProfile() {
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

// ─── CRUD Actions ────────────────────────────────────────────────────────────

export async function getApplications(): Promise<JobApplicationUI[]> {
  try {
    const profile = await getProfile();

    const dbApps = await prisma.jobApplication.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return dbApps.map(mapDbToUI);
  } catch (err) {
    console.error("Error in getApplications:", err);
    return [];
  }
}

export async function createApplication(data: {
  companyName: string;
  jobTitle: string;
  jobUrl?: string;
  location?: string;
  salary?: string;
  status: UIStatus;
  notes?: string;
}) {
  try {
    const profile = await getProfile();
    const mapped = mapUIToDb(data.status, data.notes || "");

    const newApp = await prisma.jobApplication.create({
      data: {
        profileId: profile.id,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        jobUrl: data.jobUrl || null,
        location: data.location || null,
        salary: data.salary || null,
        status: mapped.status,
        notes: mapped.notes || null,
        appliedAt: data.status !== "Withdrawn" ? new Date() : null,
      },
    });

    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return { success: true, application: mapDbToUI(newApp) };
  } catch (err: any) {
    console.error("Error in createApplication:", err);
    return { success: false, error: err.message };
  }
}

export async function updateApplicationStatus(id: string, newStatus: UIStatus) {
  try {
    const profile = await getProfile();

    // Fetch existing first to retain notes mapping
    const existing = await prisma.jobApplication.findFirst({
      where: { id, profileId: profile.id },
    });

    if (!existing) {
      throw new Error("Application not found.");
    }

    const mapped = mapUIToDb(newStatus, existing.notes);

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: {
        status: mapped.status,
        notes: mapped.notes,
        appliedAt: newStatus === "Applied" && !existing.appliedAt ? new Date() : existing.appliedAt,
      },
    });

    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return { success: true, application: mapDbToUI(updated) };
  } catch (err: any) {
    console.error("Error in updateApplicationStatus:", err);
    return { success: false, error: err.message };
  }
}

export async function updateApplicationDetails(
  id: string,
  data: {
    companyName: string;
    jobTitle: string;
    jobUrl?: string;
    location?: string;
    salary?: string;
    notes?: string;
  }
) {
  try {
    const profile = await getProfile();
    
    const existing = await prisma.jobApplication.findFirst({
      where: { id, profileId: profile.id },
    });

    if (!existing) {
      throw new Error("Application not found.");
    }

    // Map UIStatus to retrieve base status details
    const uiObj = mapDbToUI(existing);
    const mapped = mapUIToDb(uiObj.status, data.notes || "");

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: {
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        jobUrl: data.jobUrl || null,
        location: data.location || null,
        salary: data.salary || null,
        notes: mapped.notes || null,
      },
    });

    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return { success: true, application: mapDbToUI(updated) };
  } catch (err: any) {
    console.error("Error in updateApplicationDetails:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteApplication(id: string) {
  try {
    const profile = await getProfile();

    await prisma.jobApplication.deleteMany({
      where: { id, profileId: profile.id },
    });

    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteApplication:", err);
    return { success: false, error: err.message };
  }
}

// ─── Analytics Actions ───────────────────────────────────────────────────────

export interface TrackerAnalytics {
  total: number;
  funnel: { status: UIStatus; count: number }[];
  interviewRate: number; // percentage of applied that reach interview rounds
  offerRate: number; // percentage of interviews that reach offers
}

export async function getApplicationsAnalytics(): Promise<TrackerAnalytics> {
  try {
    const list = await getApplications();
    const total = list.length;

    const statuses: UIStatus[] = [
      "Applied",
      "Under Review",
      "OA",
      "Interview",
      "HR Round",
      "Offer",
      "Rejected",
      "Withdrawn",
    ];

    const funnel = statuses.map((status) => ({
      status,
      count: list.filter((a) => a.status === status).length,
    }));

    // Interview count = Interview + HR Round
    const interviewCount = list.filter((a) => a.status === "Interview" || a.status === "HR Round").length;
    // Offer count
    const offerCount = list.filter((a) => a.status === "Offer").length;

    const appliedOrMore = list.filter((a) => a.status !== "Withdrawn").length;

    const interviewRate = appliedOrMore > 0 ? Math.round((interviewCount / appliedOrMore) * 100) : 0;
    const offerRate = interviewCount > 0 ? Math.round((offerCount / interviewCount) * 100) : 0;

    return {
      total,
      funnel,
      interviewRate,
      offerRate,
    };
  } catch (err) {
    console.error("Error in getApplicationsAnalytics:", err);
    return {
      total: 0,
      funnel: [],
      interviewRate: 0,
      offerRate: 0,
    };
  }
}
