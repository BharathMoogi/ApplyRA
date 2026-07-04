/**
 * Advanced Hybrid Resume Parser
 * Uses heuristic section detection + smart regex extraction.
 * No external API key required — fully self-contained.
 */

import type { StructuredResumeData, ResumeProject, ResumeCertification, ResumeAchievement } from '@/actions/resumes';

// ────────────────────────────────────────────────────────────────────────────
// SECTION HEADERS DETECTION
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// SECTION HEADER MAP
// Maps every normalised heading string to a section key.
// We normalise by: lowercase, strip punctuation & extra spaces.
// ────────────────────────────────────────────────────────────────────────────

type SectionKey = 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'achievements' | 'internships' | 'other';

const HEADING_MAP: Record<string, SectionKey> = {
  // Summary / Objective
  'summary':                   'summary',
  'professional summary':      'summary',
  'career summary':            'summary',
  'profile':                   'summary',
  'about me':                  'summary',
  'objective':                 'summary',
  'career objective':          'summary',
  'professional profile':      'summary',

  // Experience
  'experience':                'experience',
  'work experience':           'experience',
  'professional experience':   'experience',
  'employment history':        'experience',
  'employment':                'experience',
  'work history':              'experience',
  'career history':            'experience',
  'relevant experience':       'experience',
  'job history':               'experience',

  // Internships (kept separate so we can merge into experience)
  'internship':                'internships',
  'internships':               'internships',
  'internship experience':     'internships',

  // Education
  'education':                 'education',
  'educational background':    'education',
  'academic background':       'education',
  'academic qualifications':   'education',
  'academics':                 'education',
  'educational qualifications':'education',

  // Skills
  'skills':                    'skills',
  'technical skills':          'skills',
  'core competencies':         'skills',
  'key skills':                'skills',
  'expertise':                 'skills',
  'technologies':              'skills',
  'tools and technologies':    'skills',
  'tools & technologies':      'skills',
  'skills and technologies':   'skills',
  'programming skills':        'skills',
  'languages and tools':       'skills',
  'languages':                 'skills',
  'tech stack':                'skills',

  // Projects
  'projects':                  'projects',
  'personal projects':         'projects',
  'key projects':              'projects',
  'side projects':             'projects',
  'academic projects':         'projects',
  'project experience':        'projects',

  // Certifications
  'certifications':            'certifications',
  'certification':             'certifications',
  'courses':                   'certifications',
  'course':                    'certifications',
  'licenses':                  'certifications',
  'license':                   'certifications',
  'training':                  'certifications',
  'professional development':  'certifications',

  // Achievements / Awards
  'achievements':              'achievements',
  'achievement':               'achievements',
  'awards':                    'achievements',
  'honors':                    'achievements',
  'honours':                   'achievements',
  'accomplishments':           'achievements',
  'recognition':               'achievements',
  'extracurricular activities':'achievements',
  'extracurriculars':          'achievements',
  'activities':                'achievements',
  'leadership':                'achievements',
  'volunteer':                 'achievements',
  'volunteering':              'achievements',
};

function normaliseHeading(line: string): string {
  return line
    .toLowerCase()
    .replace(/[^a-z\s&]/g, '')  // keep letters, spaces, ampersand
    .replace(/\s+/g, ' ')
    .trim();
}

