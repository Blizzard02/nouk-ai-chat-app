import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

const MAX_TEXTAREA_HEIGHT_PX = 200;

@Component({
  selector: 'app-composer',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './composer.component.html',
  styleUrl: './composer.component.scss',
})
export class ComposerComponent {
  readonly streaming = input(false);
  readonly disabled = input(false);

  readonly send = output<string>();
  readonly stop = output<void>();

  readonly draft = signal('');

  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  onInput(): void {
    const el = this.textarea()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }

  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    keyboardEvent.preventDefault();
    this.submit();
  }

  submit(): void {
    const value = this.draft().trim();
    if (!value || this.streaming() || this.disabled()) return;
    this.send.emit(value);
    this.draft.set('');
    const el = this.textarea()?.nativeElement;
    if (el) el.style.height = 'auto';
  }
}
