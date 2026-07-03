import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, debounceTime } from 'rxjs';
import { ChatUiStateService } from '../../../../core/services/chat-ui-state.service';
import { ConversationStore } from '../../../../core/services/conversation-store.service';
import { ModelInfo, ProviderName } from '../../../../models';

@Component({
  selector: 'app-settings-panel',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSliderModule,
    MatTooltipModule,
  ],
  templateUrl: './settings-panel.component.html',
  styleUrl: './settings-panel.component.scss',
})
export class SettingsPanelComponent {
  protected readonly store = inject(ConversationStore);
  protected readonly uiState = inject(ChatUiStateService);

  protected readonly conversation = this.store.activeConversation;

  protected readonly availableModels = computed<ModelInfo[]>(() => {
    const providerId = this.conversation()?.settings.provider;
    return this.store.providers().find((p) => p.id === providerId)?.models ?? [];
  });

  private readonly systemPrompt$ = new Subject<string>();

  constructor() {
    this.systemPrompt$.pipe(debounceTime(500), takeUntilDestroyed()).subscribe((prompt) => {
      const conversation = this.conversation();
      if (conversation) {
        this.store.updateSettings(conversation.id, { systemPrompt: prompt });
      }
    });
  }

  onProviderChange(event: MatSelectChange): void {
    const conversation = this.conversation();
    if (!conversation) return;
    const providerId = event.value as ProviderName;
    const provider = this.store.providers().find((p) => p.id === providerId);
    const model = provider?.models[0]?.id ?? conversation.settings.model;
    this.store.updateSettings(conversation.id, { provider: providerId, model });
  }

  onModelChange(event: MatSelectChange): void {
    const conversation = this.conversation();
    if (conversation) {
      this.store.updateSettings(conversation.id, { model: event.value as string });
    }
  }

  onTemperatureChange(value: number): void {
    const conversation = this.conversation();
    if (conversation) {
      this.store.updateSettings(conversation.id, { temperature: value });
    }
  }

  onMaxTokensChange(value: number): void {
    const conversation = this.conversation();
    if (conversation) {
      this.store.updateSettings(conversation.id, { maxTokens: value });
    }
  }

  onSystemPromptInput(value: string): void {
    this.systemPrompt$.next(value);
  }
}
