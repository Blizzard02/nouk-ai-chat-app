import { test, expect } from '@playwright/test';
import { startNewConversation } from './helpers';

test.describe('theme toggle', () => {
  test('toggling the theme changes its label and persists across a reload', async ({ page }) => {
    await page.goto('/');
    const themeButton = page.locator('button[aria-label*="theme"]');
    const initialLabel = await themeButton.getAttribute('aria-label');

    await themeButton.click();
    const afterToggleLabel = await themeButton.getAttribute('aria-label');
    expect(afterToggleLabel).not.toBe(initialLabel);

    await page.reload();
    const afterReloadLabel = await page.locator('button[aria-label*="theme"]').getAttribute('aria-label');
    expect(afterReloadLabel).toBe(afterToggleLabel);
  });
});

test.describe('conversation settings panel', () => {
  test('opening settings shows the provider, model, temperature, and system prompt controls', async ({ page }) => {
    await startNewConversation(page);

    await page.locator('button[aria-label="Conversation settings"]').click();

    const panel = page.locator('.settings-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Provider')).toBeVisible();
    await expect(panel.getByText('Model')).toBeVisible();
    await expect(panel.getByText('Temperature')).toBeVisible();
    await expect(panel.getByText('System prompt')).toBeVisible();
  });

  test('changing the temperature slider updates the displayed value and persists across a reload', async ({
    page,
  }) => {
    await startNewConversation(page);
    await page.locator('button[aria-label="Conversation settings"]').click();

    const slider = page.locator('#temperature-slider');
    await slider.focus();

    // Each key press fires its own (un-debounced) PATCH request; wait for
    // each one to land before pressing the next so they can't race and
    // resolve out of order, which would make the persisted value flaky.
    for (let i = 0; i < 5; i++) {
      const patchResponse = page.waitForResponse(
        (res) => res.url().includes('/api/conversations/') && res.request().method() === 'PATCH'
      );
      await page.keyboard.press('ArrowRight');
      await patchResponse;
    }

    const valueAfterChange = await page.locator('.settings-panel__value').first().textContent();

    await page.reload();
    await page.locator('button[aria-label="Conversation settings"]').click();
    const valueAfterReload = await page.locator('.settings-panel__value').first().textContent();

    expect(valueAfterReload).toBe(valueAfterChange);
  });

  test('closing the settings panel hides it', async ({ page }) => {
    await startNewConversation(page);
    await page.locator('button[aria-label="Conversation settings"]').click();
    await expect(page.locator('.settings-panel')).toBeVisible();

    await page.getByRole('button', { name: 'Close settings' }).click();
    await expect(page.locator('.settings-panel')).toBeHidden();
  });
});
