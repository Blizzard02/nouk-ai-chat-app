import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ConversationStore } from '../../../../core/services/conversation-store.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-chat-welcome',
  imports: [MatButtonModule, MatIconModule, EmptyStateComponent],
  templateUrl: './chat-welcome.component.html',
  styleUrl: './chat-welcome.component.scss',
})
export class ChatWelcomeComponent {
  private readonly store = inject(ConversationStore);
  private readonly router = inject(Router);

  startChat(): void {
    this.store.createConversation((conversation) => {
      this.router.navigate(['/c', conversation.id]);
    });
  }
}
