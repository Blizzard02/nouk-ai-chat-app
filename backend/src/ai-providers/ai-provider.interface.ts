import { MessageRole, ModelInfo, ProviderName } from '../types';

export interface ProviderChatMessage {
  role: MessageRole;
  content: string;
}

export interface StreamCompletionOptions {
  model: string;
  temperature: number;
  maxTokens: number;
  signal: AbortSignal;
}

/**
 * Every AI vendor is adapted to this single shape so the rest of the
 * backend (and the entire frontend) never has to know which vendor
 * SDK is in play.
 */
export interface AiProvider {
  readonly name: ProviderName;
  readonly label: string;
  readonly models: ModelInfo[];

  isConfigured(): boolean;

  streamCompletion(
    messages: ProviderChatMessage[],
    options: StreamCompletionOptions
  ): AsyncIterable<string>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(public readonly provider: ProviderName) {
    super(`Missing API key for provider "${provider}". Set the corresponding environment variable and restart the server.`);
    this.name = 'ProviderNotConfiguredError';
  }
}
