import OpenAI from 'openai';
import { ModelInfo, ProviderName } from '../types';
import {
  AiProvider,
  ProviderChatMessage,
  ProviderNotConfiguredError,
  StreamCompletionOptions,
} from './ai-provider.interface';

export class OpenAiProvider implements AiProvider {
  readonly name: ProviderName = 'openai';
  readonly label = 'OpenAI';
  readonly models: ModelInfo[] = [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  ];

  private readonly client: OpenAI | null;

  constructor(apiKey: string | undefined) {
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
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

    const stream = await this.client.chat.completions.create(
      {
        model: options.model,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      { signal: options.signal }
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }
}
