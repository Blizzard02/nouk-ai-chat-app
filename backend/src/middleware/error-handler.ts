import { NextFunction, Request, Response } from 'express';
import { ConversationNotFoundError, MessageNotFoundError } from '../conversations/conversation.service';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    return;
  }

  if (err instanceof ConversationNotFoundError || err instanceof MessageNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: message });
}
