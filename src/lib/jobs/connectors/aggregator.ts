import type { JobConnector, RawJobListing, JobListing, JobSearchFilters, ExtractedResumeSummary } from "../types";
import { JSearchConnector } from "./jsearch";
import { MockJobConnector, MOCK_JOB_LISTINGS } from "./mock";
import { calculateJobMatch } from "../matcher";

export class JobAggregator {
  private connectors: JobConnector[] = [];

  constructor() {
    this.connectors = [
      new JSearchConnector(),
      new MockJobConnector(),
    ];
  }

  /**
   * Registers a new custom job connector dynamically
   */
  registerConnector(connector: JobConnector) {
    this.connectors.push(connector);
  }

  /**
   * Searches across all active connectors for given queries and filters.
   * Handles individual source failures gracefully without crashing.
   */
  async searchAcrossSources(
    queries: string[],
    filters: JobSearchFilters,
    resumeSummary?: ExtractedResumeSummary
  ): Promise<JobListing[]> {
    const rawJobsMap = new Map<string, RawJobListing>();

    const activeConnectors = this.connectors.filter((c) => c.isAvailable());
    const searchTasks: Promise<RawJobListing[]>[] = [];

    // Fan-out each query across all active connectors
    for (const q of queries) {
      for (const connector of activeConnectors) {
        searchTasks.push(
          connector.search(q, filters, 1).catch((err) => {
            console.warn(`[Aggregator] Connector ${connector.name} failed for query "${q}":`, err?.message || err);
            return [];
          })
        );
      }
    }

    const settled = await Promise.allSettled(searchTasks);
    for (const result of settled) {
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        for (const job of result.value) {
          // Canonical deduplication key: URL without tracking params, or company+title
          const cleanUrl = job.jobUrl.split("?")[0].toLowerCase();
          const fallbackKey = `${job.company.toLowerCase().trim()}::${job.title.toLowerCase().trim()}`;
          const key = cleanUrl.length > 10 ? cleanUrl : fallbackKey;

          if (!rawJobsMap.has(key)) {
            rawJobsMap.set(key, job);
          }
        }
      }
    }

    // If zero jobs returned from external connectors, fallback to mock repository
    if (rawJobsMap.size === 0) {
      for (const job of MOCK_JOB_LISTINGS) {
        rawJobsMap.set(job.id, job);
      }
    }

    // Map raw jobs to standard JobListing with real matching calculation
    let results: JobListing[] = Array.from(rawJobsMap.values()).map((raw) => {
      let atsScore = 75;
      let matchingSkills: string[] = [];
      let missingSkills: string[] = [];
      let matchExplanation: string | undefined = undefined;

      if (resumeSummary) {
        const match = calculateJobMatch(raw, resumeSummary);
        atsScore = match.score;
        matchingSkills = match.matchingSkills;
        missingSkills = match.missingSkills;
        matchExplanation = match.rationale;
      } else {
        // Fallback default score if no resume provided
        atsScore = 70;
      }

      return {
        id: raw.id,
        title: raw.title,
        company: raw.company,
        location: raw.location,
        salary: raw.salary || "Not Disclosed",
        experience: raw.experience || "Not Disclosed",
        experienceYears: raw.experienceYears,
        workMode: raw.workMode || (raw.remote ? "Remote" : "Not Disclosed"),
        remote: !!raw.remote,
        skills: raw.skills && raw.skills.length > 0 ? raw.skills : ["General Software Engineering"],
        description: raw.description,
        atsScore,
        postedAt: raw.postedAt || "Recent",
        source: raw.source,
        jobUrl: raw.jobUrl,
        matchingSkills,
        missingSkills,
        matchExplanation,
      };
    });

    // ─── Filter Processing ──────────────────────────────────────────────────
    if (filters.location && filters.location.trim().length > 0) {
      const loc = filters.location.toLowerCase().trim();
      const segments = loc.split(",").map((s) => s.trim()).filter((s) => s.length >= 2);
      const expandedTerms = new Set<string>([loc, ...segments]);
      if (loc.includes("bengaluru") || loc.includes("bangalore")) {
        expandedTerms.add("bengaluru");
        expandedTerms.add("bangalore");
      }
      if (loc.includes("united states") || loc.includes("usa") || loc.includes("u.s.")) {
        expandedTerms.add("united states");
        expandedTerms.add("usa");
      }
      if (loc.includes("united kingdom") || loc.includes("uk") || loc.includes("u.k.")) {
        expandedTerms.add("united kingdom");
        expandedTerms.add("uk");
      }

      results = results.filter((j) => {
        const jLoc = j.location.toLowerCase();
        if (jLoc.includes(loc) || loc.includes(jLoc)) return true;
        for (const term of expandedTerms) {
          if (term.length >= 3 && jLoc.includes(term)) return true;
        }
        return false;
      });
    }

    if (filters.workMode && filters.workMode !== "All") {
      results = results.filter((j) => j.workMode === filters.workMode);
    } else if (filters.remote) {
      results = results.filter((j) => j.remote);
    }

    if (filters.experience && filters.experience !== "all") {
      const expLow = filters.experience.toLowerCase();
      results = results.filter((j) => {
        if (j.experience === "Not Disclosed") return true; // Keep undisclosed to avoid discarding
        if (expLow === "fresher") return j.experience === "Fresher";
        if (expLow === "0-1") return j.experience === "Fresher" || j.experience === "Entry";
        if (expLow === "1-3") return j.experience === "Entry" || j.experience === "Mid";
        if (expLow === "3-5") return j.experience === "Mid";
        if (expLow === "5+") return j.experience === "Senior" || j.experience === "Lead";
        return j.experience.toLowerCase() === expLow;
      });
    }

    if (filters.minMatchScore && filters.minMatchScore > 0) {
      results = results.filter((j) => j.atsScore >= (filters.minMatchScore || 0));
    }

    if (filters.source && filters.source !== "all") {
      const srcLow = filters.source.toLowerCase();
      results = results.filter((j) => j.source.toLowerCase().includes(srcLow));
    }

    // ─── Sorting ────────────────────────────────────────────────────────────
    const sortBy = filters.sortBy || "best_match";
    results.sort((a, b) => {
      if (sortBy === "best_match") {
        return b.atsScore - a.atsScore;
      }
      if (sortBy === "newest") {
        return a.postedAt.localeCompare(b.postedAt);
      }
      if (sortBy === "salary_high" || sortBy === "salary_low") {
        const getSalNum = (str: string) => {
          const m = str.replace(/,/g, "").match(/\d+/g);
          return m ? parseInt(m[m.length - 1], 10) : 0;
        };
        const numA = getSalNum(a.salary);
        const numB = getSalNum(b.salary);
        return sortBy === "salary_high" ? numB - numA : numA - numB;
      }
      return 0;
    });

    return results;
  }
}

export const defaultJobAggregator = new JobAggregator();
