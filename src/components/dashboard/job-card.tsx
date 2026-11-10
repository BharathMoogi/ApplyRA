"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bookmark, MapPin, DollarSign, Loader2, Sparkles, MonitorCheck, Building2, Clock, ExternalLink } from "lucide-react";
import { toggleBookmarkJob, type JobListing } from "@/actions/jobs";

interface JobCardProps {
  job: JobListing;
  isBookmarked: boolean;
  onBookmarkToggle?: () => void;
  onClick?: () => void;
  hasResume?: boolean; // whether a resume was used for scoring
}

export function JobCard({ job, isBookmarked, onBookmarkToggle, onClick, hasResume }: JobCardProps) {
  const [isPending, setIsPending] = useState(false);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPending(true);
    try {
      const res = await toggleBookmarkJob({
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        jobUrl: job.jobUrl,
      });
      if (res.success && onBookmarkToggle) {
        onBookmarkToggle();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPending(false);
    }
  };

  // Match score colors
  let matchColor = "text-amber-500 bg-amber-500/10 dark:text-amber-400";
  let matchLabel = hasResume ? "Est. Match" : "Relevance";
  if (job.atsScore >= 80) {
    matchColor = "text-emerald-500 bg-emerald-500/10 dark:text-emerald-400";
  } else if (job.atsScore < 60) {
    matchColor = "text-slate-500 bg-slate-500/10 dark:text-slate-400";
  }

  // Work mode badge
  const workModeBadge: Record<string, string> = {
    Remote: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    Hybrid: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    "On-site": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  };

  return (
    <Card
      onClick={onClick}
      className="group transition-all duration-200 hover:shadow-md border-muted/50 cursor-pointer relative overflow-hidden bg-card/90"
    >
      <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-start justify-between gap-4">
        <div className="flex gap-3 min-w-0">
          {/* Company Initial Avatar */}
          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center font-bold text-sm text-primary shrink-0 border">
            {(job.company || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm group-hover:text-primary transition-colors truncate leading-tight">
              {job.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 shrink-0" />
              {job.company}
            </p>
          </div>
        </div>

        {/* Bookmark icon */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full shrink-0 ${
            isBookmarked
              ? "text-amber-500 hover:text-amber-600 bg-amber-500/5 hover:bg-amber-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          onClick={handleBookmarkClick}
          disabled={isPending}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark job"}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
          )}
        </Button>
      </CardHeader>

      <CardContent className="pb-4 pt-0 px-5 space-y-3">
        {/* Info badges */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-medium">
          <span className="flex items-center gap-1 truncate max-w-[180px]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.location}</span>
          </span>
          <span className="flex items-center gap-0.5 truncate max-w-[160px]">
            <DollarSign className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.salary}</span>
          </span>
          {job.workMode && job.workMode !== "Not Disclosed" && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${workModeBadge[job.workMode] || "bg-muted text-muted-foreground"}`}>
              {job.workMode}
            </span>
          )}
          {job.experienceYears && (
            <span className="text-[10px] font-medium text-muted-foreground">
              {job.experienceYears} exp
            </span>
          )}
        </div>

        {/* Skills tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(job.skills || []).slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="text-[10px] font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded"
            >
              {skill}
            </span>
          ))}
          {(job.skills || []).length > 3 && (
            <span className="text-[10px] font-medium px-2 py-0.5 bg-muted text-muted-foreground/80 rounded">
              +{job.skills.length - 3} more
            </span>
          )}
        </div>

        {/* Footer: postedAt | match score | source */}
        <div className="flex items-center justify-between pt-2 border-t border-dashed mt-3">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {job.postedAt}
          </span>

          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${matchColor}`}>
              <Sparkles className="h-2.5 w-2.5 fill-current" />
              {job.atsScore}% {matchLabel}
            </span>
            <Badge variant="secondary" className="text-[9px] capitalize px-1.5 py-0 max-w-[70px] truncate">
              {job.source}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
