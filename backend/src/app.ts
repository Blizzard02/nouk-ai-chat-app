import cors from 'cors';
import express, { Express } from 'express';
import { chatRouter } from './chat/chat.routes';
import { conversationsRouter } from './conversations/conversations.routes';
import { errorHandler } from './middleware/error-handler';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', conversationsRouter);
  app.use('/api', chatRouter);

  app.use(errorHandler);

  return app;
}
