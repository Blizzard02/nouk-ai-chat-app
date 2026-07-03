import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Request, Response } from 'express';
import { ConversationNotFoundError } from '../conversations/conversation.service';
import { errorHandler } from './error-handler';

function fakeRes() {
  const calls: { status?: number; body?: unknown } = {};
  const res = {
    headersSent: false,
    status(code: number) {
      calls.status = code;
      return this;
    },
    json(body: unknown) {
      calls.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, calls };
}

test('errorHandler maps ConversationNotFoundError to a 404 with the error message', () => {
  const { res, calls } = fakeRes();
  errorHandler(new ConversationNotFoundError('abc'), {} as Request, res, () => {});

  assert.equal(calls.status, 404);
  assert.match((calls.body as { error: string }).error, /abc/);
});

test('errorHandler maps unknown errors to a 500', () => {
  const { res, calls } = fakeRes();
  errorHandler(new Error('unexpected'), {} as Request, res, () => {});

  assert.equal(calls.status, 500);
  assert.equal((calls.body as { error: string }).error, 'unexpected');
});

test('errorHandler does nothing once headers have already been sent', () => {
  const { res, calls } = fakeRes();
  (res as unknown as { headersSent: boolean }).headersSent = true;

  errorHandler(new Error('too late'), {} as Request, res, () => {});

  assert.equal(calls.status, undefined);
});
