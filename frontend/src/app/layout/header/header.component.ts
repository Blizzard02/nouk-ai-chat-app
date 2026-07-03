import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatUiStateService } from '../../core/services/chat-ui-state.service';
import { ConversationStore } from '../../core/services/conversation-store.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-header',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  protected readonly store = inject(ConversationStore);
  protected readonly theme = inject(ThemeService);
  protected readonly uiState = inject(ChatUiStateService);

  readonly menuToggle = output<void>();

  readonly editing = signal(false);
  readonly draftTitle = signal('');

  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  startEditing(): void {
    const conversation = this.store.activeConversation();
    if (!conversation) return;
    this.draftTitle.set(conversation.title);
    this.editing.set(true);
    queueMicrotask(() => this.titleInput()?.nativeElement.select());
  }

  confirmEdit(): void {
    const conversation = this.store.activeConversation();
    const title = this.draftTitle().trim();
    if (conversation && title && title !== conversation.title) {
      this.store.renameConversation(conversation.id, title);
    }
    this.editing.set(false);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }
}
