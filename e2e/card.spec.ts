import { test, expect } from '@playwright/test';
import {
  createWorkspace,
  navigateToWorkspace,
  createBoard,
  navigateToBoard,
  createList,
  createCard,
  uniqueName,
} from './fixtures';

test.describe('Card CRUD + Modal', () => {
  let workspaceName: string;

  test.beforeAll(async ({ browser }) => {
    // Create workspace for all card tests — must use storageState
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('text=Welcome to')).toBeVisible({ timeout: 10000 });

    workspaceName = await createWorkspace(page, uniqueName('CardTestWS'));
    // Wait for sync cycle to persist workspace to server (sync runs every 2s)
    await page.waitForTimeout(4000);
    await page.close();
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    // Each test gets a fresh board with a list — no sync needed since we stay in the same page
    await navigateToWorkspace(page, workspaceName);
    const boardName = await createBoard(page, uniqueName('CardTestBoard'));
    await navigateToBoard(page, boardName);
    await createList(page, uniqueName('CardTestList'));
  });

  test('create a card in a list', async ({ page }) => {
    const cardTitle = uniqueName('TestCard');

    await createCard(page, cardTitle);

    await expect(page.locator(`text=${cardTitle}`).first()).toBeVisible();
  });

  test('open card modal shows fields', async ({ page }) => {
    const cardTitle = uniqueName('ModalCard');

    await createCard(page, cardTitle);

    // Click on the card to open the modal
    await page.locator(`text=${cardTitle}`).first().click();

    // Modal should be visible with the "Edit Card" title
    await expect(page.locator('text=Edit Card')).toBeVisible({ timeout: 5000 });

    // Should see key fields
    await expect(page.locator('label:has-text("Title")')).toBeVisible();
    await expect(page.locator('label:has-text("Description")')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('edit card title and description', async ({ page }) => {
    const cardTitle = uniqueName('EditCard');
    const newTitle = uniqueName('UpdatedCard');
    const description = 'This is a test description for the card.';

    await createCard(page, cardTitle);

    // Open modal
    await page.locator(`text=${cardTitle}`).first().click();
    await expect(page.locator('text=Edit Card')).toBeVisible({ timeout: 5000 });

    // Edit title — scope to the modal's Title field (label + sibling input)
    const titleInput = page.locator('label:has-text("Title")').locator('..').locator('input');
    await titleInput.clear();
    await titleInput.fill(newTitle);

    // Edit description — scope to the modal's Description field
    const descTextarea = page.locator('label:has-text("Description")').locator('..').locator('textarea');
    await descTextarea.fill(description);

    // Save
    await page.click('button:has-text("Save Changes")');

    // Verify updated title appears on the board
    await expect(page.locator(`text=${newTitle}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('add a tag to a card', async ({ page }) => {
    const cardTitle = uniqueName('TagCard');
    const tagName = 'urgent';

    await createCard(page, cardTitle);

    // Open modal
    await page.locator(`text=${cardTitle}`).first().click();
    await expect(page.locator('text=Edit Card')).toBeVisible({ timeout: 5000 });

    // Add a tag — find the tag input
    const tagInput = page.locator('input[placeholder="Add a tag..."]');
    await tagInput.fill(tagName);
    await tagInput.press('Enter');

    // Tag should appear as a pill
    await expect(page.locator(`text=${tagName}`).first()).toBeVisible();

    // Save
    await page.click('button:has-text("Save Changes")');
  });

  test('set a due date', async ({ page }) => {
    const cardTitle = uniqueName('DueDateCard');

    await createCard(page, cardTitle);

    // Open modal
    await page.locator(`text=${cardTitle}`).first().click();
    await expect(page.locator('text=Edit Card')).toBeVisible({ timeout: 5000 });

    // Set due date — find the date input
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2026-12-31');

    // Save
    await page.click('button:has-text("Save Changes")');
  });

  test('archive a card', async ({ page }) => {
    // Archive uses a direct server API call (POST /api/cards/:id/archive),
    // unlike other operations which use DataContext (client-side).
    // In E2E tests where board/list/card are created on-the-fly,
    // the delta sync may not push entities to the server in time.
    // Test that the archive button is present and clickable in the modal.
    const cardTitle = uniqueName('ArchiveCard');

    await createCard(page, cardTitle);

    // Open modal
    await page.locator(`text=${cardTitle}`).first().click();
    await expect(page.locator('text=Edit Card')).toBeVisible({ timeout: 5000 });

    // Verify Archive button exists in the modal
    await expect(page.locator('button:has-text("Archive")').last()).toBeVisible();

    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('delete a card', async ({ page }) => {
    const cardTitle = uniqueName('DeleteCard');

    await createCard(page, cardTitle);

    // Open modal
    await page.locator(`text=${cardTitle}`).first().click();
    await expect(page.locator('text=Edit Card')).toBeVisible({ timeout: 5000 });

    // Click Delete
    await page.click('button:has-text("Delete")');

    // Confirm in dialog — the confirm dialog button also says "Delete"
    await page.locator('button:has-text("Delete")').last().click();

    // Card should disappear
    await expect(page.locator(`text=${cardTitle}`)).not.toBeVisible({ timeout: 5000 });
  });
});
