"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Loader2, CheckCircle2, AlertCircle, Link, GitBranch, MapPin, Globe } from "lucide-react";
import { updateResumeStructuredData, type StructuredResumeData } from "@/actions/resumes";

interface Resume {
  id: string;
  title: string;
  fileUrl: string | null;
  isDefault: boolean;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ResumeEditorProps {
  resume: Resume | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete?: () => void;
}

export function ResumeEditor({ resume, isOpen, onClose, onSaveComplete }: ResumeEditorProps) {
  const [activeTab, setActiveTab] = useState<"personal" | "experience" | "education" | "skills" | "projects" | "certifications" | "achievements">("personal");
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<StructuredResumeData | null>(null);

  // Load structured data when resume changes
  useEffect(() => {
    if (resume?.content) {
      try {
        const parsed = JSON.parse(resume.content) as StructuredResumeData;
        setData(parsed);
      } catch (err) {
        console.error("Failed to parse resume content:", err);
      }
    } else {
      setData(null);
    }
  }, [resume]);

  const handleSave = async () => {
    if (!resume || !data) return;
    setIsSaving(true);
    try {
      const res = await updateResumeStructuredData(resume.id, data);
      if (res.success) {
        if (onSaveComplete) {
          onSaveComplete();
        }
        onClose();
      } else {
        alert(res.error || "Failed to save updates.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!resume || !data) return null;

  // Personal helpers
  const handlePersonalChange = (key: keyof typeof data.personal, value: string) => {
    setData({
      ...data,
      personal: {
        ...data.personal,
        [key]: value,
      },
    });
  };

  // Experience helpers
  const handleExperienceChange = (index: number, key: string, value: string) => {
    const updated = [...data.experience];
    updated[index] = { ...updated[index], [key]: value };
    setData({ ...data, experience: updated });
  };

  const addExperience = () => {
    setData({
      ...data,
      experience: [
        ...data.experience,
        { company: "", role: "", duration: "", description: "" },
      ],
    });
  };

  const removeExperience = (index: number) => {
    const updated = data.experience.filter((_, i) => i !== index);
    setData({ ...data, experience: updated });
  };

  // Education helpers
  const handleEducationChange = (index: number, key: string, value: any) => {
    const updated = [...data.education];
    updated[index] = { ...updated[index], [key]: value };
    setData({ ...data, education: updated });
  };

  const addEducation = () => {
    setData({
      ...data,
      education: [...data.education, { school: "", degree: "", year: "" }],
    });
  };

  const removeEducation = (index: number) => {
    const updated = data.education.filter((_, i) => i !== index);
    setData({ ...data, education: updated });
  };

  // Projects helpers
  const handleProjectChange = (index: number, key: string, value: any) => {
    const updated = [...(data.projects || [])];
    updated[index] = { ...updated[index], [key]: value };
    setData({ ...data, projects: updated });
  };

  const addProject = () => {
    setData({
      ...data,
      projects: [
        ...(data.projects || []),
        { name: "", description: "", technologies: [], duration: "", githubUrl: "", liveUrl: "" },
      ],
    });
  };

  const removeProject = (index: number) => {
    const updated = (data.projects || []).filter((_, i) => i !== index);
    setData({ ...data, projects: updated });
  };

  // Certifications helpers
  const handleCertificationChange = (index: number, key: string, value: any) => {
    const updated = [...(data.certifications || [])];
    updated[index] = { ...updated[index], [key]: value };
    setData({ ...data, certifications: updated });
  };

  const addCertification = () => {
    setData({
      ...data,
      certifications: [
        ...(data.certifications || []),
        { name: "", issuer: "", issueDate: "", expiryDate: "", credentialUrl: "" },
      ],
    });
  };

  const removeCertification = (index: number) => {
    const updated = (data.certifications || []).filter((_, i) => i !== index);
    setData({ ...data, certifications: updated });
  };

  // Achievements helpers
  const handleAchievementChange = (index: number, key: string, value: any) => {
    const updated = [...(data.achievements || [])];
    updated[index] = { ...updated[index], [key]: value };
    setData({ ...data, achievements: updated });
  };

  const addAchievement = () => {
    setData({
      ...data,
      achievements: [
        ...(data.achievements || []),
        { title: "", category: "Award", description: "", date: "" },
      ],
    });
  };

  const removeAchievement = (index: number) => {
    const updated = (data.achievements || []).filter((_, i) => i !== index);
    setData({ ...data, achievements: updated });
  };

  // Skills helpers
  const handleSkillsChange = (value: string) => {
    const split = value.split(",").map((s) => s.trim()).filter(Boolean);
    setData({ ...data, skills: split });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col h-full p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-xl font-bold">Edit Parsed Details</SheetTitle>
          <SheetDescription className="text-xs">
            Review and optimize the extracted structured data of your resume
          </SheetDescription>
        </SheetHeader>

        {/* Custom Tab Bar */}
        <div className="flex border-b text-xs font-semibold select-none shrink-0 bg-muted/20 px-4 overflow-x-auto">
          {(["personal", "experience", "education", "skills", "projects", "certifications", "achievements"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 capitalize transition-all border-b-2 -mb-[2px] shrink-0 ${
                activeTab === tab
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "personal" ? "Contact Info" : tab}
            </button>
          ))}
        </div>

        {/* Tab Contents (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* PERSONAL TAB */}
          {activeTab === "personal" && (
            <div className="space-y-4">
              {/* Validation helper functions */}
              {(() => {
                const isEmailValid = !data.personal.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personal.email);
                const isPhoneValid = !data.personal.phone || data.personal.phone.replace(/\D/g, '').length >= 7;
                const isValidUrl = (url: string) => {
                  if (!url) return true;
                  try {
                    new URL(url.startsWith('http') ? url : 'https://' + url);
                    return true;
                  } catch {
                    return false;
                  }
                };

                return (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={data.personal.name}
                        onChange={(e) => handlePersonalChange("name", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="email">Email</Label>
                        {data.personal.email && (
                          <span className="flex items-center gap-1 text-[10px]">
                            {isEmailValid ? (
                              <span className="text-emerald-500 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Valid</span>
                            ) : (
                              <span className="text-rose-500 flex items-center gap-0.5"><AlertCircle className="h-3 w-3" /> Invalid Email</span>
                            )}
                          </span>
                        )}
                      </div>
                      <Input
                        id="email"
                        type="email"
                        value={data.personal.email}
                        onChange={(e) => handlePersonalChange("email", e.target.value)}
                        className={data.personal.email && !isEmailValid ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="phone">Phone</Label>
                        {data.personal.phone && (
                          <span className="flex items-center gap-1 text-[10px]">
                            {isPhoneValid ? (
                              <span className="text-emerald-500 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Valid</span>
                            ) : (
                              <span className="text-rose-500 flex items-center gap-0.5"><AlertCircle className="h-3 w-3" /> Too Short</span>
                            )}
                          </span>
                        )}
                      </div>
                      <Input
                        id="phone"
                        value={data.personal.phone}
                        onChange={(e) => handlePersonalChange("phone", e.target.value)}
                        className={data.personal.phone && !isPhoneValid ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Location
                      </Label>
                      <Input
                        id="location"
                        placeholder="e.g. City, State / Country"
                        value={data.personal.location || ""}
                        onChange={(e) => handlePersonalChange("location", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="linkedin" className="flex items-center gap-1">
                          <Link className="h-3.5 w-3.5 text-[#0A66C2]" /> LinkedIn URL
                        </Label>
                        {data.personal.linkedin && (
                          <span className="flex items-center gap-1 text-[10px]">
                            {isValidUrl(data.personal.linkedin) ? (
                              <span className="text-emerald-500 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Valid Link</span>
                            ) : (
                              <span className="text-rose-500 flex items-center gap-0.5"><AlertCircle className="h-3 w-3" /> Invalid URL</span>
                            )}
                          </span>
                        )}
                      </div>
                      <Input
                        id="linkedin"
                        placeholder="https://linkedin.com/in/username"
                        value={data.personal.linkedin || ""}
                        onChange={(e) => handlePersonalChange("linkedin", e.target.value)}
                        className={data.personal.linkedin && !isValidUrl(data.personal.linkedin) ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="github" className="flex items-center gap-1">
                          <GitBranch className="h-3.5 w-3.5 text-foreground" /> GitHub URL
                        </Label>
                        {data.personal.github && (
                          <span className="flex items-center gap-1 text-[10px]">
                            {isValidUrl(data.personal.github) ? (
                              <span className="text-emerald-500 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Valid Link</span>
                            ) : (
                              <span className="text-rose-500 flex items-center gap-0.5"><AlertCircle className="h-3 w-3" /> Invalid URL</span>
                            )}
                          </span>
                        )}
                      </div>
                      <Input
                        id="github"
                        placeholder="https://github.com/username"
                        value={data.personal.github || ""}
                        onChange={(e) => handlePersonalChange("github", e.target.value)}
                        className={data.personal.github && !isValidUrl(data.personal.github) ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="portfolio" className="flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Portfolio / Website
                        </Label>
                        {data.personal.portfolio && (
                          <span className="flex items-center gap-1 text-[10px]">
                            {isValidUrl(data.personal.portfolio) ? (
                              <span className="text-emerald-500 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Valid Link</span>
                            ) : (
                              <span className="text-rose-500 flex items-center gap-0.5"><AlertCircle className="h-3 w-3" /> Invalid URL</span>
                            )}
                          </span>
                        )}
                      </div>
                      <Input
                        id="portfolio"
                        placeholder="https://yourwebsite.com"
                        value={data.personal.portfolio || (!/linkedin\.com|github\.com/i.test(data.personal.website || "") ? data.personal.website || "" : "")}
                        onChange={(e) => {
                          handlePersonalChange("portfolio", e.target.value);
                          handlePersonalChange("website", e.target.value);
                        }}
                        className={(data.personal.portfolio || (!/linkedin\.com|github\.com/i.test(data.personal.website || "") ? data.personal.website || "" : "")) && !isValidUrl(data.personal.portfolio || data.personal.website || "") ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <Label htmlFor="summary">Professional Summary / Objective</Label>
                      <textarea
                        id="summary"
                        rows={4}
                        placeholder="Brief summary of your professional background and objectives..."
                        className="w-full text-sm p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring"
                        value={data.summary || ""}
                        onChange={(e) => setData({ ...data, summary: e.target.value })}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* WORK EXPERIENCE TAB */}
          {activeTab === "experience" && (
            <div className="space-y-6">
              {data.experience.map((exp, index) => (
                <div key={index} className="border border-muted/80 rounded-xl p-4 space-y-4 relative group/item bg-muted/10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 h-7 w-7"
                    onClick={() => removeExperience(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input
                        value={exp.company}
                        onChange={(e) => handleExperienceChange(index, "company", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input
                        value={exp.role}
                        onChange={(e) => handleExperienceChange(index, "role", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (e.g. 2021 - 2023)</Label>
                    <Input
                      value={exp.duration}
                      onChange={(e) => handleExperienceChange(index, "duration", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        placeholder="e.g. San Francisco, CA / Remote"
                        value={exp.location || ""}
                        onChange={(e) => handleExperienceChange(index, "location", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employment Type</Label>
                      <Input
                        placeholder="e.g. Full-time / Contract / Intern"
                        value={exp.employmentType || ""}
                        onChange={(e) => handleExperienceChange(index, "employmentType", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <textarea
                      rows={3}
                      className="w-full text-sm p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring"
                      value={exp.description}
                      onChange={(e) => handleExperienceChange(index, "description", e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed gap-1 h-9 font-semibold text-xs"
                onClick={addExperience}
              >
                <Plus className="h-4 w-4" />
                Add Work Experience
              </Button>
            </div>
          )}

          {/* EDUCATION TAB */}
          {activeTab === "education" && (
            <div className="space-y-6">
              {data.education.map((edu, index) => (
                <div key={index} className="border border-muted/80 rounded-xl p-4 space-y-4 relative bg-muted/10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 h-7 w-7"
                    onClick={() => removeEducation(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>School / University</Label>
                      <Input
                        value={edu.school}
                        onChange={(e) => handleEducationChange(index, "school", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Degree / Program</Label>
                      <Input
                        value={edu.degree}
                        onChange={(e) => handleEducationChange(index, "degree", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Field of Study</Label>
                      <Input
                        placeholder="e.g. Computer Science / Business"
                        value={edu.fieldOfStudy || ""}
                        onChange={(e) => handleEducationChange(index, "fieldOfStudy", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grade / CGPA</Label>
                      <Input
                        placeholder="e.g. 8.5 CGPA / 92%"
                        value={edu.grade || ""}
                        onChange={(e) => handleEducationChange(index, "grade", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        placeholder="e.g. 2019 / Aug 2019"
                        value={edu.startDate || ""}
                        onChange={(e) => handleEducationChange(index, "startDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date / Graduation</Label>
                      <Input
                        placeholder="e.g. 2023 / Present"
                        value={edu.endDate || ""}
                        onChange={(e) => handleEducationChange(index, "endDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Graduation Year</Label>
                      <Input
                        value={edu.year}
                        onChange={(e) => handleEducationChange(index, "year", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Coursework (comma separated)</Label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Data Structures, Algorithms, DBMS"
                      className="w-full text-sm p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring"
                      value={edu.coursework ? edu.coursework.join(", ") : ""}
                      onChange={(e) => {
                        const courses = e.target.value.split(",").map(c => c.trim()).filter(Boolean);
                        handleEducationChange(index, "coursework", courses);
                      }}
                    />
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed gap-1 h-9 font-semibold text-xs"
                onClick={addEducation}
              >
                <Plus className="h-4 w-4" />
                Add Education Record
              </Button>
            </div>
          )}

          {/* SKILLS TAB */}
          {activeTab === "skills" && (
            <div className="space-y-6">
              {/* Validation/Clean helper to categorise input changes and update flat array */}
              {(() => {
                const cats = data.categorizedSkills || {
                  languages: [], frameworks: [], databases: [], tools: [], cloud: [], other: []
                };

                const handleCategoryChange = (key: keyof typeof cats, value: string) => {
                  const items = value.split(",").map((s) => s.trim()).filter(Boolean);
                  const updatedCats = { ...cats, [key]: items };
                  
                  // Re-compile flat skills array
                  const flat = [
                    ...updatedCats.languages,
                    ...updatedCats.frameworks,
                    ...updatedCats.databases,
                    ...updatedCats.tools,
                    ...updatedCats.cloud,
                    ...updatedCats.other
                  ];
                  const uniqueFlat = [...new Set(flat)];

                  setData({
                    ...data,
                    skills: uniqueFlat,
                    categorizedSkills: updatedCats
                  });
                };

                return (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Languages</Label>
                      <Input
                        placeholder="e.g. JavaScript, TypeScript, Python"
                        value={cats.languages.join(", ")}
                        onChange={(e) => handleCategoryChange("languages", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Frameworks / Libraries</Label>
                      <Input
                        placeholder="e.g. React, Next.js, Django"
                        value={cats.frameworks.join(", ")}
                        onChange={(e) => handleCategoryChange("frameworks", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Databases</Label>
                      <Input
                        placeholder="e.g. PostgreSQL, MongoDB, Redis"
                        value={cats.databases.join(", ")}
                        onChange={(e) => handleCategoryChange("databases", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cloud & Infrastructure</Label>
                      <Input
                        placeholder="e.g. AWS, Docker, Kubernetes"
                        value={cats.cloud.join(", ")}
                        onChange={(e) => handleCategoryChange("cloud", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tools & Version Control</Label>
                      <Input
                        placeholder="e.g. Git, Figma, Postman"
                        value={cats.tools.join(", ")}
                        onChange={(e) => handleCategoryChange("tools", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Other Skills (Soft / Professional)</Label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Agile, Scrum, Communication, Teamwork"
                        className="w-full text-sm p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring"
                        value={cats.other.join(", ")}
                        onChange={(e) => handleCategoryChange("other", e.target.value)}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* PROJECTS TAB */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              {(data.projects || []).map((proj, index) => (
                <div key={index} className="border border-muted/80 rounded-xl p-4 space-y-4 relative bg-muted/10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 h-7 w-7"
                    onClick={() => removeProject(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Project Name</Label>
                      <Input
                        value={proj.name}
                        onChange={(e) => handleProjectChange(index, "name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (if available)</Label>
                      <Input
                        placeholder="e.g. Fall 2023 / 2 months"
                        value={proj.duration || ""}
                        onChange={(e) => handleProjectChange(index, "duration", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>GitHub Link</Label>
                      <Input
                        placeholder="https://github.com/..."
                        value={proj.githubUrl || ""}
                        onChange={(e) => handleProjectChange(index, "githubUrl", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Live / Demo Link</Label>
                      <Input
                        placeholder="https://..."
                        value={proj.liveUrl || ""}
                        onChange={(e) => handleProjectChange(index, "liveUrl", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Technologies (comma separated)</Label>
                    <textarea
                      rows={1}
                      placeholder="e.g. Next.js, TypeScript, TailwindCSS"
                      className="w-full text-sm p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring"
                      value={proj.technologies ? proj.technologies.join(", ") : ""}
                      onChange={(e) => {
                        const techs = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
                        handleProjectChange(index, "technologies", techs);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <textarea
                      rows={3}
                      className="w-full text-sm p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring"
                      value={proj.description}
                      onChange={(e) => handleProjectChange(index, "description", e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed gap-1 h-9 font-semibold text-xs"
                onClick={addProject}
              >
                <Plus className="h-4 w-4" />
                Add Project Record
              </Button>
            </div>
          )}
          {/* CERTIFICATIONS TAB */}
          {activeTab === "certifications" && (
            <div className="space-y-6">
              {(data.certifications || []).map((cert, index) => (
                <div key={index} className="border border-muted/80 rounded-xl p-4 space-y-4 relative bg-muted/10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 h-7 w-7"
                    onClick={() => removeCertification(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="space-y-2">
                    <Label>Certification Name</Label>
                    <Input
                      value={cert.name}
                      onChange={(e) => handleCertificationChange(index, "name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Issuing Organization</Label>
                    <Input
                      placeholder="e.g. Amazon Web Services / Google Cloud"
                      value={cert.issuer}
                      onChange={(e) => handleCertificationChange(index, "issuer", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Issue Date</Label>
                      <Input
                        placeholder="e.g. Jan 2023"
                        value={cert.issueDate || ""}
                        onChange={(e) => handleCertificationChange(index, "issueDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date (if any)</Label>
                      <Input
                        placeholder="e.g. Jan 2026 / No Expiry"
                        value={cert.expiryDate || ""}
                        onChange={(e) => handleCertificationChange(index, "expiryDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Credential Link / URL</Label>
                    <Input
                      placeholder="https://..."
                      value={cert.credentialUrl || ""}
                      onChange={(e) => handleCertificationChange(index, "credentialUrl", e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed gap-1 h-9 font-semibold text-xs"
                onClick={addCertification}
              >
                <Plus className="h-4 w-4" />
                Add Certification
              </Button>
            </div>
          )}
          {/* ACHIEVEMENTS TAB */}
          {activeTab === "achievements" && (
            <div className="space-y-6">
              {(data.achievements || []).map((ach, index) => (
                <div key={index} className="border border-muted/80 rounded-xl p-4 space-y-4 relative bg-muted/10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 h-7 w-7"
                    onClick={() => removeAchievement(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={ach.title}
                        onChange={(e) => handleAchievementChange(index, "title", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select
                        className="w-full text-sm p-2.5 rounded-lg border bg-background focus:outline-none focus:border-ring h-10"
                        value={ach.category}
                        onChange={(e) => handleAchievementChange(index, "category", e.target.value)}
                      >
                        <option value="Award">Award / Honor</option>
                        <option value="Leadership">Leadership Position</option>
                        <option value="Competition">Competition / Hackathon</option>
                        <option value="Sport">Sport Achievement</option>
                        <option value="Publication">Publication</option>
                        <option value="Extracurricular">Extracurricular Activity</option>
                        <option value="Other">Other Achievement</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Date / Year (if available)</Label>
                    <Input
                      placeholder="e.g. 2023 / Spring 2022"
                      value={ach.date || ""}
                      onChange={(e) => handleAchievementChange(index, "date", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description / Details</Label>
                    <textarea
                      rows={3}
                      className="w-full text-sm p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring"
                      value={ach.description}
                      onChange={(e) => handleAchievementChange(index, "description", e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed gap-1 h-9 font-semibold text-xs"
                onClick={addAchievement}
              >
                <Plus className="h-4 w-4" />
                Add Achievement
              </Button>
            </div>
          )}
        </div>

        {/* Footer Area */}
        <SheetFooter className="p-6 border-t shrink-0 flex items-center justify-end gap-2 bg-background">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
