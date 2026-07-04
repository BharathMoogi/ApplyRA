import Anthropic from '@anthropic-ai/sdk';
import { 
  AIProvider, 
  AIGenerateTextOptions, 
  AIGenerateObjectOptions, 
  AIResponse, 
  AIStreamTextResult 
} from '../types';

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (this.client) return this.client;
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY environment variable.");
    }
    
    this.client = new Anthropic({ apiKey });
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
        console.warn(`[AI Claude Provider] Attempt ${attempt} failed: ${error.message || error}`);
        
        if (attempt > maxRetries) {
          throw error;
        }

        let delay = initialDelay * Math.pow(2, attempt);
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after'];
          if (retryAfter) {
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds)) {
              delay = seconds * 1000;
              console.log(`[AI Claude Provider] Rate limited (429). Retrying after ${seconds}s based on header.`);
            }
          } else {
            console.log(`[AI Claude Provider] Rate limited (429). Retrying with backoff delay of ${delay}ms.`);
          }
        } else {
          console.log(`[AI Claude Provider] Retrying in ${delay}ms...`);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max retries exceeded");
  }

  async generateText(options: AIGenerateTextOptions): Promise<AIResponse<string>> {
    const startTime = Date.now();
    const model = options.model || 'claude-3-5-sonnet-latest';
    const timeout = options.timeoutMs || 30000;

    try {
      const client = this.getClient();
      
      const { data, retries } = await this.executeWithRetry(
        async () => {
          return client.messages.create({
            model,
            max_tokens: options.maxTokens || 4000,
            temperature: options.temperature ?? 0.7,
            system: options.systemPrompt,
            messages: [{ role: 'user', content: options.prompt }],
          }, {
            timeout,
          });
        },
        options.maxRetries ?? 3
      );

      const text = data.content[0].type === 'text' ? data.content[0].text : '';
      const latencyMs = Date.now() - startTime;

      console.log(`[AI Claude Provider] Text generation successful. Latency: ${latencyMs}ms. Retries: ${retries}`);

      return {
        success: true,
        data: text,
        metadata: {
          model,
          tokensUsed: data.usage?.input_tokens ? (data.usage.input_tokens + (data.usage.output_tokens || 0)) : undefined,
          latencyMs,
          retries,
        }
      };
    } catch (error: any) {
      console.error('[AI Claude Provider] generateText failed:', error);
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
    const model = options.model || 'claude-3-5-sonnet-latest';
    
    const enhancedPrompt = `
      ${options.prompt}
      
      Return ONLY a valid JSON object matching the requested schema. 
      Do not wrap your response in markdown formatting or code blocks like \`\`\`json.
      Do not include any preachy text, explanations, or conversational prefix/suffix.
    `;

    const systemPrompt = options.systemPrompt 
      ? `${options.systemPrompt}\n\nIMPORTANT: You must respond ONLY with raw, valid JSON. No conversational wrapper.`
      : 'You are a precise parsing system. You must output ONLY a valid raw JSON object. Never include markdown code fences or explanatory text.';

    try {
      const response = await this.generateText({
        ...options,
        prompt: enhancedPrompt,
        systemPrompt,
      });

      if (!response.success) {
        return {
          success: false,
          data: {} as T,
          error: response.error,
          metadata: response.metadata,
        };
      }

      let text = response.data.trim();
      if (text.startsWith('```')) {
        text = text.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(text);
      const validated = options.schema.parse(parsed);

      return {
        success: true,
        data: validated as T,
        metadata: response.metadata,
      };
    } catch (error: any) {
      console.error('[AI Claude Provider] generateObject failed:', error);
      return {
        success: false,
        data: {} as T,
        error: `JSON parsing or Zod validation failed: ${error.message || error}`,
        metadata: {
          model,
          latencyMs: Date.now() - startTime,
        }
      };
    }
  }

  async streamText(options: AIGenerateTextOptions): Promise<AIResponse<AIStreamTextResult>> {
    const model = options.model || 'claude-3-5-sonnet-latest';
    const timeout = options.timeoutMs || 30000;

    try {
      const client = this.getClient();
      const abortController = new AbortController();

      const stream = new ReadableStream<string>({
        async start(controller) {
          try {
            const rawStream = await client.messages.create({
              model,
              max_tokens: options.maxTokens || 4000,
              temperature: options.temperature ?? 0.7,
              system: options.systemPrompt,
              messages: [{ role: 'user', content: options.prompt }],
              stream: true,
            }, {
              signal: abortController.signal,
              timeout,
            });

            for await (const chunk of rawStream) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                controller.enqueue(chunk.delta.text);
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
      console.error('[AI Claude Provider] streamText failed:', error);
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
