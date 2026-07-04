import Groq from 'groq-sdk';
import { 
  AIProvider, 
  AIGenerateTextOptions, 
  AIGenerateObjectOptions, 
  AIResponse, 
  AIStreamTextResult 
} from '../types';

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
    maxRetries = 3,
    initialDelay = 1000
  ): Promise<{ data: T; retries: number }> {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const data = await operation(attempt);
        return { data, retries: attempt };
      } catch (error: any) {
        attempt++;
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
              console.log(`[AI Groq Provider] Rate limited (429). Retrying after ${seconds}s based on header.`);
            }
          } else {
            console.log(`[AI Groq Provider] Rate limited (429). Retrying with backoff delay of ${delay}ms.`);
          }
        } else {
          console.log(`[AI Groq Provider] Retrying in ${delay}ms...`);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max retries exceeded");
  }

  async generateText(options: AIGenerateTextOptions): Promise<AIResponse<string>> {
    const startTime = Date.now();
    const model = options.model || 'llama-3.3-70b-versatile';
    const timeout = options.timeoutMs || 30000;

    try {
      const client = this.getClient();
      
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
        options.maxRetries ?? 3
      );

      const text = data.choices[0]?.message?.content || '';
      const latencyMs = Date.now() - startTime;

      console.log(`[AI Groq Provider] Text generation successful. Latency: ${latencyMs}ms. Retries: ${retries}`);

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
      console.error('[AI Groq Provider] generateText failed:', error);
      return {
        success: false,
        data: '',
        error: error.message || String(error),
        metadata: {
          model,
          latencyMs: Date.now() - startTime,
        }
      };
    }
  }

  async generateObject<T>(options: AIGenerateObjectOptions): Promise<AIResponse<T>> {
    const startTime = Date.now();
    const model = options.model || 'llama-3.3-70b-versatile';
    const timeout = options.timeoutMs || 30000;
    const maxValidationRetries = options.maxRetries || 3;

    let validationAttempt = 0;
    let lastErrorFeedback = '';

    while (validationAttempt <= maxValidationRetries) {
      const enhancedPrompt = `
        ${options.prompt}
        
        Return ONLY a valid JSON object matching the requested schema. 
        Do not include any conversational prefix/suffix or markdown styling.

        ${lastErrorFeedback ? `\n\nCRITICAL: Your previous response failed validation with error: "${lastErrorFeedback}". Please correct this in your new JSON output.` : ''}
      `;

      try {
        const client = this.getClient();
        
        const { data, retries } = await this.executeWithRetry(
          async () => {
            return client.chat.completions.create({
              model,
              max_tokens: options.maxTokens || 4000,
              temperature: options.temperature ?? 0.3,
              response_format: { type: "json_object" },
              messages: [
                { role: 'system' as const, content: options.systemPrompt || "You are a precise JSON generator. Output valid JSON matching the requested schema." },
                { role: 'user' as const, content: enhancedPrompt }
              ],
            }, {
              timeout,
            });
          },
          3
        );

        const text = data.choices[0]?.message?.content || '';
        const parsed = JSON.parse(text);
        const validated = options.schema.parse(parsed);
        const latencyMs = Date.now() - startTime;

        return {
          success: true,
          data: validated as T,
          metadata: {
            model,
            tokensUsed: data.usage?.total_tokens,
            latencyMs,
            retries: validationAttempt + retries,
          }
        };
      } catch (error: any) {
        validationAttempt++;
        lastErrorFeedback = error.message || String(error);
        console.warn(`[AI Groq Provider] JSON generation/validation attempt ${validationAttempt} failed: ${lastErrorFeedback}`);
        
        if (validationAttempt > maxValidationRetries) {
          return {
            success: false,
            data: {} as T,
            error: `Groq JSON validation failed after ${maxValidationRetries} correction attempts. Last error: ${lastErrorFeedback}`,
            metadata: {
              model,
              latencyMs: Date.now() - startTime,
            }
          };
        }
        
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    throw new Error("Validation loop exited unexpectedly");
  }

  async streamText(options: AIGenerateTextOptions): Promise<AIResponse<AIStreamTextResult>> {
    const model = options.model || 'llama-3.3-70b-versatile';
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
