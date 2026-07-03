"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bookmark, MapPin, DollarSign, Loader2, Sparkles } from "lucide-react";
import { toggleBookmarkJob, type JobListing } from "@/actions/jobs";

interface JobCardProps {
  job: JobListing;
  isBookmarked: boolean;
  onBookmarkToggle?: () => void;
  onClick?: () => void;
}

export function JobCard({ job, isBookmarked, onBookmarkToggle, onClick }: JobCardProps) {
  const [isPending, setIsPending] = useState(false);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click drawer trigger
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
  if (job.atsScore >= 85) {
    matchColor = "text-emerald-500 bg-emerald-500/10 dark:text-emerald-400";
  } else if (job.atsScore < 70) {
    matchColor = "text-rose-500 bg-rose-500/10 dark:text-rose-400";
  }

  return (
    <Card
      onClick={onClick}
      className="group transition-all duration-200 hover:shadow-md border-muted/50 cursor-pointer relative overflow-hidden bg-card/90"
    >
      <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-start justify-between gap-4">
        <div className="flex gap-3 min-w-0">
          {/* Mock Logo */}
          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center font-bold text-sm text-primary shrink-0 border">
            {job.company[0]}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm group-hover:text-primary transition-colors truncate leading-tight">
              {job.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {job.location}
          </span>
          <span className="flex items-center gap-0.5">
            <DollarSign className="h-3.5 w-3.5" />
            {job.salary}
          </span>
        </div>

        {/* Skills Tag row */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {job.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="text-[10px] font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 3 && (
            <span className="text-[10px] font-medium px-2 py-0.5 bg-muted text-muted-foreground/80 rounded">
              +{job.skills.length - 3} more
            </span>
          )}
        </div>

        {/* Footer info (ATS score and Posted time) */}
        <div className="flex items-center justify-between pt-2 border-t border-dashed mt-3">
          <span className="text-[10px] text-muted-foreground">{job.postedAt}</span>
          
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${matchColor}`}>
              <Sparkles className="h-2.5 w-2.5 fill-current" />
              {job.atsScore}% Match
            </span>
            <Badge variant="secondary" className="text-[9px] capitalize px-1.5 py-0">
              {job.source}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
