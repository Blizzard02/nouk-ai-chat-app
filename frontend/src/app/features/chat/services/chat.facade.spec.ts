import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ChatFacade } from './chat.facade';
import { ChatStreamService } from '../../../core/services/chat-stream.service';
import { ConversationStore } from '../../../core/services/conversation-store.service';
import { ToastService } from '../../../core/services/toast.service';
import { ChatStreamEvent } from '../../../models';

describe('ChatFacade', () => {
  let facade: ChatFacade;
  let streamService: jasmine.SpyObj<ChatStreamService>;
  let store: jasmine.SpyObj<ConversationStore>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    streamService = jasmine.createSpyObj('ChatStreamService', ['streamChat']);
    store = jasmine.createSpyObj('ConversationStore', [
      'addOptimisticMessage',
      'appendToMessage',
      'dropLastAssistantMessage',
      'truncateAfterMessage',
      'setMessageError',
      'refreshActiveConversation',
    ]);
    toast = jasmine.createSpyObj('ToastService', ['error', 'info']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ChatStreamService, useValue: streamService },
        { provide: ConversationStore, useValue: store },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(ChatFacade);
  });

  it('sendMessage adds an optimistic user message before streaming starts', () => {
    streamService.streamChat.and.returnValue(of());
    facade.sendMessage('conv-1', 'Hello');

    expect(store.addOptimisticMessage).toHaveBeenCalledWith(
      jasmine.objectContaining({ role: 'user', content: 'Hello' }),
    );
    expect(streamService.streamChat).toHaveBeenCalledWith('conv-1', {
      action: 'send',
      content: 'Hello',
    });
  });

  it('processes start -> token -> token -> done and ends with isStreaming false', () => {
    const events: ChatStreamEvent[] = [
      { type: 'start', data: { messageId: 'm1', createdAt: '2026-01-01T00:00:00.000Z' } },
      { type: 'token', data: { content: 'Hi ' } },
      { type: 'token', data: { content: 'there' } },
      {
        type: 'done',
        data: { message: { id: 'm1', role: 'assistant', content: 'Hi there' } } as never,
      },
    ];
    streamService.streamChat.and.returnValue(of(...events));

    facade.sendMessage('conv-1', 'Hello');

    expect(facade.isStreaming()).toBe(false);
    expect(facade.isAwaitingFirstToken()).toBe(false);
    expect(store.addOptimisticMessage).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'm1', role: 'assistant', content: '' }),
    );
    expect(store.appendToMessage).toHaveBeenCalledWith('m1', 'Hi ');
    expect(store.appendToMessage).toHaveBeenCalledWith('m1', 'there');
    expect(store.refreshActiveConversation).toHaveBeenCalledWith('conv-1');
  });

  it('clears isAwaitingFirstToken as soon as the start event arrives, before any tokens', () => {
    const subject = new Subject<ChatStreamEvent>();
    streamService.streamChat.and.returnValue(subject.asObservable());

    facade.sendMessage('conv-1', 'Hello');
    expect(facade.isAwaitingFirstToken()).toBe(true);

    subject.next({ type: 'start', data: { messageId: 'm1', createdAt: '' } });
    expect(facade.isAwaitingFirstToken()).toBe(false);
  });

  it('regenerate drops the last assistant message before requesting a new one', () => {
    streamService.streamChat.and.returnValue(of());
    facade.regenerate('conv-1');

    expect(store.dropLastAssistantMessage).toHaveBeenCalled();
    expect(streamService.streamChat).toHaveBeenCalledWith('conv-1', { action: 'regenerate' });
  });

  it('editMessage truncates from the edited message before rerunning', () => {
    streamService.streamChat.and.returnValue(of());
    facade.editMessage('conv-1', 'm1', 'Edited content');

    expect(store.truncateAfterMessage).toHaveBeenCalledWith('m1', 'Edited content');
    expect(streamService.streamChat).toHaveBeenCalledWith('conv-1', {
      action: 'edit',
      messageId: 'm1',
      content: 'Edited content',
    });
  });

  it('stop() unsubscribes from the stream and resets streaming flags', () => {
    const subject = new Subject<ChatStreamEvent>();
    streamService.streamChat.and.returnValue(subject.asObservable());

    facade.sendMessage('conv-1', 'Hello');
    expect(facade.isStreaming()).toBe(true);

    facade.stop();

    expect(facade.isStreaming()).toBe(false);
    expect(facade.isAwaitingFirstToken()).toBe(false);
    expect(subject.observed).toBe(false);
  });

  it('an "error" event marks the message, toasts, refreshes, and ends the stream', () => {
    const events: ChatStreamEvent[] = [
      { type: 'start', data: { messageId: 'm1', createdAt: '' } },
      { type: 'error', data: { messageId: 'm1', error: 'Provider failed' } },
    ];
    streamService.streamChat.and.returnValue(of(...events));

    facade.sendMessage('conv-1', 'Hello');

    expect(store.setMessageError).toHaveBeenCalledWith('m1', 'Provider failed');
    expect(toast.error).toHaveBeenCalledWith('Provider failed');
    expect(store.refreshActiveConversation).toHaveBeenCalledWith('conv-1');
    expect(facade.isStreaming()).toBe(false);
  });

  it('an observable-level error (e.g. network failure) toasts a message and ends the stream', () => {
    streamService.streamChat.and.returnValue(throwError(() => new Error('network down')));

    facade.sendMessage('conv-1', 'Hello');

    expect(toast.error).toHaveBeenCalledWith('network down');
    expect(store.refreshActiveConversation).toHaveBeenCalledWith('conv-1');
    expect(facade.isStreaming()).toBe(false);
  });

  it('a "stopped" event (server-side abort ack) refreshes the conversation and ends the stream', () => {
    const events: ChatStreamEvent[] = [
      { type: 'start', data: { messageId: 'm1', createdAt: '' } },
      { type: 'stopped', data: { messageId: 'm1' } },
    ];
    streamService.streamChat.and.returnValue(of(...events));

    facade.sendMessage('conv-1', 'Hello');

    expect(store.refreshActiveConversation).toHaveBeenCalledWith('conv-1');
    expect(facade.isStreaming()).toBe(false);
  });
});
