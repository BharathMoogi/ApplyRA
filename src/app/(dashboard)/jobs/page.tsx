"use client";

import { useEffect, useState, useCallback } from "react";
import { searchJobs, getBookmarkedJobUrls, type JobListing } from "@/actions/jobs";
import { JobCard } from "@/components/dashboard/job-card";
import { JobDetailsDrawer } from "@/components/dashboard/job-details-drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/shared/loading";
import { Search, MapPin, SlidersHorizontal, ChevronLeft, ChevronRight, X } from "lucide-react";

export default function JobSearchPage() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [bookmarkedUrls, setBookmarkedUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [expFilter, setExpFilter] = useState("all");
  const [remoteFilter, setRemoteFilter] = useState(false);
  
  // Active filters applied to query
  const [appliedFilters, setAppliedFilters] = useState({
    location: "",
    experience: "all",
    remote: false,
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 4,
    totalCount: 0,
    totalPages: 0,
  });

  // Details drawer state
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch bookmarks
  const fetchBookmarks = useCallback(async () => {
    try {
      const urls = await getBookmarkedJobUrls();
      setBookmarkedUrls(urls);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Main search fetch trigger
  const performSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await searchJobs(
        activeQuery,
        {
          location: appliedFilters.location,
          experience: appliedFilters.experience,
          remote: appliedFilters.remote,
        },
        page,
        4 // page size
      );
      setJobs(res.jobs);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeQuery, appliedFilters, page]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveQuery(searchTerm);
  };

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFilters({
      location: locationFilter,
      experience: expFilter,
      remote: remoteFilter,
    });
  };

  const handleClearFilters = () => {
    setPage(1);
    setLocationFilter("");
    setExpFilter("all");
    setRemoteFilter(false);
    setAppliedFilters({
      location: "",
      experience: "all",
      remote: false,
    });
  };

  const handleCardClick = (job: JobListing) => {
    setSelectedJob(job);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Search Board</h1>
        <p className="text-muted-foreground text-sm">
          Discover opportunities across multiple aggregators and track them instantly
        </p>
      </div>

      {/* Control Bar: Search and Toggle Filters */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by role, keyword or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 border-muted/50"
          />
        </div>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={`h-10 gap-1.5 border-muted/50 font-medium text-xs ${
            showFilters ? "bg-muted" : ""
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {(appliedFilters.location || appliedFilters.experience !== "all" || appliedFilters.remote) && (
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          )}
        </Button>

        <Button type="submit" className="h-10 text-xs font-semibold px-5">
          Search
        </Button>
      </form>

      {/* Expandable Advanced Filters Grid */}
      {showFilters && (
        <div className="border border-muted/50 bg-muted/10 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Location filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="e.g. San Francisco, Singapore"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="pl-9 h-9 border-muted/50 text-xs bg-background"
                />
              </div>
            </div>

            {/* Experience level select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Experience Level</label>
              <select
                value={expFilter}
                onChange={(e) => setExpFilter(e.target.value)}
                className="w-full text-xs h-9 p-2 border rounded-lg bg-background border-muted/50 focus:outline-none focus:border-ring"
              >
                <option value="all">All Levels</option>
                <option value="Entry">Entry Level</option>
                <option value="Mid">Mid Level</option>
                <option value="Senior">Senior Level</option>
                <option value="Lead">Lead / Architect</option>
              </select>
            </div>

            {/* Checkbox remote filter */}
            <div className="flex items-center gap-2 h-full pt-6">
              <input
                type="checkbox"
                id="remote-checkbox"
                checked={remoteFilter}
                onChange={(e) => setRemoteFilter(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
              />
              <label htmlFor="remote-checkbox" className="text-xs font-semibold cursor-pointer">
                Remote Only
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-dashed pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs text-muted-foreground hover:text-foreground h-8"
            >
              Clear Filters
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApplyFilters}
              className="text-xs font-semibold h-8"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* Main Results Listing */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center border border-muted/50 rounded-xl bg-muted/5">
          <Loading text="Scanning aggregated job boards..." />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl bg-muted/20">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h4 className="font-semibold text-sm">No job matches found</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search terms or clearing advanced filters
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isBookmarked={bookmarkedUrls.includes(job.jobUrl)}
                onBookmarkToggle={fetchBookmarks}
                onClick={() => handleCardClick(job)}
              />
            ))}
          </div>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-muted/50 pt-4 px-1">
              <span className="text-xs text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} -{" "}
                {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{" "}
                {pagination.totalCount} results
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-muted/50 shrink-0"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={page === p ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 text-xs font-semibold p-0"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-muted/50 shrink-0"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Sheet Overlay */}
      <JobDetailsDrawer
        job={selectedJob}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedJob(null);
        }}
        isBookmarked={selectedJob ? bookmarkedUrls.includes(selectedJob.jobUrl) : false}
        onBookmarkActionComplete={fetchBookmarks}
      />
    </div>
  );
}
