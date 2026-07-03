import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Briefcase, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Application {
  id: string;
  companyName: string;
  jobTitle: string;
  status: "DRAFT" | "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | "WITHDRAWN";
  appliedAt: string;
  score: number;
}

const mockApplications: Application[] = [
  {
    id: "1",
    companyName: "Vercel",
    jobTitle: "Senior Frontend Engineer",
    status: "INTERVIEW",
    appliedAt: "2 hours ago",
    score: 92,
  },
  {
    id: "2",
    companyName: "OpenAI",
    jobTitle: "AI Integration Lead",
    status: "SCREENING",
    appliedAt: "1 day ago",
    score: 87,
  },
  {
    id: "3",
    companyName: "Figma",
    jobTitle: "Product Engineer",
    status: "APPLIED",
    appliedAt: "3 days ago",
    score: 79,
  },
  {
    id: "4",
    companyName: "Netflix",
    jobTitle: "Software Engineer II",
    status: "REJECTED",
    appliedAt: "1 week ago",
    score: 64,
  },
];

const statusStyles: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-transparent",
  APPLIED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent",
  SCREENING: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-transparent",
  INTERVIEW: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-transparent",
  OFFER: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
  REJECTED: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-transparent",
  WITHDRAWN: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
};

export function RecentApplicationsTable() {
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
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-muted/70 text-muted-foreground text-xs font-semibold">
                <th className="pb-3 px-6">Company</th>
                <th className="pb-3 px-4">Role</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4">Score</th>
                <th className="pb-3 px-6 text-right">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/40">
              {mockApplications.map((app) => (
                <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                  {/* Company Info */}
                  <td className="py-3 px-6 flex items-center gap-3 font-semibold">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                      {app.companyName[0]}
                    </div>
                    <span className="truncate max-w-[120px]">{app.companyName}</span>
                  </td>

                  {/* Job Title */}
                  <td className="py-3 px-4 text-muted-foreground truncate max-w-[160px]">
                    {app.jobTitle}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={`font-semibold capitalize text-[10px] ${statusStyles[app.status]}`}>
                      {app.status.toLowerCase()}
                    </Badge>
                  </td>

                  {/* Compatibility Score */}
                  <td className="py-3 px-4 font-bold">
                    <span
                      className={
                        app.score >= 85
                          ? "text-emerald-600 dark:text-emerald-400"
                          : app.score >= 70
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {app.score}%
                    </span>
                  </td>

                  {/* Date Applied */}
                  <td className="py-3 px-6 text-right text-muted-foreground text-xs font-medium">
                    {app.appliedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
