"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getResumes, uploadResume } from "@/actions/resumes";
import type { ExtractedResumeSummary } from "@/lib/jobs/types";
import {
  FileText,
  UploadCloud,
  Sparkles,
  ChevronDown,
  Layers,
  GraduationCap,
  Briefcase,
  Check,
  Loader2,
  X,
  Search,
} from "lucide-react";

interface ResumeJobMatcherHeaderProps {
  selectedResumeId: string | null;
  onSelectResume: (resumeId: string | null) => void;
  resumeSummary?: ExtractedResumeSummary;
  onDiscover: () => void;
  isDiscovering: boolean;
  onSelectQuery?: (query: string) => void;
  activeQuery?: string;
}

interface SavedResumeOption {
  id: string;
  title: string;
  isDefault: boolean;
  createdAt: string | Date;
  occupationCategory?: string | null;
}

export function ResumeJobMatcherHeader({
  selectedResumeId,
  onSelectResume,
  resumeSummary,
  onDiscover,
  isDiscovering,
  onSelectQuery,
  activeQuery,
}: ResumeJobMatcherHeaderProps) {
  const [resumes, setResumes] = useState<SavedResumeOption[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch saved resumes on mount
  useEffect(() => {
    async function loadResumes() {
      try {
        const list = await getResumes();
        setResumes(
          list.map((r: any) => ({
            id: r.id,
            title: r.title,
            isDefault: r.isDefault,
            createdAt: r.createdAt,
            occupationCategory: r.occupationCategory,
          }))
        );

        // Auto-select primary or first resume if not already chosen
        if (!selectedResumeId && list.length > 0) {
          const primary = list.find((r: any) => r.isDefault) || list[0];
          onSelectResume(primary.id);
        }
      } catch (err) {
        console.error("Failed to load user resumes:", err);
      }
    }
    loadResumes();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle uploading new resume
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      setUploadError("Please upload a PDF or DOCX file.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadResume(formData);
      if (res.success && res.resume) {
        // Refresh resume list and select newly uploaded resume
        const updated = await getResumes();
        setResumes(
          updated.map((r: any) => ({
            id: r.id,
            title: r.title,
            isDefault: r.isDefault,
            createdAt: r.createdAt,
            occupationCategory: r.occupationCategory,
          }))
        );
        onSelectResume(res.resume.id);
      } else {
        setUploadError(res.error || "Failed to upload and parse resume.");
      }
    } catch (err: any) {
      setUploadError(err.message || "An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectedResume = resumes.find((r) => r.id === selectedResumeId);

  return (
    <Card className="mb-6 border-primary/20 shadow-sm bg-gradient-to-r from-card via-card to-primary/5 overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left section: Resume selection & Upload */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-foreground">
                Resume-Driven Job Matcher
              </h2>
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-primary/30">
                AI Discovery
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Select an uploaded resume or upload a new one to automatically extract skills, target roles, and discover matching listings.
            </p>

            {/* Resume Selector & Upload Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Dropdown selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium rounded-md border bg-background hover:bg-muted/50 transition-colors max-w-[280px] sm:max-w-[340px] shadow-sm"
                >
                  <span className="truncate">
                    {selectedResume ? (
                      <span className="flex items-center gap-1.5 truncate">
                        <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate font-semibold">{selectedResume.title}</span>
                        {selectedResume.isDefault && (
                          <span className="text-[10px] text-muted-foreground shrink-0">(Primary)</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Manual Search (No Resume)</span>
                    )}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-72 rounded-md border bg-popover shadow-lg z-50 py-1 text-xs">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Your Resumes
                    </div>

                    {resumes.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          onSelectResume(r.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-muted/80 transition-colors ${
                          r.id === selectedResumeId ? "bg-primary/10 font-medium text-primary" : ""
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate font-medium">{r.title}</div>
                          {r.occupationCategory && (
                            <div className="text-[10px] text-muted-foreground">{r.occupationCategory}</div>
                          )}
                        </div>
                        {r.id === selectedResumeId && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </button>
                    ))}

                    <div className="border-t my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        onSelectResume(null);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                      Search Manually Without Resume
                    </button>
                  </div>
                )}
              </div>

              {/* Upload New Resume Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs gap-1.5 bg-background shadow-sm hover:bg-muted/60"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Parsing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5 text-primary" />
                    <span>Upload Resume (PDF/DOCX)</span>
                  </>
                )}
              </Button>

              {/* Find Matching Jobs Action Button */}
              <Button
                type="button"
                size="sm"
                disabled={isDiscovering || isUploading}
                onClick={onDiscover}
                className="h-8 text-xs gap-1.5 shadow-sm font-medium"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Searching Portals...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                    <span>Find Matching Jobs</span>
                  </>
                )}
              </Button>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-500 font-medium pt-1">{uploadError}</p>
            )}
          </div>
        </div>

        {/* Selected Resume Extracted Metadata & Query Pills */}
        {resumeSummary && selectedResumeId && (
          <div className="mt-4 pt-3 border-t border-border/60">
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted-foreground">
              {/* Target Role */}
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span className="font-medium text-foreground">Target Role:</span>
                <span className="font-semibold text-primary">
                  {resumeSummary.targetRoles[0] || resumeSummary.primaryCategory || "Software Engineer"}
                </span>
              </div>

              {/* Experience */}
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span className="font-medium text-foreground">Experience:</span>
                <span>
                  {resumeSummary.totalExperienceYears > 0
                    ? `${resumeSummary.totalExperienceYears} yrs (${resumeSummary.experienceLevel})`
                    : resumeSummary.experienceLevel}
                </span>
              </div>

              {/* Education */}
              {resumeSummary.educationDegrees.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                  <span className="font-medium text-foreground">Education:</span>
                  <span className="truncate max-w-[200px]">{resumeSummary.educationDegrees[0]}</span>
                </div>
              )}
            </div>

            {/* Generated Query Suggestions */}
            {resumeSummary.generatedQueries.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mr-1">
                  <Search className="h-3 w-3" /> Auto Searches:
                </span>
                {resumeSummary.generatedQueries.map((q) => {
                  const isActive = activeQuery?.toLowerCase() === q.toLowerCase();
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onSelectQuery && onSelectQuery(q)}
                      className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary font-medium"
                          : "bg-background/80 hover:bg-muted text-foreground border-border"
                      }`}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
