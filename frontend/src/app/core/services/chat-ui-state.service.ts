import { Injectable, signal } from '@angular/core';

/**
 * Cross-component UI state for the chat feature (e.g. whether the
 * settings drawer is open). Lives in core because the trigger button
 * sits in the layout header while the drawer itself renders inside
 * the lazy-loaded chat feature — a plain shared service is the
 * simplest way to connect the two without route-level coupling.
 */
@Injectable({ providedIn: 'root' })
export class ChatUiStateService {
  readonly settingsPanelOpen = signal(false);

  toggleSettingsPanel(): void {
    this.settingsPanelOpen.update((open) => !open);
  }

  closeSettingsPanel(): void {
    this.settingsPanelOpen.set(false);
  }
}
