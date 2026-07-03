"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"personal" | "experience" | "education" | "skills">("personal");
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
  const handleEducationChange = (index: number, key: string, value: string) => {
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
        <div className="flex border-b text-xs font-semibold select-none shrink-0 bg-muted/20 px-4">
          {(["personal", "experience", "education", "skills"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 capitalize transition-all border-b-2 -mb-[2px] ${
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
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={data.personal.name}
                  onChange={(e) => handlePersonalChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.personal.email}
                  onChange={(e) => handlePersonalChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={data.personal.phone}
                  onChange={(e) => handlePersonalChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website / Portfolio</Label>
                <Input
                  id="website"
                  value={data.personal.website}
                  onChange={(e) => handlePersonalChange("website", e.target.value)}
                />
              </div>
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

                  <div className="space-y-2">
                    <Label>Graduation Year</Label>
                    <Input
                      value={edu.year}
                      onChange={(e) => handleEducationChange(index, "year", e.target.value)}
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="skills-input">Skills (comma separated)</Label>
                <textarea
                  id="skills-input"
                  rows={4}
                  className="w-full text-sm p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring"
                  value={data.skills.join(", ")}
                  onChange={(e) => handleSkillsChange(e.target.value)}
                />
              </div>

              <Label className="block mt-4">Preview Skill Tags</Label>
              <div className="flex flex-wrap gap-2 border border-muted/50 rounded-xl p-4 bg-muted/5">
                {data.skills.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No tags loaded.</span>
                ) : (
                  data.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 bg-violet-600/10 text-violet-600 dark:text-violet-400 font-semibold rounded text-xs select-none"
                    >
                      {skill}
                    </span>
                  ))
                )}
              </div>
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
