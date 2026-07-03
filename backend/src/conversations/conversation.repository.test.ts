import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InMemoryConversationRepository } from './conversation.repository';
import { Conversation } from '../types';

function makeConversation(id: string): Conversation {
  const now = new Date().toISOString();
  return {
    id,
    title: 'Untitled',
    messages: [],
    settings: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1024, systemPrompt: '' },
    createdAt: now,
    updatedAt: now,
  };
}

test('save then findById returns the same conversation', () => {
  const repo = new InMemoryConversationRepository();
  const conversation = makeConversation('a');
  repo.save(conversation);

  assert.deepEqual(repo.findById('a'), conversation);
});

test('findById returns undefined for an unknown id', () => {
  const repo = new InMemoryConversationRepository();
  assert.equal(repo.findById('missing'), undefined);
});

test('findAll returns every saved conversation', () => {
  const repo = new InMemoryConversationRepository();
  repo.save(makeConversation('a'));
  repo.save(makeConversation('b'));

  assert.equal(repo.findAll().length, 2);
});

test('delete removes a conversation and reports success', () => {
  const repo = new InMemoryConversationRepository();
  repo.save(makeConversation('a'));

  assert.equal(repo.delete('a'), true);
  assert.equal(repo.findById('a'), undefined);
});

test('delete returns false for an id that does not exist', () => {
  const repo = new InMemoryConversationRepository();
  assert.equal(repo.delete('missing'), false);
});
