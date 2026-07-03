import { TestBed } from '@angular/core/testing';
import { ChatStreamService } from './chat-stream.service';
import { ChatStreamEvent } from '../../models';

function sseBody(...frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = frames.map((f) => encoder.encode(f));
  let index = 0;
  return {
    getReader: () => ({
      read: async () => {
        if (index < chunks.length) {
          return { done: false, value: chunks[index++] };
        }
        return { done: true, value: undefined };
      },
    }),
  } as unknown as ReadableStream<Uint8Array>;
}

function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

describe('ChatStreamService', () => {
  let service: ChatStreamService;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatStreamService);
    fetchSpy = spyOn(window, 'fetch');
  });

  it('parses SSE frames into typed events in order and completes on "done"', async () => {
    fetchSpy.and.resolveTo({
      ok: true,
      body: sseBody(
        frame('start', { messageId: 'm1', createdAt: '2026-01-01T00:00:00.000Z' }),
        frame('token', { content: 'Hello ' }),
        frame('token', { content: 'world' }),
        frame('done', { message: { id: 'm1', content: 'Hello world' } }),
      ),
    } as Response);

    const events: ChatStreamEvent[] = [];
    let completed = false;

    await new Promise<void>((resolve) => {
      service.streamChat('conv-1', { action: 'send', content: 'hi' }).subscribe({
        next: (e) => events.push(e),
        complete: () => {
          completed = true;
          resolve();
        },
      });
    });

    expect(events.map((e) => e.type)).toEqual(['start', 'token', 'token', 'done']);
    expect(completed).toBe(true);
  });

  it('sends the conversationId and action fields in the request body', async () => {
    fetchSpy.and.resolveTo({ ok: true, body: sseBody(frame('done', { message: {} })) } as Response);

    await new Promise<void>((resolve) => {
      service.streamChat('conv-42', { action: 'regenerate' }).subscribe({ complete: resolve });
    });

    const [, init] = fetchSpy.calls.mostRecent().args;
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ conversationId: 'conv-42', action: 'regenerate' });
  });

  it('errors with the server-provided message when the response is not ok', async () => {
    fetchSpy.and.resolveTo({
      ok: false,
      body: null,
      json: () => Promise.resolve({ error: 'Missing API key for OpenAI.' }),
    } as unknown as Response);

    let receivedError: Error | undefined;
    await new Promise<void>((resolve) => {
      service.streamChat('conv-1', { action: 'send', content: 'hi' }).subscribe({
        error: (err) => {
          receivedError = err;
          resolve();
        },
      });
    });

    expect(receivedError?.message).toBe('Missing API key for OpenAI.');
  });

  it('errors with a generic message when fetch itself rejects (network failure)', async () => {
    fetchSpy.and.rejectWith(new Error('network down'));

    let receivedError: Error | undefined;
    await new Promise<void>((resolve) => {
      service.streamChat('conv-1', { action: 'send', content: 'hi' }).subscribe({
        error: (err) => {
          receivedError = err;
          resolve();
        },
      });
    });

    expect(receivedError?.message).toContain('Could not reach the server');
  });

  it('aborts the in-flight fetch when the subscription is torn down early', () => {
    let capturedSignal: AbortSignal | undefined;
    fetchSpy.and.callFake((_url: string, init: RequestInit) => {
      capturedSignal = init.signal as AbortSignal;
      return new Promise(() => {
        /* never resolves — simulates a still-streaming request */
      });
    });

    const subscription = service
      .streamChat('conv-1', { action: 'send', content: 'hi' })
      .subscribe();

    expect(capturedSignal?.aborted).toBe(false);
    subscription.unsubscribe();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
