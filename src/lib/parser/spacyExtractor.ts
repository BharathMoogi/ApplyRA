import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Runs the Python spaCy extractor script and returns extracted entities.
 * The script outputs JSON with arrays: persons, orgs, dates.
 * 
 * Safety & Serverless Guarantees:
 * - In serverless environments (Vercel, AWS Lambda), Python/spaCy binaries are not present.
 *   Returns immediately without spawning or hanging.
 * - Enforces a strict 1.2s timeout so it NEVER causes 504 Gateway Timeouts.
 * - Safe error handling on stdin stream and child process.
 */
export async function extractEntitiesWithSpaCy(
  text: string
): Promise<{ persons: string[]; orgs: string[]; dates: string[] }> {
  // Never attempt to spawn Python in Vercel Serverless environments
  if (process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION) {
    return { persons: [], orgs: [], dates: [] };
  }

  return new Promise((resolve) => {
    let isSettled = false;
    let pyProcess: ReturnType<typeof spawn> | null = null;

    const safeResolve = (data: { persons: string[]; orgs: string[]; dates: string[] }) => {
      if (!isSettled) {
        isSettled = true;
        resolve(data);
      }
    };

    // Strict 1200ms timeout
    const timeout = setTimeout(() => {
      try {
        if (pyProcess) {
          pyProcess.kill();
        }
      } catch {}
      safeResolve({ persons: [], orgs: [], dates: [] });
    }, 1200);

    try {
      const candidates = [
        path.resolve(process.cwd(), 'scripts', 'spacy_extractor.py'),
        path.resolve(process.cwd(), 'ai-job-agent', 'scripts', 'spacy_extractor.py'),
        path.resolve(__dirname, '../../../../scripts/spacy_extractor.py'),
      ];

      const scriptPath = candidates.find((p) => fs.existsSync(p));

      if (!scriptPath) {
        clearTimeout(timeout);
        return safeResolve({ persons: [], orgs: [], dates: [] });
      }

      pyProcess = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';

      pyProcess.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      pyProcess.stdin?.on('error', () => {
        clearTimeout(timeout);
        safeResolve({ persons: [], orgs: [], dates: [] });
      });

      pyProcess.on('error', () => {
        clearTimeout(timeout);
        safeResolve({ persons: [], orgs: [], dates: [] });
      });

      pyProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          return safeResolve({ persons: [], orgs: [], dates: [] });
        }
        try {
          const result = JSON.parse(stdout);
          safeResolve({
            persons: Array.isArray(result.persons) ? result.persons : [],
            orgs: Array.isArray(result.orgs) ? result.orgs : [],
            dates: Array.isArray(result.dates) ? result.dates : [],
          });
        } catch {
          safeResolve({ persons: [], orgs: [], dates: [] });
        }
      });

      // Pass first 5000 characters to prevent excessive processing overhead
      const truncatedText = text.slice(0, 5000);
      pyProcess.stdin?.write(truncatedText);
      pyProcess.stdin?.end();
    } catch {
      clearTimeout(timeout);
      safeResolve({ persons: [], orgs: [], dates: [] });
    }
  });
}
