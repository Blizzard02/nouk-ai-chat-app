import { GoogleGenerativeAI } from '@google/generative-ai';
import { ModelInfo, ProviderName } from '../types';
import {
  AiProvider,
  ProviderChatMessage,
  ProviderNotConfiguredError,
  StreamCompletionOptions,
} from './ai-provider.interface';

export class GeminiProvider implements AiProvider {
  readonly name: ProviderName = 'gemini';
  readonly label = 'Google Gemini';
  readonly models: ModelInfo[] = [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ];

  private readonly client: GoogleGenerativeAI | null;

  constructor(apiKey: string | undefined) {
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
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

    const systemInstruction = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const model = this.client.getGenerativeModel({
      model: options.model,
      systemInstruction: systemInstruction || undefined,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const result = await model.generateContentStream(
      { contents },
      { signal: options.signal }
    );

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }
}
