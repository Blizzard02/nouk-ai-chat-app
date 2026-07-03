import { Component, ElementRef, effect, inject, output, viewChild } from '@angular/core';
import { ChatFacade } from '../../services/chat.facade';
import { ConversationStore } from '../../../../core/services/conversation-store.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';

const STICK_TO_BOTTOM_THRESHOLD_PX = 120;

@Component({
  selector: 'app-message-list',
  imports: [MessageBubbleComponent, TypingIndicatorComponent, EmptyStateComponent],
  templateUrl: './message-list.component.html',
  styleUrl: './message-list.component.scss',
})
export class MessageListComponent {
  protected readonly store = inject(ConversationStore);
  protected readonly facade = inject(ChatFacade);

  readonly editMessage = output<{ messageId: string; content: string }>();
  readonly regenerateRequested = output<void>();

  private readonly scrollAnchor = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');
  private readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  private shouldStickToBottom = true;

  constructor() {
    effect(() => {
      this.store.activeConversation();
      this.facade.isAwaitingFirstToken();
      queueMicrotask(() => this.maybeScrollToBottom());
    });
  }

  onScroll(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (!el) return;
    this.shouldStickToBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_THRESHOLD_PX;
  }

  private maybeScrollToBottom(): void {
    if (!this.shouldStickToBottom) return;
    this.scrollAnchor()?.nativeElement.scrollIntoView({ block: 'end' });
  }
}
