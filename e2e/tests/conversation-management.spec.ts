import { test, expect } from '@playwright/test';
import { startNewConversation } from './helpers';

test.describe('conversation management', () => {
  test('creating a conversation navigates to it and shows it in the sidebar', async ({ page }) => {
    await startNewConversation(page);

    await expect(page.getByText('Say hello')).toBeVisible();
    const url = page.url();
    const conversationId = url.split('/c/')[1];
    await expect(page.getByRole('navigation', { name: 'Conversations' })).toContainText('New chat');
    expect(conversationId).toBeTruthy();
  });

  test('renaming a conversation from the sidebar menu updates the header title too', async ({ page }) => {
    await startNewConversation(page);

    await page.getByRole('button', { name: 'Conversation options' }).first().click();
    await page.getByRole('menuitem', { name: 'Rename' }).click();

    const input = page.locator('input.item--editing');
    await input.fill('My renamed chat');
    await input.press('Enter');

    await expect(page.getByRole('navigation', { name: 'Conversations' })).toContainText('My renamed chat');
    await expect(page.locator('.header__title-btn')).toContainText('My renamed chat');
  });

  test('renaming inline from the header title also updates the sidebar', async ({ page }) => {
    await startNewConversation(page);

    await page.locator('.header__title-btn').click();
    const headerInput = page.locator('.header__title-input');
    await headerInput.fill('Renamed from header');
    await headerInput.press('Enter');

    await expect(page.locator('.header__title-btn')).toContainText('Renamed from header');
    await expect(page.getByRole('navigation', { name: 'Conversations' })).toContainText('Renamed from header');
  });

  test('deleting a conversation asks for confirmation, then removes it and returns to the empty state', async ({
    page,
  }) => {
    await startNewConversation(page);
    await page.locator('.header__title-btn').click();
    const headerInput = page.locator('.header__title-input');
    await headerInput.fill('To be deleted');
    await headerInput.press('Enter');

    await page.getByRole('button', { name: 'Conversation options' }).first().click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    const dialog = page.getByRole('dialog', { name: 'Delete conversation?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Start a new conversation')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Conversations' })).not.toContainText('To be deleted');
  });

  test('cancelling the delete confirmation keeps the conversation', async ({ page }) => {
    await startNewConversation(page);
    await page.locator('.header__title-btn').click();
    const headerInput = page.locator('.header__title-input');
    await headerInput.fill('Keep me');
    await headerInput.press('Enter');

    await page.getByRole('button', { name: 'Conversation options' }).first().click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    const dialog = page.getByRole('dialog', { name: 'Delete conversation?' });
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.locator('.header__title-btn')).toContainText('Keep me');
  });
});
