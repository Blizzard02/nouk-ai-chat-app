import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const STORAGE_KEY = 'ai-chat-app:theme';

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('defaults to the OS color scheme preference when nothing is stored', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('dark');
  });

  it('loads a previously persisted preference over the OS default', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('light');
  });

  it('toggle() flips between light and dark', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    const service = TestBed.inject(ThemeService);

    service.toggle();
    expect(service.mode()).toBe('dark');

    service.toggle();
    expect(service.mode()).toBe('light');
  });

  it('persists the mode to localStorage and reflects it on the document element', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    const service = TestBed.inject(ThemeService);

    service.toggle();
    TestBed.flushEffects();

    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
