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
      // 2. Auto-detect: prefer Groq when available for blazing-fast 1s latency, then Gemini, then Claude
      if (process.env.GROQ_API_KEY) {
        this.activeProviderName = 'groq';
      } else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        this.activeProviderName = 'gemini';
      } else if (process.env.ANTHROPIC_API_KEY) {
        this.activeProviderName = 'claude';
      } else {
        this.activeProviderName = 'groq';
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
    const primary = this.getProvider(this.activeProviderName);

    // Resilient proxy: if primary provider encounters an error or timeout,
    // automatically attempt failover between groq and gemini
    return {
      name: primary.name,
      generateText: async (options) => {
        const res = await primary.generateText(options);
        if (!res.success) {
          const backup = this.activeProviderName === 'groq' ? 'gemini' : 'groq';
          const hasKey = backup === 'groq' ? !!process.env.GROQ_API_KEY : !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
          if (hasKey) {
            console.warn(`[AI Failover] Primary '${primary.name}' failed. Falling back to '${backup}'...`);
            return this.getProvider(backup).generateText(options);
          }
        }
        return res;
      },
      generateObject: async <T>(options: any) => {
        const res = await primary.generateObject<T>(options);
        if (!res.success) {
          const backup = this.activeProviderName === 'groq' ? 'gemini' : 'groq';
          const hasKey = backup === 'groq' ? !!process.env.GROQ_API_KEY : !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
          if (hasKey) {
            console.warn(`[AI Failover] Primary '${primary.name}' failed. Falling back to '${backup}'...`);
            return this.getProvider(backup).generateObject<T>(options);
          }
        }
        return res;
      },
      streamText: (options) => primary.streamText(options),
    };
  }
}

export const ai = new AIServiceManager();
export * from './types';