function detectSection(line: string): SectionKey | null {
  const key = normaliseHeading(line);
  // Direct match
  if (HEADING_MAP[key]) return HEADING_MAP[key];
  // Allow trailing colon variants (e.g. "Skills:") – already stripped by regex above
  // Allow short ALL-CAPS headings that exactly match a key
  const upper = key.toUpperCase();
  for (const heading of Object.keys(HEADING_MAP)) {
    if (heading.toUpperCase() === upper) return HEADING_MAP[heading];
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// SECTION CHUNKER
// ────────────────────────────────────────────────────────────────────────────

interface SectionChunks {
  contact: string[];
  summary: string[];
  experience: string[];
  education: string[];
  skills: string[];
  projects: string[];
  certifications: string[];
  achievements: string[];
  internships: string[];
  other: string[];
}

function cleanLine(line: string): string {
  return line
    .replace(/\uFFFD/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function chunkIntoSections(rawText: string): SectionChunks {
  const lines = rawText.split('\n').map(cleanLine).filter(l => l.length > 0);
  const chunks: SectionChunks = {
    contact: [], summary: [], experience: [], education: [], skills: [],
    projects: [], certifications: [], achievements: [], internships: [], other: [],
  };

  let currentSection: SectionKey = 'contact';
  let contactLinesSeen = 0;

  for (const line of lines) {
    const detected = detectSection(line);
    if (detected !== null) {
      currentSection = detected;
      continue; // skip the heading line itself
    }

    if (currentSection === 'contact' && contactLinesSeen < 10) {
      contactLinesSeen++;
      chunks.contact.push(line);
    } else {
      if (currentSection === 'contact') currentSection = 'other';
      chunks[currentSection].push(line);
    }
  }

  return chunks;
}

// ────────────────────────────────────────────────────────────────────────────
// CONTACT INFO EXTRACTOR
// ────────────────────────────────────────────────────────────────────────────

function extractContactInfo(contactLines: string[], authName: string, fullText: string) {
  const contactText = contactLines.join('\n');
  const searchText = contactText + '\n' + fullText;

  // 1. Email extraction & validation
  const emailMatch = searchText.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,6}/);
  let email = emailMatch ? emailMatch[0].trim() : '';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    email = ''; // Invalid email
  }

  // 2. Phone extraction & validation
  const phoneMatch = searchText.match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/) || searchText.match(/(\+?\d[\d\s\-().]{7,20}\d)/);
  let phone = phoneMatch ? phoneMatch[0].trim() : '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    phone = ''; // Invalid phone
  }

  // 3. Extract all links/URLs in text
  const urlRegex = /(https?:\/\/[^\s|]+|www\.[^\s|]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s|]*)/gi;
  const urls: string[] = [];
  let match;
  while ((match = urlRegex.exec(searchText)) !== null) {
    // Strip trailing punctuation and layout characters like pipes (|), backslashes, etc.
    const candidate = match[0].replace(/[.,;:()|\[\]{}]$/, '').trim();
    if (!urls.includes(candidate)) {
      urls.push(candidate);
    }
  }

  // Helper to validate URLs
  const isValidUrl = (url: string) => {
    try {
      new URL(url.startsWith('http') ? url : 'https://' + url);
      return true;
    } catch {
      return false;
    }
  };

  let linkedin = '';
  let github = '';
  let portfolio = '';

  for (const url of urls) {
    if (!isValidUrl(url)) continue;
    
    // Normalize to standard link format
    const normalized = url.startsWith('http') ? url : 'https://' + url;

    if (/linkedin\.com/i.test(normalized) && !linkedin) {
      linkedin = normalized;
    } else if (/github\.com/i.test(normalized) && !github) {
      github = normalized;
    } else if (!/linkedin\.com|github\.com/i.test(normalized) && !portfolio) {
      portfolio = normalized;
    }
  }

  // 4. Location extraction
  // Search for patterns like "City, State", "City, Country"
  // Exclude lines containing common words like email, phone, university, school, or URLs
  // Crucial: Exclude technical keywords and skills (like AWS, CDK, Lambda, Java) from matching as a location
  const locationKeywordsToExclude = /email|phone|github|linkedin|http|www|education|skills|experience|present|resume|curriculum|aws|cdk|lambda|cloud|api|devops|docker|kubernetes|software|developer|engineer|manager|git|react|angular|node|postgresql/i;
  let location = '';

  for (const line of contactLines) {
    if (locationKeywordsToExclude.test(line)) continue;
    // Match common City, State/Country syntax
    const locMatch = line.match(/\b([A-Z][a-zA-Z\s.]+),\s*([A-Z]{2,}|[A-Z][a-zA-Z\s.]+)\b/);
    if (locMatch) {
      location = locMatch[0].trim();
      break;
    }
  }

  // Fallback: search top 15 lines of raw text for location pattern if not found in chunk
  if (!location) {
    const rawLines = fullText.split('\n').slice(0, 15);
    for (const line of rawLines) {
      if (locationKeywordsToExclude.test(line)) continue;
      const locMatch = line.match(/\b([A-Z][a-zA-Z\s.]+),\s*([A-Z]{2,}|[A-Z][a-zA-Z\s.]+)\b/);
      if (locMatch) {
        location = locMatch[0].trim();
        break;
      }
    }
  }

  return {
    name: authName,
    email,
    phone,
    website: portfolio || '', // Only set website to portfolio (do not fallback to linkedin/github)
    linkedin,
    github,
    portfolio,
    location,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// EXPERIENCE EXTRACTOR
// ────────────────────────────────────────────────────────────────────────────

function extractExperience(expLines: string[]) {
  if (expLines.length === 0) return [];

  const experiences: { company: string; role: string; duration: string; description: string; location?: string; employmentType?: string }[] = [];
  const datePattern = /(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*\d{4}\s*[-–—to]+\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*(?:\d{4}|Present|Current|Now))/gi;

  const eduKeywords = /\b(B\.?S\.?|B\.?E\.?|B\.?Tech|M\.?S\.?|M\.?Tech|MBA|Ph\.?D|Bachelor|Master|Associate|Diploma|Certificate|B\.?A\.?|M\.?A\.?|B\.?Sc|M\.?Sc|University|College|Institute|GITAM|School)\b/i;
  
  const sectionHeadingsToIgnore = /summary|experience|education|skills|projects|certifications|achievements|internships|employment|work|history/i;

  const empTypes = /\b(Full-time|Part-time|Contract|Internship|Intern|Freelance|Apprentice|Remote|On-site|Hybrid)\b/i;

  let current: typeof experiences[0] | null = null;
  let descLines: string[] = [];

  const flush = () => {
    if (current) {
      // Prevent adding education or headings as work experience
      const isEdu = eduKeywords.test(current.company) || eduKeywords.test(current.role);
      const isHeading = sectionHeadingsToIgnore.test(current.company) && current.company.split(' ').length <= 2;
      
      if (!isEdu && !isHeading) {
        current.description = descLines.join(' ').trim();
        experiences.push(current);
      }
      descLines = [];
      current = null;
    }
  };

  for (const line of expLines) {
    const normalised = line.trim().toLowerCase().replace(/[^a-z\s]/g, '');
    if (sectionHeadingsToIgnore.test(normalised) && line.split(' ').length <= 2) {
      flush();
      continue;
    }

    if (eduKeywords.test(line) && !line.includes("Intern") && !line.includes("Developer") && !line.includes("Engineer")) {
      flush();
      continue;
    }

    const dateMatches = [...line.matchAll(new RegExp(datePattern.source, 'gi'))];

    if (dateMatches.length > 0) {
      flush();
      const duration = dateMatches[0][0].trim();
      const withoutDate = line.replace(new RegExp(datePattern.source, 'gi'), '').trim();
      
      let location = '';
      const locMatch = withoutDate.match(/\b([A-Z][a-zA-Z\s.]+),\s*([A-Z]{2,}|[A-Z][a-zA-Z\s.]+)\b/);
      if (locMatch) {
        location = locMatch[0].trim();
      }
      const cleanedLine = location ? withoutDate.replace(location, '').trim() : withoutDate;

      let employmentType = '';
      const empMatch = cleanedLine.match(empTypes);
      if (empMatch) {
        employmentType = empMatch[0].trim();
      }
      const finalLine = employmentType ? cleanedLine.replace(empTypes, '').trim() : cleanedLine;

      const parts = finalLine.split(/[|,·•\-–—]/).map(p => p.trim()).filter(Boolean);
      current = {
        company: parts[0] || 'Company',
        role: parts[1] || parts[0] || 'Role',
        duration,
        description: '',
        location: location || undefined,
        employmentType: employmentType || undefined
      };
    } else if (current) {
      if (/skills|certifications|awards|languages|tools/i.test(line) && line.length < 30) {
        flush();
      } else {
        descLines.push(line);
      }
    } else if (!current) {
      const isTitleLike = line.length < 90 && !/^\d/.test(line);
      const parts = line.split(/[|,·•]/).map(p => p.trim()).filter(Boolean);
      if (isTitleLike && parts.length >= 2) {
        flush();
        current = { company: parts[0], role: parts[1], duration: '', description: '' };
      } else {
        descLines.push(line);
      }
    }
  }
  flush();

  return experiences;
}

// ────────────────────────────────────────────────────────────────────────────
// EDUCATION EXTRACTOR
// ────────────────────────────────────────────────────────────────────────────

function extractEducation(eduLines: string[]) {
  if (eduLines.length === 0) return [];

  const education: {
    school: string;
    degree: string;
    year: string;
    fieldOfStudy?: string;
    grade?: string;
    startDate?: string;
    endDate?: string;
    coursework?: string[];
  }[] = [];

  const yearPattern = /\b(19|20)\d{2}\b/g;
  const dateRangePattern = /(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*\d{4}\s*[-–—to]+\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*(?:\d{4}|Present|Current|Now))/gi;

  const degreePattern = /\b(B\.?S\.?|B\.?E\.?|B\.?Tech|M\.?S\.?|M\.?Tech|MBA|Ph\.?D|Bachelor|Master|Associate|Diploma|Certificate|B\.?A\.?|M\.?A\.?|B\.?Sc|M\.?Sc|High\s+School|Secondary)\b/i;
  
  const schoolKeywords = /\b(University|College|Institute|GITAM|School|Academy|Polytechnic)\b/i;

  const gradePattern = /\b(\d\.\d{1,2}(?:\s*\/10)?\s*(?:CGPA|GPA)?|\d{2,3}(?:\.\d{1,2})?\s*%)\b/i;

  let current: typeof education[0] | null = null;
  let courseworkLines: string[] = [];

  const flush = () => {
    if (current && (current.school || current.degree)) {
      if (courseworkLines.length > 0) {
        const fullCourseworkText = courseworkLines.join(' ');
        const cleaned = fullCourseworkText.replace(/^(?:coursework|relevant coursework|courses|subjects)\s*[:\-–—]?\s*/i, '');
        current.coursework = cleaned.split(/[,;]/).map(c => c.trim()).filter(c => c.length > 2 && c.length < 50);
      }
      education.push(current);
      current = null;
      courseworkLines = [];
    }
  };

  for (const line of eduLines) {
    const hasDegree = degreePattern.test(line);
    const hasSchool = schoolKeywords.test(line);
    const gradeMatch = line.match(gradePattern);
    const dateRangeMatch = line.match(dateRangePattern);
    const years = line.match(yearPattern);

    if (hasDegree || (hasSchool && !current)) {
      flush();
      
      const degMatch = line.match(degreePattern);
      const degreeName = degMatch ? degMatch[0].trim() : 'Degree';

      let fieldOfStudy = '';
      const studyMatch = line.match(/\bin\b\s*([A-Za-z\s&]+)/i) || line.match(/\bof\b\s*([A-Za-z\s&]+)/i);
      if (studyMatch) {
        fieldOfStudy = studyMatch[1].split(/[|,·•\-–—(]/)[0].trim();
      }

      let startDate = '';
      let endDate = '';
      if (dateRangeMatch) {
        const dateParts = dateRangeMatch[0].split(/[-–—to]+/i);
        startDate = dateParts[0]?.trim() || '';
        endDate = dateParts[1]?.trim() || '';
      } else if (years && years.length >= 2) {
        startDate = years[0];
        endDate = years[1];
      } else if (years && years.length === 1) {
        endDate = years[0];
      }

      current = {
        school: hasSchool ? line.trim() : '',
        degree: degreeName,
        fieldOfStudy: fieldOfStudy || undefined,
        year: dateRangeMatch ? dateRangeMatch[0].trim() : (years ? years.join(' - ') : ''),
        grade: gradeMatch ? gradeMatch[0].trim() : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
    } else if (current) {
      if (!current.grade && gradeMatch) {
        current.grade = gradeMatch[0].trim();
      }

      if (!current.school && hasSchool) {
        current.school = line.trim();
      } else if (current.school && !current.degree && hasDegree) {
        const degMatch = line.match(degreePattern);
        current.degree = degMatch ? degMatch[0].trim() : 'Degree';
      }

      if (!current.startDate && !current.endDate) {
        if (dateRangeMatch) {
          const dateParts = dateRangeMatch[0].split(/[-–—to]+/i);
          current.startDate = dateParts[0]?.trim();
          current.endDate = dateParts[1]?.trim();
          current.year = dateRangeMatch[0].trim();
        } else if (years && years.length >= 2) {
          current.startDate = years[0];
          current.endDate = years[1];
          current.year = years.join(' - ');
        } else if (years && years.length === 1) {
          current.endDate = years[0];
          current.year = years[0];
        }
      }

      if (/coursework|courses|subjects|curriculum/i.test(line)) {
        courseworkLines.push(line);
      } else if (courseworkLines.length > 0 && (line.includes(",") || line.includes(";"))) {
        courseworkLines.push(line);
      }
    }
  }
  flush();

  return education;
}

// ────────────────────────────────────────────────────────────────────────────
// SKILLS EXTRACTOR
// ────────────────────────────────────────────────────────────────────────────

interface CategorizedSkills {
  languages: string[];
  frameworks: string[];
  databases: string[];
  tools: string[];
  cloud: string[];
  other: string[];
}

function extractCategorizedSkills(skillLines: string[], fullText: string) {
  const allSkills = new Set<string>();

  const cleanSkill = (s: string) => {
    return s.replace(/^[•·*-\s]+|[•·*-\s]+$/g, '').trim();
  };

  for (const line of skillLines) {
    if (line.length > 80 || /\b(implemented|responsible|worked|using|developed|created)\b/i.test(line)) {
      continue;
    }

    const items = line.split(/[,|•·\/\\]/).map(cleanSkill).filter(s => s.length > 1 && s.length < 40 && !/\s{3,}/.test(s));
    for (const item of items) {
      if (item.split(' ').length <= 4) {
        allSkills.add(item);
      }
    }
  }

  const LANGS = /\b(javascript|typescript|python|java|c\+\+|c\#|go|golang|rust|ruby|php|swift|kotlin|sql|html|css|bash|shell|r|scala|perl|dart)\b/i;
  const FRAMEWORKS = /\b(react|next\.js|nextjs|angular|vue|vue\.js|svelte|express|express\.js|django|flask|fastapi|spring\s*boot|rails|nest\.js|nestjs|flutter|react\s*native|swiftui|laravel|django|bootstrap|tailwind|sass|redux|zustand|graphql|jquery)\b/i;
  const DBS = /\b(postgresql|postgres|mysql|sqlite|mongodb|mongo|redis|cassandra|dynamodb|oracle|mssql|sql\s*server|mariadb|firestore|firebase)\b/i;
  const TOOLS = /\b(git|github|gitlab|vscode|webpack|babel|vite|figma|postman|jest|playwright|cypress|npm|yarn|pnpm|jira|confluence|trello|maven|gradle)\b/i;
  const CLOUD = /\b(aws|gcp|azure|vercel|netlify|heroku|supabase|cloudflare|terraform|docker|kubernetes|ci\/cd|jenkins|circleci|github\s*actions|google\s*cloud|amazon\s*web\s*services)\b/i;
  
  const TECH_MAP: Record<string, string> = {
    "javascript": "JavaScript", "typescript": "TypeScript", "python": "Python", "java": "Java", 
    "c++": "C++", "c#": "C#", "go": "Go", "golang": "Go", "rust": "Rust", "ruby": "Ruby", 
    "php": "PHP", "swift": "Swift", "kotlin": "Kotlin", "sql": "SQL", "html": "HTML", 
    "css": "CSS", "bash": "Bash", "shell": "Shell", "r": "R", "scala": "Scala", "dart": "Dart",
    "react": "React", "next.js": "Next.js", "nextjs": "Next.js", "angular": "Angular", 
    "vue": "Vue.js", "vue.js": "Vue.js", "svelte": "Svelte", "express": "Express.js", 
    "express.js": "Express.js", "django": "Django", "flask": "Flask", "fastapi": "FastAPI", 
    "spring boot": "Spring Boot", "springboot": "Spring Boot", "rails": "Ruby on Rails", 
    "nestjs": "NestJS", "nest.js": "NestJS", "flutter": "Flutter", "react native": "React Native", 
    "swiftui": "SwiftUI", "tailwind": "Tailwind CSS", "tailwindcss": "Tailwind CSS",
    "postgresql": "PostgreSQL", "postgres": "PostgreSQL", "mysql": "MySQL", "sqlite": "SQLite", 
    "mongodb": "MongoDB", "mongo": "MongoDB", "redis": "Redis", "cassandra": "Cassandra", 
    "dynamodb": "DynamoDB", "oracle": "Oracle", "firestore": "Firestore", "firebase": "Firebase",
    "git": "Git", "github": "GitHub", "gitlab": "GitLab", "vscode": "VS Code", 
    "webpack": "Webpack", "vite": "Vite", "figma": "Figma", "postman": "Postman", 
    "jest": "Jest", "playwright": "Playwright", "cypress": "Cypress", "npm": "npm", 
    "yarn": "Yarn", "pnpm": "pnpm", "jira": "Jira",
    "aws": "AWS", "gcp": "GCP", "azure": "Azure", "vercel": "Vercel", "netlify": "Netlify", 
    "heroku": "Heroku", "supabase": "Supabase", "cloudflare": "Cloudflare", 
    "terraform": "Terraform", "docker": "Docker", "kubernetes": "Kubernetes", 
    "ci/cd": "CI/CD", "jenkins": "Jenkins", "github actions": "GitHub Actions",
    "communication": "Communication", "leadership": "Leadership", "teamwork": "Teamwork",
    "problem solving": "Problem Solving", "agile": "Agile", "scrum": "Scrum"
  };

  for (const [key, val] of Object.entries(TECH_MAP)) {
    const rx = new RegExp(`\\b${key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (rx.test(fullText)) {
      allSkills.add(val);
    }
  }

  const skillsList = [...allSkills].filter(s => s.length > 1 && s.length < 35);

  const categorized: CategorizedSkills = {
    languages: [],
    frameworks: [],
    databases: [],
    tools: [],
    cloud: [],
    other: []
  };

  for (const skill of skillsList) {
    const norm = skill.toLowerCase();
    
    if (LANGS.test(norm)) {
      const display = TECH_MAP[norm] || skill;
      if (!categorized.languages.includes(display)) categorized.languages.push(display);
    } else if (FRAMEWORKS.test(norm)) {
      const display = TECH_MAP[norm] || skill;
      if (!categorized.frameworks.includes(display)) categorized.frameworks.push(display);
    } else if (DBS.test(norm)) {
      const display = TECH_MAP[norm] || skill;
      if (!categorized.databases.includes(display)) categorized.databases.push(display);
    } else if (CLOUD.test(norm)) {
      const display = TECH_MAP[norm] || skill;
      if (!categorized.cloud.includes(display)) categorized.cloud.push(display);
    } else if (TOOLS.test(norm)) {
      const display = TECH_MAP[norm] || skill;
      if (!categorized.tools.includes(display)) categorized.tools.push(display);
    } else {
      if (!categorized.other.includes(skill)) categorized.other.push(skill);
    }
  }

  return {
    flatSkills: skillsList,
    categorized
  };
}

function extractSummary(summaryLines: string[], fullText: string): string {
  if (summaryLines.length > 0) {
    return summaryLines.join('\n').trim();
  }

  // Fallback: If no explicit summary header was found,
  // look at the first 15 lines of raw text, skip contact info lines,
  // and take any paragraph before any major section header.
  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 20);
  const summaryCandidateLines: string[] = [];
  
  let skipLines = true;
  for (const line of lines) {
    const isContactLine = /@|phone|github|linkedin|http|www|^\+?\d[\d\s-]{7,}/i.test(line);
    const isHeading = detectSection(line) !== null;

    if (isHeading) {
      break; // stop at any major header
    }

    if (skipLines) {
      // Typically a summary paragraph is longer than typical header lines
      if (!isContactLine && line.length > 25 && !/^[A-Z\s]+$/.test(line)) {
        skipLines = false;
        summaryCandidateLines.push(line);
      }
    } else {
      if (!isContactLine) {
        summaryCandidateLines.push(line);
      }
    }
  }

  return summaryCandidateLines.join('\n').trim();
}

function extractProjects(projectLines: string[]): ResumeProject[] {
  if (projectLines.length === 0) return [];

  const projects: ResumeProject[] = [];
  const datePattern = /(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*\d{4}\s*[-–—to]+\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*(?:\d{4}|Present|Current|Now))/gi;
  const urlRegex = /(https?:\/\/[^\s|]+|www\.[^\s|]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s|]*)/gi;

  const techDictionary = [
    "React", "Next.js", "TypeScript", "JavaScript", "Node.js", "Tailwind CSS",
    "PostgreSQL", "Prisma", "Supabase", "Kubernetes", "Docker", "CI/CD", "AWS",
    "GCP", "Azure", "GraphQL", "REST API", "Redux", "Zustand", "Figma", "Python",
    "Flask", "Django", "FastAPI", "TensorFlow", "PyTorch", "OpenCV", "MySQL", "MongoDB",
    "Redis", "Express", "Vercel", "TailwindCSS", "CSS", "HTML"
  ];

  let current: ResumeProject | null = null;
  let descLines: string[] = [];

  const flush = () => {
    if (current) {
      current.description = descLines.join(' ').trim();
      projects.push(current);
      current = null;
      descLines = [];
    }
  };

  for (const line of projectLines) {
    const isTitleLike = line.length < 80 && !/^\d/.test(line) && (line.includes("-") || line.includes("|") || line.split(" ").length <= 4);
    const dateMatch = line.match(datePattern);
    
    if (isTitleLike && !line.toLowerCase().includes("coursework") && !line.toLowerCase().includes("skills")) {
      flush();
      
      const withoutDate = dateMatch ? line.replace(datePattern, '').trim() : line;
      const parts = withoutDate.split(/[|-–—·•]/).map(p => p.trim()).filter(Boolean);
      const name = parts[0] || 'Project Name';

      let githubUrl = '';
      let liveUrl = '';
      let match;
      while ((match = urlRegex.exec(line)) !== null) {
        const url = match[0].replace(/[.,;:()|\[\]{}]$/, '').trim();
        if (/github\.com/i.test(url)) {
          githubUrl = url;
        } else {
          liveUrl = url;
        }
      }

      const lineTechs = techDictionary.filter(t => 
        line.toLowerCase().includes(t.toLowerCase())
      );

      current = {
        name,
        description: '',
        duration: dateMatch ? dateMatch[0].trim() : undefined,
        githubUrl: githubUrl || undefined,
        liveUrl: liveUrl || undefined,
        technologies: lineTechs.length > 0 ? lineTechs : undefined
      };
    } else if (current) {
      let match;
      while ((match = urlRegex.exec(line)) !== null) {
        const url = match[0].replace(/[.,;:()|\[\]{}]$/, '').trim();
        if (/github\.com/i.test(url) && !current.githubUrl) {
          current.githubUrl = url;
        } else if (!/github\.com/i.test(url) && !current.liveUrl) {
          current.liveUrl = url;
        }
      }

      const foundTechs = techDictionary.filter(t => 
        line.toLowerCase().includes(t.toLowerCase())
      );
      if (foundTechs.length > 0) {
        current.technologies = [...new Set([...(current.technologies || []), ...foundTechs])];
      }

      descLines.push(line);
    }
  }
  flush();

  return projects;
}

function extractCertifications(certLines: string[]): ResumeCertification[] {
  if (certLines.length === 0) return [];

  const certifications: ResumeCertification[] = [];
  const datePattern = /(\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*\d{4}\s*[-–—to]*\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*(?:\d{4}|Present|Current|Now)?)/gi;
  const urlRegex = /(https?:\/\/[^\s|]+|www\.[^\s|]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s|]*)/gi;

  const issuersDictionary = [
    "Amazon Web Services", "AWS", "Google Cloud", "Google", "Microsoft", "Microsoft Azure", "Azure", 
    "Oracle", "Cisco", "IBM", "Harvard", "MIT", "Stanford", "Coursera", "Udemy", "edX", "Pluralsight", 
    "Scrum Alliance", "Project Management Institute", "PMI", "Linux Foundation", "HashiCorp"
  ];

  for (const line of certLines) {
    if (line.trim().length < 5) continue;
    if (/\b(B\.?Tech|Bachelor|Master|Degree|GPA|CGPA|University|College)\b/i.test(line)) continue;
    if (/\b(achievement|award|won|prize|scholarship|ranked|percentile)\b/i.test(line)) continue;

    const dates = line.match(datePattern);
    let issueDate = '';
    let expiryDate = '';
    if (dates && dates.length > 0) {
      const dateParts = dates[0].split(/[-–—to]+/i);
      issueDate = dateParts[0]?.trim() || '';
      expiryDate = dateParts[1]?.trim() || '';
    }

    let cleanedLine = dates ? line.replace(datePattern, '').trim() : line;

    let credentialUrl = '';
    const urlMatch = cleanedLine.match(urlRegex);
    if (urlMatch) {
      credentialUrl = urlMatch[0].replace(/[.,;:()|\[\]{}]$/, '').trim();
      cleanedLine = cleanedLine.replace(urlRegex, '').trim();
    }

    let issuer = '';
    for (const name of issuersDictionary) {
      const rx = new RegExp(`\\b${name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (rx.test(cleanedLine)) {
        issuer = name;
        cleanedLine = cleanedLine.replace(rx, '').trim();
        break;
      }
    }

    const parts = cleanedLine.split(/[|·•\-–—,]/).map(p => p.trim()).filter(Boolean);
    const name = parts[0] || 'Certification Name';
    if (!issuer && parts.length > 1) {
      issuer = parts[1];
    }

    certifications.push({
      name: name.replace(/[|·•\-–—,:]+$/, '').trim(),
      issuer: issuer ? issuer.replace(/[|·•\-–—,:]+$/, '').trim() : 'Verified Issuer',
      issueDate: issueDate || undefined,
      expiryDate: expiryDate || undefined,
      credentialUrl: credentialUrl || undefined
    });
  }

  return certifications;
}

function extractAchievements(achLines: string[]): ResumeAchievement[] {
  if (achLines.length === 0) return [];

  const achievements: ResumeAchievement[] = [];
  const datePattern = /(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*\d{4}\s*[-–—to]*\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*(?:\d{4}|Present|Current|Now)?)/gi;

  for (const line of achLines) {
    if (line.trim().length < 5) continue;
    if (/\b(B\.?Tech|Bachelor|Master|Degree|GPA|CGPA|University|College)\b/i.test(line)) continue;
    if (/\b(work|professional|experience|employment|job|career)\b/i.test(line) && line.length < 30) continue;

    const dates = line.match(datePattern);
    const date = dates && dates.length > 0 ? dates[0].trim() : undefined;
    let cleanedLine = dates ? line.replace(datePattern, '').trim() : line;

    let category: ResumeAchievement["category"] = "Other";
    const norm = cleanedLine.toLowerCase();

    if (/\b(publication|published|paper|journal|conference|patent)\b/i.test(norm)) {
      category = "Publication";
    } else if (/\b(sport|cricket|football|basketball|tennis|badminton|athletics|tournament|run)\b/i.test(norm)) {
      category = "Sport";
    } else if (/\b(hackathon|competition|contest|olympiad|codeforces|leetcode|kaggle)\b/i.test(norm)) {
      category = "Competition";
    } else if (/\b(leader|captain|lead|president|head|founder|representative|coordinator|officer|managed)\b/i.test(norm)) {
      category = "Leadership";
    } else if (/\b(volunteered|volunteer|member|club|society|ngo|event|organized|extracurricular)\b/i.test(norm)) {
      category = "Extracurricular";
    } else if (/\b(award|prize|scholarship|ranked|percentile|honored|medal|stipend|first place|top)\b/i.test(norm)) {
      category = "Award";
    }

    const parts = cleanedLine.split(/[|·•\-–—,:]/).map(p => p.trim()).filter(Boolean);
    const title = parts[0] || 'Achievement';
    const description = parts.slice(1).join(' ').trim() || cleanedLine;

    achievements.push({
      title: title.replace(/[|·•\-–—,:]+$/, '').trim(),
      category,
      description: description || title,
      date
    });
  }

  return achievements;
}

function validateAndCleanResumeData(data: StructuredResumeData): StructuredResumeData {
  const experience = [...data.experience];
  const education = [...data.education];
  const projects = [...(data.projects || [])];
  const certifications = [...(data.certifications || [])];
  const achievements = [...(data.achievements || [])];

  const containsAny = (text: string, keywords: string[]) => {
    const lower = text.toLowerCase();
    return keywords.some(kw => lower.includes(kw.toLowerCase()));
  };

  const eduKeywords = [
    "university", "college", "institute", "school", "degree", "bachelor", "master", "phd", 
    "btech", "mtech", "mba", "gitam", "minor", "major", "coursework", "academy", "education", 
    "communication engineering", "science & communication"
  ];
  const jobKeywords = ["engineer", "developer", "analyst", "manager", "intern", "consultant", "specialist", "lead", "architect"];

  // 1. Validate Work Experience entries
  for (let i = experience.length - 1; i >= 0; i--) {
    const exp = experience[i];
    const isEdu = containsAny(exp.company, eduKeywords) || containsAny(exp.role, eduKeywords) || exp.description.toLowerCase().includes("coursework:");
    
    if (isEdu && !containsAny(exp.role, jobKeywords)) {
      education.push({
        school: exp.company || "Verified University",
        degree: exp.role || "Minor / Degree",
        year: exp.duration || "N/A",
        fieldOfStudy: exp.location || ""
      });
      experience.splice(i, 1);
    }
  }

  // Swap school and degree if school name looks like a degree designation
  for (const edu of education) {
    if (/^(B\.?Tech|M\.?Tech|B\.?S\.?|M\.?S\.?|B\.?E\.?|B\.?A\.?|M\.?A\.?|MBA|Ph\.?D|Bachelor|Master)/i.test(edu.school) && (!edu.degree || edu.degree === "Degree" || edu.degree.length === 0)) {
      edu.degree = edu.school;
      edu.school = "Verified University";
    }
  }

  // 2. Validate Education entries
  for (let i = education.length - 1; i >= 0; i--) {
    const edu = education[i];
    if (containsAny(edu.degree, jobKeywords) && !containsAny(edu.school, eduKeywords)) {
      experience.push({
        company: edu.school,
        role: edu.degree,
        duration: edu.year,
        description: edu.coursework ? `Coursework: ${edu.coursework.join(', ')}` : ""
      });
      education.splice(i, 1);
    }
  }

  // 3. Validate Projects entries
  for (let i = projects.length - 1; i >= 0; i--) {
    const proj = projects[i];
    const companyNames = ["google", "microsoft", "amazon", "apple", "meta", "netflix", "uber", "tcs", "cognizant", "wipro", "infosys", "accenture"];
    if (containsAny(proj.name, companyNames) && containsAny(proj.description, jobKeywords)) {
      experience.push({
        company: proj.name,
        role: "Software Engineer",
        duration: proj.duration || "N/A",
        description: proj.description
      });
      projects.splice(i, 1);
    }
  }

  // 4. Deduplicate Achievements
  for (let i = achievements.length - 1; i >= 0; i--) {
    const ach = achievements[i];
    const isCert = certifications.some(c => 
      c.name.toLowerCase() === ach.title.toLowerCase() || 
      c.name.toLowerCase().includes(ach.title.toLowerCase())
    );
    if (isCert) {
      achievements.splice(i, 1);
      continue;
    }

    const isProj = projects.some(p =>
      p.name.toLowerCase() === ach.title.toLowerCase() ||
      p.name.toLowerCase().includes(ach.title.toLowerCase())
    );
    if (isProj) {
      achievements.splice(i, 1);
    }
  }

  // 5. Deduplicate Projects against Experience
  for (let i = projects.length - 1; i >= 0; i--) {
    const proj = projects[i];
    const isDuplicate = experience.some(exp =>
      exp.company.toLowerCase() === proj.name.toLowerCase() ||
      (exp.description.toLowerCase().includes(proj.name.toLowerCase()) && proj.name.length > 5)
    );
    if (isDuplicate) {
      projects.splice(i, 1);
    }
  }

  return {
    ...data,
    experience,
    education,
    projects,
    certifications,
    achievements
  };
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ────────────────────────────────────────────────────────────────────────────

export async function parseResumeHybrid(
  rawText: string,
  authName: string
): Promise<StructuredResumeData> {
  const chunks = chunkIntoSections(rawText);

  const personal = extractContactInfo(chunks.contact, authName, rawText);

  // Merge internships into experience source
  const experienceLines = [
    ...chunks.experience,
    ...chunks.internships,
    ...(chunks.experience.length === 0 && chunks.internships.length === 0 ? chunks.other : []),
  ];
  
  // Parse experiences (safeguards inside extractExperience will filter out education keywords)
  const experience = extractExperience(experienceLines);

  // Try parsing education from education section first
  let education = extractEducation(chunks.education);

  // Fallback: Scan the rawText or other chunks if education section wasn't populated or detected
  if (education.length === 0) {
    // Scan raw lines for anything that looks like a degree/school
    const rawLines = rawText.split('\n');
    const eduKeywords = /\b(B\.?S\.?|B\.?E\.?|B\.?Tech|M\.?S\.?|M\.?Tech|MBA|Ph\.?D|Bachelor|Master|Associate|Diploma|Certificate|B\.?A\.?|M\.?A\.?|B\.?Sc|M\.?Sc|University|College|Institute|GITAM|School)\b/i;
    const yearPattern = /\b(19|20)\d{2}\b/;
    
    // Find all lines containing education keywords
    const candidateLines = rawLines.filter(line => eduKeywords.test(line));
    if (candidateLines.length > 0) {
      education = extractEducation(candidateLines);
    }
  }

  // Skills: dedicated section + keyword scan + achievements listed as skills
  const skillsData = extractCategorizedSkills(
    [...chunks.skills, ...chunks.achievements, ...chunks.certifications],
    rawText
  );

  const summary = extractSummary(chunks.summary, rawText);

  const projects = extractProjects(chunks.projects);

  const certifications = extractCertifications(chunks.certifications);

  const achievements = extractAchievements(chunks.achievements);

  const rawParsed = {
    personal: {
      name: personal.name,
      email: personal.email || '',
      phone: personal.phone || '',
      website: personal.website || '',
      linkedin: personal.linkedin || '',
      github: personal.github || '',
      portfolio: personal.portfolio || '',
      location: personal.location || '',
    },
    experience: experience, // Strictly work experience (internships/jobs), no projects
    education,
    skills: skillsData.flatSkills,
    summary,
    projects,
    categorizedSkills: skillsData.categorized,
    certifications,
    achievements,
  };

  return validateAndCleanResumeData(rawParsed);
}
