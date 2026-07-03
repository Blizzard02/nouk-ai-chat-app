import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateTokens } from './token-estimate';

test('estimateTokens returns roughly 1 token per 4 characters', () => {
  assert.equal(estimateTokens('12345678'), 2);
  assert.equal(estimateTokens('1234567890123'), 4);
});

test('estimateTokens never returns less than 1, even for empty text', () => {
  assert.equal(estimateTokens(''), 1);
});

test('estimateTokens rounds up partial tokens', () => {
  assert.equal(estimateTokens('12345'), 2);
});
