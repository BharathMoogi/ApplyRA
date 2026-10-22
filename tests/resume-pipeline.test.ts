import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { parseResumeHybrid } from "../src/lib/parser";
import { renderResumeHtml, generateResumePdf } from "../src/lib/pdf/generator";
import { validateResumeForExport } from "../src/lib/pdf/validator";
import type { StructuredResumeData } from "../src/actions/resumes";

describe("ApplyRA Resume Pipeline Tests", () => {
  // Test 1: A project whose title contains a company name
  test("1. Project with company name in title must remain in Projects and not convert to Work Experience", async () => {
    const rawText = `
John Doe
john@example.com | +1234567890 | San Francisco, CA

PROJECTS
Amazon Price Tracker | React, Node.js, AWS | Jan 2023 - May 2023
- Built an automated scraper monitoring price drops on Amazon retail products.
- Alerted 1,000+ active users via Telegram bot webhook.

EDUCATION
San Jose State University
Bachelor of Science in Computer Science | 2024
    `;

    const parsed = await parseResumeHybrid(rawText, "John Doe");
    
    // Must NOT convert into experience at Amazon
    const amazonJob = parsed.experience.find(e => /amazon/i.test(e.company));
    assert.equal(amazonJob, undefined, "Project should NOT be converted into a job at Amazon");

    // Must be preserved in projects
    const amazonProj = parsed.projects?.find(p => /amazon price tracker/i.test(p.name));
    assert.ok(amazonProj, "Amazon Price Tracker must be preserved in Projects");
    assert.ok(amazonProj?.technologies?.includes("React"));
  });

  // Test 2: Multiple internships and projects in one resume
  test("2. Multiple internships and projects in one resume are cleanly segregated", async () => {
    const rawText = `
Jane Smith
jane@example.com | 9876543210

EXPERIENCE
Software Engineering Intern | Acme Corp | May 2023 - Aug 2023
- Developed internal reporting dashboard using React.

Frontend Intern | Beta Labs | Jan 2023 - Apr 2023
- Optimized landing page Lighthouse score by 25%.

PROJECTS
DevPortfolio | Next.js, Tailwind CSS | 2022
- Responsive portfolio builder for developers.

TaskFlow | TypeScript, Express | 2023
- Kanban board task management system with real-time sync.

EDUCATION
University of Washington
Bachelor of Science in Informatics | 2024
    `;

    const parsed = await parseResumeHybrid(rawText, "Jane Smith");
    assert.equal(parsed.experience.length, 2, "Should preserve both internships under experience");
    assert.equal(parsed.projects?.length, 2, "Should preserve both projects under projects");
    assert.ok(parsed.experience.some(e => /acme/i.test(e.company)));
    assert.ok(parsed.experience.some(e => /beta/i.test(e.company)));
    assert.ok(parsed.projects?.some(p => /devportfolio/i.test(p.name)));
    assert.ok(parsed.projects?.some(p => /taskflow/i.test(p.name)));
  });

  // Test 3: Multiline education with full degree name and university
  test("3. Multiline education preserves full degree name, university, and CGPA without placeholders", async () => {
    const rawText = `
Alex Kumar
alex@example.com | 555-0199

EDUCATION
GITAM Deemed to be University, Visakhapatnam
Bachelor of Technology in Computer Science and Engineering | CGPA: 8.85 / 10 | 2020 - 2024
Relevant Coursework: Data Structures, Operating Systems, Computer Networks
    `;

    const parsed = await parseResumeHybrid(rawText, "Alex Kumar");
    assert.ok(parsed.education.length >= 1, "Should extract education");
    const edu = parsed.education[0];
    
    assert.ok(/gitam/i.test(edu.school), `School should be GITAM, got: "${edu.school}"`);
    assert.ok(!/verified university/i.test(edu.school), "Should NEVER contain 'Verified University'");
    assert.ok(/bachelor of technology/i.test(edu.degree), `Degree should contain Bachelor of Technology, got: "${edu.degree}"`);
    assert.ok(/computer science/i.test(edu.fieldOfStudy || ""), `Field should contain Computer Science, got: "${edu.fieldOfStudy}"`);
    assert.ok(edu.grade?.includes("8.85"), `Grade should contain 8.85, got: "${edu.grade}"`);
  });

  // Test 4: Missing university, dates, or optional fields
  test("4. Missing university or dates does not throw or inject fake placeholders", async () => {
    const rawText = `
Sam River
sam@example.com

EDUCATION
Bachelor of Arts
Major: Philosophy

PROJECTS
MiniLisp Interpreter
- Implemented AST evaluator in Rust.
    `;

    const parsed = await parseResumeHybrid(rawText, "Sam River");
    assert.ok(parsed.education.length >= 1);
    const edu = parsed.education[0];
    assert.ok(!/verified university/i.test(edu.school), "Must not inject 'Verified University'");
    assert.ok(!/project name/i.test(parsed.projects?.[0]?.name || ""), "Must not inject 'Project Name'");
  });

  // Test 5: Long bullets and duplicate bullets handling
  test("5. Pre-export validation detects duplicate bullets across entries", () => {
    const resumeWithDuplicates: StructuredResumeData = {
      personal: { name: "Test User", email: "user@test.com", phone: "+1234567890", website: "" },
      summary: "Experienced developer.",
      skills: ["React", "TypeScript"],
      experience: [
        {
          company: "Alpha Inc",
          role: "Frontend Engineer",
          duration: "2022 - 2023",
          description: "Architected micro-frontend architecture resulting in 40% reduction in page load latency."
        },
        {
          company: "Beta Corp",
          role: "Software Engineer",
          duration: "2023 - Present",
          description: "Architected micro-frontend architecture resulting in 40% reduction in page load latency."
        }
      ],
      education: [{ school: "State University", degree: "B.S. in CS", year: "2022" }]
    };

    const report = validateResumeForExport(resumeWithDuplicates);
    assert.ok(report.warnings.some(w => w.message.includes("Duplicate bullet detected")), "Validator must flag duplicate bullets");
  });

  // Test 6: Job description mismatch / preserving real experience
  test("6. Validator flags invented employers if modified data contains unverified companies", () => {
    const original: StructuredResumeData = {
      personal: { name: "Candidate A", email: "a@a.com", phone: "123", website: "" },
      skills: ["Python"],
      experience: [{ company: "Real Company A", role: "Junior Dev", duration: "2023", description: "Wrote scripts" }],
      education: [{ school: "Real College", degree: "B.Tech", year: "2023" }]
    };

    const modifiedWithFakeJob: StructuredResumeData = {
      ...original,
      experience: [
        ...original.experience,
        { company: "Fake High Frequency Trading Firm", role: "Principal Architect", duration: "2024", description: "Built engine" }
      ]
    };

    const report = validateResumeForExport(modifiedWithFakeJob, original);
    assert.ok(report.warnings.some(w => w.message.includes("Fake High Frequency Trading Firm")), "Validator should warn about invented employers");
  });

  // Test 7: Resume with certifications and achievements
  test("7. Certifications and achievements are rendered in both HTML preview and PDF export", async () => {
    const resume: StructuredResumeData = {
      personal: { name: "Certified Developer", email: "cert@test.com", phone: "+1234567890", website: "" },
      summary: "Cloud and security focused engineer.",
      skills: ["AWS", "Docker"],
      experience: [{ company: "Tech Co", role: "DevOps Engineer", duration: "2021 - Present", description: "Managed k8s" }],
      education: [{ school: "City College", degree: "B.S.", year: "2021" }],
      certifications: [
        { name: "AWS Certified Solutions Architect", issuer: "Amazon Web Services", issueDate: "2023" }
      ],
      achievements: [
        { title: "First Place Winner", category: "Competition", description: "Won annual regional hackathon out of 120 teams", date: "2022" }
      ]
    };

    const html = renderResumeHtml(resume);
    assert.ok(html.includes("Certifications & Achievements"), "HTML must contain Certifications & Achievements section");
    assert.ok(html.includes("AWS Certified Solutions Architect"), "HTML must include AWS certificate");
    assert.ok(html.includes("First Place Winner"), "HTML must include First Place achievement");

    const pdfBuffer = await generateResumePdf(resume);
    assert.ok(pdfBuffer.length > 1000, "PDF buffer must be generated successfully");
  });

  // Test 8: Multiple-page PDF generation
  test("8. Multiple-page PDF generation produces valid PDF buffer without crashing", async () => {
    const longResume: StructuredResumeData = {
      personal: { name: "Senior Architect", email: "senior@test.com", phone: "1234567890", website: "" },
      summary: "Ten years of software engineering experience.",
      skills: ["Go", "Kubernetes", "PostgreSQL", "Kafka", "Distributed Systems"],
      experience: Array.from({ length: 6 }).map((_, i) => ({
        company: `Enterprise Corp ${i + 1}`,
        role: `Staff Engineer ${i + 1}`,
        duration: `${2018 + i} - ${2019 + i}`,
        description: `Scaled distributed transaction pipelines across 50 nodes.\nImplemented automated disaster recovery protocols.\nMentored 15 junior engineers.`
      })),
      projects: Array.from({ length: 4 }).map((_, i) => ({
        name: `Open Source Framework ${i + 1}`,
        technologies: ["Go", "gRPC"],
        description: "High throughput RPC framework with 2k GitHub stars."
      })),
      education: [{ school: "Tech Institute", degree: "M.S. in CS", year: "2018" }]
    };

    const pdfBuffer = await generateResumePdf(longResume);
    assert.ok(pdfBuffer.length > 5000, "Multipage PDF must generate cleanly");
  });

  // Test 9: Agreement between HTML structure and PDF output
  test("9. HTML preview structure follows exact standard ATS section ordering", () => {
    const resume: StructuredResumeData = {
      personal: { name: "Jane Doe", email: "jane@test.com", phone: "1234567890", website: "" },
      summary: "Full stack engineer.",
      skills: ["React", "Node.js"],
      categorizedSkills: {
        languages: ["JavaScript", "TypeScript"],
        frameworks: ["React", "Express"],
        databases: ["PostgreSQL"],
        tools: ["Docker"],
        cloud: ["AWS"],
        other: []
      },
      experience: [{ company: "Tech Inc", role: "Dev", duration: "2023", description: "Developed features" }],
      projects: [{ name: "Project Alpha", description: "Built web app" }],
      education: [{ school: "University", degree: "B.Tech", year: "2023" }]
    };

    const html = renderResumeHtml(resume);
    
    // Check ordering index in HTML
    const summaryIndex = html.indexOf("Professional Summary");
    const skillsIndex = html.indexOf("Technical Skills");
    const expIndex = html.indexOf("Work Experience & Internships");
    const projIndex = html.indexOf("Projects");
    const eduIndex = html.indexOf("Education");

    assert.ok(summaryIndex !== -1, "Summary must exist");
    assert.ok(skillsIndex > summaryIndex, "Skills must be placed after Summary");
    assert.ok(expIndex > skillsIndex, "Experience must be placed after Skills");
    assert.ok(projIndex > expIndex, "Projects must be placed after Experience");
    assert.ok(eduIndex > projIndex, "Education must be placed after Projects");
  });

  // Test 10: Fresher resume with projects and no full-time experience
  test("10. Fresher resume without work experience renders cleanly with projects emphasized", async () => {
    const fresherResume: StructuredResumeData = {
      personal: { name: "Fresher Candidate", email: "fresher@college.edu", phone: "+91 9999999999", website: "" },
      summary: "Recent computer science graduate with strong foundations in algorithms, web development, and cloud databases.",
      skills: ["Python", "Java", "React", "PostgreSQL"],
      experience: [], // No full-time experience
      projects: [
        {
          name: "Campus Event Manager",
          technologies: ["React", "Node.js", "PostgreSQL"],
          duration: "2023 - 2024",
          description: "Built full-stack event registration portal used by 2,000 students across campus."
        },
        {
          name: "Smart Attendance System",
          technologies: ["Python", "OpenCV"],
          duration: "2023",
          description: "Automated student facial recognition attendance with 98% accuracy."
        }
      ],
      education: [
        {
          school: "National Institute of Technology",
          degree: "Bachelor of Technology",
          fieldOfStudy: "Computer Science and Engineering",
          grade: "8.9 CGPA",
          year: "2020 - 2024"
        }
      ]
    };

    const report = validateResumeForExport(fresherResume);
    assert.equal(report.isValid, true, "Fresher resume with projects and education must be valid");
    assert.equal(report.errors.length, 0, "No errors should be triggered for valid fresher resume");

    const html = renderResumeHtml(fresherResume);
    assert.ok(html.includes("Projects"), "Projects section must be rendered");
    assert.ok(html.includes("Campus Event Manager"), "Fresher project must be rendered");
    assert.ok(!html.includes("Work Experience & Internships"), "Empty work experience header should not render");

    const pdfBuffer = await generateResumePdf(fresherResume);
    assert.ok(pdfBuffer.length > 1000, "PDF must compile cleanly for fresher resume");
  });
});
