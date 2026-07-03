import Anthropic from '@anthropic-ai/sdk';
import { ModelInfo, ProviderName } from '../types';
import {
  AiProvider,
  ProviderChatMessage,
  ProviderNotConfiguredError,
  StreamCompletionOptions,
} from './ai-provider.interface';

export class AnthropicProvider implements AiProvider {
  readonly name: ProviderName = 'anthropic';
  readonly label = 'Anthropic';
  readonly models: ModelInfo[] = [
    { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-1-20250805', label: 'Claude Opus 4.1' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude Haiku 3.5' },
  ];

  private readonly client: Anthropic | null;

  constructor(apiKey: string | undefined) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async *streamCompletion(
    messages: ProviderChatMessage[],
    options: StreamCompletionOptions
  ): AsyncIterable<string> {
    if (!this.client) {
      throw new ProviderNotConfiguredError(this.name);
    }

    const systemPrompt = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const conversationMessages = messages
      .filter((m): m is ProviderChatMessage & { role: 'user' | 'assistant' } => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const stream = this.client.messages.stream(
      {
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        system: systemPrompt || undefined,
        messages: conversationMessages,
      },
      { signal: options.signal }
    );

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
}
