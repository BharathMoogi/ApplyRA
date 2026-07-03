"use client";

import { useState, useRef } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { uploadResume } from "@/actions/resumes";

interface ResumeUploadZoneProps {
  onUploadComplete?: () => void;
}

export function ResumeUploadZone({ onUploadComplete }: ResumeUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx");

    if (!isPdf && !isDocx) {
      alert("Invalid file type. Please upload a PDF or DOCX file.");
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadResume(file.name, file.size);
      if (res.success) {
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        alert(res.error || "Failed to upload and parse resume.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during resume upload.");
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileInput}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
        isDragging
          ? "border-primary bg-primary/5 scale-[0.99]"
          : "border-muted-foreground/35 hover:border-primary hover:bg-muted/30"
      } ${isUploading ? "pointer-events-none opacity-70" : ""}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx"
        className="hidden"
      />

      {isUploading ? (
        <div className="space-y-3 flex flex-col items-center animate-pulse">
          <div className="h-12 w-12 rounded-full bg-violet-600/10 flex items-center justify-center text-violet-600">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Parsing with AI</h4>
            <p className="text-xs text-muted-foreground">
              Extracting personal details, skills and work history...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Upload master resume</h4>
            <p className="text-xs text-muted-foreground">
              Drag & drop your file here, or click to browse
            </p>
            <p className="text-[10px] text-muted-foreground/80">
              Supports PDF and DOCX up to 10MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
