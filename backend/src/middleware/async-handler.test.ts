import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Request, Response } from 'express';
import { asyncHandler } from './async-handler';

function fakeReqRes() {
  return { req: {} as Request, res: {} as Response };
}

test('asyncHandler forwards a resolved handler without calling next', async () => {
  const { req, res } = fakeReqRes();
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  const handler = asyncHandler(async () => {
    /* succeeds */
  });

  handler(req, res, next);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(nextCalled, false);
});

test('asyncHandler forwards a rejected handler to next(err) instead of throwing an unhandled rejection', async () => {
  const { req, res } = fakeReqRes();
  const error = new Error('boom');
  let received: unknown;
  const next = (err: unknown) => {
    received = err;
  };

  const handler = asyncHandler(async () => {
    throw error;
  });

  handler(req, res, next);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(received, error);
});
