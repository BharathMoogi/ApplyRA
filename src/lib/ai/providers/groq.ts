import Groq from 'groq-sdk';
import { 
  AIProvider, 
  AIGenerateTextOptions, 
  AIGenerateObjectOptions, 
  AIResponse, 
  AIStreamTextResult 
} from '../types';

// Tested and verified ultra-low-latency models active on Groq (170-500ms)
const CANDIDATE_GROQ_MODELS = [
  process.env.GROQ_MODEL,
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b'
].filter(Boolean) as string[];

export class GroqProvider implements AIProvider {
  readonly name = 'groq';
  private client: Groq | null = null;

  private getClient(): Groq {
    if (this.client) return this.client;
    
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GROQ_API_KEY environment variable.");
    }
    
    this.client = new Groq({ apiKey });
    return this.client;
  }

  private async executeWithRetry<T>(
    operation: (attempt: number) => Promise<T>,
    maxRetries = 2,
    initialDelay = 500
  ): Promise<{ data: T; retries: number }> {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const data = await operation(attempt);
        return { data, retries: attempt };
      } catch (error: any) {
        attempt++;
        
        // Never retry client/model errors (400 decommissioned, 404 not found, 401 auth)
        if (error.status === 400 || error.status === 404 || error.status === 401 || error.code === 'model_not_found' || error.code === 'model_decommissioned') {
          throw error;
        }

        console.warn(`[AI Groq Provider] Attempt ${attempt} failed: ${error.message || error}`);
        
        if (attempt > maxRetries) {
          throw error;
        }

        let delay = initialDelay * Math.pow(2, attempt);
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after'];
          if (retryAfter) {
            const seconds = parseFloat(retryAfter);
            if (!isNaN(seconds)) {
              delay = Math.ceil(seconds * 1000);
            }
          }
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max retries exceeded");
  }

  async generateText(options: AIGenerateTextOptions): Promise<AIResponse<string>> {
    const startTime = Date.now();
    const modelsToTry = options.model ? [options.model] : CANDIDATE_GROQ_MODELS;
    const timeout = options.timeoutMs || 20000;
    let lastError: any = null;

    const client = this.getClient();

    for (const model of modelsToTry) {
      try {
        console.log(`[AI Groq Provider] Attempting generateText with model: ${model}`);
        const { data, retries } = await this.executeWithRetry(
          async () => {
            return client.chat.completions.create({
              model,
              max_tokens: options.maxTokens || 4000,
              temperature: options.temperature ?? 0.7,
              messages: [
                ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
                { role: 'user' as const, content: options.prompt }
              ],
            }, {
              timeout,
            });
          },
          1
        );

        const text = data.choices[0]?.message?.content || '';
        const latencyMs = Date.now() - startTime;

        return {
          success: true,
          data: text,
          metadata: {
            model,
            tokensUsed: data.usage?.total_tokens,
            latencyMs,
            retries,
          }
        };
      } catch (error: any) {
        lastError = error;
        console.warn(`[AI Groq Provider] Model ${model} failed: ${error.message || error}`);
      }
    }

    console.error('[AI Groq Provider] generateText failed across all candidate models:', lastError);
    return {
      success: false,
      data: '',
      error: lastError?.message || String(lastError),
      metadata: {
        model: modelsToTry[0],
        latencyMs: Date.now() - startTime,
      }
    };
  }

  async generateObject<T>(options: AIGenerateObjectOptions): Promise<AIResponse<T>> {
    const startTime = Date.now();
    const modelsToTry = options.model ? [options.model] : CANDIDATE_GROQ_MODELS;
    const timeout = options.timeoutMs || 25000;
    let lastError: any = null;

    const client = this.getClient();

    for (const model of modelsToTry) {
      try {
        console.log(`[AI Groq Provider] Attempting generateObject with model: ${model}`);

        const enhancedPrompt = `
${options.prompt}

Return ONLY a valid JSON object matching the requested schema.
Do not include any markdown prefix/suffix or backticks.
        `.trim();

        const { data, retries } = await this.executeWithRetry(
          async () => {
            return client.chat.completions.create({
              model,
              max_tokens: options.maxTokens || 4000,
              temperature: options.temperature ?? 0.2,
              response_format: { type: "json_object" },
              messages: [
                { role: 'system' as const, content: options.systemPrompt || "You are a precise JSON generator. Output valid JSON matching the requested schema." },
                { role: 'user' as const, content: enhancedPrompt }
              ],
            }, {
              timeout,
            });
          },
          1
        );

        const rawText = data.choices[0]?.message?.content || '{}';
        const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/g, '').trim();
        const parsed = JSON.parse(cleaned);
        const validated = options.schema.parse(parsed);
        const latencyMs = Date.now() - startTime;

        console.log(`[AI Groq Provider] Success with ${model} in ${latencyMs}ms!`);

        return {
          success: true,
          data: validated as T,
          metadata: {
            model,
            tokensUsed: data.usage?.total_tokens,
            latencyMs,
            retries,
          }
        };
      } catch (error: any) {
        lastError = error;
        console.warn(`[AI Groq Provider] Model ${model} failed generateObject: ${error.message || error}`);
      }
    }

    console.error('[AI Groq Provider] generateObject failed across all candidate models:', lastError);
    return {
      success: false,
      data: {} as T,
      error: lastError?.message || String(lastError),
      metadata: {
        model: modelsToTry[0],
        latencyMs: Date.now() - startTime,
      }
    };
  }

  async streamText(options: AIGenerateTextOptions): Promise<AIResponse<AIStreamTextResult>> {
    const model = options.model || CANDIDATE_GROQ_MODELS[0];
    const timeout = options.timeoutMs || 30000;

    try {
      const client = this.getClient();
      const abortController = new AbortController();

      const stream = new ReadableStream<string>({
        async start(controller) {
          try {
            const rawStream = await client.chat.completions.create({
              model,
              max_tokens: options.maxTokens || 4000,
              temperature: options.temperature ?? 0.7,
              messages: [
                ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
                { role: 'user' as const, content: options.prompt }
              ],
              stream: true,
            }, {
              signal: abortController.signal,
              timeout,
            });

            for await (const chunk of rawStream) {
              const text = chunk.choices[0]?.delta?.content || '';
              if (text) {
                controller.enqueue(text);
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
        cancel() {
          abortController.abort();
        }
      });

      return {
        success: true,
        data: {
          stream,
          cancel: () => abortController.abort(),
        },
        metadata: {
          model,
        }
      };
    } catch (error: any) {
      console.error('[AI Groq Provider] streamText failed:', error);
      return {
        success: false,
        data: {
          stream: new ReadableStream(),
          cancel: () => {},
        },
        error: error.message || String(error),
        metadata: {
          model,
        }
      };
    }
  }
}
