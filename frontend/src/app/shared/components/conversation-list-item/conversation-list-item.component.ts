import { Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConversationSummary } from '../../../models';

@Component({
  selector: 'app-conversation-list-item',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './conversation-list-item.component.html',
  styleUrl: './conversation-list-item.component.scss',
})
export class ConversationListItemComponent {
  readonly summary = input.required<ConversationSummary>();
  readonly active = input(false);

  readonly opened = output<void>();
  readonly rename = output<string>();
  readonly deleteConversation = output<void>();

  readonly editing = signal(false);
  readonly draftTitle = signal('');

  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  constructor() {
    effect(() => {
      if (this.editing()) {
        queueMicrotask(() => this.titleInput()?.nativeElement.select());
      }
    });
  }

  startEditing(): void {
    this.draftTitle.set(this.summary().title);
    this.editing.set(true);
  }

  confirmEdit(): void {
    const title = this.draftTitle().trim();
    if (title && title !== this.summary().title) {
      this.rename.emit(title);
    }
    this.editing.set(false);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }
}
