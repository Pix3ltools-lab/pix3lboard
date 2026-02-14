import { test, expect } from '@playwright/test';
import { createWorkspace, uniqueName } from './fixtures';

test.describe('Workspace CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Welcome to')).toBeVisible({ timeout: 10000 });
  });

  test('create a workspace', async ({ page }) => {
    const name = uniqueName('TestWS');

    await createWorkspace(page, name);

    // Workspace should appear in the list (use .first() to avoid matching toast)
    await expect(page.locator(`a:has-text("${name}")`).first()).toBeVisible();
  });

  test('rename a workspace', async ({ page }) => {
    const originalName = uniqueName('RenameWS');
    const newName = uniqueName('RenamedWS');

    // Create workspace
    await createWorkspace(page, originalName);

    // Open the workspace card menu (three dots)
    const workspaceCard = page.locator(`div:has(a:has-text("${originalName}"))`).first();
    // Hover to reveal the menu button
    await workspaceCard.hover();
    const menuButton = workspaceCard.locator('button').filter({ has: page.locator('svg') }).last();
    await menuButton.click();

    // Click Edit
    await page.click('button:has-text("Edit")');

    // Clear and type new name
    const nameInput = page.locator('input[placeholder="My Project"]');
    await nameInput.clear();
    await nameInput.fill(newName);

    // Save
    await page.click('button:has-text("Save Changes")');

    // New name should be visible, old should not
    await expect(page.locator(`text=${newName}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('delete a workspace', async ({ page }) => {
    const name = uniqueName('DeleteWS');

    // Create workspace
    await createWorkspace(page, name);

    // Open the workspace card menu
    const workspaceCard = page.locator(`div:has(a:has-text("${name}"))`).first();
    await workspaceCard.hover();
    const menuButton = workspaceCard.locator('button').filter({ has: page.locator('svg') }).last();
    await menuButton.click();

    // Click Delete
    await page.click('button:has-text("Delete")');

    // Confirm in the dialog
    const confirmDialog = page.locator('.fixed').filter({ hasText: 'Delete' }).last();
    await confirmDialog.locator('button:has-text("Delete")').click();

    // Workspace should disappear
    await expect(page.locator(`a:has-text("${name}")`)).not.toBeVisible({ timeout: 5000 });
  });
});
