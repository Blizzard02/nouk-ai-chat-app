import { randomUUID } from 'crypto';
import { AiProviderFactory } from '../ai-providers/provider.factory';
import { Conversation, ConversationSettings, ConversationSummary, Message, MessageRole } from '../types';
import { ConversationRepository } from './conversation.repository';
import { estimateTokens } from './token-estimate';

const DEFAULT_SETTINGS: Omit<ConversationSettings, 'provider' | 'model'> = {
  temperature: 0.7,
  maxTokens: 1024,
  systemPrompt: 'You are a helpful, concise assistant.',
};

const TITLE_MAX_LENGTH = 48;

export class ConversationNotFoundError extends Error {
  constructor(id: string) {
    super(`Conversation "${id}" was not found.`);
    this.name = 'ConversationNotFoundError';
  }
}

export class MessageNotFoundError extends Error {
  constructor(id: string) {
    super(`Message "${id}" was not found.`);
    this.name = 'MessageNotFoundError';
  }
}

export class ConversationService {
  constructor(
    private readonly repository: ConversationRepository,
    private readonly providerFactory: AiProviderFactory
  ) {}

  listSummaries(): ConversationSummary[] {
    return this.repository
      .findAll()
      .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getOrThrow(id: string): Conversation {
    const conversation = this.repository.findById(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }
    return conversation;
  }

  create(): Conversation {
    const now = new Date().toISOString();
    const defaultProvider = this.providerFactory.listProviders().find((p) => p.configured);

    const settings: ConversationSettings = {
      provider: defaultProvider?.id ?? 'openai',
      model: defaultProvider?.models[0]?.id ?? 'gpt-4o-mini',
      ...DEFAULT_SETTINGS,
    };

    const conversation: Conversation = {
      id: randomUUID(),
      title: 'New chat',
      messages: [],
      settings,
      createdAt: now,
      updatedAt: now,
    };

    return this.repository.save(conversation);
  }

  rename(id: string, title: string): Conversation {
    const conversation = this.getOrThrow(id);
    conversation.title = title.trim().slice(0, TITLE_MAX_LENGTH) || 'Untitled chat';
    conversation.updatedAt = new Date().toISOString();
    return this.repository.save(conversation);
  }

  updateSettings(id: string, settings: Partial<ConversationSettings>): Conversation {
    const conversation = this.getOrThrow(id);
    conversation.settings = { ...conversation.settings, ...settings };
    conversation.updatedAt = new Date().toISOString();
    return this.repository.save(conversation);
  }

  delete(id: string): void {
    if (!this.repository.delete(id)) {
      throw new ConversationNotFoundError(id);
    }
  }

  addMessage(conversationId: string, role: MessageRole, content: string): Message {
    const conversation = this.getOrThrow(conversationId);
    const message: Message = {
      id: randomUUID(),
      role,
      content,
      createdAt: new Date().toISOString(),
      tokenEstimate: estimateTokens(content),
    };
    conversation.messages.push(message);
    conversation.updatedAt = message.createdAt;

    if (role === 'user' && conversation.title === 'New chat') {
      conversation.title = content.trim().slice(0, TITLE_MAX_LENGTH) || conversation.title;
    }

    this.repository.save(conversation);
    return message;
  }

  /** Removes the trailing assistant message, if any, so it can be regenerated. */
  dropLastAssistantMessage(conversationId: string): Conversation {
    const conversation = this.getOrThrow(conversationId);
    const last = conversation.messages[conversation.messages.length - 1];
    if (last?.role === 'assistant') {
      conversation.messages.pop();
      this.repository.save(conversation);
    }
    return conversation;
  }

  /** Overwrites a user message's content and discards everything after it. */
  editMessageAndTruncate(conversationId: string, messageId: string, content: string): Conversation {
    const conversation = this.getOrThrow(conversationId);
    const index = conversation.messages.findIndex((m) => m.id === messageId);
    if (index === -1) {
      throw new MessageNotFoundError(messageId);
    }

    const edited = conversation.messages[index];
    edited.content = content;
    edited.tokenEstimate = estimateTokens(content);
    edited.createdAt = new Date().toISOString();
    conversation.messages = conversation.messages.slice(0, index + 1);
    conversation.updatedAt = new Date().toISOString();

    this.repository.save(conversation);
    return conversation;
  }

  appendStreamedContent(conversationId: string, messageId: string, chunk: string): void {
    const conversation = this.getOrThrow(conversationId);
    const message = conversation.messages.find((m) => m.id === messageId);
    if (!message) {
      throw new MessageNotFoundError(messageId);
    }
    message.content += chunk;
    message.tokenEstimate = estimateTokens(message.content);
    this.repository.save(conversation);
  }

  markMessageError(conversationId: string, messageId: string, error: string): void {
    const conversation = this.getOrThrow(conversationId);
    const message = conversation.messages.find((m) => m.id === messageId);
    if (!message) {
      return;
    }
    message.error = error;
    this.repository.save(conversation);
  }

  removeMessage(conversationId: string, messageId: string): void {
    const conversation = this.getOrThrow(conversationId);
    conversation.messages = conversation.messages.filter((m) => m.id !== messageId);
    this.repository.save(conversation);
  }
}
