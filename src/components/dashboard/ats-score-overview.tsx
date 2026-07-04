import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, FileCheck, ArrowRight } from "lucide-react";

interface ATSScoreOverviewProps {
  score?: number;
}

export function ATSScoreOverview({ score = 78 }: ATSScoreOverviewProps) {
  // SVG Stroke math
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let feedbackColor = "text-amber-500";
  let feedbackText = "Average match rate. Consider tailoring keywords.";
  let badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  let strokeColor = "stroke-amber-500";

  if (score >= 85) {
    feedbackColor = "text-emerald-500";
    feedbackText = "Excellent match rate! Ready to submit.";
    badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    strokeColor = "stroke-emerald-500";
  } else if (score < 60) {
    feedbackColor = "text-rose-500";
    feedbackText = "Low match rate. Needs major keyword tailoring.";
    badgeColor = "bg-rose-500/10 text-rose-600 dark:text-rose-400";
    strokeColor = "stroke-rose-500";
  }

  return (
    <Card className="transition-all hover:shadow-md border-muted/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">ATS Score Overview</CardTitle>
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <CardDescription>Average resume compatibility score</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-2">
        {/* Circular Gauge */}
        <div className="relative flex items-center justify-center h-32 w-32">
          <svg className="transform -rotate-90 w-full h-full">
            <circle
              cx="64"
              cy="64"
              r={radius}
              className="stroke-muted"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              className={`transition-all duration-1000 ease-out ${strokeColor}`}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold tracking-tight">{score}%</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Compatibility
            </span>
          </div>
        </div>

        {/* Info & Feedback */}
        <div className="w-full mt-4 text-center space-y-3">
          <p className={`text-xs font-medium ${feedbackColor}`}>{feedbackText}</p>
          <div className="border-t border-dashed my-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-1">
              <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
              Primary Resume
            </span>
            <span className={`px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
              Active
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
