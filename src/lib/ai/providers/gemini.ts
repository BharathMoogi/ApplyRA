import { generateText, generateObject, streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { 
  AIProvider, 
  AIGenerateTextOptions, 
  AIGenerateObjectOptions, 
  AIResponse, 
  AIStreamTextResult 
} from '../types';

// Fallback models in priority order for standard generateContent endpoints
const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash',
].filter(Boolean) as string[];

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  async generateText(options: AIGenerateTextOptions): Promise<AIResponse<string>> {
    const startTime = Date.now();
    const modelsToTry = options.model ? [options.model] : CANDIDATE_MODELS;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[AI Gemini Provider] Attempting generateText with model: ${modelName}`);
        const { text } = await generateText({
          model: google(modelName),
          prompt: options.prompt,
          system: options.systemPrompt,
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          abortSignal: AbortSignal.timeout(options.timeoutMs || 15000),
        });

        const latencyMs = Date.now() - startTime;
        return {
          success: true,
          data: text,
          metadata: {
            model: modelName,
            latencyMs,
          }
        };
      } catch (error: any) {
        lastError = error;
        console.warn(`[AI Gemini Provider] Model ${modelName} failed: ${error.message || error}`);
      }
    }

    console.error('[AI Gemini Provider] All models failed in generateText:', lastError);
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
    const modelsToTry = options.model ? [options.model] : CANDIDATE_MODELS;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[AI Gemini Provider] Attempting generateObject with model: ${modelName}`);
        const { object } = await generateObject({
          model: google(modelName),
          schema: options.schema,
          prompt: options.prompt,
          system: options.systemPrompt,
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          abortSignal: AbortSignal.timeout(options.timeoutMs || 18000),
        });

        const latencyMs = Date.now() - startTime;
        return {
          success: true,
          data: object as T,
          metadata: {
            model: modelName,
            latencyMs,
          }
        };
      } catch (error: any) {
        lastError = error;
        console.warn(`[AI Gemini Provider] Model ${modelName} failed: ${error.message || error}`);
      }
    }

    console.error('[AI Gemini Provider] All models failed in generateObject:', lastError);
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
    const modelName = options.model || CANDIDATE_MODELS[0];
    try {
      const result = await streamText({
        model: google(modelName),
        prompt: options.prompt,
        system: options.systemPrompt,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        abortSignal: AbortSignal.timeout(options.timeoutMs || 25000),
      });

      return {
        success: true,
        data: {
          stream: result.textStream,
          cancel: () => {},
        },
        metadata: {
          model: modelName,
        }
      };
    } catch (error: any) {
      console.error('[AI Gemini Provider] streamText failed:', error);
      return {
        success: false,
        data: {
          stream: new ReadableStream(),
          cancel: () => {},
        },
        error: error.message || String(error),
        metadata: {
          model: modelName,
        }
      };
    }
  }
}
