"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getApplications,
  createApplication,
  updateApplicationStatus,
  updateApplicationDetails,
  deleteApplication,
  getApplicationsAnalytics,
  type JobApplicationUI,
  type UIStatus,
  type TrackerAnalytics,
} from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loading } from "@/components/shared/loading";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import {
  Briefcase,
  Search,
  MapPin,
  Kanban as KanbanIcon,
  Table as TableIcon,
  Plus,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  Sparkles,
  Calendar,
  DollarSign,
  Info,
  Loader2,
  ExternalLink,
} from "lucide-react";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<JobApplicationUI[]>([]);
  const [analytics, setAnalytics] = useState<TrackerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [viewTab, setViewTab] = useState<"kanban" | "table">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<JobApplicationUI | null>(null);

  // Form states (Add)
  const [addCompany, setAddCompany] = useState("");
  const [addRole, setAddRole] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addLocation, setAddLocation] = useState("");
  const [addSalary, setAddSalary] = useState("");
  const [addStatus, setAddStatus] = useState<UIStatus>("Applied");
  const [addNotes, setAddNotes] = useState("");
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  // Form states (Edit/Details)
  const [editCompany, setEditCompany] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<UIStatus>("Applied");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchTrackerData = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getApplications();
      setApplications(list);
      const stats = await getApplicationsAnalytics();
      setAnalytics(stats);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrackerData();
  }, [fetchTrackerData]);

  // Status lists
  const statuses: UIStatus[] = [
    "Applied",
    "Under Review",
    "OA",
    "Interview",
    "HR Round",
    "Offer",
    "Rejected",
    "Withdrawn",
  ];

  // Filter application helpers
  const filteredApps = applications.filter((app) => {
    const matchSearch =
      app.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLoc = app.location
      ? app.location.toLowerCase().includes(locationFilter.toLowerCase())
      : true;
    return matchSearch && (locationFilter ? matchLoc : true);
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCompany || !addRole) return;
    setIsSavingAdd(true);
    try {
      const res = await createApplication({
        companyName: addCompany,
        jobTitle: addRole,
        jobUrl: addUrl,
        location: addLocation,
        salary: addSalary,
        status: addStatus,
        notes: addNotes,
      });

      if (res.success) {
        setIsAddOpen(false);
        // Reset
        setAddCompany("");
        setAddRole("");
        setAddUrl("");
        setAddLocation("");
        setAddSalary("");
        setAddStatus("Applied");
        setAddNotes("");
        fetchTrackerData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingAdd(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setIsSavingEdit(true);
    try {
      // If status changed, update it
      if (editStatus !== selectedApp.status) {
        await updateApplicationStatus(selectedApp.id, editStatus);
      }
      
      const res = await updateApplicationDetails(selectedApp.id, {
        companyName: editCompany,
        jobTitle: editRole,
        jobUrl: editUrl,
        location: editLocation,
        salary: editSalary,
        notes: editNotes,
      });

      if (res.success) {
        setIsDetailsOpen(false);
        setSelectedApp(null);
        fetchTrackerData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      const res = await deleteApplication(id);
      if (res.success) {
        setIsDetailsOpen(false);
        setSelectedApp(null);
        fetchTrackerData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditDrawer = (app: JobApplicationUI) => {
    setSelectedApp(app);
    setEditCompany(app.companyName);
    setEditRole(app.jobTitle);
    setEditUrl(app.jobUrl || "");
    setEditLocation(app.location || "");
    setEditSalary(app.salary || "");
    setEditNotes(app.notes || "");
    setEditStatus(app.status);
    setIsDetailsOpen(true);
  };

  const shiftStatus = async (app: JobApplicationUI, direction: "left" | "right") => {
    const currentIndex = statuses.indexOf(app.status);
    let nextIndex = direction === "right" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < statuses.length) {
      const nextStatus = statuses[nextIndex];
      await updateApplicationStatus(app.id, nextStatus);
      fetchTrackerData();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Tracker</h1>
          <p className="text-muted-foreground text-sm">
            Organize, update, and review your interview funnel statuses in Kanban columns or lists
          </p>
        </div>

        <Button className="gap-1.5 text-xs font-semibold shrink-0" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Application
        </Button>
      </div>

      {/* METRICS ROW */}
      {analytics && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="border border-muted/50 rounded-xl p-4 bg-muted/5">
            <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Total Tracks</h5>
            <p className="text-2xl font-black mt-1 text-primary">{analytics.total}</p>
          </div>
          <div className="border border-muted/50 rounded-xl p-4 bg-muted/5">
            <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Interview Rate</h5>
            <p className="text-2xl font-black mt-1 text-accent flex items-center gap-1">
              <TrendingUp className="h-5 w-5 shrink-0" />
              {analytics.interviewRate}%
            </p>
          </div>
          <div className="border border-muted/50 rounded-xl p-4 bg-muted/5">
            <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Offer Success</h5>
            <p className="text-2xl font-black mt-1 text-emerald-500 flex items-center gap-1">
              <Sparkles className="h-5 w-5 shrink-0" />
              {analytics.offerRate}%
            </p>
          </div>
          <div className="border border-muted/50 rounded-xl p-4 bg-muted/5">
            <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Offer Total</h5>
            <p className="text-2xl font-black mt-1 text-amber-500">
              {applications.filter((a) => a.status === "Offer").length}
            </p>
          </div>
        </div>
      )}

      {/* CONTROL & VIEW TOGGLE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-muted/50 pb-4">
        {/* Search & Location query inputs */}
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search role or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 border-muted/50 text-xs"
            />
          </div>
          <div className="relative w-40 shrink-0">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="pl-9 h-9 border-muted/50 text-xs"
            />
          </div>
        </div>

        {/* View tab selector button group */}
        <div className="flex border border-muted/50 rounded-lg p-0.5 bg-muted/10 shrink-0 self-start">
          <button
            onClick={() => setViewTab("kanban")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewTab === "kanban" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <KanbanIcon className="h-3.5 w-3.5" />
            Kanban
          </button>
          <button
            onClick={() => setViewTab("table")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewTab === "table" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            Spreadsheet
          </button>
        </div>
      </div>

      {/* TRACKER CORE CONTAINER */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center border border-muted/50 rounded-xl bg-muted/5">
          <Loading text="Loading tracking funnel..." />
        </div>
      ) : filteredApps.length === 0 ? (
        <Card className="border-dashed py-16 text-center">
          <CardContent className="space-y-3">
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="font-semibold text-sm">No applications tracked</h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Find openings inside Job Search or add your existing submissions manually.
            </p>
            <Button size="sm" onClick={() => setIsAddOpen(true)}>Add Your First Job</Button>
          </CardContent>
        </Card>
      ) : viewTab === "kanban" ? (
        /* ──── KANBAN COLUMNS (Horizontal scrolling layout) ──── */
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none min-h-[500px]">
          {statuses.map((status) => {
            const list = filteredApps.filter((a) => a.status === status);
            return (
              <div key={status} className="w-72 shrink-0 flex flex-col bg-muted/10 border border-muted/30 rounded-xl p-3 h-[600px]">
                {/* Column header */}
                <div className="flex items-center justify-between pb-2 border-b border-muted/20 mb-3 shrink-0">
                  <span className="text-xs font-bold uppercase tracking-wider">{status}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted/40 text-muted-foreground">
                    {list.length}
                  </span>
                </div>

                {/* Cards stack */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {list.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => openEditDrawer(app)}
                      className="border border-muted/50 bg-card rounded-xl p-3.5 space-y-2.5 shadow-sm hover:shadow transition-all hover:border-muted cursor-pointer relative group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h5 className="font-bold text-xs group-hover:text-primary transition-colors leading-tight flex-1">
                            {app.jobTitle}
                          </h5>
                          {app.jobUrl && (
                            <a
                              href={app.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-primary p-0.5 rounded transition-colors shrink-0"
                              title="View original job listing"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground block mt-0.5">
                          {app.companyName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-dashed">
                        <span>{app.location || "Location N/A"}</span>
                        <span className="font-semibold">{app.salary || "Salary N/A"}</span>
                      </div>

                      {/* Direction Shift Controls (Mobile & mouse helpers) */}
                      <div className="flex items-center justify-end gap-1 pt-1">
                        {statuses.indexOf(app.status) > 0 && (
                          <button
                            title="Move status left"
                            onClick={(e) => {
                              e.stopPropagation();
                              shiftStatus(app, "left");
                            }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </button>
                        )}
                        {statuses.indexOf(app.status) < statuses.length - 1 && (
                          <button
                            title="Move status right"
                            onClick={(e) => {
                              e.stopPropagation();
                              shiftStatus(app, "right");
                            }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ──── TABLE VIEW (Tabular spreadsheet view) ──── */
        <div className="border border-muted/50 rounded-xl overflow-hidden bg-card/50">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-muted bg-muted/20 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Role / Company</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Salary</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Applied Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span>{app.jobTitle}</span>
                        {app.jobUrl && (
                          <a
                            href={app.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="View original job listing"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">{app.companyName}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">{app.location || "N/A"}</td>
                    <td className="p-3 font-medium">{app.salary || "N/A"}</td>
                    <td className="p-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border",
                        app.status === "Offer" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                        (app.status === "Interview" || app.status === "HR Round") && "bg-accent/10 text-accent border-accent/20",
                        app.status === "Rejected" && "bg-rose-500/10 text-rose-500 border-rose-500/20",
                        (app.status === "Applied" || app.status === "Under Review" || app.status === "OA") && "bg-primary/10 text-primary border-primary/20",
                        app.status === "Withdrawn" && "bg-muted text-muted-foreground border-transparent"
                      )}>
                        {app.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{app.appliedAt || "N/A"}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDrawer(app)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                          onClick={() => handleDelete(app.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──── ADD APPLICATION DIALOG SHEET ──── */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col h-full p-0">
          <SheetHeader className="p-6 border-b shrink-0">
            <SheetTitle className="text-lg font-bold">Add Tracked Position</SheetTitle>
            <SheetDescription className="text-xs">
              Log new submissions to match metrics correctly
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-role">Job Title / Role</Label>
              <Input
                id="add-role"
                required
                placeholder="e.g. Senior Frontend Engineer"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="h-9 border-muted/50 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-company">Company Name</Label>
              <Input
                id="add-company"
                required
                placeholder="e.g. Stripe, OpenAI"
                value={addCompany}
                onChange={(e) => setAddCompany(e.target.value)}
                className="h-9 border-muted/50 text-xs"
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="add-loc">Location</Label>
                <Input
                  id="add-loc"
                  placeholder="e.g. SF, Remote"
                  value={addLocation}
                  onChange={(e) => setAddLocation(e.target.value)}
                  className="h-9 border-muted/50 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-salary">Salary / Bracket</Label>
                <Input
                  id="add-salary"
                  placeholder="e.g. $120k - $140k"
                  value={addSalary}
                  onChange={(e) => setAddSalary(e.target.value)}
                  className="h-9 border-muted/50 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-url">Job Listing Href URL</Label>
              <Input
                id="add-url"
                placeholder="https://company.com/careers/role"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                className="h-9 border-muted/50 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-status-select">Status Column</Label>
              <select
                id="add-status-select"
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value as UIStatus)}
                className="w-full text-xs h-9 p-2 border rounded-lg bg-background border-muted/50 focus:outline-none focus:border-ring"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-notes">Application Notes</Label>
              <textarea
                id="add-notes"
                rows={4}
                placeholder="Log online tests, interviewer names, or next steps details..."
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                className="w-full text-xs p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring border-muted/50"
              />
            </div>

            <Button type="submit" className="w-full text-xs font-semibold h-10" disabled={isSavingAdd}>
              {isSavingAdd ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Add Tracker"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* ──── EDIT DETAILS & TIMELINE DRAWER SHEET ──── */}
      <Sheet open={isDetailsOpen} onOpenChange={(open) => !open && setIsDetailsOpen(false)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col h-full p-0">
          <SheetHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between gap-4">
            <div>
              <SheetTitle className="text-lg font-bold">Position Details</SheetTitle>
              <SheetDescription className="text-xs">Edit metadata and review logging milestones</SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 h-8 w-8 mt-2"
              onClick={() => selectedApp && handleDelete(selectedApp.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {selectedApp && (
              <div className="space-y-5">
                {/* Editable Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Role Title</Label>
                    <Input
                      required
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="h-9 border-muted/50 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      required
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      className="h-9 border-muted/50 text-xs"
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="h-9 border-muted/50 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Salary Bracket</Label>
                      <Input
                        value={editSalary}
                        onChange={(e) => setEditSalary(e.target.value)}
                        className="h-9 border-muted/50 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Listing URL</Label>
                      {editUrl && (
                        <a
                          href={editUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-bold"
                        >
                          Visit Listing <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <Input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="h-9 border-muted/50 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status Column</Label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as UIStatus)}
                      className="w-full text-xs h-9 p-2 border rounded-lg bg-background border-muted/50 focus:outline-none focus:border-ring"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <textarea
                      rows={4}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full text-xs p-3 rounded-lg border bg-background resize-none focus:outline-none focus:border-ring border-muted/50"
                    />
                  </div>
                </div>

                {/* TIMELINE HISTORIES */}
                <div className="space-y-3 pt-3 border-t border-dashed">
                  <h5 className="text-[10px] font-extrabold text-muted-foreground uppercase flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Timeline Milestone History
                  </h5>

                  <div className="relative border-l border-muted pl-4 ml-2 space-y-4 py-2">
                    <div className="relative text-[11px] leading-snug">
                      <span className="absolute -left-[21px] top-0.5 h-2 w-2 rounded-full bg-accent border border-background" />
                      <span className="text-muted-foreground font-semibold">Track Created</span>
                      <span className="text-[10px] text-muted-foreground/60 block">{new Date(selectedApp.createdAt).toLocaleDateString()}</span>
                    </div>

                    {selectedApp.appliedAt && (
                      <div className="relative text-[11px] leading-snug">
                        <span className="absolute -left-[21px] top-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-background" />
                        <span className="text-muted-foreground font-semibold">Marked as Applied</span>
                        <span className="text-[10px] text-muted-foreground/60 block">{new Date(selectedApp.appliedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <SheetFooter className="pt-4 border-t shrink-0">
              <Button type="submit" className="w-full text-xs font-semibold h-10" disabled={isSavingEdit}>
                {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Track Details"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
