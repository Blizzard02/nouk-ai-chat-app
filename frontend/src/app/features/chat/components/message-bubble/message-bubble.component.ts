import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatMessage } from '../../../../models';
import { MarkdownContentComponent } from '../../../../shared/components/markdown-content/markdown-content.component';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-message-bubble',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MarkdownContentComponent,
  ],
  templateUrl: './message-bubble.component.html',
  styleUrl: './message-bubble.component.scss',
})
export class MessageBubbleComponent {
  readonly message = input.required<ChatMessage>();
  readonly isLastAssistant = input(false);
  readonly actionsDisabled = input(false);
  readonly streaming = input(false);

  readonly editMessage = output<string>();
  readonly regenerateRequested = output<void>();

  private readonly toast = inject(ToastService);

  readonly editing = signal(false);
  readonly draftContent = signal('');
  readonly copied = signal(false);

  readonly isUser = computed(() => this.message().role === 'user');

  startEdit(): void {
    this.draftContent.set(this.message().content);
    this.editing.set(true);
  }

  confirmEdit(): void {
    const content = this.draftContent().trim();
    if (content && content !== this.message().content) {
      this.editMessage.emit(content);
    }
    this.editing.set(false);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  onEditKeydown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    keyboardEvent.preventDefault();
    this.confirmEdit();
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.message().content);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      this.toast.error('Could not copy to clipboard.');
    }
  }
}
