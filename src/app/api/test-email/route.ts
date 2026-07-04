import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }
  const resend = new Resend(apiKey);
  try {
    const result = await resend.emails.send({
      from: "Applyra Agent <onboarding@resend.dev>",
      to: process.env.RESEND_TO_EMAIL || "bharathmoog143@gmail.com",
      subject: "✅ Test: Applyra Email Notification",
      html: "<h1>Email test successful!</h1><p>Your Applyra email notifications are working correctly.</p>",
    });
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, details: err }, { status: 500 });
  }
}
