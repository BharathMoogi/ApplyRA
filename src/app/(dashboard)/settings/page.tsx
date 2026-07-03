"use client";

import { useEffect, useState } from "react";
import { getSettingsMetadata, updateSettingsMetadata, type SettingsPreferences, type UserSettingsResponse } from "@/actions/settings";
import { getGmailConnectionStatus, toggleGmailConnection } from "@/actions/gmail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/shared/loading";
import {
  User,
  Sliders,
  Bell,
  Lock,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ShieldCheck,
  Plus,
  X,
  Loader2,
  FileText,
} from "lucide-react";

type ActiveTab = "profile" | "automation" | "integrations" | "security";

export default function SettingsDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Direct Profile Inputs
  const [fullName, setFullName] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGitHubUrl] = useState("");

  // Extracted Preferences
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  
  const [salaryExpectations, setSalaryExpectations] = useState("");
  
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [locInput, setLocInput] = useState("");
  
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const [experienceYears, setExperienceYears] = useState(5);
  const [remotePreferences, setRemotePreferences] = useState<SettingsPreferences["remotePreferences"]>("Hybrid/Remote");
  const [resumeTemplate, setResumeTemplate] = useState<SettingsPreferences["resumeTemplate"]>("Elegant Tech");
  
  // API Keys
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Automation
  const [autoApplyScore, setAutoApplyScore] = useState(85);
  const [autoGenerateCoverLetter, setAutoGenerateCoverLetter] = useState(true);

  // Notifications
  const [emailDigest, setEmailDigest] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Gmail OAuth Status
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);

  // Security (Change Password Mock)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passMessage, setPassMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await getSettingsMetadata();
      if (res.success && res.settings) {
        const { fullName, website, linkedinUrl, githubUrl, preferences } = res.settings;
        setFullName(fullName);
        setWebsite(website);
        setLinkedinUrl(linkedinUrl);
        setGitHubUrl(githubUrl);
        
        setPreferredRoles(preferences.preferredRoles);
        setSalaryExpectations(preferences.salaryExpectations);
        setPreferredLocations(preferences.preferredLocations);
        setSkills(preferences.skills);
        setExperienceYears(preferences.experienceYears);
        setRemotePreferences(preferences.remotePreferences);
        setResumeTemplate(preferences.resumeTemplate);
        setOpenaiApiKey(preferences.openaiApiKey);
        setAutoApplyScore(preferences.autoApplyScore);
        setAutoGenerateCoverLetter(preferences.autoGenerateCoverLetter);
        setEmailDigest(preferences.emailDigest);
        setPushNotifications(preferences.pushNotifications);
      }

      const gmailConnected = await getGmailConnectionStatus();
      setIsGmailConnected(gmailConnected);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await updateSettingsMetadata({
        fullName,
        website,
        linkedinUrl,
        githubUrl,
        preferences: {
          preferredRoles,
          salaryExpectations,
          preferredLocations,
          skills,
          experienceYears,
          remotePreferences,
          resumeTemplate,
          openaiApiKey,
          emailDigest,
          pushNotifications,
          autoApplyScore,
          autoGenerateCoverLetter,
        },
      });

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    await new Promise((r) => setTimeout(r, 1200));
    try {
      const status = await toggleGmailConnection(!isGmailConnected);
      setIsGmailConnected(status);
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMessage("Confirm password does not match new password.");
      return;
    }

    setIsChangingPassword(true);
    setPassMessage(null);
    await new Promise((r) => setTimeout(r, 1500)); // mock delay
    setIsChangingPassword(false);
    setPassMessage("Password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // Helper arrays
  const addPreferredRole = () => {
    if (roleInput && !preferredRoles.includes(roleInput)) {
      setPreferredRoles([...preferredRoles, roleInput]);
      setRoleInput("");
    }
  };

  const removePreferredRole = (val: string) => {
    setPreferredRoles(preferredRoles.filter((r) => r !== val));
  };

  const addPreferredLocation = () => {
    if (locInput && !preferredLocations.includes(locInput)) {
      setPreferredLocations([...preferredLocations, locInput]);
      setLocInput("");
    }
  };

  const removePreferredLocation = (val: string) => {
    setPreferredLocations(preferredLocations.filter((l) => l !== val));
  };

  const addSkill = () => {
    if (skillInput && !skills.includes(skillInput)) {
      setSkills([...skills, skillInput]);
      setSkillInput("");
    }
  };

  const removeSkill = (val: string) => {
    setSkills(skills.filter((s) => s !== val));
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center border border-muted/50 rounded-xl bg-muted/5">
        <Loading text="Retrieving preferences metadata..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration Settings</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Manage profiles metadata, job expectations, automation score rules, and secure API keys
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-2 shrink-0">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Settings saved!
            </span>
          )}
          <Button onClick={handleSavePreferences} disabled={isSaving} className="h-9 text-xs font-semibold">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* TABS CONTROLLER MENU */}
      <div className="flex border-b border-muted/60 gap-4 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all border-b-2 -mb-0.5 leading-none shrink-0 ${
            activeTab === "profile"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          Profile & Preferences
        </button>

        <button
          onClick={() => setActiveTab("automation")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all border-b-2 -mb-0.5 leading-none shrink-0 ${
            activeTab === "automation"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="h-4 w-4" />
          AI & Automation
        </button>

        <button
          onClick={() => setActiveTab("integrations")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all border-b-2 -mb-0.5 leading-none shrink-0 ${
            activeTab === "integrations"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell className="h-4 w-4" />
          Integrations & Alerts
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all border-b-2 -mb-0.5 leading-none shrink-0 ${
            activeTab === "security"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Lock className="h-4 w-4" />
          Security & Templates
        </button>
      </div>

      {/* CORE VIEW TABS CONTENTS */}
      <div className="grid gap-6">
        {/* ──── TAB 1: PROFILE & PREFERENCES ──── */}
        {activeTab === "profile" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Bio Metadata */}
            <Card className="border-muted/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">User Details</CardTitle>
                <CardDescription>Setup metadata for resume optimization scans</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10 border-muted/50 text-xs" />
                </div>

                <div className="space-y-2">
                  <Label>Personal Href Website</Label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://website.com" className="h-10 border-muted/50 text-xs" />
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>LinkedIn Profile</Label>
                    <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/user" className="h-10 border-muted/50 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>GitHub URL</Label>
                    <Input value={githubUrl} onChange={(e) => setGitHubUrl(e.target.value)} placeholder="https://github.com/user" className="h-10 border-muted/50 text-xs" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Career details expectations */}
            <Card className="border-muted/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Job Expectations</CardTitle>
                <CardDescription>Preferred targeting parameters for matching scans</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Preferred roles tags */}
                <div className="space-y-2">
                  <Label>Preferred Roles</Label>
                  <div className="flex gap-1.5">
                    <Input value={roleInput} onChange={(e) => setRoleInput(e.target.value)} placeholder="Add title..." className="h-9 border-muted/50 text-xs" />
                    <Button type="button" onClick={addPreferredRole} className="h-9 px-3 text-xs"><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {preferredRoles.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-muted font-bold text-muted-foreground border">
                        {r}
                        <button type="button" onClick={() => removePreferredRole(r)}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Salary & Locations */}
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Salary Bracket</Label>
                    <Input value={salaryExpectations} onChange={(e) => setSalaryExpectations(e.target.value)} placeholder="e.g. $130k - $160k" className="h-10 border-muted/50 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>Experience Level (Years)</Label>
                    <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(parseInt(e.target.value))} className="h-10 border-muted/50 text-xs" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Remote Preferences</Label>
                  <select
                    value={remotePreferences}
                    onChange={(e) => setRemotePreferences(e.target.value as any)}
                    className="w-full text-xs h-9 p-2 border rounded-lg bg-background border-muted/50 focus:outline-none"
                  >
                    <option value="Remote">100% Remote</option>
                    <option value="Hybrid">Hybrid Office</option>
                    <option value="Onsite">100% Onsite</option>
                    <option value="Hybrid/Remote">Hybrid / Remote Optional</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Skills Tag block (Full Width on Grid) */}
            <Card className="border-muted/50 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Skills Tag Library</CardTitle>
                <CardDescription>Enter technical skills to match against job criteria logs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex gap-2 max-w-md">
                  <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Type skill (e.g. Next.js)..." className="h-9 border-muted/50 text-xs" />
                  <Button type="button" onClick={addSkill} className="h-9 px-3 text-xs"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 px-3 py-1 rounded bg-violet-600/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-600/10 text-[10px]">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)}><X className="h-3.5 w-3.5" /></button>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ──── TAB 2: AI & AUTOMATION RULES ──── */}
        {activeTab === "automation" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* API Keys */}
            <Card className="border-muted/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Integrations API Keys</CardTitle>
                <CardDescription>Integrate OpenAI modules for customized resume generation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-2">
                  <Label>OpenAI API Key</Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder="sk-proj-..."
                      className="h-10 border-muted/50 text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Automation Rules */}
            <Card className="border-muted/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Autonomous Submission Rules</CardTitle>
                <CardDescription>Setup threshold compatibility parameters for AI Auto-Apply</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Minimum ATS Score for Auto-Apply</Label>
                    <span className="font-bold text-violet-600 text-xs">{autoApplyScore}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="95"
                    value={autoApplyScore}
                    onChange={(e) => setAutoApplyScore(parseInt(e.target.value))}
                    className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    The AI Agent will automatically apply only when the compatibility matches or exceeds this threshold.
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-dashed">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold">Auto-generate Cover Letters</h5>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Produce personalized letters during scans</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoGenerateCoverLetter}
                      onChange={(e) => setAutoGenerateCoverLetter(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-muted/50 text-primary focus:ring-primary accent-primary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ──── TAB 3: INTEGRATIONS & ALERTS ──── */}
        {activeTab === "integrations" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Gmail OAuth */}
            <Card className="border-muted/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Mail className="h-5 w-5 text-rose-500" />
                  Gmail OAuth Sync
                </CardTitle>
                <CardDescription>Scan your career inbox for confirmations and schedules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {isGmailConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl leading-tight">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <div>
                        <h5 className="font-bold">Google Auth Verified</h5>
                        <p className="text-[10px] text-muted-foreground mt-0.5">john.doe@gmail.com</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleConnectGmail}
                      disabled={isConnectingGmail}
                      className="w-full text-xs font-semibold h-9 border-muted/50 text-rose-600 hover:bg-rose-500/5"
                    >
                      {isConnectingGmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect Gmail"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-muted/10 border border-muted/50 rounded-xl leading-tight">
                      <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-muted-foreground">Sync inactive</h5>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Enable Google integrations to update pipeline trackers</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleConnectGmail}
                      disabled={isConnectingGmail}
                      className="w-full gap-1.5 h-9 font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      {isConnectingGmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect Gmail via Google OAuth"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notification settings */}
            <Card className="border-muted/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Real-Time Notification Preferences</CardTitle>
                <CardDescription>Select channels for application logs and matching summaries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold">Receive Daily Summary Email</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Sends weekly progress summaries</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailDigest}
                    onChange={(e) => setEmailDigest(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-muted/50 accent-primary"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-dashed">
                  <div>
                    <h5 className="font-bold">Enable Browser Push Notifications</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Triggers desktop toasts for invitations</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-muted/50 accent-primary"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ──── TAB 4: SECURITY & TEMPLATES ──── */}
        {activeTab === "security" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Change Password */}
            <Card className="border-muted/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Account Security</CardTitle>
                <CardDescription>Update credentials keys layers</CardDescription>
              </CardHeader>
              <form onSubmit={handleChangePassword}>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="h-9 border-muted/50 text-xs"
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-9 border-muted/50 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm New Password</Label>
                      <Input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-9 border-muted/50 text-xs"
                      />
                    </div>
                  </div>

                  {passMessage && (
                    <p className={`text-[10px] font-bold ${passMessage.includes("success") ? "text-emerald-600" : "text-rose-600"}`}>
                      {passMessage}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="pt-2">
                  <Button type="submit" disabled={isChangingPassword} className="h-9 text-xs font-semibold ml-auto">
                    {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Resume template selector */}
            <Card className="border-muted/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Primary Resume Style</CardTitle>
                <CardDescription>Select default formatting template for PDF print downloads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {(["Elegant Tech", "Modern Creative", "Minimalist Classic"] as const).map((temp) => (
                  <div
                    key={temp}
                    onClick={() => setResumeTemplate(temp)}
                    className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-all ${
                      resumeTemplate === temp
                        ? "border-primary bg-primary/5 text-primary-foreground"
                        : "border-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4.5 w-4.5 text-muted-foreground" />
                      <div>
                        <h5 className="font-bold text-foreground">{temp}</h5>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {temp === "Elegant Tech"
                            ? "Tailored for tech roles and ATS scanners"
                            : temp === "Modern Creative"
                            ? "Vibrant layout for design and startup teams"
                            : "Traditional compact executive formatting"}
                        </p>
                      </div>
                    </div>
                    <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                      resumeTemplate === temp ? "border-primary bg-primary text-white" : "border-muted/50"
                    }`}>
                      {resumeTemplate === temp && <span className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
