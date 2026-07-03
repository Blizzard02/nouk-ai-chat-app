import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: '',
  styleUrl: './skeleton.component.scss',
  host: {
    class: 'app-skeleton',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'radius()',
  },
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('16px');
  readonly radius = input('var(--app-radius-sm)');
}
