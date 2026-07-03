export type ProviderName = 'openai' | 'anthropic' | 'gemini';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
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
  messages: Message[];
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

export interface ChatSendRequest {
  action: 'send';
  content: string;
}

export interface ChatRegenerateRequest {
  action: 'regenerate';
}

export interface ChatEditRequest {
  action: 'edit';
  messageId: string;
  content: string;
}

export type ChatRequestBody = ChatSendRequest | ChatRegenerateRequest | ChatEditRequest;
