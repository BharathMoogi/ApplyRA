import { searchJobs, type JobListing } from '@/actions/jobs';
import { type StructuredResumeData } from '@/actions/resumes';

export class JobSearchAgent {
  static async searchAndRankJobs(
    profile: { bio: string | null; location: string | null },
    masterResume: StructuredResumeData,
    limit = 5
  ): Promise<{ job: JobListing; matchScore: number }[]> {
    console.log("[JobSearchAgent] Parsing user preferences from profile and resume...");
    
    let preferredRole = "Software Engineer";
    let preferredLocation = profile.location || "Remote";

    if (profile.bio) {
      try {
        const parsedBio = JSON.parse(profile.bio);
        if (parsedBio.preferredRoles && parsedBio.preferredRoles.length > 0) {
          preferredRole = parsedBio.preferredRoles[0];
        }
        if (parsedBio.preferredLocations && parsedBio.preferredLocations.length > 0) {
          preferredLocation = parsedBio.preferredLocations[0];
        }
      } catch (e) {
        // use default
      }
    }

    console.log(`[JobSearchAgent] Searching job sources for "${preferredRole}" in "${preferredLocation}"...`);
    const searchResult = await searchJobs(preferredRole, { location: preferredLocation }, 1, limit);
    const jobs = searchResult.jobs;

    const rankedJobs = jobs.map((job) => {
      let matchedCount = 0;
      const jobSkills = job.skills || [];
      const resumeSkills = masterResume.skills || [];

      jobSkills.forEach((skill) => {
        if (resumeSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
          matchedCount++;
        }
      });

      const matchScore = jobSkills.length > 0
        ? Math.round((matchedCount / jobSkills.length) * 100)
        : 70;

      return {
        job,
        matchScore
      };
    });

    return rankedJobs.sort((a, b) => b.matchScore - a.matchScore);
  }
}
