import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Runs the Python spaCy extractor script and returns extracted entities.
 * The script outputs JSON with arrays: persons, orgs, dates.
 * Gracefully returns empty arrays if Python / spaCy is not installed or fails.
 */
export async function extractEntitiesWithSpaCy(
  text: string
): Promise<{ persons: string[]; orgs: string[]; dates: string[] }> {
  return new Promise((resolve) => {
    try {
      const candidates = [
        path.resolve(process.cwd(), 'scripts', 'spacy_extractor.py'),
        path.resolve(process.cwd(), 'ai-job-agent', 'scripts', 'spacy_extractor.py'),
        path.resolve(__dirname, '../../../../scripts/spacy_extractor.py'),
      ];

      const scriptPath = candidates.find((p) => fs.existsSync(p));

      if (!scriptPath) {
        return resolve({ persons: [], orgs: [], dates: [] });
      }

      const py = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      py.stdout.on('data', (data) => (stdout += data.toString()));
      py.stderr.on('data', (data) => (stderr += data.toString()));

      py.on('error', () => {
        // Python executable not found or process spawn error
        resolve({ persons: [], orgs: [], dates: [] });
      });

      py.on('close', (code) => {
        if (code !== 0) {
          return resolve({ persons: [], orgs: [], dates: [] });
        }
        try {
          const result = JSON.parse(stdout);
          resolve({
            persons: Array.isArray(result.persons) ? result.persons : [],
            orgs: Array.isArray(result.orgs) ? result.orgs : [],
            dates: Array.isArray(result.dates) ? result.dates : [],
          });
        } catch {
          resolve({ persons: [], orgs: [], dates: [] });
        }
      });

      py.stdin.write(text);
      py.stdin.end();
    } catch {
      resolve({ persons: [], orgs: [], dates: [] });
    }
  });
}
