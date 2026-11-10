import type { RawJobListing, ExtractedResumeSummary, ExperienceLevel } from "./types";

export interface MatchResult {
  score: number; // 0 - 100 estimated fit
  matchingSkills: string[];
  missingSkills: string[];
  rationale: string;
}

/**
 * Calculates a genuine, explainable estimated relevance score between a resume and a job listing.
 * Scoring breakdown:
 * - Skills & Tech Overlap: 40%
 * - Job Title & Role Relevance: 35%
 * - Experience Compatibility: 15%
 * - Work Mode / Details: 10%
 */
export function calculateJobMatch(
  job: RawJobListing,
  resume: ExtractedResumeSummary
): MatchResult {
  const candidateSkillsLower = new Set(
    resume.skills.map((s) => s.toLowerCase().trim())
  );

  // ─── 1. Skills & Tech Match (40 pts) ─────────────────────────────────────────
  const jobSkillsLower = (job.skills || []).map((s) => s.toLowerCase().trim());
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];

  // If job provides explicit skills:
  if (jobSkillsLower.length > 0) {
    for (const skill of job.skills || []) {
      const sLow = skill.toLowerCase().trim();
      if (candidateSkillsLower.has(sLow) || Array.from(candidateSkillsLower).some(cs => cs.includes(sLow) || sLow.includes(cs))) {
        matchingSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }
  } else {
    // Scan job description for candidate skills
    const descLower = job.description.toLowerCase();
    for (const skill of resume.skills) {
      const sLow = skill.toLowerCase();
      // Whole word / boundary check for short skills like 'go', 'r', 'c'
      const regex = new RegExp(`\\b${escapeRegExp(sLow)}\\b`, "i");
      if (regex.test(descLower)) {
        if (!matchingSkills.includes(skill)) matchingSkills.push(skill);
      }
    }
  }

  let skillsScore = 0;
  if (jobSkillsLower.length > 0) {
    const ratio = matchingSkills.length / Math.max(1, jobSkillsLower.length);
    skillsScore = Math.min(40, Math.round(ratio * 40));
  } else {
    // Description heuristic: 5+ matching skills = 40 pts
    const matchedCount = matchingSkills.length;
    skillsScore = Math.min(40, matchedCount * 8);
  }

  // ─── 2. Job Title & Role Match (35 pts) ──────────────────────────────────────
  let titleScore = 10; // Baseline
  const jobTitleLower = job.title.toLowerCase();

  for (const role of resume.targetRoles) {
    const roleLower = role.toLowerCase();
    if (jobTitleLower.includes(roleLower) || roleLower.includes(jobTitleLower)) {
      titleScore = 35;
      break;
    }

    // Token overlap
    const roleTokens = roleLower.split(/\s+/).filter((t) => t.length > 2);
    const matches = roleTokens.filter((t) => jobTitleLower.includes(t));
    if (matches.length >= 2) {
      titleScore = Math.max(titleScore, 30);
    } else if (matches.length === 1) {
      titleScore = Math.max(titleScore, 22);
    }
  }

  if (resume.primaryCategory && jobTitleLower.includes(resume.primaryCategory.toLowerCase())) {
    titleScore = Math.max(titleScore, 28);
  }

  // ─── 3. Experience Compatibility (15 pts) ───────────────────────────────────
  let expScore = 10; // Default when experience not disclosed
  if (job.experience && job.experience !== "Not Disclosed") {
    const candidateRank = getLevelRank(resume.experienceLevel);
    const jobRank = getLevelRank(job.experience);

    if (candidateRank >= jobRank) {
      expScore = 15; // Fully qualified or senior
    } else if (candidateRank === jobRank - 1) {
      expScore = 11; // One step below (stretch role)
    } else {
      expScore = 5; // Under-qualified by 2+ tiers
    }
  }

  // ─── 4. Work Mode & Listing Completeness (10 pts) ───────────────────────────
  let detailsScore = 8;
  if (job.remote) detailsScore += 2;

  // ─── Final Score & Rationale ────────────────────────────────────────────────
  const rawTotal = skillsScore + titleScore + expScore + detailsScore;
  // Bound score realistically between 40% and 98%
  const score = Math.max(42, Math.min(98, rawTotal));

  let rationale = "";
  if (matchingSkills.length > 0) {
    rationale = `Matches ${matchingSkills.length} key skill${matchingSkills.length > 1 ? "s" : ""} (${matchingSkills.slice(0, 3).join(", ")})`;
  } else {
    rationale = `Role alignment with target title: "${resume.targetRoles[0] || "Software Engineer"}"`;
  }

  if (job.experience && job.experience !== "Not Disclosed") {
    rationale += ` • ${job.experience} level fit`;
  }

  return {
    score,
    matchingSkills,
    missingSkills,
    rationale,
  };
}

function getLevelRank(level: ExperienceLevel): number {
  switch (level) {
    case "Fresher": return 1;
    case "Entry": return 2;
    case "Mid": return 3;
    case "Senior": return 4;
    case "Lead": return 5;
    default: return 2;
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
