import { Conversation } from '../types';

/**
 * Repository-pattern abstraction over conversation storage. The rest
 * of the app only depends on this interface, so the in-memory store
 * could be swapped for a real database later without touching callers.
 */
export interface ConversationRepository {
  findAll(): Conversation[];
  findById(id: string): Conversation | undefined;
  save(conversation: Conversation): Conversation;
  delete(id: string): boolean;
}

export class InMemoryConversationRepository implements ConversationRepository {
  private readonly store = new Map<string, Conversation>();

  findAll(): Conversation[] {
    return Array.from(this.store.values());
  }

  findById(id: string): Conversation | undefined {
    return this.store.get(id);
  }

  save(conversation: Conversation): Conversation {
    this.store.set(conversation.id, conversation);
    return conversation;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
