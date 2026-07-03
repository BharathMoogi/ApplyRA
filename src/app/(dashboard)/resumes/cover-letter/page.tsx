"use client";

import { useState } from "react";
import { generateCoverLetter } from "@/actions/cover-letter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Copy, Check, Download, RotateCcw, AlertCircle, FileText } from "lucide-react";

export default function CoverLetterPage() {
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  
  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Result state
  const [letterText, setLetterText] = useState("");

  const handleGenerate = async () => {
    if (!companyName || !jobTitle || !jobDescription) {
      alert("Please fill in the company name, job title, and job description.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateCoverLetter(companyName, jobTitle, jobDescription);
      if (res.success && res.coverLetter) {
        setLetterText(res.coverLetter);
      } else {
        alert(res.error || "Failed to generate cover letter.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during cover letter generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letterText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setCompanyName("");
    setJobTitle("");
    setJobDescription("");
    setLetterText("");
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
      {/* Dynamic Printing Style Overlay (only active when print is triggered) */}
      <style>{`
        @media print {
          /* Hide all page layouts */
          body * {
            visibility: hidden;
          }
          /* Show print target only */
          #printable-letter, #printable-letter * {
            visibility: visible;
          }
          #printable-letter {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white;
            color: black;
            box-shadow: none;
            border: none;
            font-size: 12pt;
            line-height: 1.6;
          }
        }
      `}</style>

      {/* Title Header */}
      <div className="no-print">
        <h1 className="text-3xl font-bold tracking-tight">AI Cover Letter Generator</h1>
        <p className="text-muted-foreground text-sm">
          Generate formal personalized cover letters tailored to specific company listings
        </p>
      </div>

      {/* INPUT WORKSPACE PANEL */}
      {!letterText && (
        <Card className="border-muted/50 no-print">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Cover Letter Builder</CardTitle>
            <CardDescription>Enter company details and target job description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="e.g. Vercel, Google"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-10 border-muted/50 text-xs"
                />
              </div>

              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="h-10 border-muted/50 text-xs"
                />
              </div>
            </div>

            {/* Job Description Area */}
            <div className="space-y-2">
              <Label htmlFor="jobDescription">Job Description</Label>
              <textarea
                id="jobDescription"
                rows={8}
                placeholder="Paste the target job description to match skills and current experience bullets..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full text-xs p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring border-muted/50"
              />
            </div>

            <Button
              className="w-full gap-1.5 font-semibold text-xs h-10"
              onClick={handleGenerate}
              disabled={isGenerating || !companyName || !jobTitle || !jobDescription}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing qualifications & compiling letter...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Generate AI Cover Letter
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* DUAL WORKSPACE SPLIT */}
      {letterText && (
        <div className="grid gap-6 lg:grid-cols-5 no-print">
          {/* EDITABLE PLAIN TEXT EDITOR PANEL (2/5 width) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Edit Cover Letter</h3>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  className="h-8 gap-1 text-[11px]"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  className="h-8 gap-1 text-[11px]"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Regenerate
                </Button>
              </div>
            </div>

            <textarea
              rows={24}
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
              className="w-full text-xs p-4 rounded-xl border bg-background font-mono resize-none focus:outline-none focus:border-ring border-muted/50 h-[calc(100vh-220px)] min-h-[450px]"
            />

            <Button
              variant="outline"
              className="w-full text-xs font-semibold"
              onClick={handleReset}
            >
              Start Over / Create Another
            </Button>
          </div>

          {/* LETTER SHEET PREVIEW PANEL (3/5 width) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Printable Letter Preview</h3>
              <Button size="sm" className="gap-1.5 text-xs font-semibold h-8 px-4" onClick={handlePrint}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>

            {/* A4 Styled printable sheet */}
            <div
              id="printable-letter"
              className="border border-muted/50 rounded-xl p-10 bg-white text-black shadow-lg space-y-6 max-w-[800px] mx-auto text-left font-serif leading-relaxed text-sm whitespace-pre-line h-[calc(100vh-220px)] min-h-[450px] overflow-y-auto"
            >
              {letterText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
