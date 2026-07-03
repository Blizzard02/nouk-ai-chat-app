import { test, expect } from '@playwright/test';
import { startNewConversation } from './helpers';

test.describe('chat error handling', () => {
  test('sending a message without a configured AI provider surfaces a graceful toast, not a native alert, and leaves the conversation empty', async ({
    page,
    request,
  }) => {
    const providersRes = await request.get('http://localhost:3000/api/providers');
    const providers = (await providersRes.json()) as { configured: boolean }[];
    test.skip(
      providers.some((p) => p.configured),
      'A real provider API key is configured in this environment — skipping the deterministic no-key error path.'
    );

    let nativeDialogSeen = false;
    page.on('dialog', () => (nativeDialogSeen = true));

    await startNewConversation(page);
    await page.getByPlaceholder('Message Nouk...').fill('Hello, can you help me?');
    await page.locator('button[aria-label="Send message"]').click();

    await expect(page.locator('.mat-mdc-snack-bar-label').first()).toContainText(/API key/i);
    await expect(page.getByText('Say hello')).toBeVisible();
    expect(nativeDialogSeen).toBe(false);
  });

  test('a request against a deleted conversation does not crash the app', async ({ page, request }) => {
    const created = await (
      await request.post('http://localhost:3000/api/conversations')
    ).json();
    await request.delete(`http://localhost:3000/api/conversations/${created.id}`);

    await page.goto(`/c/${created.id}`);

    await expect(page.getByText('Conversation not found')).toBeVisible();
  });
});
