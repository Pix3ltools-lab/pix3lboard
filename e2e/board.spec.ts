import { test, expect } from '@playwright/test';
import {
  createWorkspace,
  navigateToWorkspace,
  createBoard,
  navigateToBoard,
  createList,
  uniqueName,
} from './fixtures';

test.describe('Board + Lists', () => {
  let workspaceName: string;

  test.beforeAll(async ({ browser }) => {
    // Create a shared workspace for all board tests — must use storageState
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('text=Welcome to')).toBeVisible({ timeout: 10000 });
    workspaceName = await createWorkspace(page, uniqueName('BoardTestWS'));
    // Wait for sync cycle to persist workspace to server (sync runs every 2s)
    await page.waitForTimeout(4000);
    await page.close();
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);
  });

  test('create a board', async ({ page }) => {
    const boardName = uniqueName('TestBoard');

    await createBoard(page, boardName);

    // Board should appear in the boards list
    await expect(page.locator(`a:has-text("${boardName}")`).first()).toBeVisible();
  });

  test('open board shows Kanban view', async ({ page }) => {
    const boardName = uniqueName('KanbanBoard');

    await createBoard(page, boardName);
    await navigateToBoard(page, boardName);

    // Should see the empty board state with "Create Your First List" button
    await expect(page.locator('text=No Lists Yet')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Create Your First List")')).toBeVisible();
  });

  test('create a list', async ({ page }) => {
    const boardName = uniqueName('ListBoard');
    const listName = uniqueName('TodoList');

    await createBoard(page, boardName);
    await navigateToBoard(page, boardName);

    await createList(page, listName);

    // List header should be visible
    await expect(page.locator(`h3:has-text("${listName}")`)).toBeVisible();
  });

  test('rename a list', async ({ page }) => {
    const boardName = uniqueName('RenameListBoard');
    const listName = uniqueName('OldList');
    const newListName = uniqueName('NewList');

    await createBoard(page, boardName);
    await navigateToBoard(page, boardName);
    await createList(page, listName);

    // Click the menu button (MoreVertical icon) on the list header
    const listHeader = page.locator(`div:has(> div > h3:has-text("${listName}"))`).first();
    await listHeader.locator('button').last().click();

    // Click Rename
    await page.click('button:has-text("Rename")');

    // The rename input has autoFocus — use keyboard to type into the focused input
    await page.keyboard.press('Control+A');
    await page.keyboard.type(newListName);
    await page.keyboard.press('Enter');

    // New name should be visible
    await expect(page.locator(`h3:has-text("${newListName}")`)).toBeVisible({ timeout: 5000 });
  });

  test('create two lists', async ({ page }) => {
    const boardName = uniqueName('TwoListBoard');
    const list1 = uniqueName('List1');
    const list2 = uniqueName('List2');

    await createBoard(page, boardName);
    await navigateToBoard(page, boardName);

    await createList(page, list1);
    await createList(page, list2);

    // Both should be visible
    await expect(page.locator(`h3:has-text("${list1}")`)).toBeVisible();
    await expect(page.locator(`h3:has-text("${list2}")`)).toBeVisible();
  });

  test('delete a list', async ({ page }) => {
    const boardName = uniqueName('DeleteListBoard');
    const listName = uniqueName('ToDelete');

    await createBoard(page, boardName);
    await navigateToBoard(page, boardName);
    await createList(page, listName);

    // Open list menu
    const listHeader = page.locator(`div:has(> div > h3:has-text("${listName}"))`).first();
    await listHeader.locator('button').last().click();

    // Click Delete in the menu
    await page.click('button:has-text("Delete")');

    // Confirm in the "Delete List" dialog
    await page.locator('button:has-text("Delete")').click();

    // List should disappear
    await expect(page.locator(`h3:has-text("${listName}")`)).not.toBeVisible({ timeout: 5000 });
  });

  test('delete a board', async ({ page }) => {
    const boardName = uniqueName('DeleteBoard');

    await createBoard(page, boardName);

    // Open board card menu (three dots)
    const boardCard = page.locator(`div:has(> a:has-text("${boardName}"))`).first();
    await boardCard.hover();
    // The menu button is inside the boardCard, positioned absolutely
    const menuButton = boardCard.locator('button').first();
    await menuButton.click({ force: true });

    // Click Delete
    await page.click('button:has-text("Delete")');

    // Confirm deletion in the dialog
    // The confirm dialog has two "Delete" buttons — click the one in the confirm modal
    await page.locator('button:has-text("Delete")').last().click();

    // Board should disappear
    await expect(page.locator(`a:has-text("${boardName}")`)).not.toBeVisible({ timeout: 5000 });
  });
});
