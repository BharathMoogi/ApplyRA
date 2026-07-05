"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MoreVertical, Trash2, Check, Star, Edit, Loader2, Download } from "lucide-react";
import { setPrimaryResume, deleteResume } from "@/actions/resumes";
import { formatDate } from "@/lib/utils";

interface Resume {
  id: string;
  title: string;
  fileUrl: string | null;
  isDefault: boolean;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ResumeListProps {
  resumes: Resume[];
  onRefresh?: () => void;
  onEdit?: (resume: Resume) => void;
}

export function ResumeList({ resumes, onRefresh, onEdit }: ResumeListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDownload = (resume: Resume) => {
    if (resume.fileUrl) {
      window.open(resume.fileUrl, "_blank");
      return;
    }

    if (!resume.content) return;

    try {
      const data = JSON.parse(resume.content);
      let text = "";
      
      // Name & Contact info
      text += `${data.personal?.name || ""}\n`;
      const contactInfo = [
        data.personal?.email,
        data.personal?.phone,
        data.personal?.location,
        data.personal?.linkedin,
        data.personal?.github,
        data.personal?.portfolio
      ].filter(Boolean).join(" | ");
      text += `${contactInfo}\n`;
      text += "=".repeat(60) + "\n\n";

      // Summary
      if (data.summary) {
        text += "PROFESSIONAL SUMMARY\n";
        text += "-".repeat(20) + "\n";
        text += `${data.summary}\n\n`;
      }

      // Experience
      if (data.experience && data.experience.length > 0) {
        text += "WORK EXPERIENCE\n";
        text += "-".repeat(20) + "\n";
        data.experience.forEach((exp: any) => {
          text += `${exp.role} at ${exp.company} (${exp.duration || ""})\n`;
          if (exp.location) text += `Location: ${exp.location}\n`;
          if (exp.description) text += `${exp.description}\n`;
          text += "\n";
        });
      }

      // Skills
      if (data.skills && data.skills.length > 0) {
        text += "SKILLS\n";
        text += "-".repeat(20) + "\n";
        text += `${data.skills.join(", ")}\n\n`;
      }

      // Projects
      if (data.projects && data.projects.length > 0) {
        text += "PROJECTS\n";
        text += "-".repeat(20) + "\n";
        data.projects.forEach((proj: any) => {
          text += `${proj.name} (${proj.duration || ""})\n`;
          if (proj.technologies && proj.technologies.length > 0) {
            text += `Technologies: ${proj.technologies.join(", ")}\n`;
          }
          if (proj.description) text += `${proj.description}\n`;
          text += "\n";
        });
      }

      // Education
      if (data.education && data.education.length > 0) {
        text += "EDUCATION\n";
        text += "-".repeat(20) + "\n";
        data.education.forEach((edu: any) => {
          const dates = [edu.startDate, edu.endDate || edu.year].filter(Boolean).join(" - ");
          text += `${edu.degree} - ${edu.school} (${dates})\n`;
          if (edu.grade) text += `Grade: ${edu.grade}\n`;
          text += "\n";
        });
      }

      // Certifications
      if (data.certifications && data.certifications.length > 0) {
        text += "CERTIFICATIONS\n";
        text += "-".repeat(20) + "\n";
        data.certifications.forEach((cert: any) => {
          const expDate = cert.expiryDate ? ` (Expires: ${cert.expiryDate})` : "";
          text += `${cert.name} - Issued by ${cert.issuer} on ${cert.issueDate || ""}${expDate}\n`;
        });
        text += "\n";
      }

      // Achievements
      if (data.achievements && data.achievements.length > 0) {
        text += "ACHIEVEMENTS\n";
        text += "-".repeat(20) + "\n";
        data.achievements.forEach((ach: any) => {
          text += `[${ach.category}] ${ach.title} (${ach.date || ""})\n`;
          if (ach.description) text += `${ach.description}\n`;
        });
        text += "\n";
      }

      // Create download link
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${resume.title.replace(/[^a-z0-9]/i, "_")}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to parse resume JSON for download:", err);
      // Fallback to downloading raw JSON
      const blob = new Blob([resume.content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${resume.title.replace(/[^a-z0-9]/i, "_")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleSetPrimary = async (id: string) => {
    setPendingId(id);
    try {
      const res = await setPrimaryResume(id);
      if (res.success && onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume version?")) {
      return;
    }
    setPendingId(id);
    try {
      const res = await deleteResume(id);
      if (res.success && onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPendingId(null);
    }
  };

  if (resumes.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <h4 className="font-semibold text-sm">No resume versions found</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Upload a master resume above to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {resumes.map((resume) => {
        const isPending = pendingId === resume.id;

        return (
          <Card
            key={resume.id}
            className={`transition-all duration-200 border-muted/50 relative overflow-hidden ${
              resume.isDefault
                ? "ring-1 ring-accent/50 bg-accent/[0.02]"
                : "hover:shadow-md"
            }`}
          >
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0 border border-accent/20">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm truncate leading-tight mb-1" title={resume.title}>
                    {resume.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    Uploaded {formatDate(resume.createdAt)}
                  </p>
                </div>
              </div>

              {resume.isDefault && (
                <Badge className="bg-accent hover:bg-accent-hover text-accent-foreground select-none shrink-0 font-semibold text-[10px] py-0 px-2 h-5 flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-current" />
                  Primary
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 mt-4 border-t border-dashed pt-3">
                {/* Make default button */}
                {!resume.isDefault && (
                  <Button
                    variant="outline"
                    size="xs"
                    className="flex-1 text-[11px] gap-1 h-8"
                    disabled={isPending}
                    onClick={() => handleSetPrimary(resume.id)}
                  >
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Star className="h-3 w-3" />
                    )}
                    Make Primary
                  </Button>
                )}

                {/* Edit Button */}
                <Button
                  variant="outline"
                  size="xs"
                  className={`flex-1 text-[11px] gap-1 h-8 ${
                    resume.isDefault ? "bg-accent/5 hover:bg-accent/10 border-accent/20 hover:border-accent/30 text-accent" : ""
                  }`}
                  disabled={isPending}
                  onClick={() => onEdit && onEdit(resume)}
                >
                  <Edit className="h-3 w-3" />
                  Edit details
                </Button>

                {/* Download Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0 hover:bg-primary/10"
                  disabled={isPending}
                  onClick={() => handleDownload(resume)}
                  aria-label="Download resume version"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-rose-600 shrink-0 hover:bg-rose-500/10"
                  disabled={isPending}
                  onClick={() => handleDelete(resume.id)}
                  aria-label="Delete resume version"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
