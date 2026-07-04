"use client";

import { useEffect, useState } from "react";
import { getApplications, type JobApplicationUI } from "@/actions/applications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Calendar, Video, CalendarX } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Interview {
  id: string;
  companyName: string;
  jobTitle: string;
  scheduledAt: string;
}

export function UpcomingInterviews() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getApplications().then((apps) => {
      // Show applications with Interview or HR Round status as "upcoming"
      const interviewApps = apps
        .filter((a) => a.status === "Interview" || a.status === "HR Round")
        .slice(0, 3)
        .map((a) => ({
          id: a.id,
          companyName: a.companyName,
          jobTitle: a.jobTitle,
          scheduledAt: a.appliedAt || a.updatedAt,
        }));
      setInterviews(interviewApps);
      setIsLoading(false);
    });
  }, []);

  return (
    <Card className="transition-all hover:shadow-md border-muted/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Upcoming Interviews</CardTitle>
          <Calendar className="h-4 w-4 text-accent" />
        </div>
        <CardDescription>Your scheduled sessions</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : interviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground gap-2">
            <CalendarX className="h-8 w-8 opacity-30" />
            <p className="font-medium">No interviews scheduled</p>
            <p className="text-[11px]">Applications in Interview stage will appear here</p>
            <Link
              href="/applications"
              className={cn(buttonVariants({ variant: "outline", size: "xs" }), "mt-1 text-[11px] h-7 gap-1")}
            >
              <Video className="h-3 w-3" />
              Track Applications
            </Link>
          </div>
        ) : (
          <div className="relative pl-4 border-l border-muted space-y-6">
            {interviews.map((interview) => (
              <div key={interview.id} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-accent group-hover:scale-110 transition-transform" />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold truncate leading-none">
                      {interview.companyName}
                    </h4>
                    <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded bg-muted whitespace-nowrap">
                      Interview
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">{interview.jobTitle}</p>
                  <Link
                    href="/applications"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "xs" }),
                      "w-full mt-2 gap-1 bg-accent/5 hover:bg-accent/10 text-accent border-accent/20 hover:border-accent/30 transition-all font-medium text-[11px] h-7"
                    )}
                  >
                    <Video className="h-3.5 w-3.5 shrink-0" />
                    View Application
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
