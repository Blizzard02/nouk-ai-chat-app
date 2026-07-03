import { aiProviderFactory } from '../ai-providers/provider.factory';
import { ConversationService } from './conversation.service';
import { InMemoryConversationRepository } from './conversation.repository';

export const conversationService = new ConversationService(
  new InMemoryConversationRepository(),
  aiProviderFactory
);
