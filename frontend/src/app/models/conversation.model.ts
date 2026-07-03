export type ProviderName = 'openai' | 'anthropic' | 'gemini';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  tokenEstimate: number;
  error?: string;
}

export interface ConversationSettings {
  provider: ProviderName;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  settings: ConversationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelInfo {
  id: string;
  label: string;
}

export interface ProviderInfo {
  id: ProviderName;
  label: string;
  models: ModelInfo[];
  configured: boolean;
}
