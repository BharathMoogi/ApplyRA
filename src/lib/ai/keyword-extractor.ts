import { z } from 'zod';
import { ai } from './index';

export const ExtractedKeywordsSchema = z.object({
  skills: z.array(z.string()).describe("Core soft or domain skills required, ranked by importance"),
  technologies: z.array(z.string()).describe("Programming languages, frameworks, libraries, databases, ranked by importance"),
  tools: z.array(z.string()).describe("Software tools, developer tools, platforms, or systems, ranked by importance"),
  responsibilities: z.array(z.string()).describe("Key responsibilities/tasks highlighted in the job description"),
  qualifications: z.array(z.string()).describe("Required or preferred educational/professional qualifications"),
  actionVerbs: z.array(z.string()).describe("Strong action verbs aligned with the job role"),
  importantKeywords: z.array(z.string()).describe("General high-impact keywords mentioned in the job description")
});

export type ExtractedKeywords = z.infer<typeof ExtractedKeywordsSchema>;

// Comprehensive dictionary for fast, sub-millisecond keyword extraction
const TECH_DICTIONARY: Record<string, string> = {
  "javascript": "JavaScript", "typescript": "TypeScript", "python": "Python", "java": "Java",
  "c++": "C++", "c#": "C#", "golang": "Go", "go": "Go", "rust": "Rust", "ruby": "Ruby",
  "php": "PHP", "swift": "Swift", "kotlin": "Kotlin", "sql": "SQL", "nosql": "NoSQL",
  "html": "HTML", "css": "CSS", "bash": "Bash", "shell": "Shell", "r": "R", "scala": "Scala",
  "react": "React", "next.js": "Next.js", "nextjs": "Next.js", "angular": "Angular",
  "vue": "Vue.js", "vue.js": "Vue.js", "svelte": "Svelte", "express": "Express.js",
  "django": "Django", "flask": "Flask", "fastapi": "FastAPI", "spring boot": "Spring Boot",
  "springboot": "Spring Boot", "rails": "Ruby on Rails", "nestjs": "NestJS", "flutter": "Flutter",
  "react native": "React Native", "tailwind": "Tailwind CSS", "tailwindcss": "Tailwind CSS",
  "postgresql": "PostgreSQL", "postgres": "PostgreSQL", "mysql": "MySQL", "sqlite": "SQLite",
  "mongodb": "MongoDB", "redis": "Redis", "cassandra": "Cassandra", "dynamodb": "DynamoDB",
  "oracle": "Oracle", "graphql": "GraphQL", "rest api": "REST API", "restful": "RESTful APIs",
  "prisma": "Prisma", "hibernate": "Hibernate", "pytorch": "PyTorch", "tensorflow": "TensorFlow",
  "pandas": "Pandas", "numpy": "NumPy", "scikit-learn": "scikit-learn", "llm": "LLMs",
  "genai": "Generative AI", "generative ai": "Generative AI", "opencv": "OpenCV"
};

const TOOLS_DICTIONARY: Record<string, string> = {
  "git": "Git", "github": "GitHub", "gitlab": "GitLab", "docker": "Docker", "kubernetes": "Kubernetes",
  "aws": "AWS", "amazon web services": "AWS", "gcp": "GCP", "google cloud": "Google Cloud",
  "azure": "Azure", "terraform": "Terraform", "linux": "Linux", "ci/cd": "CI/CD",
  "jenkins": "Jenkins", "github actions": "GitHub Actions", "jira": "Jira", "postman": "Postman",
  "figma": "Figma", "vite": "Vite", "webpack": "Webpack", "jest": "Jest", "cypress": "Cypress",
  "playwright": "Playwright", "vercel": "Vercel", "supabase": "Supabase"
};

const SKILLS_DICTIONARY: Record<string, string> = {
  "problem solving": "Problem Solving", "communication": "Communication", "leadership": "Leadership",
  "teamwork": "Teamwork", "agile": "Agile", "scrum": "Scrum", "code review": "Code Review",
  "system design": "System Design", "microservices": "Microservices", "debugging": "Debugging",
  "object oriented": "Object-Oriented Programming (OOP)", "oop": "OOP", "unit testing": "Unit Testing",
  "performance optimization": "Performance Optimization", "collaboration": "Cross-Functional Collaboration",
  "analytical skills": "Analytical Skills", "data analysis": "Data Analysis", "project management": "Project Management"
};

