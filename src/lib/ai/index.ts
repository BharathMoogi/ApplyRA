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

    this.activeProviderName = process.env.AI_PROVIDER || 'groq';
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
