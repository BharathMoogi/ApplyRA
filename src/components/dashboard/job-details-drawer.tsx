"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sparkles, MapPin, DollarSign, Calendar, Globe, Send, Loader2, CheckCircle2 } from "lucide-react";
import { applyToBookmarkedJob, type JobListing } from "@/actions/jobs";
import { cn } from "@/lib/utils";

interface JobDetailsDrawerProps {
  job: JobListing | null;
  isOpen: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  onBookmarkActionComplete?: () => void;
}

export function JobDetailsDrawer({
  job,
  isOpen,
  onClose,
  isBookmarked,
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

  // Mock ATS feedback detail
  const matchingSkills = job.skills.slice(0, Math.ceil(job.skills.length * 0.7));
  const missingSkills = job.skills.slice(Math.ceil(job.skills.length * 0.7));

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col h-full p-0">
        {/* Header Block */}
        <SheetHeader className="p-6 border-b shrink-0">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center font-bold text-sm text-primary border shrink-0">
              {job.company[0]}
            </div>
            <div className="space-y-1">
              <SheetTitle className="text-xl font-bold leading-tight">{job.title}</SheetTitle>
              <SheetDescription className="text-xs font-semibold text-muted-foreground">
                {job.company} &bull; {job.location}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Cards */}
          <div className="grid gap-3 grid-cols-3 text-center">
            <div className="border border-muted/50 rounded-xl p-3 bg-muted/5">
              <MapPin className="h-4 w-4 text-accent mx-auto mb-1" />
              <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Location</h5>
              <p className="text-xs font-semibold mt-0.5 truncate">{job.location}</p>
            </div>
            <div className="border border-muted/50 rounded-xl p-3 bg-muted/5">
              <DollarSign className="h-4 w-4 text-accent mx-auto mb-1" />
              <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Salary</h5>
              <p className="text-xs font-semibold mt-0.5 truncate">{job.salary}</p>
            </div>
            <div className="border border-muted/50 rounded-xl p-3 bg-muted/5">
              <Calendar className="h-4 w-4 text-accent mx-auto mb-1" />
              <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Posted</h5>
              <p className="text-xs font-semibold mt-0.5 truncate">{job.postedAt}</p>
            </div>
          </div>

          {/* ATS COMPATIBILITY CARD */}
          <div className="border border-accent/20 bg-accent/[0.02] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sm text-accent">
                <Sparkles className="h-4 w-4" />
                ATS Compatibility Report
              </div>
              <span className="text-lg font-black">{job.atsScore}%</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground block mb-1.5">Matching Resume Keywords</span>
                <div className="flex flex-wrap gap-1.5">
                  {matchingSkills.map((skill) => (
                    <span key={skill} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold rounded text-[10px]">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {missingSkills.length > 0 && (
                <div>
                  <span className="font-semibold text-muted-foreground block mb-1.5">Missing Resume Keywords</span>
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map((skill) => (
                      <span key={skill} className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold rounded text-[10px]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* JOB DESCRIPTION */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Job Description</h4>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {job.description}
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
              className="gap-1.5 text-accent border-accent/20 hover:border-accent/30 hover:bg-accent/5"
              onClick={handleTrackApplication}
              disabled={isPromoting}
            >
              {isPromoting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              {isBookmarked ? "Track Application" : "Bookmark & Track"}
            </Button>
          )}

          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Send className="h-4 w-4" />
            Apply via {job.source}
          </a>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
