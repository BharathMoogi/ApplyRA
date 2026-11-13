"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sparkles,
  MapPin,
  Banknote,
  Calendar,
  Send,
  Loader2,
  CheckCircle2,
  Briefcase,
  MonitorCheck,
  ExternalLink,
  Info,
} from "lucide-react";
import { applyToBookmarkedJob, type JobListing } from "@/actions/jobs";
import { cn } from "@/lib/utils";

interface JobDetailsDrawerProps {
  job: JobListing | null;
  isOpen: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  hasResume?: boolean;
  onBookmarkActionComplete?: () => void;
}

export function JobDetailsDrawer({
  job,
  isOpen,
  onClose,
  isBookmarked,
  hasResume,
  onBookmarkActionComplete,
}: JobDetailsDrawerProps) {
  const [isPromoting, setIsPromoting] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const handleTrackApplication = async () => {
    if (!job) return;
    setIsPromoting(true);
    try {
      const res = await applyToBookmarkedJob(job);
      if (res.success) {
        setIsApplied(true);
        if (onBookmarkActionComplete) {
          onBookmarkActionComplete();
        }
      } else {
        alert(res.error || "Failed to promote application status.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPromoting(false);
    }
  };

  if (!job) return null;

  // Use actual matching data if available (from resume scoring), otherwise derive from skills
  const matchingSkills = job.matchingSkills && job.matchingSkills.length > 0
    ? job.matchingSkills
    : job.skills.slice(0, Math.ceil(job.skills.length * 0.65));

  const missingSkills = job.missingSkills && job.missingSkills.length > 0
    ? job.missingSkills
    : job.skills.slice(Math.ceil(job.skills.length * 0.65));

  const matchScore = job.atsScore;
  let matchColor = "text-amber-600 dark:text-amber-400";
  let matchBg = "border-amber-500/20 bg-amber-500/[0.03]";
  if (matchScore >= 80) {
    matchColor = "text-emerald-600 dark:text-emerald-400";
    matchBg = "border-emerald-500/20 bg-emerald-500/[0.03]";
  } else if (matchScore < 60) {
    matchColor = "text-slate-600 dark:text-slate-400";
    matchBg = "border-slate-500/20 bg-slate-500/[0.03]";
  }

  // Work mode display
  const workModeStyle: Record<string, string> = {
    Remote: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    Hybrid: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    "On-site": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col h-full p-0">
        {/* Header */}
        <SheetHeader className="p-6 border-b shrink-0">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center font-bold text-sm text-primary border shrink-0">
              {(job.company || "?")[0].toUpperCase()}
            </div>
            <div className="space-y-1 min-w-0">
              <SheetTitle className="text-xl font-bold leading-tight truncate">{job.title}</SheetTitle>
              <SheetDescription className="text-xs font-semibold text-muted-foreground">
                {job.company} &bull; {job.location}
              </SheetDescription>
              {/* Quick badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {job.workMode && job.workMode !== "Not Disclosed" && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${workModeStyle[job.workMode] || "bg-muted text-muted-foreground"}`}>
                    {job.workMode}
                  </span>
                )}
                {job.experience && job.experience !== "Not Disclosed" && (
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                    {job.experience} Level
                    {job.experienceYears ? ` · ${job.experienceYears}` : ""}
                  </span>
                )}
                <span className="text-[10px] font-medium px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                  via {job.source}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Metadata Cards */}
          <div className="grid gap-3 grid-cols-3 text-center">
            <div className="border border-muted/50 rounded-xl p-3 bg-muted/5">
              <MapPin className="h-4 w-4 text-primary mx-auto mb-1" />
              <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Location</h5>
              <p className="text-xs font-semibold mt-0.5">{job.location}</p>
            </div>
            <div className="border border-muted/50 rounded-xl p-3 bg-muted/5">
              <Banknote className="h-4 w-4 text-primary mx-auto mb-1" />
              <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Salary</h5>
              <p className="text-xs font-semibold mt-0.5">{job.salary}</p>
            </div>
            <div className="border border-muted/50 rounded-xl p-3 bg-muted/5">
              <Calendar className="h-4 w-4 text-primary mx-auto mb-1" />
              <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Posted</h5>
              <p className="text-xs font-semibold mt-0.5">{job.postedAt}</p>
            </div>
          </div>

          {/* Match Score Card */}
          <div className={`border rounded-xl p-5 space-y-4 ${matchBg}`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-1.5 font-bold text-sm ${matchColor}`}>
                <Sparkles className="h-4 w-4" />
                {hasResume ? "Resume Match Analysis" : "Estimated Relevance"}
              </div>
              <div className="text-right">
                <span className={`text-2xl font-black ${matchColor}`}>{matchScore}%</span>
                <p className="text-[10px] text-muted-foreground">Estimated fit</p>
              </div>
            </div>

            {/* Score explanation */}
            {job.matchExplanation && (
              <p className="text-xs text-muted-foreground bg-background/60 rounded-lg p-2.5 border leading-relaxed">
                {job.matchExplanation}
              </p>
            )}

            {/* Skills breakdown */}
            <div className="space-y-3 text-xs">
              {matchingSkills.length > 0 && (
                <div>
                  <span className="font-semibold text-muted-foreground block mb-1.5">
                    {hasResume ? "Matching Resume Keywords" : "Listed Skills"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {matchingSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold rounded text-[10px]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {missingSkills.length > 0 && (
                <div>
                  <span className="font-semibold text-muted-foreground block mb-1.5">
                    {hasResume ? "Skills to Bridge" : "Additional Requirements"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold rounded text-[10px]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground/70 flex items-start gap-1 leading-relaxed">
              <Info className="h-3 w-3 shrink-0 mt-px" />
              This is an estimated match score based on skills, role, and experience alignment — not a guarantee of suitability.
            </p>
          </div>

          {/* Job Description */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Job Description</h4>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {job.description || "No description provided."}
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <SheetFooter className="p-6 border-t shrink-0 flex items-center justify-end gap-2 bg-background">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          {isApplied ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-500/10 h-9 px-3 rounded-md">
              <CheckCircle2 className="h-4 w-4" />
              Application Tracked
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleTrackApplication}
              disabled={isPromoting}
            >
              {isPromoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
              {isBookmarked ? "Track Application" : "Bookmark & Track"}
            </Button>
          )}

          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            onClick={() => {
              if (!isApplied) {
                handleTrackApplication();
              }
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Apply via {job.source}
          </a>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
