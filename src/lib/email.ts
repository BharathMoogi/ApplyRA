/**
 * Email notification utility using Resend.
 * Sends a branded application confirmation email to the user.
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApplicationEmail({
  toEmail,
  userName,
  jobTitle,
  company,
  location,
  salary,
  atsScore,
  jobUrl,
}: {
  toEmail: string;
  userName: string;
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  atsScore: number;
  jobUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email notification.");
    return;
  }

  const firstName = userName?.split(" ")[0] || "there";
  // Use verified Resend account email if RESEND_TO_EMAIL is set, otherwise use user email
  const recipientEmail = process.env.RESEND_TO_EMAIL || toEmail;

  const result = await resend.emails.send({
    from: "Applyra Agent <onboarding@resend.dev>",
    to: recipientEmail,
    subject: `✅ Applied: ${jobTitle} at ${company} — for ${toEmail}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Application Submitted</title>
</head>
<body style="margin:0;padding:0;background:#0f0f12;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f12;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#18181f;border-radius:16px;overflow:hidden;border:1px solid #2a2a3a;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);font-weight:600;letter-spacing:2px;text-transform:uppercase;">Applyra AI Agent</p>
                    <h1 style="margin:8px 0 0;font-size:26px;color:#ffffff;font-weight:800;">Application Submitted! 🎉</h1>
                  </td>
                  <td align="right">
                    <div style="background:rgba(255,255,255,0.15);border-radius:50%;width:52px;height:52px;text-align:center;line-height:52px;font-size:24px;">✅</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 24px;font-size:15px;color:#a1a1b5;line-height:1.6;">
                Hi <strong style="color:#e5e5f7;">${firstName}</strong>, your AI Agent has successfully applied on your behalf!
              </p>

              <!-- Job Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1e2e;border-radius:12px;border:1px solid #2a2a3a;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;color:#6366f1;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Position Applied</p>
                    <h2 style="margin:0 0 4px;font-size:20px;color:#ffffff;font-weight:700;">${jobTitle}</h2>
                    <p style="margin:0 0 16px;font-size:14px;color:#8b8ba7;">${company}</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%">
                          <p style="margin:0 0 4px;font-size:10px;color:#5c5c7a;text-transform:uppercase;font-weight:600;">📍 Location</p>
                          <p style="margin:0;font-size:13px;color:#c4c4d8;">${location}</p>
                        </td>
                        <td width="50%">
                          <p style="margin:0 0 4px;font-size:10px;color:#5c5c7a;text-transform:uppercase;font-weight:600;">💰 Salary</p>
                          <p style="margin:0;font-size:13px;color:#c4c4d8;">${salary}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ATS Score Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(16,185,129,0.05));border:1px solid rgba(16,185,129,0.2);border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0 0 2px;font-size:11px;color:#10b981;text-transform:uppercase;font-weight:700;letter-spacing:1px;">ATS Resume Match Score</p>
                          <p style="margin:0;font-size:13px;color:#a1a1b5;">Your resume was optimized to match this job's requirements</p>
                        </td>
                        <td align="right">
                          <div style="background:#10b981;color:#fff;font-weight:800;font-size:20px;border-radius:8px;padding:6px 14px;">${atsScore}%</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${jobUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 24px;border-radius:8px;margin-right:12px;">View Job Posting →</a>
                    <a href="https://apply-ra.vercel.app/applications" style="display:inline-block;background:#1e1e2e;border:1px solid #2a2a3a;color:#a1a1b5;text-decoration:none;font-weight:600;font-size:13px;padding:12px 24px;border-radius:8px;">Track Applications</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #2a2a3a;">
              <p style="margin:0;font-size:11px;color:#3a3a52;text-align:center;">
                This email was sent by your <strong style="color:#6366f1;">Applyra AI Agent</strong>. You can manage your notification preferences in
                <a href="https://apply-ra.vercel.app/settings" style="color:#6366f1;text-decoration:none;">Settings</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  // Resend SDK returns error object instead of throwing — check and throw manually
  if (result.error) {
    throw new Error(`Resend API error: ${result.error.message} (${result.error.name})`);
  }
}
