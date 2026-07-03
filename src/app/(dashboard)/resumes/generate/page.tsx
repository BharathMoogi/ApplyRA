"use client";

import { useEffect, useState, useRef } from "react";
import { getResumes } from "@/actions/resumes";
import { generateCustomizedResume, type TailoredResumeResult } from "@/actions/generator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/shared/loading";
import { Sparkles, FileText, Download, Wand2, CheckCircle2, ChevronRight, Mail, Phone, Globe, AlertCircle, Loader2 } from "lucide-react";

interface ResumeVersion {
  id: string;
  title: string;
  isDefault: boolean;
  content: string | null;
}

export default function ResumeGeneratorPage() {
  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  
  // Loading states
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Result state
  const [generationResult, setGenerationResult] = useState<TailoredResumeResult | null>(null);

  // Load user resumes on mount
  useEffect(() => {
    const fetchResumes = async () => {
      setIsLoadingResumes(true);
      try {
        const list = await getResumes();
        setResumes(list);
        
        // Select primary default resume if present
        const primary = list.find((r) => r.isDefault);
        if (primary) {
          setSelectedResumeId(primary.id);
        } else if (list.length > 0) {
          setSelectedResumeId(list[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingResumes(false);
      }
    };

    fetchResumes();
  }, []);

  const handleGenerate = async () => {
    if (!selectedResumeId || !jobDescription) {
      alert("Please select a master resume and paste a job description.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateCustomizedResume(selectedResumeId, jobDescription);
      if (res.success && res.result) {
        setGenerationResult(res.result);
      } else {
        alert(res.error || "Failed to generate tailored resume.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during resume generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
          #printable-resume, #printable-resume * {
            visibility: visible;
          }
          #printable-resume {
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
          }
        }
      `}</style>

      {/* Title Header */}
      <div className="no-print">
        <h1 className="text-3xl font-bold tracking-tight">AI Resume Tailoring</h1>
        <p className="text-muted-foreground text-sm">
          Optimize keywords and experiences from your master resume to match target job requirements
        </p>
      </div>

      {/* INPUT WORKSPACE PANEL (Hidden when result is generated to save space, or renders on top) */}
      {!generationResult && (
        <Card className="border-muted/50 no-print">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tailor Workspace</CardTitle>
            <CardDescription>Select version and paste target description text</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingResumes ? (
              <Loading text="Loading master versions..." />
            ) : resumes.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                <AlertCircle className="h-6 w-6 mx-auto text-amber-500 mb-1" />
                Upload a master resume version in Resume Management before tailoring.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Select Master Resume
                  </label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full text-xs h-10 p-2.5 border rounded-lg bg-background border-muted/50 focus:outline-none focus:border-ring"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} {r.isDefault ? "(Primary Master)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Description Pasting Area */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Pasted Job Description
                  </label>
                  <textarea
                    rows={8}
                    placeholder="Paste the complete job description here to analyze and optimize your resume..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring border-muted/50"
                  />
                </div>

                <Button
                  className="w-full gap-1.5 font-semibold text-xs h-10"
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedResumeId || !jobDescription}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Optimizing Experience & Matching Keywords...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Generate AI-Tailored Resume
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* GENERATED TAILORED SPLIT LAYOUT */}
      {generationResult && (
        <div className="grid gap-6 lg:grid-cols-5 no-print">
          {/* LEFT PANEL: Optimization Reports (2/5 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* MATCH SCORE ELEVATION */}
            <Card className="border-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">ATS Compatibility Elevation</CardTitle>
                <CardDescription>Compatibility comparison rating</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-around py-4">
                <div className="text-center">
                  <span className="text-2xl font-bold text-muted-foreground/60">{generationResult.originalScore}%</span>
                  <span className="text-[10px] text-muted-foreground block font-medium">Original</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/45" />
                <div className="text-center">
                  <span className="text-3xl font-black text-emerald-500 flex items-center justify-center gap-0.5">
                    <Sparkles className="h-4 w-4 animate-pulse fill-current" />
                    {generationResult.optimizedScore}%
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider block">
                    Optimized
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* KEYWORDS ANALYZER */}
            <Card className="border-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Keyword Analysis</CardTitle>
                <CardDescription>Extracted and enriched job keywords</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Matched keywords */}
                <div>
                  <h5 className="font-semibold text-muted-foreground block mb-2">Matched Skills (Retained)</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {generationResult.matchedKeywords.length === 0 ? (
                      <span className="text-xs text-muted-foreground">None found.</span>
                    ) : (
                      generationResult.matchedKeywords.map((k) => (
                        <span key={k} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold rounded text-[10px]">
                          {k}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Injected keywords */}
                <div>
                  <h5 className="font-semibold text-muted-foreground block mb-2">Optimized Skills (AI-Injected)</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {generationResult.missingKeywords.slice(0, 2).map((k) => (
                      <span key={k} className="px-2 py-0.5 bg-violet-600/10 text-violet-600 dark:text-violet-400 font-semibold rounded text-[10px] flex items-center gap-0.5 border border-violet-500/20">
                        <PlusIcon className="h-3 w-3 shrink-0" />
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OPTIMIZED SENTENCES DIFF VIEW */}
            <Card className="border-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">AI Experience Optimization</CardTitle>
                <CardDescription>Tailored resume bullet points details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {generationResult.optimizedPoints.map((point, index) => (
                  <div key={index} className="space-y-1.5 border-b border-dashed pb-3 last:border-b-0 last:pb-0">
                    <p className="text-rose-500 line-through leading-tight opacity-75">
                      {point.original}
                    </p>
                    <p className="text-emerald-500 leading-tight font-medium">
                      {point.optimized}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* RESET BUTTON */}
            <Button
              variant="outline"
              className="w-full text-xs font-semibold"
              onClick={() => setGenerationResult(null)}
            >
              Tailor Another Resume
            </Button>
          </div>

          {/* RIGHT PANEL: Customized Preview sheet (3/5 width) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Customized Resume Preview</h3>
              <Button size="sm" className="gap-1.5 text-xs font-semibold h-8 px-4" onClick={handlePrint}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>

            {/* HTML Resume preview container (styled professional format) */}
            <div
              id="printable-resume"
              className="border border-muted/50 rounded-xl p-8 bg-white text-black shadow-lg space-y-6 max-w-[800px] mx-auto text-left"
            >
              {/* Header Contact info */}
              <div className="text-center space-y-2 border-b pb-4">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                  {generationResult.tailoredData.personal.name}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {generationResult.tailoredData.personal.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {generationResult.tailoredData.personal.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {generationResult.tailoredData.personal.website}
                  </span>
                </div>
              </div>

              {/* Work Experience */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-gray-900 border-b pb-1">
                  Professional Experience
                </h3>
                {generationResult.tailoredData.experience.map((exp, index) => (
                  <div key={index} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-gray-900">
                      <span>{exp.role} &bull; {exp.company}</span>
                      <span className="text-gray-500 font-medium text-[10px]">{exp.duration}</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {exp.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Education */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-gray-900 border-b pb-1">
                  Education
                </h3>
                {generationResult.tailoredData.education.map((edu, index) => (
                  <div key={index} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-gray-900">
                      <span>{edu.degree}</span>
                      <span className="text-gray-500 font-medium text-[10px]">{edu.year}</span>
                    </div>
                    <p className="text-gray-600">{edu.school}</p>
                  </div>
                ))}
              </div>

              {/* Skills Grid */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-gray-900 border-b pb-1">
                  Technical Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {generationResult.tailoredData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-gray-100 text-gray-800 font-semibold rounded text-[10px]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PlusIcon helper
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
