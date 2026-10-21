const fs = require("fs");
const path = require("path");
const pdfMake = require("pdfmake");
const htmlToPdfmake = require("html-to-pdfmake");
const { JSDOM } = require("jsdom");

async function testPdf() {
  const dom = new JSDOM("");
  const window = dom.window;

  const html = `
    <div style="font-family: Helvetica; color: #333333; padding: 20px;">
      <h1 style="color: #0284c7; font-size: 24px; text-align: center; margin-bottom: 2px;">John Doe</h1>
      <p style="text-align: center; font-size: 10px; color: #666666; margin-bottom: 10px;">
        john.doe@email.com | +1 (123) 456-7890 | linkedin.com/in/johndoe | SF, CA
      </p>
      
      <h2 style="font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; color: #0284c7; margin-top: 15px;">Professional Summary</h2>
      <p style="font-size: 10px; line-height: 1.4;">
        A highly motivated Frontend Engineer with 5+ years of experience building beautiful web applications.
      </p>
      
      <h2 style="font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; color: #0284c7; margin-top: 15px;">Work Experience</h2>
      <div style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between;">
          <strong>Senior Frontend Engineer</strong>
          <span>2022 - Present</span>
        </div>
        <div><em>Vercel, San Francisco, CA</em></div>
        <p style="font-size: 10px; line-height: 1.4; margin-top: 2px;">
          - Developed new features for the Vercel Dashboard using Next.js, React, and TypeScript.<br>
          - Optimized page rendering performance, reducing load times by 20%.
        </p>
      </div>
      
      <h2 style="font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; color: #0284c7; margin-top: 15px;">Skills</h2>
      <p style="font-size: 10px;">
        <strong>Languages:</strong> TypeScript, JavaScript, HTML, CSS, Python<br>
        <strong>Frameworks:</strong> React, Next.js, Node.js, Tailwind CSS
      </p>
    </div>
  `;

  const content = htmlToPdfmake(html, { window });

  const fonts = {
    Helvetica: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique"
    }
  };

  pdfMake.setFonts(fonts);

  const docDefinition = {
    content: content,
    defaultStyle: {
      font: "Helvetica"
    }
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  await pdfDoc.write(path.join(process.cwd(), "test.pdf"));
  console.log("PDF generated successfully!");
}

testPdf().catch(console.error);
