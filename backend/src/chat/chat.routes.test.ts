import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { createApp } from '../app';
import { AiProvider } from '../ai-providers/ai-provider.interface';
import { aiProviderFactory } from '../ai-providers/provider.factory';

/**
 * Integration test for the SSE chat route. It swaps a fake provider into
 * the real, shared AiProviderFactory singleton (the exact seam the app
 * itself uses to pick a vendor at request time), so every other layer —
 * routing, SSE framing, conversation persistence, stop-on-abort — runs
 * as shipped. node:test isolates each test file in its own process, so
 * this monkeypatch can't leak into other test files.
 */

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

const fakeProvider: AiProvider = {
  name: 'openai',
  label: 'Fake',
  models: [{ id: 'fake-model', label: 'Fake Model' }],
  isConfigured: () => true,
  async *streamCompletion(messages, options) {
    const text = `Echoing ${messages.length} messages: hello there friend`;
    for (const word of text.split(' ')) {
      if (options.signal.aborted) return;
      yield word + ' ';
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  },
};

before(async () => {
  aiProviderFactory.getProvider = () => fakeProvider;
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://localhost:${port}/api`;
});

after(() => {
  server.close();
});

interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

async function readSse(response: Response): Promise<SseEvent[]> {
  const events: SseEvent[] = [];
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const lines = frame.split('\n');
      const eventLine = lines.find((l) => l.startsWith('event: '));
      const dataLine = lines.find((l) => l.startsWith('data: '));
      if (eventLine && dataLine) {
        events.push({ event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) });
      }
    }
  }
  return events;
}

async function createConversation(): Promise<string> {
  const res = await fetch(`${baseUrl}/conversations`, { method: 'POST' });
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function postChat(body: Record<string, unknown>): Promise<Response> {
  return fetch(`${baseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('sending a message streams start, token, and done events and persists the exchange', async () => {
  const conversationId = await createConversation();

  const res = await postChat({ conversationId, action: 'send', content: 'Hi there' });
  assert.equal(res.status, 200);

  const events = await readSse(res);
  assert.equal(events[0].event, 'start');
  assert.ok(events.some((e) => e.event === 'token'));
  assert.equal(events.at(-1)?.event, 'done');

  const finalMessage = events.at(-1)?.data.message as { content: string };
  assert.match(finalMessage.content, /Echoing/);

  const conversation = (await (await fetch(`${baseUrl}/conversations/${conversationId}`)).json()) as {
    messages: unknown[];
    title: string;
  };
  assert.equal(conversation.messages.length, 2);
  assert.equal(conversation.title, 'Hi there');
});

test('regenerate replaces the last assistant message rather than appending a new one', async () => {
  const conversationId = await createConversation();
  await readSse(await postChat({ conversationId, action: 'send', content: 'Hi there' }));

  await readSse(await postChat({ conversationId, action: 'regenerate' }));

  const conversation = (await (await fetch(`${baseUrl}/conversations/${conversationId}`)).json()) as {
    messages: unknown[];
  };
  assert.equal(conversation.messages.length, 2);
});

test('editing a user message truncates everything after it and reruns from there', async () => {
  const conversationId = await createConversation();
  await readSse(await postChat({ conversationId, action: 'send', content: 'Hi there' }));

  const before = (await (await fetch(`${baseUrl}/conversations/${conversationId}`)).json()) as {
    messages: { id: string; role: string }[];
  };
  const userMessageId = before.messages[0].id;

  await readSse(
    await postChat({ conversationId, action: 'edit', messageId: userMessageId, content: 'Edited message' })
  );

  const after = (await (await fetch(`${baseUrl}/conversations/${conversationId}`)).json()) as {
    messages: { content: string }[];
  };
  assert.equal(after.messages.length, 2);
  assert.equal(after.messages[0].content, 'Edited message');
});

test('aborting the request mid-stream persists a partial assistant message and does not crash the server', async () => {
  const conversationId = await createConversation();
  const controller = new AbortController();

  const res = await fetch(`${baseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, action: 'send', content: 'One more' }),
    signal: controller.signal,
  });

  const reader = res.body!.getReader();
  await reader.read();
  controller.abort();
  await new Promise((resolve) => setTimeout(resolve, 200));

  const conversation = (await (await fetch(`${baseUrl}/conversations/${conversationId}`)).json()) as {
    messages: { role: string; content: string }[];
  };
  const last = conversation.messages.at(-1)!;
  assert.equal(last.role, 'assistant');

  const healthRes = await fetch(`${baseUrl}/health`);
  assert.equal(healthRes.status, 200);
});

test('a provider reporting as unconfigured returns 422 without opening an SSE stream', async () => {
  const conversationId = await createConversation();
  const original = aiProviderFactory.getProvider;
  aiProviderFactory.getProvider = () => ({ ...fakeProvider, isConfigured: () => false }) as AiProvider;

  try {
    const res = await postChat({ conversationId, action: 'send', content: 'test' });
    assert.equal(res.status, 422);
    const body = (await res.json()) as { error: string };
    assert.ok(body.error.length > 0);
  } finally {
    aiProviderFactory.getProvider = original;
  }
});

test('chatting against an unknown conversation returns 404 and leaves the server healthy', async () => {
  const res = await postChat({ conversationId: 'does-not-exist', action: 'send', content: 'x' });
  assert.equal(res.status, 404);

  const healthRes = await fetch(`${baseUrl}/health`);
  assert.equal(healthRes.status, 200);
});
