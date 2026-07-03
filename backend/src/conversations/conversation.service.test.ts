import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AiProviderFactory } from '../ai-providers/provider.factory';
import {
  ConversationNotFoundError,
  ConversationService,
  MessageNotFoundError,
} from './conversation.service';
import { InMemoryConversationRepository } from './conversation.repository';

function makeService(): ConversationService {
  return new ConversationService(new InMemoryConversationRepository(), new AiProviderFactory());
}

test('create sets sane defaults and a placeholder title', () => {
  const service = makeService();
  const conversation = service.create();

  assert.equal(conversation.title, 'New chat');
  assert.deepEqual(conversation.messages, []);
  assert.equal(conversation.settings.temperature, 0.7);
  assert.equal(conversation.settings.maxTokens, 1024);
  assert.ok(conversation.settings.systemPrompt.length > 0);
});

test('getOrThrow throws ConversationNotFoundError for an unknown id', () => {
  const service = makeService();
  assert.throws(() => service.getOrThrow('nope'), ConversationNotFoundError);
});

test('rename trims whitespace and falls back to a default title when blank', () => {
  const service = makeService();
  const conversation = service.create();

  const renamed = service.rename(conversation.id, '  My chat  ');
  assert.equal(renamed.title, 'My chat');

  const blanked = service.rename(conversation.id, '   ');
  assert.equal(blanked.title, 'Untitled chat');
});

test('rename truncates overly long titles', () => {
  const service = makeService();
  const conversation = service.create();
  const longTitle = 'x'.repeat(200);

  const renamed = service.rename(conversation.id, longTitle);
  assert.ok(renamed.title.length <= 48);
});

test('addMessage appends a message with an id, timestamp and token estimate', () => {
  const service = makeService();
  const conversation = service.create();

  const message = service.addMessage(conversation.id, 'user', 'Hello there');

  assert.equal(message.role, 'user');
  assert.equal(message.content, 'Hello there');
  assert.ok(message.id);
  assert.ok(message.tokenEstimate > 0);
  assert.equal(service.getOrThrow(conversation.id).messages.length, 1);
});

test('the first user message becomes the conversation title', () => {
  const service = makeService();
  const conversation = service.create();

  service.addMessage(conversation.id, 'user', 'What is the capital of France?');
  assert.equal(service.getOrThrow(conversation.id).title, 'What is the capital of France?');
});

test('a second user message does not overwrite an already-set title', () => {
  const service = makeService();
  const conversation = service.create();

  service.addMessage(conversation.id, 'user', 'First message');
  service.addMessage(conversation.id, 'assistant', 'Reply');
  service.addMessage(conversation.id, 'user', 'Second message');

  assert.equal(service.getOrThrow(conversation.id).title, 'First message');
});

test('dropLastAssistantMessage removes a trailing assistant message only', () => {
  const service = makeService();
  const conversation = service.create();
  service.addMessage(conversation.id, 'user', 'Hi');
  service.addMessage(conversation.id, 'assistant', 'Hello!');

  service.dropLastAssistantMessage(conversation.id);

  const messages = service.getOrThrow(conversation.id).messages;
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, 'user');
});

test('dropLastAssistantMessage is a no-op when the last message is from the user', () => {
  const service = makeService();
  const conversation = service.create();
  service.addMessage(conversation.id, 'user', 'Hi');

  service.dropLastAssistantMessage(conversation.id);

  assert.equal(service.getOrThrow(conversation.id).messages.length, 1);
});

test('editMessageAndTruncate updates content and discards everything after it', () => {
  const service = makeService();
  const conversation = service.create();
  const userMessage = service.addMessage(conversation.id, 'user', 'Original');
  service.addMessage(conversation.id, 'assistant', 'Reply');
  service.addMessage(conversation.id, 'user', 'Follow-up');

  service.editMessageAndTruncate(conversation.id, userMessage.id, 'Edited');

  const messages = service.getOrThrow(conversation.id).messages;
  assert.equal(messages.length, 1);
  assert.equal(messages[0].content, 'Edited');
});

test('editMessageAndTruncate throws MessageNotFoundError for an unknown message id', () => {
  const service = makeService();
  const conversation = service.create();
  assert.throws(
    () => service.editMessageAndTruncate(conversation.id, 'missing', 'x'),
    MessageNotFoundError
  );
});

test('appendStreamedContent accumulates chunks and recomputes the token estimate', () => {
  const service = makeService();
  const conversation = service.create();
  const message = service.addMessage(conversation.id, 'assistant', '');

  service.appendStreamedContent(conversation.id, message.id, 'Hello ');
  service.appendStreamedContent(conversation.id, message.id, 'world');

  const updated = service.getOrThrow(conversation.id).messages[0];
  assert.equal(updated.content, 'Hello world');
  assert.ok(updated.tokenEstimate > 0);
});

test('markMessageError sets the error field on the target message only', () => {
  const service = makeService();
  const conversation = service.create();
  const a = service.addMessage(conversation.id, 'assistant', 'a');
  const b = service.addMessage(conversation.id, 'assistant', 'b');

  service.markMessageError(conversation.id, a.id, 'boom');

  const messages = service.getOrThrow(conversation.id).messages;
  assert.equal(messages.find((m) => m.id === a.id)?.error, 'boom');
  assert.equal(messages.find((m) => m.id === b.id)?.error, undefined);
});

test('removeMessage filters out exactly the targeted message', () => {
  const service = makeService();
  const conversation = service.create();
  const a = service.addMessage(conversation.id, 'user', 'a');
  service.addMessage(conversation.id, 'assistant', 'b');

  service.removeMessage(conversation.id, a.id);

  const messages = service.getOrThrow(conversation.id).messages;
  assert.equal(messages.length, 1);
  assert.equal(messages[0].content, 'b');
});

test('updateSettings merges a partial update without clobbering other fields', () => {
  const service = makeService();
  const conversation = service.create();

  const updated = service.updateSettings(conversation.id, { temperature: 1.2 });

  assert.equal(updated.settings.temperature, 1.2);
  assert.equal(updated.settings.maxTokens, conversation.settings.maxTokens);
});

test('delete removes the conversation; deleting again throws ConversationNotFoundError', () => {
  const service = makeService();
  const conversation = service.create();

  service.delete(conversation.id);
  assert.throws(() => service.delete(conversation.id), ConversationNotFoundError);
});

test('listSummaries orders conversations by most recently updated first', async () => {
  const service = makeService();
  const first = service.create();
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = service.create();

  const summaries = service.listSummaries();
  assert.equal(summaries[0].id, second.id);
  assert.equal(summaries[1].id, first.id);
});
