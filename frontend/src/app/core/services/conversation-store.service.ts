import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ConversationApiService } from './conversation-api.service';
import { ToastService } from './toast.service';
import {
  ChatMessage,
  Conversation,
  ConversationSettings,
  ConversationSummary,
  ProviderInfo,
} from '../../models';

/**
 * Single source of truth for conversation list + active conversation
 * state. Shared by the sidebar (layout) and the chat feature so both
 * stay in sync without prop-drilling or duplicated fetches.
 */
@Injectable({ providedIn: 'root' })
export class ConversationStore {
  private readonly api = inject(ConversationApiService);
  private readonly toast = inject(ToastService);

  readonly summaries = signal<ConversationSummary[]>([]);
  readonly activeConversation = signal<Conversation | null>(null);
  readonly providers = signal<ProviderInfo[]>([]);
  readonly loadingSummaries = signal(false);
  readonly loadingConversation = signal(false);

  loadProviders(): void {
    this.api.listProviders().subscribe({
      next: (providers) => this.providers.set(providers),
      error: () => this.toast.error('Could not load AI providers from the server.'),
    });
  }

  loadSummaries(): void {
    this.loadingSummaries.set(true);
    this.api
      .listConversations()
      .pipe(finalize(() => this.loadingSummaries.set(false)))
      .subscribe({
        next: (summaries) => this.summaries.set(summaries),
        error: () => this.toast.error('Could not load your conversations.'),
      });
  }

  loadConversation(id: string): void {
    this.loadingConversation.set(true);
    this.activeConversation.set(null);
    this.api
      .getConversation(id)
      .pipe(finalize(() => this.loadingConversation.set(false)))
      .subscribe({
        next: (conversation) => this.activeConversation.set(conversation),
        error: () => this.toast.error('Could not load that conversation.'),
      });
  }

  /**
   * Re-syncs the active conversation from the server without the
   * null/loading flash `loadConversation` causes — used after a
   * stream finishes to pick up server-assigned message ids.
   */
  refreshActiveConversation(id: string): void {
    this.api.getConversation(id).subscribe({
      next: (conversation) => {
        if (this.activeConversation()?.id === id) {
          this.activeConversation.set(conversation);
        }
      },
      error: () => this.toast.error('Could not refresh the conversation.'),
    });
  }

  createConversation(onCreated: (conversation: Conversation) => void): void {
    this.api.createConversation().subscribe({
      next: (conversation) => {
        this.summaries.update((list) => [
          {
            id: conversation.id,
            title: conversation.title,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          },
          ...list,
        ]);
        this.activeConversation.set(conversation);
        onCreated(conversation);
      },
      error: () => this.toast.error('Could not start a new conversation.'),
    });
  }

  renameConversation(id: string, title: string): void {
    this.api.renameConversation(id, title).subscribe({
      next: (conversation) => {
        this.patchSummary(id, { title: conversation.title, updatedAt: conversation.updatedAt });
        if (this.activeConversation()?.id === id) {
          this.activeConversation.set(conversation);
        }
      },
      error: () => this.toast.error('Could not rename the conversation.'),
    });
  }

  deleteConversation(id: string, onDeleted: () => void): void {
    this.api.deleteConversation(id).subscribe({
      next: () => {
        this.summaries.update((list) => list.filter((s) => s.id !== id));
        if (this.activeConversation()?.id === id) {
          this.activeConversation.set(null);
        }
        onDeleted();
      },
      error: () => this.toast.error('Could not delete the conversation.'),
    });
  }

  updateSettings(id: string, settings: Partial<ConversationSettings>): void {
    const previous = this.activeConversation();
    if (previous && previous.id === id) {
      this.activeConversation.set({ ...previous, settings: { ...previous.settings, ...settings } });
    }
    this.api.updateSettings(id, settings).subscribe({
      error: () => this.toast.error('Could not save conversation settings.'),
    });
  }

  addOptimisticMessage(message: ChatMessage): void {
    this.mutateMessages((messages) => [...messages, message]);
  }

  appendToMessage(messageId: string, chunk: string): void {
    this.mutateMessages((messages) =>
      messages.map((m) => (m.id === messageId ? { ...m, content: m.content + chunk } : m)),
    );
  }

  setMessageError(messageId: string, error: string): void {
    this.mutateMessages((messages) =>
      messages.map((m) => (m.id === messageId ? { ...m, error } : m)),
    );
  }

  truncateAfterMessage(messageId: string, newContent: string): void {
    this.mutateMessages((messages) => {
      const index = messages.findIndex((m) => m.id === messageId);
      if (index === -1) return messages;
      const edited = { ...messages[index], content: newContent };
      return [...messages.slice(0, index), edited];
    });
  }

  dropLastAssistantMessage(): void {
    this.mutateMessages((messages) => {
      const last = messages[messages.length - 1];
      return last?.role === 'assistant' ? messages.slice(0, -1) : messages;
    });
  }

  touchActiveConversationTitle(title: string): void {
    const conversation = this.activeConversation();
    if (!conversation) return;
    this.activeConversation.set({ ...conversation, title });
    this.patchSummary(conversation.id, { title });
  }

  private patchSummary(id: string, patch: Partial<ConversationSummary>): void {
    this.summaries.update((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  private mutateMessages(updater: (messages: ChatMessage[]) => ChatMessage[]): void {
    const conversation = this.activeConversation();
    if (!conversation) return;
    this.activeConversation.set({ ...conversation, messages: updater(conversation.messages) });
  }
}
