import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConversationApiService } from './conversation-api.service';
import { ConversationStore } from './conversation-store.service';
import { ToastService } from './toast.service';
import { ChatMessage, Conversation } from '../../models';

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  const now = new Date().toISOString();
  return {
    id: 'c1',
    title: 'New chat',
    messages: [],
    settings: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1024,
      systemPrompt: '',
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    role: 'user',
    content: 'hi',
    createdAt: new Date().toISOString(),
    tokenEstimate: 1,
    ...overrides,
  };
}

describe('ConversationStore', () => {
  let store: ConversationStore;
  let api: jasmine.SpyObj<ConversationApiService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    api = jasmine.createSpyObj('ConversationApiService', [
      'listProviders',
      'listConversations',
      'getConversation',
      'createConversation',
      'renameConversation',
      'updateSettings',
      'deleteConversation',
    ]);
    toast = jasmine.createSpyObj('ToastService', ['error', 'info']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ConversationApiService, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    });
    store = TestBed.inject(ConversationStore);
  });

  it('loadSummaries populates summaries and toggles the loading flag', () => {
    api.listConversations.and.returnValue(
      of([{ id: 'a', title: 'A', createdAt: '', updatedAt: '' }]),
    );

    store.loadSummaries();

    expect(store.summaries().length).toBe(1);
    expect(store.loadingSummaries()).toBe(false);
  });

  it('loadSummaries surfaces a toast on failure and still clears the loading flag', () => {
    api.listConversations.and.returnValue(throwError(() => new Error('boom')));

    store.loadSummaries();

    expect(toast.error).toHaveBeenCalled();
    expect(store.loadingSummaries()).toBe(false);
  });

  it('loadConversation sets the active conversation from the API response', () => {
    const conversation = makeConversation();
    api.getConversation.and.returnValue(of(conversation));

    store.loadConversation('c1');

    expect(store.activeConversation()).toEqual(conversation);
    expect(store.loadingConversation()).toBe(false);
  });

  it('refreshActiveConversation only applies the result if it is still the active conversation', () => {
    store.activeConversation.set(makeConversation({ id: 'c1' }));
    const updated = makeConversation({ id: 'c1', title: 'Updated' });
    api.getConversation.and.returnValue(of(updated));

    store.refreshActiveConversation('c1');
    expect(store.activeConversation()?.title).toBe('Updated');

    // Simulate the user having navigated away before the refresh resolved.
    store.activeConversation.set(makeConversation({ id: 'c2' }));
    api.getConversation.and.returnValue(of(makeConversation({ id: 'c1', title: 'Stale' })));
    store.refreshActiveConversation('c1');
    expect(store.activeConversation()?.id).toBe('c2');
  });

  it('createConversation prepends a summary, sets it active, and invokes the callback', () => {
    const conversation = makeConversation({ id: 'new-id', title: 'New chat' });
    api.createConversation.and.returnValue(of(conversation));
    let callbackArg: Conversation | undefined;

    store.createConversation((c) => (callbackArg = c));

    expect(store.summaries()[0].id).toBe('new-id');
    expect(store.activeConversation()?.id).toBe('new-id');
    expect(callbackArg?.id).toBe('new-id');
  });

  it('renameConversation updates both the summary list and the active conversation', () => {
    store.summaries.set([{ id: 'c1', title: 'Old', createdAt: '', updatedAt: '' }]);
    store.activeConversation.set(makeConversation({ id: 'c1', title: 'Old' }));
    api.renameConversation.and.returnValue(of(makeConversation({ id: 'c1', title: 'Renamed' })));

    store.renameConversation('c1', 'Renamed');

    expect(store.summaries()[0].title).toBe('Renamed');
    expect(store.activeConversation()?.title).toBe('Renamed');
  });

  it('deleteConversation removes the summary, clears active if it was selected, and invokes the callback', () => {
    store.summaries.set([{ id: 'c1', title: 'A', createdAt: '', updatedAt: '' }]);
    store.activeConversation.set(makeConversation({ id: 'c1' }));
    api.deleteConversation.and.returnValue(of(undefined));
    let called = false;

    store.deleteConversation('c1', () => (called = true));

    expect(store.summaries().length).toBe(0);
    expect(store.activeConversation()).toBeNull();
    expect(called).toBe(true);
  });

  it('updateSettings applies an optimistic local merge before the API call resolves', () => {
    store.activeConversation.set(makeConversation({ id: 'c1' }));
    api.updateSettings.and.returnValue(of(makeConversation()));

    store.updateSettings('c1', { temperature: 1.9 });

    expect(store.activeConversation()?.settings.temperature).toBe(1.9);
  });

  it('addOptimisticMessage appends to the active conversation messages', () => {
    store.activeConversation.set(makeConversation({ id: 'c1', messages: [] }));
    store.addOptimisticMessage(makeMessage({ id: 'm1' }));
    expect(store.activeConversation()?.messages.length).toBe(1);
  });

  it('appendToMessage concatenates content onto the matching message only', () => {
    store.activeConversation.set(
      makeConversation({
        messages: [
          makeMessage({ id: 'm1', content: 'Hello' }),
          makeMessage({ id: 'm2', content: 'X' }),
        ],
      }),
    );

    store.appendToMessage('m1', ' world');

    const messages = store.activeConversation()!.messages;
    expect(messages.find((m) => m.id === 'm1')?.content).toBe('Hello world');
    expect(messages.find((m) => m.id === 'm2')?.content).toBe('X');
  });

  it('setMessageError sets the error field on only the targeted message', () => {
    store.activeConversation.set(
      makeConversation({ messages: [makeMessage({ id: 'm1' }), makeMessage({ id: 'm2' })] }),
    );

    store.setMessageError('m1', 'failed');

    const messages = store.activeConversation()!.messages;
    expect(messages.find((m) => m.id === 'm1')?.error).toBe('failed');
    expect(messages.find((m) => m.id === 'm2')?.error).toBeUndefined();
  });

  it('truncateAfterMessage overwrites the target content and drops everything after it', () => {
    store.activeConversation.set(
      makeConversation({
        messages: [
          makeMessage({ id: 'm1', role: 'user', content: 'original' }),
          makeMessage({ id: 'm2', role: 'assistant', content: 'reply' }),
        ],
      }),
    );

    store.truncateAfterMessage('m1', 'edited');

    const messages = store.activeConversation()!.messages;
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('edited');
  });

  it('dropLastAssistantMessage removes a trailing assistant message but leaves a trailing user message alone', () => {
    store.activeConversation.set(
      makeConversation({
        messages: [
          makeMessage({ id: 'm1', role: 'user' }),
          makeMessage({ id: 'm2', role: 'assistant' }),
        ],
      }),
    );
    store.dropLastAssistantMessage();
    expect(store.activeConversation()!.messages.length).toBe(1);

    store.dropLastAssistantMessage();
    expect(store.activeConversation()!.messages.length).toBe(1);
  });

  it('touchActiveConversationTitle updates both the active conversation and its summary entry', () => {
    store.summaries.set([{ id: 'c1', title: 'Old', createdAt: '', updatedAt: '' }]);
    store.activeConversation.set(makeConversation({ id: 'c1', title: 'Old' }));

    store.touchActiveConversationTitle('New title');

    expect(store.activeConversation()?.title).toBe('New title');
    expect(store.summaries()[0].title).toBe('New title');
  });
});
