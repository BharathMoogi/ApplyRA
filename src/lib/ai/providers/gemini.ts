import { generateText, generateObject, streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { 
  AIProvider, 
  AIGenerateTextOptions, 
  AIGenerateObjectOptions, 
  AIResponse, 
  AIStreamTextResult 
} from '../types';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  async generateText(options: AIGenerateTextOptions): Promise<AIResponse<string>> {
    const startTime = Date.now();
    const modelName = options.model || 'gemini-2.0-flash';
    try {
      const { text } = await generateText({
        model: google(modelName),
        prompt: options.prompt,
        system: options.systemPrompt,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
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
      console.error('[AI Gemini Provider] generateText failed:', error);
      return {
        success: false,
        data: '',
        error: error.message || String(error),
        metadata: {
          model: modelName,
          latencyMs: Date.now() - startTime,
        }
      };
    }
  }

  async generateObject<T>(options: AIGenerateObjectOptions): Promise<AIResponse<T>> {
    const startTime = Date.now();
    const modelName = options.model || 'gemini-2.0-flash';
    try {
      const { object } = await generateObject({
        model: google(modelName),
        schema: options.schema,
        prompt: options.prompt,
        system: options.systemPrompt,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
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
      console.error('[AI Gemini Provider] generateObject failed:', error);
      return {
        success: false,
        data: {} as T,
        error: error.message || String(error),
        metadata: {
          model: modelName,
          latencyMs: Date.now() - startTime,
        }
      };
    }
  }

  async streamText(options: AIGenerateTextOptions): Promise<AIResponse<AIStreamTextResult>> {
    const modelName = options.model || 'gemini-2.0-flash';
    try {
      const result = await streamText({
        model: google(modelName),
        prompt: options.prompt,
        system: options.systemPrompt,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
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
