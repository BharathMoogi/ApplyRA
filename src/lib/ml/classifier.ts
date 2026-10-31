/**
 * Secure HTTP client for the Python FastAPI occupation classifier.
 * Reads OCCUPATION_API_URL + OCCUPATION_API_KEY from server-side env vars only.
 * Returns gracefully if the API is unconfigured or unavailable.
 */

export interface OccupationPrediction {
  label: string;
  score: number;
}

export interface ClassificationResult {
  predictedOccupation: string;
  confidence: number;
  topPredictions: OccupationPrediction[];
}

export type ClassifierResponse =
  | { success: true; data: ClassificationResult }
  | { success: false; error: string; notConfigured?: boolean };

export async function classifyResumeOccupation(
  text: string
): Promise<ClassifierResponse> {
  const apiUrl = process.env.OCCUPATION_API_URL;
  const apiKey = process.env.OCCUPATION_API_KEY;

  if (!apiUrl || apiUrl.trim() === "") {
    return {
      success: false,
      error: "ML API not configured",
      notConfigured: true,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const response = await fetch(
      `${apiUrl.replace(/\/$/, "")}/predict`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ text: text.slice(0, 8000) }), // truncate to avoid oversized payloads
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        success: false,
        error: `API error ${response.status}: ${body}`,
      };
    }

    const json = await response.json();

    return {
      success: true,
      data: {
        predictedOccupation: json.predicted_occupation ?? "",
        confidence:
          typeof json.confidence === "number" ? json.confidence : 0,
        topPredictions: Array.isArray(json.top_predictions)
          ? json.top_predictions.map((p: { label?: unknown; score?: unknown }) => ({
              label: String(p.label ?? ""),
              score: typeof p.score === "number" ? p.score : 0,
            }))
          : [],
      },
    };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const error = err as { name?: string; message?: string };
    const msg =
      error?.name === "AbortError"
        ? "ML API request timed out"
        : error?.message ?? String(err);
    return { success: false, error: msg };
  }
}
