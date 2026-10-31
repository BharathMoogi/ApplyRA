"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BrainCircuit, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { classifyResume } from "@/actions/classification";

export interface OccupationPrediction {
  label: string;
  score: number;
}

interface OccupationBadgeProps {
  resumeId: string;
  status: string;
  category: string | null;
  confidence: number | null;
  alternatives: OccupationPrediction[] | null;
  onComplete?: () => void;
}

export function OccupationBadge({
  resumeId,
  status,
  category,
  confidence,
  alternatives,
  onComplete,
}: OccupationBadgeProps) {
  const [isPending, startTransition] = useTransition();
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleAnalyze = () => {
    setLocalError(null);
    startTransition(async () => {
      const result = await classifyResume(resumeId);
      if (!result.success) {
        setLocalError(result.error ?? "Classification failed");
      } else {
        onComplete?.();
      }
    });
  };

  // PENDING state (being classified right now)
  if (status === "PENDING" || isPending) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Analyzing occupation…</span>
      </div>
    );
  }

  // COMPLETED — show result
  if (status === "COMPLETED" && category) {
    const pct = confidence !== null ? Math.round(confidence * 100) : null;
    const alts = (alternatives ?? []).filter((a) => a.label !== category);

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className="text-[11px] bg-accent/10 text-accent border-accent/20 gap-1 font-medium"
          >
            <BrainCircuit className="h-3 w-3" />
            {category}
            {pct !== null && (
              <span className="text-accent/70 font-normal">· {pct}%</span>
            )}
          </Badge>

          {alts.length > 0 && (
            <button
              onClick={() => setShowAlternatives((v) => !v)}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAlternatives ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {showAlternatives ? "Hide" : "Alternatives"}
            </button>
          )}
        </div>

        {showAlternatives && alts.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {alts.slice(0, 2).map((alt) => (
              <Badge
                key={alt.label}
                variant="outline"
                className="text-[10px] text-muted-foreground font-normal"
              >
                {alt.label} · {Math.round(alt.score * 100)}%
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  // FAILED state
  if (status === "FAILED") {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] text-rose-500">
          <AlertCircle className="h-3 w-3" />
          <span>Classification failed</span>
        </div>
        {localError && (
          <p className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={localError}>
            {localError}
          </p>
        )}
        <Button
          variant="outline"
          size="xs"
          className="h-6 text-[10px] gap-1 mt-0.5"
          onClick={handleAnalyze}
        >
          <BrainCircuit className="h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  // NOT_RUN — show Analyze button
  return (
    <div className="space-y-1">
      {localError && (
        <p className="text-[10px] text-rose-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {localError}
        </p>
      )}
      <Button
        variant="outline"
        size="xs"
        className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
        onClick={handleAnalyze}
      >
        <BrainCircuit className="h-3 w-3" />
        Analyze Occupation
      </Button>
    </div>
  );
}
