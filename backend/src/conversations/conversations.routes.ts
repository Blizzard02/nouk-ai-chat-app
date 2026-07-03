import { Router } from 'express';
import { aiProviderFactory } from '../ai-providers/provider.factory';
import { ConversationSettings } from '../types';
import { conversationService } from './instance';

export const conversationsRouter = Router();

conversationsRouter.get('/providers', (_req, res) => {
  res.json(aiProviderFactory.listProviders());
});

conversationsRouter.get('/conversations', (_req, res) => {
  res.json(conversationService.listSummaries());
});

conversationsRouter.post('/conversations', (_req, res) => {
  const conversation = conversationService.create();
  res.status(201).json(conversation);
});

conversationsRouter.get('/conversations/:id', (req, res) => {
  const conversation = conversationService.getOrThrow(req.params.id);
  res.json(conversation);
});

conversationsRouter.patch('/conversations/:id', (req, res) => {
  const { title, settings } = req.body as {
    title?: string;
    settings?: Partial<ConversationSettings>;
  };

  let conversation = conversationService.getOrThrow(req.params.id);

  if (typeof title === 'string') {
    conversation = conversationService.rename(req.params.id, title);
  }
  if (settings) {
    conversation = conversationService.updateSettings(req.params.id, settings);
  }

  res.json(conversation);
});

conversationsRouter.delete('/conversations/:id', (req, res) => {
  conversationService.delete(req.params.id);
  res.status(204).send();
});
