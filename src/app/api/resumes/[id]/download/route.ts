import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResumePdf } from "@/lib/pdf/generator";
import { validateResumeForExport } from "@/lib/pdf/validator";
import { type StructuredResumeData } from "@/actions/resumes";

export const maxDuration = 60;
export const preferredRegion = "syd1";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    // Fetch resume from DB
    const resume = await prisma.resume.findUnique({
      where: { id }
    });

    if (!resume || !resume.content) {
      return new NextResponse("Resume not found", { status: 404 });
    }

    const structuredData: StructuredResumeData = JSON.parse(resume.content);

    // Pre-export validation check
    const report = validateResumeForExport(structuredData);
    if (!report.isValid) {
      console.warn(`[Resume Export] Validation issues for resume ${id}:`, report.errors);
    }
    
    // Generate PDF
    const pdfBuffer = await generateResumePdf(structuredData);

    // Return response streaming PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${resume.title.replace(/[^a-z0-9]/gi, "_")}.pdf"`,
      }
    });
  } catch (error: any) {
    console.error("Error generating resume PDF:", error);
    return new NextResponse(`Error generating PDF: ${error.message}`, { status: 500 });
  }
}
