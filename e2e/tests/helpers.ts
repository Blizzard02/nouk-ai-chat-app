import { Page, expect } from '@playwright/test';

/** Navigates to the empty state and starts a brand new conversation. */
export async function startNewConversation(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New chat' }).first().click();
  await expect(page).toHaveURL(/\/c\/[\w-]+/);
  await expect(page.getByPlaceholder('Message Nouk...')).toBeVisible();
}
