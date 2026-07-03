import { ProviderInfo, ProviderName } from '../types';
import { AiProvider } from './ai-provider.interface';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import { OpenAiProvider } from './openai.provider';

/**
 * Central registry of every configured AI vendor. Callers ask for a
 * provider by name and get back the same AiProvider shape regardless
 * of which vendor SDK backs it — this is the only place that knows
 * providers exist as distinct classes.
 */
export class AiProviderFactory {
  private readonly providers: Map<ProviderName, AiProvider>;

  constructor() {
    this.providers = new Map<ProviderName, AiProvider>([
      ['openai', new OpenAiProvider(process.env.OPENAI_API_KEY)],
      ['anthropic', new AnthropicProvider(process.env.ANTHROPIC_API_KEY)],
      ['gemini', new GeminiProvider(process.env.GEMINI_API_KEY)],
    ]);
  }

  getProvider(name: ProviderName): AiProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Unknown provider "${name}".`);
    }
    return provider;
  }

  listProviders(): ProviderInfo[] {
    return Array.from(this.providers.values()).map((provider) => ({
      id: provider.name,
      label: provider.label,
      models: provider.models,
      configured: provider.isConfigured(),
    }));
  }
}

export const aiProviderFactory = new AiProviderFactory();
