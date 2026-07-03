import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ChatUiStateService } from '../../../../core/services/chat-ui-state.service';
import { ConversationStore } from '../../../../core/services/conversation-store.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ChatFacade } from '../../services/chat.facade';
import { ComposerComponent } from '../composer/composer.component';
import { MessageListComponent } from '../message-list/message-list.component';
import { SettingsPanelComponent } from '../settings-panel/settings-panel.component';

@Component({
  selector: 'app-chat-page',
  imports: [
    ComposerComponent,
    MessageListComponent,
    SettingsPanelComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent {
  protected readonly store = inject(ConversationStore);
  protected readonly facade = inject(ChatFacade);
  protected readonly uiState = inject(ChatUiStateService);

  private readonly route = inject(ActivatedRoute);

  private readonly conversationId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  readonly skeletonRows = [1, 2, 3];

  constructor() {
    effect(() => {
      const id = this.conversationId();
      if (id) {
        this.store.loadConversation(id);
      }
    });
  }

  onSend(content: string): void {
    const id = this.conversationId();
    if (id) this.facade.sendMessage(id, content);
  }

  onRegenerate(): void {
    const id = this.conversationId();
    if (id) this.facade.regenerate(id);
  }

  onEditMessage(event: { messageId: string; content: string }): void {
    const id = this.conversationId();
    if (id) this.facade.editMessage(id, event.messageId, event.content);
  }
}
