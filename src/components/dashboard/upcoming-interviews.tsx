import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Calendar, Video, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Interview {
  id: string;
  companyName: string;
  jobTitle: string;
  interviewer: string;
  scheduledAt: string;
  type: string;
  meetingUrl?: string;
}

const mockInterviews: Interview[] = [
  {
    id: "1",
    companyName: "Google",
    jobTitle: "Senior Software Engineer",
    interviewer: "Sundar Pichai (Tech Screen)",
    scheduledAt: "July 8, 2026 at 2:00 PM",
    type: "Google Meet",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
  },
  {
    id: "2",
    companyName: "Stripe",
    jobTitle: "Frontend Architect",
    interviewer: "John Collison (Design Interview)",
    scheduledAt: "July 12, 2026 at 10:30 AM",
    type: "Zoom",
    meetingUrl: "https://zoom.us/j/123456789",
  },
];

export function UpcomingInterviews() {
  return (
    <Card className="transition-all hover:shadow-md border-muted/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Upcoming Interviews</CardTitle>
          <Calendar className="h-4 w-4 text-violet-500" />
        </div>
        <CardDescription>Your scheduled sessions</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {mockInterviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
            <p>No upcoming interviews scheduled.</p>
          </div>
        ) : (
          <div className="relative pl-4 border-l border-muted space-y-6">
            {mockInterviews.map((interview) => (
              <div key={interview.id} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-violet-600 group-hover:scale-110 transition-transform" />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold truncate leading-none">
                      {interview.companyName}
                    </h4>
                    <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded bg-muted whitespace-nowrap">
                      {interview.type}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-tight">
                    {interview.jobTitle}
                  </p>
                  <p className="text-[11px] font-medium text-foreground/80 flex items-center gap-1">
                    <span className="text-muted-foreground">With:</span> {interview.interviewer}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{interview.scheduledAt}</p>

                  {interview.meetingUrl && (
                    <Link
                      href={interview.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "xs" }),
                        "w-full mt-2 gap-1 bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:border-violet-500/30 transition-all font-medium text-[11px] h-7"
                      )}
                    >
                      <Video className="h-3.5 w-3.5 shrink-0" />
                      Join Meeting
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
