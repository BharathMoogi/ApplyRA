"use client";

import { useEffect, useState } from "react";
import { getApplications, type JobApplicationUI } from "@/actions/applications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Briefcase, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const statusStyles: Record<string, string> = {
  Applied: "bg-primary/10 text-primary border-transparent",
  "Under Review": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
  OA: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent",
  Interview: "bg-accent/10 text-accent border-transparent",
  "HR Round": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-transparent",
  Offer: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
  Rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-transparent",
  Withdrawn: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-transparent",
};

export function RecentApplicationsTable() {
  const [applications, setApplications] = useState<JobApplicationUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getApplications()
      .then((apps) => setApplications(apps.slice(0, 5)))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <Card className="transition-all hover:shadow-md border-muted/50 w-full">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
          <CardDescription>Your latest job submissions</CardDescription>
        </div>
        <Link
          href="/applications"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs gap-1")}
        >
          View All
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="space-y-3 px-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Briefcase className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No applications yet</p>
            <p className="text-xs mt-1">Start tracking jobs from the Applications page</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-muted/70 text-muted-foreground text-xs font-semibold">
                  <th className="pb-3 px-6">Company</th>
                  <th className="pb-3 px-4">Role</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-6 text-right">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/40">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-6 flex items-center gap-3 font-semibold">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                        {app.companyName[0]?.toUpperCase()}
                      </div>
                      <span className="truncate max-w-[120px]">{app.companyName}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground truncate max-w-[160px]">
                      {app.jobTitle}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={`font-semibold capitalize text-[10px] ${statusStyles[app.status] || ""}`}>
                        {app.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-6 text-right text-muted-foreground text-xs font-medium">
                      {app.createdAt
                        ? formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
