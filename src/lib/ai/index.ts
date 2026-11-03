import { AIProvider } from './types';
import { ClaudeProvider } from './providers/claude';
import { GeminiProvider } from './providers/gemini';
import { GroqProvider } from './providers/groq';

class AIServiceManager {
  private providers: Map<string, AIProvider> = new Map();
  private activeProviderName: string;

  constructor() {
    this.providers.set('claude', new ClaudeProvider());
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('groq', new GroqProvider());

    // 1. Honour explicit AI_PROVIDER env var
    const envVal = (process.env.AI_PROVIDER || "").trim();
    if (envVal && this.providers.has(envVal)) {
      this.activeProviderName = envVal;
    } else {
      // 2. Auto-detect: pick the first provider whose API key is present
      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        this.activeProviderName = 'gemini';
      } else if (process.env.ANTHROPIC_API_KEY) {
        this.activeProviderName = 'claude';
      } else if (process.env.GROQ_API_KEY) {
        this.activeProviderName = 'groq';
      } else {
        // Default fallback – will fail at call time with a clear error
        this.activeProviderName = 'gemini';
      }
    }
    console.log(`[AI] Active provider: ${this.activeProviderName}`);
  }

  getProvider(name?: string): AIProvider {
    const target = name || this.activeProviderName;
    const provider = this.providers.get(target);
    if (!provider) {
      throw new Error(`AI Provider "${target}" is not registered or supported.`);
    }
    return provider;
  }

  get active(): AIProvider {
    return this.getProvider();
  }
}

export const ai = new AIServiceManager();
export * from './types';
