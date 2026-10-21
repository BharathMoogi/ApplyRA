import pdfMake from "pdfmake";
import htmlToPdfmake from "html-to-pdfmake";
import { JSDOM } from "jsdom";
import { type StructuredResumeData } from "@/actions/resumes";

export function renderResumeHtml(data: StructuredResumeData): string {
  const p = data.personal || { name: "", email: "", phone: "", website: "" };
  
  // Format contacts
  const contacts = [
    p.email ? `<a href="mailto:${p.email}">${p.email}</a>` : "",
    p.phone ? p.phone : "",
    p.location ? p.location : "",
    p.linkedin ? `<a href="${p.linkedin}">LinkedIn</a>` : "",
    p.github ? `<a href="${p.github}">GitHub</a>` : "",
    p.portfolio ? `<a href="${p.portfolio}">Portfolio</a>` : "",
    p.website ? `<a href="${p.website}">${p.website.replace(/^https?:\/\//, "")}</a>` : ""
  ].filter(Boolean).join(" | ");

  let html = `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.35; font-size: 9.5px;">
      <!-- 1. Header Contact Information -->
      <div style="text-align: center; margin-bottom: 10px;">
        <h1 style="color: #0f172a; font-size: 20px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">${p.name || "Candidate"}</h1>
        <div style="color: #475569; font-size: 8.5px; margin-bottom: 4px;">${contacts}</div>
      </div>
  `;

  // 2. Professional Summary
  if (data.summary && data.summary.trim()) {
    html += `
      <!-- Summary -->
      <div style="margin-bottom: 10px;">
        <h2 style="font-size: 10.5px; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 1px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Professional Summary</h2>
        <p style="margin: 0; line-height: 1.35; text-align: justify; color: #334155;">${data.summary.trim()}</p>
      </div>
    `;
  }

  // 3. Technical Skills (Categorized by type)
  const cat = data.categorizedSkills;
  const hasCategorized = cat && (
    (cat.languages && cat.languages.length > 0) ||
    (cat.frameworks && cat.frameworks.length > 0) ||
    (cat.databases && cat.databases.length > 0) ||
    (cat.tools && cat.tools.length > 0) ||
    (cat.cloud && cat.cloud.length > 0)
  );

  if (hasCategorized || (data.skills && data.skills.length > 0)) {
    html += `
      <!-- Technical Skills -->
      <div style="margin-bottom: 10px;">
        <h2 style="font-size: 10.5px; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 1px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Technical Skills</h2>
        <div style="margin: 0; line-height: 1.4; color: #334155;">
    `;

    if (hasCategorized && cat) {
      if (cat.languages && cat.languages.length > 0) {
        html += `<div style="margin-bottom: 1px;"><strong>Languages:</strong> ${cat.languages.join(", ")}</div>`;
      }
      if (cat.frameworks && cat.frameworks.length > 0) {
        html += `<div style="margin-bottom: 1px;"><strong>Frameworks & Libraries:</strong> ${cat.frameworks.join(", ")}</div>`;
      }
      if (cat.databases && cat.databases.length > 0) {
        html += `<div style="margin-bottom: 1px;"><strong>Databases:</strong> ${cat.databases.join(", ")}</div>`;
      }
      const toolsAndCloud = [
        ...(cat.tools || []),
        ...(cat.cloud || [])
      ];
      if (toolsAndCloud.length > 0) {
        html += `<div style="margin-bottom: 1px;"><strong>Tools & Cloud:</strong> ${[...new Set(toolsAndCloud)].join(", ")}</div>`;
      }
      if (cat.other && cat.other.length > 0) {
        html += `<div style="margin-bottom: 1px;"><strong>Core Concepts:</strong> ${cat.other.join(", ")}</div>`;
      }
    } else if (data.skills && data.skills.length > 0) {
      html += `<div><strong>Skills:</strong> ${data.skills.join(", ")}</div>`;
    }

    html += `
        </div>
      </div>
    `;
  }

  // 4. Work Experience & Internships
  if (data.experience && data.experience.length > 0) {
    html += `
      <!-- Experience -->
      <div style="margin-bottom: 10px;">
        <h2 style="font-size: 10.5px; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 1px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Work Experience & Internships</h2>
    `;
    
    data.experience.forEach((exp) => {
      const locationStr = exp.location ? `, ${exp.location}` : "";
      const empTypeStr = exp.employmentType ? ` (${exp.employmentType})` : "";

      // Extract and clean bullets
      const bullets = (exp.description || "")
        .split("\n")
        .map((b) => b.replace(/^[-*•·–—\d.]+\s*/, '').trim())
        .filter(Boolean);

      const listItems = bullets.length > 0
        ? `<ul style="margin: 2px 0 0 0; padding-left: 14px;">${bullets.map(b => `<li style="margin-bottom: 2px; line-height: 1.35; color: #334155;">${b}</li>`).join("")}</ul>`
        : "";

      html += `
        <div style="margin-bottom: 7px; page-break-inside: avoid;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 1px;">
            <tr>
              <td style="font-weight: bold; font-size: 9.5px; color: #0f172a; text-align: left;">${exp.role || "Role"}</td>
              <td style="font-size: 8.5px; color: #64748b; text-align: right; font-weight: bold;">${exp.duration || ""}</td>
            </tr>
            <tr>
              <td style="font-style: italic; font-size: 8.5px; color: #475569; text-align: left;">${exp.company || ""}${locationStr}${empTypeStr}</td>
              <td></td>
            </tr>
          </table>
          ${listItems}
        </div>
      `;
    });
    
    html += `</div>`;
  }

  // 5. Projects
  if (data.projects && data.projects.length > 0) {
    html += `
      <!-- Projects -->
      <div style="margin-bottom: 10px;">
        <h2 style="font-size: 10.5px; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 1px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Projects</h2>
    `;

    data.projects.forEach((proj) => {
      const techStr = proj.technologies && proj.technologies.length > 0
        ? ` | <span style="font-weight: normal; color: #475569; font-size: 8.5px;">Tech Stack: ${proj.technologies.join(", ")}</span>`
        : "";

      const links = [
        proj.githubUrl ? `<a href="${proj.githubUrl}">Code</a>` : "",
        proj.liveUrl ? `<a href="${proj.liveUrl}">Live Demo</a>` : ""
      ].filter(Boolean).join(" | ");
      const linksStr = links ? ` [${links}]` : "";

      const projBullets = (proj.description || "")
        .split("\n")
        .map((b) => b.replace(/^[-*•·–—\d.]+\s*/, '').trim())
        .filter(Boolean);

      const listItems = projBullets.length > 0
        ? `<ul style="margin: 2px 0 0 0; padding-left: 14px;">${projBullets.map(b => `<li style="margin-bottom: 2px; line-height: 1.35; color: #334155;">${b}</li>`).join("")}</ul>`
        : "";

      html += `
        <div style="margin-bottom: 6px; page-break-inside: avoid;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 1px;">
            <tr>
              <td style="font-weight: bold; font-size: 9.5px; color: #0f172a; text-align: left;">
                ${proj.name || "Project"}${techStr}${linksStr}
              </td>
              <td style="font-size: 8.5px; color: #64748b; text-align: right; font-weight: bold;">
                ${proj.duration || ""}
              </td>
            </tr>
          </table>
          ${listItems}
        </div>
      `;
    });

    html += `</div>`;
  }

  // 6. Education
  if (data.education && data.education.length > 0) {
    html += `
      <!-- Education -->
      <div style="margin-bottom: 10px;">
        <h2 style="font-size: 10.5px; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 1px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Education</h2>
    `;

    data.education.forEach((edu) => {
      const fieldStr = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : "";
      const gradeStr = edu.grade ? ` (GPA/Marks: ${edu.grade})` : "";
      const courseworkStr = edu.coursework && edu.coursework.length > 0
        ? `<div style="font-size: 8px; color: #475569; margin-top: 1px;">Relevant Coursework: ${edu.coursework.join(", ")}</div>`
        : "";

      html += `
        <div style="margin-bottom: 5px; page-break-inside: avoid;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="font-weight: bold; font-size: 9.5px; color: #0f172a; text-align: left;">${edu.school || "University"}</td>
              <td style="font-size: 8.5px; color: #64748b; text-align: right; font-weight: bold;">${edu.year || ""}</td>
            </tr>
            <tr>
              <td style="font-style: italic; font-size: 8.5px; color: #475569; text-align: left;">${edu.degree || ""}${fieldStr}${gradeStr}</td>
              <td></td>
            </tr>
          </table>
          ${courseworkStr}
        </div>
      `;
    });

    html += `</div>`;
  }

  // 7. Certifications & Achievements (when available)
  const hasCerts = data.certifications && data.certifications.length > 0;
  const hasAchs = data.achievements && data.achievements.length > 0;

  if (hasCerts || hasAchs) {
    html += `
      <!-- Certifications and Achievements -->
      <div style="margin-bottom: 10px;">
        <h2 style="font-size: 10.5px; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 1px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Certifications & Achievements</h2>
        <ul style="margin: 2px 0 0 0; padding-left: 14px;">
    `;

    if (hasCerts && data.certifications) {
      data.certifications.forEach(cert => {
        const dateStr = cert.issueDate ? ` (${cert.issueDate})` : "";
        const urlStr = cert.credentialUrl ? ` - <a href="${cert.credentialUrl}">Credential</a>` : "";
        html += `<li style="margin-bottom: 2px; line-height: 1.35; color: #334155;"><strong>${cert.name}</strong> - ${cert.issuer}${dateStr}${urlStr}</li>`;
      });
    }

    if (hasAchs && data.achievements) {
      data.achievements.forEach(ach => {
        const dateStr = ach.date ? ` (${ach.date})` : "";
        html += `<li style="margin-bottom: 2px; line-height: 1.35; color: #334155;"><strong>${ach.title}</strong> [${ach.category}]${dateStr}: ${ach.description}</li>`;
      });
    }

    html += `
        </ul>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique"
  }
};

export async function generateResumePdf(data: StructuredResumeData): Promise<Buffer> {
  const dom = new JSDOM("");
  const window = dom.window;

  const html = renderResumeHtml(data);
  const content = htmlToPdfmake(html, { window });

  const pdfMakeInstance = pdfMake as any;
  pdfMakeInstance.setFonts(fonts);

  const docDefinition = {
    content: content,
    defaultStyle: {
      font: "Helvetica",
      fontSize: 9.5,
      lineHeight: 1.25
    },
    pageMargins: [36, 36, 36, 36]
  };

  const pdfDoc = pdfMakeInstance.createPdf(docDefinition);
  return await pdfDoc.getBuffer();
}
