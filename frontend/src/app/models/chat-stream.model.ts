import { ChatMessage } from './conversation.model';

export interface ChatStreamStart {
  messageId: string;
  createdAt: string;
}

export interface ChatStreamToken {
  content: string;
}

export interface ChatStreamDone {
  message: ChatMessage;
}

export interface ChatStreamStopped {
  messageId: string;
}

export interface ChatStreamError {
  messageId: string;
  error: string;
}

export type ChatAction =
  | { action: 'send'; content: string }
  | { action: 'regenerate' }
  | { action: 'edit'; messageId: string; content: string };

export type ChatStreamEvent =
  | { type: 'start'; data: ChatStreamStart }
  | { type: 'token'; data: ChatStreamToken }
  | { type: 'done'; data: ChatStreamDone }
  | { type: 'stopped'; data: ChatStreamStopped }
  | { type: 'error'; data: ChatStreamError };
