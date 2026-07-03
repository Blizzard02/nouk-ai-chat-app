import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatStreamService } from '../../../core/services/chat-stream.service';
import { ConversationStore } from '../../../core/services/conversation-store.service';
import { ToastService } from '../../../core/services/toast.service';
import { ChatAction, ChatMessage } from '../../../models';
import { estimateTokens } from '../../../shared/utils/token-estimate';

/**
 * Orchestrates a single streaming exchange: optimistic local updates
 * for instant feedback, then a silent resync with the server once the
 * stream ends so message ids/content stay authoritative.
 */
@Injectable({ providedIn: 'root' })
export class ChatFacade {
  private readonly streamService = inject(ChatStreamService);
  private readonly store = inject(ConversationStore);
  private readonly toast = inject(ToastService);

  readonly isStreaming = signal(false);
  readonly isAwaitingFirstToken = signal(false);
  readonly streamingMessageId = signal<string | null>(null);

  private subscription: Subscription | null = null;

  sendMessage(conversationId: string, content: string): void {
    const optimisticUser: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      tokenEstimate: estimateTokens(content),
    };
    this.store.addOptimisticMessage(optimisticUser);
    this.runStream(conversationId, { action: 'send', content });
  }

  regenerate(conversationId: string): void {
    this.store.dropLastAssistantMessage();
    this.runStream(conversationId, { action: 'regenerate' });
  }

  editMessage(conversationId: string, messageId: string, content: string): void {
    this.store.truncateAfterMessage(messageId, content);
    this.runStream(conversationId, { action: 'edit', messageId, content });
  }

  stop(): void {
    this.subscription?.unsubscribe();
    this.finishStream();
  }

  private runStream(conversationId: string, action: ChatAction): void {
    this.isStreaming.set(true);
    this.isAwaitingFirstToken.set(true);

    this.subscription = this.streamService.streamChat(conversationId, action).subscribe({
      next: (event) => {
        switch (event.type) {
          case 'start':
            this.isAwaitingFirstToken.set(false);
            this.streamingMessageId.set(event.data.messageId);
            this.store.addOptimisticMessage({
              id: event.data.messageId,
              role: 'assistant',
              content: '',
              createdAt: event.data.createdAt,
              tokenEstimate: 0,
            });
            break;
          case 'token':
            if (this.streamingMessageId()) {
              this.store.appendToMessage(this.streamingMessageId()!, event.data.content);
            }
            break;
          case 'done':
            this.store.refreshActiveConversation(conversationId);
            break;
          case 'stopped':
            this.store.refreshActiveConversation(conversationId);
            break;
          case 'error':
            if (this.streamingMessageId()) {
              this.store.setMessageError(this.streamingMessageId()!, event.data.error);
            }
            this.toast.error(event.data.error);
            this.store.refreshActiveConversation(conversationId);
            break;
        }
      },
      error: (err: unknown) => {
        this.toast.error(
          err instanceof Error ? err.message : 'Something went wrong while streaming the response.',
        );
        this.store.refreshActiveConversation(conversationId);
        this.finishStream();
      },
      complete: () => this.finishStream(),
    });
  }

  private finishStream(): void {
    this.isStreaming.set(false);
    this.isAwaitingFirstToken.set(false);
    this.streamingMessageId.set(null);
    this.subscription = null;
  }
}
