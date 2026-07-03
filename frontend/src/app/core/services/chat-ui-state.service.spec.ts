import { TestBed } from '@angular/core/testing';
import { ChatUiStateService } from './chat-ui-state.service';

describe('ChatUiStateService', () => {
  let service: ChatUiStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatUiStateService);
  });

  it('starts with the settings panel closed', () => {
    expect(service.settingsPanelOpen()).toBe(false);
  });

  it('toggleSettingsPanel() flips the open state each call', () => {
    service.toggleSettingsPanel();
    expect(service.settingsPanelOpen()).toBe(true);

    service.toggleSettingsPanel();
    expect(service.settingsPanelOpen()).toBe(false);
  });

  it('closeSettingsPanel() always sets it closed, even if already closed', () => {
    service.closeSettingsPanel();
    expect(service.settingsPanelOpen()).toBe(false);

    service.toggleSettingsPanel();
    service.closeSettingsPanel();
    expect(service.settingsPanelOpen()).toBe(false);
  });
});
