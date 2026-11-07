import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result: any = {
    groqModels: [],
    geminiModels: [],
    errors: {}
  };

  // 1. Groq models
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const list = await groq.models.list();
      result.groqModels = list.data.map(m => m.id);
    } catch (err: any) {
      result.errors.groq = err.message;
    }
  }

  // 2. Gemini models
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      const data = await res.json();
      if (data.models) {
        result.geminiModels = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace('models/', ''));
      } else {
        result.errors.gemini = data;
      }
    } catch (err: any) {
      result.errors.gemini = err.message;
    }
  }

  return NextResponse.json(result);
}
