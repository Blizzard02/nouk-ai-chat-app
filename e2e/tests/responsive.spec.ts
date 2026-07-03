import { test, expect } from '@playwright/test';

test.describe('responsive layout', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('on mobile the sidebar starts hidden and opens as an overlay via the menu button', async ({ page }) => {
    await page.goto('/');

    const sidenav = page.locator('mat-sidenav');
    await expect(sidenav).toHaveClass(/mat-drawer-over/);
    await expect(sidenav).not.toHaveClass(/mat-drawer-opened/);

    await page.locator('button[aria-label="Toggle sidebar"]').click();
    await expect(sidenav).toHaveClass(/mat-drawer-opened/);
  });

  test('selecting a conversation on mobile closes the sidebar overlay', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[aria-label="Toggle sidebar"]').click();

    const sidenav = page.locator('mat-sidenav');
    await expect(sidenav).toHaveClass(/mat-drawer-opened/);

    await page.getByRole('button', { name: 'New chat' }).first().click();

    await expect(page).toHaveURL(/\/c\/[\w-]+/);
    await expect(sidenav).not.toHaveClass(/mat-drawer-opened/);
  });
});

test.describe('desktop layout', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('on desktop the sidebar is visible by default in "side" mode', async ({ page }) => {
    await page.goto('/');

    const sidenav = page.locator('mat-sidenav');
    await expect(sidenav).toHaveClass(/mat-drawer-side/);
    await expect(sidenav).toHaveClass(/mat-drawer-opened/);
  });
});
