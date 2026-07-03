import { Component, OnInit, computed, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ConversationStore } from '../../core/services/conversation-store.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ConversationListItemComponent } from '../../shared/components/conversation-list-item/conversation-list-item.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-sidebar',
  imports: [MatButtonModule, MatIconModule, ConversationListItemComponent, SkeletonComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  protected readonly store = inject(ConversationStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly conversationSelected = output<void>();

  readonly activeId = computed(() => this.store.activeConversation()?.id ?? null);
  readonly skeletonRows = [1, 2, 3, 4];

  ngOnInit(): void {
    this.store.loadSummaries();
  }

  newChat(): void {
    this.store.createConversation((conversation) => {
      this.router.navigate(['/c', conversation.id]);
      this.conversationSelected.emit();
    });
  }

  open(id: string): void {
    this.router.navigate(['/c', id]);
    this.conversationSelected.emit();
  }

  rename(id: string, title: string): void {
    this.store.renameConversation(id, title);
  }

  remove(id: string): void {
    const data: ConfirmDialogData = {
      title: 'Delete conversation?',
      message: 'This permanently removes the conversation and all of its messages.',
      confirmLabel: 'Delete',
      destructive: true,
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '360px' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        const wasActive = this.activeId() === id;
        this.store.deleteConversation(id, () => {
          if (wasActive) {
            this.router.navigate(['/']);
          }
        });
      });
  }
}
