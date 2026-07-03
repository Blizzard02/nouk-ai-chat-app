import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { ConversationStore } from '../../core/services/conversation-store.service';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

const HANDSET_QUERY = '(max-width: 768px)';

@Component({
  selector: 'app-shell',
  imports: [MatSidenavModule, RouterOutlet, HeaderComponent, SidebarComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly store = inject(ConversationStore);

  readonly isHandset = toSignal(
    this.breakpointObserver.observe(HANDSET_QUERY).pipe(map((result) => result.matches)),
    { initialValue: this.breakpointObserver.isMatched(HANDSET_QUERY) },
  );

  readonly sidenavMode = computed(() => (this.isHandset() ? 'over' : 'side'));
  readonly sidenavOpened = signal(!this.breakpointObserver.isMatched(HANDSET_QUERY));

  constructor() {
    this.store.loadProviders();
  }

  toggleSidenav(): void {
    this.sidenavOpened.update((opened) => !opened);
  }

  onConversationSelected(): void {
    if (this.isHandset()) {
      this.sidenavOpened.set(false);
    }
  }
}
