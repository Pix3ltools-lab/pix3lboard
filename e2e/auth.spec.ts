import { test, expect } from '@playwright/test';

const E2E_EMAIL = process.env.E2E_USER_EMAIL!;
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD!;

// Auth tests run with a clean browser — no saved storage state.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', E2E_EMAIL);
    await page.fill('#password', E2E_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/', { timeout: 15000 });
    await expect(page.locator('text=Welcome to')).toBeVisible();
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', E2E_EMAIL);
    await page.fill('#password', 'wrong-password-12345');
    await page.click('button[type="submit"]');

    // Should stay on /login and show an error message
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 });
  });

  test('dashboard without auth shows login prompt', async ({ page }) => {
    await page.goto('/');

    // The app shows the public dashboard without redirect —
    // unauthenticated users see a "Log in" prompt instead of workspaces
    await expect(page.locator('text=Log in to create workspaces')).toBeVisible({ timeout: 10000 });
    // The "Create Workspace" button should NOT be visible
    await expect(page.locator('button:has-text("Create Workspace")')).not.toBeVisible();
  });

  test('logout redirects to /login', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('#email', E2E_EMAIL);
    await page.fill('#password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });

    // Open user menu — click the chevron/avatar button in the header
    // The avatar button is the last interactive element in the header
    const userMenuTrigger = page.locator('header').locator('button').last();
    await userMenuTrigger.click();

    // Click Logout in the dropdown
    await page.click('text=Logout');

    // App redirects to / and shows unauthenticated dashboard
    await expect(page.locator('text=Log in to create workspaces')).toBeVisible({ timeout: 10000 });
  });
});
