import { z } from 'zod';

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface AIGenerateTextOptions extends AIOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
}

export interface AIGenerateObjectOptions extends AIOptions {
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodType<any>;
  model?: string;
}

export interface AIResponse<T = string> {
  success: boolean;
  data: T;
  error?: string;
  metadata?: {
    model: string;
    tokensUsed?: number;
    latencyMs?: number;
    retries?: number;
  };
}

export interface AIStreamTextResult {
  stream: ReadableStream<string>;
  cancel: () => void;
}

export interface AIProvider {
  name: string;
  generateText(options: AIGenerateTextOptions): Promise<AIResponse<string>>;
  generateObject<T>(options: AIGenerateObjectOptions): Promise<AIResponse<T>>;
  streamText(options: AIGenerateTextOptions): Promise<AIResponse<AIStreamTextResult>>;
}
