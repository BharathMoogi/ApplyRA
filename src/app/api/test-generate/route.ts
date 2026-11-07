import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TestSchema = z.object({
  summary: z.string(),
  skills: z.array(z.string())
});

export async function GET() {
  const results: any = {};

  // 1. Test Groq models
  if (process.env.GROQ_API_KEY) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    for (const model of ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']) {
      const t0 = Date.now();
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'Output valid JSON matching: {"summary": string, "skills": string[]}' },
            { role: 'user', content: 'Software engineer with Python and React.' }
          ],
          response_format: { type: 'json_object' }
        }, { timeout: 15000 });
        const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
        results[`groq:${model}`] = { success: true, latencyMs: Date.now() - t0, data: parsed };
      } catch (err: any) {
        results[`groq:${model}`] = { success: false, latencyMs: Date.now() - t0, error: err.message };
      }
    }
  }

  // 2. Test Gemini models
  for (const model of ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest']) {
    const t0 = Date.now();
    try {
      const res = await generateObject({
        model: google(model),
        schema: TestSchema,
        prompt: 'Software engineer with Python and React.',
        abortSignal: AbortSignal.timeout(15000)
      });
      results[`gemini:${model}`] = { success: true, latencyMs: Date.now() - t0, data: res.object };
    } catch (err: any) {
      results[`gemini:${model}`] = { success: false, latencyMs: Date.now() - t0, error: err.message };
    }
  }

  return NextResponse.json(results);
}
