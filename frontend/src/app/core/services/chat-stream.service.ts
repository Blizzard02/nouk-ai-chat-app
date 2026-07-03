import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ChatAction, ChatStreamEvent } from '../../models';

interface RawSseEvent {
  event: string;
  data: unknown;
}

function parseSseChunk(chunk: string): RawSseEvent | null {
  const lines = chunk.split('\n');
  const eventLine = lines.find((line) => line.startsWith('event: '));
  const dataLine = lines.find((line) => line.startsWith('data: '));
  if (!eventLine || !dataLine) {
    return null;
  }
  return {
    event: eventLine.slice('event: '.length).trim(),
    data: JSON.parse(dataLine.slice('data: '.length)),
  };
}

/**
 * Streams a chat completion over SSE-over-POST. A plain EventSource
 * can't send a request body, so this reads the fetch response body
 * as a stream and parses SSE frames by hand. Wrapping it as an
 * Observable means "stop generation" is just `subscription.unsubscribe()`
 * — the teardown function aborts the underlying fetch.
 */
@Injectable({ providedIn: 'root' })
export class ChatStreamService {
  streamChat(conversationId: string, body: ChatAction): Observable<ChatStreamEvent> {
    return new Observable<ChatStreamEvent>((subscriber) => {
      const controller = new AbortController();

      const run = async () => {
        let response: globalThis.Response;
        try {
          response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId, ...body }),
            signal: controller.signal,
          });
        } catch {
          if (!controller.signal.aborted) {
            subscriber.error(
              new Error('Could not reach the server. Check your connection and try again.'),
            );
          }
          return;
        }

        if (!response.ok || !response.body) {
          const errorBody = await response.json().catch(() => ({ error: response.statusText }));
          subscriber.error(new Error(errorBody.error ?? 'The request failed.'));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split('\n\n');
            buffer = frames.pop() ?? '';

            for (const frame of frames) {
              const parsed = parseSseChunk(frame);
              if (!parsed) continue;
              subscriber.next({ type: parsed.event, data: parsed.data } as ChatStreamEvent);
              if (
                parsed.event === 'done' ||
                parsed.event === 'error' ||
                parsed.event === 'stopped'
              ) {
                subscriber.complete();
                return;
              }
            }
          }
          subscriber.complete();
        } catch (err) {
          if (!controller.signal.aborted) {
            subscriber.error(err);
          } else {
            subscriber.complete();
          }
        }
      };

      void run();

      return () => controller.abort();
    });
  }
}
