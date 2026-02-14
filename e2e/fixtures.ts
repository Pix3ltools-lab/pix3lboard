import { Page, expect } from '@playwright/test';

/**
 * Login via the UI form.
 */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 15000 });
}

/**
 * Create a workspace via the dashboard UI.
 * Returns the workspace name for assertions.
 */
export async function createWorkspace(page: Page, name: string) {
  // Click "Create Workspace" button on the dashboard
  await page.click('button:has-text("Create Workspace")');

  // Fill the workspace name
  await page.fill('input[placeholder="My Project"]', name);

  // Submit — button inside modal also says "Create Workspace"
  const modal = page.locator('.fixed, [role="dialog"]').last();
  await modal.locator('button:has-text("Create Workspace")').click();

  // Wait for the workspace card link to appear (not the toast)
  await expect(page.locator(`a:has-text("${name}")`).first()).toBeVisible({ timeout: 5000 });

  return name;
}

/**
 * Navigate into a workspace by clicking its card on the dashboard.
 */
export async function navigateToWorkspace(page: Page, workspaceName: string) {
  await page.goto('/');
  await expect(page.locator('text=Welcome to')).toBeVisible({ timeout: 10000 });
  await page.click(`a:has-text("${workspaceName}")`);
  await page.waitForURL(/\/workspace\//, { timeout: 5000 });
}

/**
 * Create a board inside the current workspace page.
 */
export async function createBoard(page: Page, name: string) {
  await page.click('button:has-text("Create Board")');

  // Fill board name
  await page.fill('input[placeholder="My Board"]', name);

  // Submit
  const modal = page.locator('.fixed, [role="dialog"]').last();
  await modal.locator('button:has-text("Create Board")').click();

  // Wait for board to appear as a link
  await expect(page.locator(`a:has-text("${name}")`).first()).toBeVisible({ timeout: 5000 });

  return name;
}

/**
 * Navigate into a board from the workspace page.
 */
export async function navigateToBoard(page: Page, boardName: string) {
  await page.click(`a:has-text("${boardName}")`);
  await page.waitForURL(/\/board\//, { timeout: 5000 });
}

/**
 * Create a list inside the current board (Kanban view).
 * Handles both empty board ("Create Your First List") and non-empty board ("Add a list").
 */
export async function createList(page: Page, name: string) {
  // On an empty board, the EmptyBoard component shows "Create Your First List"
  // which creates a default "To Do" list. After that the AddList component appears.
  const createFirstBtn = page.locator('button:has-text("Create Your First List")');
  const addListBtn = page.locator('button:has-text("Add a list")');

  // Wait for board to be fully loaded (either empty state or normal view)
  await expect(createFirstBtn.or(addListBtn)).toBeVisible({ timeout: 10000 });

  if (await createFirstBtn.isVisible()) {
    await createFirstBtn.click();
    await expect(page.locator('h3:has-text("To Do")')).toBeVisible({ timeout: 5000 });
    // Wait for DOM to stabilize after EmptyBoard → normal board transition
    await page.waitForTimeout(500);
  }

  await addListBtn.click();
  await page.fill('input[placeholder="Enter list name..."]', name);
  await page.click('button:has-text("Add List")');

  // Wait for list header to appear
  await expect(page.locator(`h3:has-text("${name}")`)).toBeVisible({ timeout: 5000 });

  return name;
}

/**
 * Create a card inside a list. Clicks the first "Add a card" button visible.
 */
export async function createCard(page: Page, title: string) {
  await page.locator('button:has-text("Add a card")').first().click();

  await page.fill('textarea[placeholder="Enter card title..."]', title);
  await page.click('button:has-text("Add Card")');

  // Wait for the card to appear
  await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 5000 });

  return title;
}

/**
 * Generate a unique name with a timestamp suffix to avoid collisions.
 */
export function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}`;
}
