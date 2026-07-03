import { Response, Router } from 'express';
import { aiProviderFactory } from '../ai-providers/provider.factory';
import { ProviderChatMessage } from '../ai-providers/ai-provider.interface';
import { conversationService } from '../conversations/instance';
import { asyncHandler } from '../middleware/async-handler';
import { ChatRequestBody, Conversation } from '../types';

export const chatRouter = Router();

function buildProviderMessages(conversation: Conversation): ProviderChatMessage[] {
  const messages: ProviderChatMessage[] = [];
  if (conversation.settings.systemPrompt.trim()) {
    messages.push({ role: 'system', content: conversation.settings.systemPrompt });
  }
  for (const message of conversation.messages) {
    if (message.content.trim()) {
      messages.push({ role: message.role, content: message.content });
    }
  }
  return messages;
}

function writeSseEvent(res: Response, event: string, data: unknown): void {
  if (res.writableEnded) {
    return;
  }
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

chatRouter.post('/chat', asyncHandler(async (req, res) => {
  const body = req.body as ChatRequestBody & { conversationId?: string };
  const { conversationId } = body;

  if (!conversationId) {
    res.status(400).json({ error: 'conversationId is required.' });
    return;
  }

  const conversation = conversationService.getOrThrow(conversationId);
  const provider = aiProviderFactory.getProvider(conversation.settings.provider);

  if (!provider.isConfigured()) {
    res.status(422).json({
      error: `Missing API key for ${provider.label}. Set the required environment variable on the server and restart it.`,
    });
    return;
  }

  try {
    switch (body.action) {
      case 'send': {
        if (!body.content?.trim()) {
          res.status(400).json({ error: 'content is required.' });
          return;
        }
        conversationService.addMessage(conversationId, 'user', body.content);
        break;
      }
      case 'regenerate': {
        conversationService.dropLastAssistantMessage(conversationId);
        break;
      }
      case 'edit': {
        if (!body.messageId || !body.content?.trim()) {
          res.status(400).json({ error: 'messageId and content are required.' });
          return;
        }
        conversationService.editMessageAndTruncate(conversationId, body.messageId, body.content);
        break;
      }
      default:
        res.status(400).json({ error: 'Unknown action.' });
        return;
    }
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
    return;
  }

  const providerMessages = buildProviderMessages(conversationService.getOrThrow(conversationId));
  const assistantMessage = conversationService.addMessage(conversationId, 'assistant', '');

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  writeSseEvent(res, 'start', { messageId: assistantMessage.id, createdAt: assistantMessage.createdAt });

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    for await (const chunk of provider.streamCompletion(providerMessages, {
      model: conversation.settings.model,
      temperature: conversation.settings.temperature,
      maxTokens: conversation.settings.maxTokens,
      signal: controller.signal,
    })) {
      conversationService.appendStreamedContent(conversationId, assistantMessage.id, chunk);
      writeSseEvent(res, 'token', { content: chunk });
    }

    const finalConversation = conversationService.getOrThrow(conversationId);
    const finalMessage = finalConversation.messages.find((m) => m.id === assistantMessage.id);
    writeSseEvent(res, 'done', { message: finalMessage });
    if (!res.writableEnded) {
      res.end();
    }
  } catch (err) {
    if (controller.signal.aborted) {
      writeSseEvent(res, 'stopped', { messageId: assistantMessage.id });
      if (!res.writableEnded) {
        res.end();
      }
      return;
    }

    const message = err instanceof Error ? err.message : 'The AI provider request failed.';
    conversationService.markMessageError(conversationId, assistantMessage.id, message);
    writeSseEvent(res, 'error', { messageId: assistantMessage.id, error: message });
    if (!res.writableEnded) {
      res.end();
    }
  }
}));
