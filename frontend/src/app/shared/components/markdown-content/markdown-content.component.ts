import { Component, ViewEncapsulation, computed, input } from '@angular/core';
import { renderMarkdown } from './markdown-renderer';

@Component({
  selector: 'app-markdown-content',
  template: `<div class="markdown" [innerHTML]="renderedHtml()"></div>`,
  styleUrl: './markdown-content.component.scss',
  // Content is injected via [innerHTML], so Angular's emulated
  // encapsulation attributes never reach it — styles must be global
  // within this component's own well-namespaced class names instead.
  encapsulation: ViewEncapsulation.None,
})
export class MarkdownContentComponent {
  readonly content = input.required<string>();

  // Bound as a plain string (not SafeHtml) so Angular's built-in HTML
  // sanitizer still runs — messages can contain arbitrary user- or
  // model-generated text, so raw HTML must never bypass sanitization.
  protected readonly renderedHtml = computed(() => renderMarkdown(this.content()));
}
