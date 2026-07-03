"use client";

import { useEffect, useState } from "react";
import { getResumes } from "@/actions/resumes";
import { ResumeUploadZone } from "@/components/dashboard/resume-upload-zone";
import { ResumeList } from "@/components/dashboard/resume-list";
import { ResumeEditor } from "@/components/dashboard/resume-editor";
import { Loading } from "@/components/shared/loading";

interface Resume {
  id: string;
  title: string;
  fileUrl: string | null;
  isDefault: boolean;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const fetchResumes = async () => {
    setIsLoading(true);
    try {
      const data = await getResumes();
      // Map Date string fields back to Dates if necessary
      const mapped = data.map((r) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }));
      setResumes(mapped);
    } catch (err) {
      console.error("Failed to load resumes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleEdit = (resume: Resume) => {
    setSelectedResume(resume);
    setIsEditorOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resume Management</h1>
        <p className="text-muted-foreground text-sm">
          Upload your master resume, edit extracted details, and manage multiple versions
        </p>
      </div>

      {/* Grid Zone */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Upload Column (1/3 width) */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-base font-semibold">Upload Master Version</h3>
          <ResumeUploadZone onUploadComplete={fetchResumes} />
        </div>

        {/* Versions Column (2/3 width) */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-base font-semibold">Saved Resume Versions</h3>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center border border-muted/50 rounded-xl bg-muted/5">
              <Loading text="Loading resume versions..." />
            </div>
          ) : (
            <ResumeList
              resumes={resumes}
              onRefresh={fetchResumes}
              onEdit={handleEdit}
            />
          )}
        </div>
      </div>

      {/* Structured Info Editor Sheet */}
      <ResumeEditor
        resume={selectedResume}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedResume(null);
        }}
        onSaveComplete={fetchResumes}
      />
    </div>
  );
}
