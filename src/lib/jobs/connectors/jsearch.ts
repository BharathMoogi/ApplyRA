import { JobConnector, RawJobListing, JobSearchFilters, ExperienceLevel } from "../types";

export class JSearchConnector implements JobConnector {
  id = "jsearch";
  name = "JSearch / RapidAPI";

  isAvailable(): boolean {
    const key = process.env.JSEARCH_API_KEY;
    return !!key && key.trim().length > 5 && !key.includes("your-api-key");
  }

  async search(query: string, filters: JobSearchFilters, page: number = 1): Promise<RawJobListing[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const apiKey = process.env.JSEARCH_API_KEY!;
    const url = new URL("https://jsearch.p.rapidapi.com/search-v2");

    const searchQuery = (query || "Software Engineer").trim();
    const fullQuery = filters.location
      ? `${searchQuery} in ${filters.location}`
      : searchQuery;

    url.searchParams.set("query", fullQuery);
    url.searchParams.set("page", Math.max(1, page).toString());
    url.searchParams.set("num_pages", "1");

    if (filters.remote || filters.workMode === "Remote") {
      url.searchParams.set("remote_jobs_only", "true");
    }

    // Set date posted filter if specified
    if (filters.datePosted && filters.datePosted !== "all") {
      if (filters.datePosted === "24h") url.searchParams.set("date_posted", "today");
      else if (filters.datePosted === "7d") url.searchParams.set("date_posted", "3days");
      else if (filters.datePosted === "30d") url.searchParams.set("date_posted", "month");
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
      next: { revalidate: 300 }, // Cache on edge for 5 mins
    });

    if (!res.ok) {
      console.warn(`[JSearchConnector] Search failed with status ${res.status}`);
      return [];
    }

    const json = await res.json();
    let rawJobs: any[] = [];
    if (json.data && Array.isArray(json.data.jobs)) {
      rawJobs = json.data.jobs;
    } else if (Array.isArray(json.data)) {
      rawJobs = json.data;
    }

    return rawJobs.map((item: any): RawJobListing => {
      // 1. Format salary or set "Not Disclosed"
      let salary = "Not Disclosed";
      if (item.job_min_salary && item.job_max_salary) {
        const curr = item.job_salary_currency || "$";
        salary = `${curr} ${item.job_min_salary.toLocaleString()} - ${item.job_max_salary.toLocaleString()}`;
      } else if (item.job_min_salary) {
        salary = `${item.job_salary_currency || "$"} ${item.job_min_salary.toLocaleString()}+`;
      }

      // 2. Format experience or set "Not Disclosed"
      let experience: ExperienceLevel = "Not Disclosed";
      let experienceYears: string | undefined = undefined;

      if (item.job_required_experience?.no_experience_required) {
        experience = "Fresher";
        experienceYears = "0 yrs";
      } else if (item.job_required_experience?.required_experience_in_months) {
        const months = item.job_required_experience.required_experience_in_months;
        const yrs = Math.round(months / 12);
        experienceYears = `${yrs} yr${yrs > 1 ? "s" : ""}`;
        if (months <= 12) experience = "Fresher";
        else if (months <= 24) experience = "Entry";
        else if (months <= 60) experience = "Mid";
        else if (months <= 96) experience = "Senior";
        else experience = "Lead";
      }

      // 3. Location & Work mode
      const isRemote = Boolean(item.job_is_remote);
      const locParts = [item.job_city, item.job_state, item.job_country].filter(Boolean);
      const location = locParts.length > 0 ? locParts.join(", ") : (isRemote ? "Remote" : "Not Disclosed");

      let workMode: "Remote" | "Hybrid" | "On-site" | "Not Disclosed" = "Not Disclosed";
      if (isRemote) workMode = "Remote";
      else if (location.toLowerCase().includes("hybrid")) workMode = "Hybrid";
      else if (locParts.length > 0) workMode = "On-site";

      // 4. Skills extraction from highlights or tags
      const skills: string[] = [];
      if (Array.isArray(item.job_highlights?.Qualifications)) {
        for (const qual of item.job_highlights.Qualifications) {
          if (typeof qual === "string" && qual.length < 30) {
            skills.push(qual);
          }
        }
      }
      if (skills.length === 0 && Array.isArray(item.job_required_skills)) {
        skills.push(...item.job_required_skills);
      }

      // 5. Posted date formatting
      let postedAt = "Recent";
      if (item.job_posted_at_datetime_utc) {
        try {
          const d = new Date(item.job_posted_at_datetime_utc);
          postedAt = d.toLocaleDateString();
        } catch {
          postedAt = "Recent";
        }
      }

      return {
        id: item.job_id || `jsearch-${Math.random().toString(36).substring(2, 9)}`,
        title: item.job_title || "Untitled Position",
        company: item.job_employer_name || "Confidential",
        location,
        salary,
        experience,
        experienceYears,
        workMode,
        remote: isRemote,
        skills: Array.from(new Set(skills)).slice(0, 8),
        description: item.job_description || "",
        postedAt,
        source: item.job_publisher || "LinkedIn",
        jobUrl: item.job_apply_link || item.job_google_link || "https://google.com/search?q=jobs",
      };
    });
  }
}
