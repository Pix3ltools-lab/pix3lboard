import { test as setup, expect } from '@playwright/test';

const E2E_EMAIL = process.env.E2E_USER_EMAIL!;
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD!;

setup('authenticate', async ({ page }) => {
  if (!E2E_EMAIL || !E2E_PASSWORD) {
    throw new Error(
      'Missing E2E_USER_EMAIL or E2E_USER_PASSWORD env vars. ' +
      'Set them before running tests.'
    );
  }

  await page.goto('/login');

  // Fill credentials
  await page.fill('#email', E2E_EMAIL);
  await page.fill('#password', E2E_PASSWORD);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL('/', { timeout: 15000 });

  // Verify we see the authenticated dashboard
  await expect(page.locator('text=Welcome to')).toBeVisible();

  // Save auth state for reuse
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