const ACTION_VERBS = [
  "Architected", "Built", "Collaborated", "Created", "Delivered", "Designed",
  "Developed", "Engineered", "Implemented", "Integrated", "Maintained", "Managed",
  "Mentored", "Optimized", "Refactored", "Resolved", "Spearheaded", "Trained"
];

export class ATSKeywordExtractor {
  /**
   * Fast, sub-millisecond heuristic extraction. Eliminates the secondary LLM round-trip
   * so resume generation stays fast, deterministic, and well within Vercel's execution window.
   */
  static extractKeywordsFast(jobDescription: string): ExtractedKeywords {
    const text = jobDescription.toLowerCase();

    const technologies: string[] = [];
    for (const [key, label] of Object.entries(TECH_DICTIONARY)) {
      const rx = new RegExp(`\\b${key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (rx.test(text) && !technologies.includes(label)) {
        technologies.push(label);
      }
    }

    const tools: string[] = [];
    for (const [key, label] of Object.entries(TOOLS_DICTIONARY)) {
      const rx = new RegExp(`\\b${key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (rx.test(text) && !tools.includes(label)) {
        tools.push(label);
      }
    }

    const skills: string[] = [];
    for (const [key, label] of Object.entries(SKILLS_DICTIONARY)) {
      const rx = new RegExp(`\\b${key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (rx.test(text) && !skills.includes(label)) {
        skills.push(label);
      }
    }

    // Extract key action verbs present in JD
    const actionVerbs: string[] = ACTION_VERBS.filter(verb =>
      new RegExp(`\\b${verb}\\b`, 'i').test(jobDescription)
    );

    // Extract responsibilities sentences from JD (lines mentioning responsibilities, build, collaborate, etc.)
    const sentences = jobDescription.split(/[.\n]+/).map(s => s.trim()).filter(Boolean);
    const responsibilities = sentences
      .filter(s => /\b(?:responsible|collaborate|develop|design|build|maintain|ensure|lead|deliver)\b/i.test(s) && s.length > 20 && s.length < 160)
      .slice(0, 5);

    // Extract important capitalized keywords or domain phrases
    const domainMatches = jobDescription.match(/\b[A-Z][a-zA-Z0-9+#.-]{2,}\b/g) || [];
    const stopwords = new Set(["The", "And", "You", "Our", "We", "Job", "Role", "Team", "With", "Will", "Are", "For", "This", "That", "From", "Have", "Has", "Must", "Can", "May", "Should", "Work", "Years", "Experience"]);
    const importantKeywords: string[] = Array.from(new Set(domainMatches.filter(w => !stopwords.has(w)))).slice(0, 10);

    return {
      technologies,
      tools,
      skills,
      responsibilities,
      qualifications: [],
      actionVerbs: actionVerbs.length > 0 ? actionVerbs : ["Developed", "Engineered", "Optimized", "Implemented"],
      importantKeywords
    };
  }

  /**
   * Primary entry point. Uses fast heuristic extraction first.
   * If zero keywords were found (unlikely), falls back to LLM.
   */
  static async extractKeywords(jobDescription: string): Promise<ExtractedKeywords> {
    const fast = this.extractKeywordsFast(jobDescription);
    const totalFound = fast.technologies.length + fast.tools.length + fast.skills.length + fast.importantKeywords.length;

    // Fast path: if heuristic matched at least 2 keywords, return instantly (0ms latency!)
    if (totalFound >= 2) {
      return fast;
    }

    // Otherwise, fallback to LLM extraction with timeout guard
    console.log("[ATSKeywordExtractor] Few heuristic keywords found; querying active AI provider...");
    try {
      const systemPrompt = `
        You are an expert ATS (Applicant Tracking System) parser and job analyzer.
        Your task is to analyze the provided Job Description and extract key skills, technologies, tools, responsibilities, qualifications, action verbs, and general high-impact keywords.
        Return ONLY a valid JSON object matching the requested schema.
      `;
      const prompt = `Please extract and rank ATS keywords from this Job Description:\n\n${jobDescription}`;

      const response = await ai.active.generateObject<ExtractedKeywords>({
        prompt,
        systemPrompt,
        schema: ExtractedKeywordsSchema
      });

      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.warn("[ATSKeywordExtractor] LLM fallback failed, returning fast structure:", error);
    }

    return fast;
  }
}
