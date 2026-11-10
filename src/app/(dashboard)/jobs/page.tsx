"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  discoverJobsWithResume,
  getBookmarkedJobUrls,
  type JobListing,
  type ExtractedResumeSummary,
  type JobSearchFilters,
} from "@/actions/jobs";
import { JobCard } from "@/components/dashboard/job-card";
import { JobDetailsDrawer } from "@/components/dashboard/job-details-drawer";
import { ResumeJobMatcherHeader } from "@/components/dashboard/resume-job-matcher-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/shared/loading";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
  MapPin,
  Briefcase,
  Wifi,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

type SortOption = "best_match" | "newest" | "salary_high" | "salary_low";
type WorkModeOption = "All" | "Remote" | "Hybrid" | "On-site";
type ExpOption = "all" | "Fresher" | "0-1" | "1-3" | "3-5" | "5+";

const PAGE_SIZE = 6;

export default function JobSearchPage() {
  // ─── Core State ──────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [bookmarkedUrls, setBookmarkedUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // ─── Resume State ─────────────────────────────────────────────────────────
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [resumeSummary, setResumeSummary] = useState<ExtractedResumeSummary | undefined>(undefined);

  // ─── Search State ─────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  // ─── Filter State (staging — not applied until Search is clicked) ────────
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [expFilter, setExpFilter] = useState<ExpOption>("all");
  const [workModeFilter, setWorkModeFilter] = useState<WorkModeOption>("All");
  const [minMatchFilter, setMinMatchFilter] = useState(0);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("best_match");
  const [dateFilter, setDateFilter] = useState<"all" | "24h" | "7d" | "30d">("all");

  // ─── Applied Filters (committed on Search / Discover) ───────────────────
  const [appliedFilters, setAppliedFilters] = useState<JobSearchFilters>({
    location: "",
    experience: "all",
    workMode: "All",
    minMatchScore: 0,
    source: "all",
    sortBy: "best_match",
    datePosted: "all",
  });

  // ─── Pagination ──────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
  });

  // ─── Drawer ───────────────────────────────────────────────────────────────
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ─── Fetch Bookmarks ─────────────────────────────────────────────────────
  const fetchBookmarks = useCallback(async () => {
    try {
      const urls = await getBookmarkedJobUrls();
      setBookmarkedUrls(urls);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // ─── Main Search/Discover Trigger ────────────────────────────────────────
  const performSearch = useCallback(
    async (
      overrideResumeId?: string | null,
      overrideQuery?: string,
      overrideFilters?: JobSearchFilters,
      overridePage?: number
    ) => {
      setIsLoading(true);
      try {
        const rId = overrideResumeId !== undefined ? overrideResumeId : selectedResumeId;
        const q = overrideQuery !== undefined ? overrideQuery : activeQuery;
        const f = overrideFilters || appliedFilters;
        const p = overridePage !== undefined ? overridePage : page;

        const res = await discoverJobsWithResume(rId || undefined, q || undefined, f, p, PAGE_SIZE);
        setJobs(res.jobs);
        setPagination(res.pagination);
        if (res.resumeSummary) {
          setResumeSummary(res.resumeSummary);
        }
        setLastRefreshed(new Date());
      } catch (err) {
        console.error(err);
        setJobs([]);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedResumeId, activeQuery, appliedFilters, page]
  );

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Initial load — search with current state
  useEffect(() => {
    performSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedFilters, activeQuery, selectedResumeId]);

  // ─── Event Handlers ───────────────────────────────────────────────────────
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const newFilters: JobSearchFilters = {
      location: locationFilter,
      experience: expFilter,
      workMode: workModeFilter,
      minMatchScore: minMatchFilter,
      source: sourceFilter,
      sortBy,
      datePosted: dateFilter,
    };
    setAppliedFilters(newFilters);
    setActiveQuery(searchTerm);
  };

  const handleDiscover = () => {
    setPage(1);
    const newFilters: JobSearchFilters = {
      location: locationFilter,
      experience: expFilter,
      workMode: workModeFilter,
      minMatchScore: minMatchFilter,
      source: sourceFilter,
      sortBy,
      datePosted: dateFilter,
    };
    setAppliedFilters(newFilters);
    // triggers useEffect
  };

  const handleQuerySelect = (q: string) => {
    setSearchTerm(q);
    setPage(1);
    setActiveQuery(q);
  };

  const handleResumeSelect = (id: string | null) => {
    setSelectedResumeId(id);
    if (!id) {
      setResumeSummary(undefined);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setLocationFilter("");
    setExpFilter("all");
    setWorkModeFilter("All");
    setMinMatchFilter(0);
    setSourceFilter("all");
    setSortBy("best_match");
    setDateFilter("all");
    setAppliedFilters({
      location: "",
      experience: "all",
      workMode: "All",
      minMatchScore: 0,
      source: "all",
      sortBy: "best_match",
      datePosted: "all",
    });
  };

  const hasActiveFilters =
    locationFilter ||
    expFilter !== "all" ||
    workModeFilter !== "All" ||
    minMatchFilter > 0 ||
    sourceFilter !== "all" ||
    dateFilter !== "all";

  const expOptions: { value: ExpOption; label: string }[] = [
    { value: "all", label: "All Levels" },
    { value: "Fresher", label: "Fresher" },
    { value: "0-1", label: "0–1 yr" },
    { value: "1-3", label: "1–3 yrs" },
    { value: "3-5", label: "3–5 yrs" },
    { value: "5+", label: "5+ yrs" },
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "best_match", label: "Best Match" },
    { value: "newest", label: "Newest" },
    { value: "salary_high", label: "Salary: High to Low" },
    { value: "salary_low", label: "Salary: Low to High" },
  ];

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4 sm:px-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Job Search Board</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover opportunities across multiple aggregators and track them instantly
        </p>
      </div>

      {/* Resume Matcher Header */}
      <ResumeJobMatcherHeader
        selectedResumeId={selectedResumeId}
        onSelectResume={handleResumeSelect}
        resumeSummary={resumeSummary}
        onDiscover={handleDiscover}
        isDiscovering={isLoading}
        onSelectQuery={handleQuerySelect}
        activeQuery={activeQuery}
      />

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 pr-4 h-10 text-sm"
              placeholder="Search by role, keyword or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Sort control */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-10 pl-8 pr-3 text-sm rounded-md border bg-background appearance-none cursor-pointer hover:bg-muted/50 transition-colors min-w-[150px]"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <Button
            type="button"
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="h-10 gap-1.5 shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-primary-foreground shrink-0" />
            )}
          </Button>

          <Button type="submit" size="sm" className="h-10 px-5 shrink-0">
            Search
          </Button>
        </div>
      </form>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="mb-5 p-4 border rounded-xl bg-muted/20 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">

            {/* Location */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location
              </label>
              <Input
                className="h-8 text-xs"
                placeholder="City, state, or remote"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>

            {/* Experience Level */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Experience
              </label>
              <select
                value={expFilter}
                onChange={(e) => setExpFilter(e.target.value as ExpOption)}
                className="h-8 w-full px-2 text-xs rounded-md border bg-background cursor-pointer"
              >
                {expOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Work Mode */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Wifi className="h-3 w-3" /> Work Mode
              </label>
              <select
                value={workModeFilter}
                onChange={(e) => setWorkModeFilter(e.target.value as WorkModeOption)}
                className="h-8 w-full px-2 text-xs rounded-md border bg-background cursor-pointer"
              >
                {["All", "Remote", "Hybrid", "On-site"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Date Posted */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Date Posted</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as "all" | "24h" | "7d" | "30d")}
                className="h-8 w-full px-2 text-xs rounded-md border bg-background cursor-pointer"
              >
                <option value="all">Any Time</option>
                <option value="24h">Past 24 hrs</option>
                <option value="7d">Past Week</option>
                <option value="30d">Past Month</option>
              </select>
            </div>

            {/* Job Source */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Job Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-8 w-full px-2 text-xs rounded-md border bg-background cursor-pointer"
              >
                <option value="all">All Sources</option>
                <option value="linkedin">LinkedIn</option>
                <option value="indeed">Indeed</option>
                <option value="glassdoor">Glassdoor</option>
                <option value="github">GitHub Jobs</option>
              </select>
            </div>

            {/* Min Match % */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Min Match: {minMatchFilter}%
              </label>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={minMatchFilter}
                onChange={(e) => setMinMatchFilter(Number(e.target.value))}
                className="w-full h-8 accent-primary cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                const newFilters: JobSearchFilters = {
                  location: locationFilter,
                  experience: expFilter,
                  workMode: workModeFilter,
                  minMatchScore: minMatchFilter,
                  source: sourceFilter,
                  sortBy,
                  datePosted: dateFilter,
                };
                setPage(1);
                setAppliedFilters(newFilters);
              }}
            >
              Apply Filters
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleResetFilters}
            >
              <X className="h-3 w-3" /> Reset
            </Button>
          </div>
        </div>
      )}

      {/* Results header */}
      <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {!isLoading && (
            <span>
              {pagination.totalCount > 0
                ? `${pagination.totalCount} opportunit${pagination.totalCount === 1 ? "y" : "ies"} found`
                : "No results found"}
            </span>
          )}
          {isLoading && <span className="animate-pulse">Searching across job portals...</span>}
        </div>
        {lastRefreshed && !isLoading && (
          <span className="flex items-center gap-1 text-[11px]">
            <RefreshCw className="h-3 w-3" />
            Updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Job Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loading />
          <p className="text-sm text-muted-foreground animate-pulse">
            {selectedResumeId
              ? "Analyzing resume & discovering matching jobs..."
              : "Searching across job portals..."}
          </p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-xl bg-muted/10">
          <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-muted-foreground">No matching jobs found</h3>
          <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
            Try different keywords, adjust your filters, or upload a resume for auto-discovery.
          </p>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="mt-3 gap-1 text-xs" onClick={handleResetFilters}>
              <X className="h-3.5 w-3.5" /> Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isBookmarked={bookmarkedUrls.includes(job.jobUrl)}
              hasResume={!!selectedResumeId && !!resumeSummary}
              onBookmarkToggle={fetchBookmarks}
              onClick={() => {
                setSelectedJob(job);
                setIsDrawerOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground font-medium">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="gap-1"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Job Details Drawer */}
      <JobDetailsDrawer
        job={selectedJob}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        isBookmarked={selectedJob ? bookmarkedUrls.includes(selectedJob.jobUrl) : false}
        hasResume={!!selectedResumeId && !!resumeSummary}
        onBookmarkActionComplete={fetchBookmarks}
      />
    </div>
  );
}
