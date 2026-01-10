/**
 * Data Migration Utility
 * Handles data transfer between localStorage and Supabase
 */

import type { AppData } from '@/types';
import { LocalStorageAdapter } from '@/lib/storage/adapters/local-storage-adapter';
import { SupabaseAdapter } from '@/lib/storage/adapters/supabase-adapter';

export interface MigrationProgress {
  phase: string;
  percent: number;
  message: string;
}

export interface MigrationResult {
  success: boolean;
  error?: string;
  workspacesCount?: number;
  boardsCount?: number;
  listsCount?: number;
  cardsCount?: number;
}

/**
 * Migrate data from localStorage to Supabase (cloud)
 */
export async function migrateLocalToCloud(
  onProgress: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  try {
    onProgress({ phase: 'init', percent: 0, message: 'Starting migration...' });

    // 1. Load data from localStorage
    onProgress({ phase: 'loading', percent: 10, message: 'Loading local data...' });
    const localAdapter = new LocalStorageAdapter();
    const localData = await localAdapter.getAllData();

    if (!localData.workspaces || localData.workspaces.length === 0) {
      return {
        success: false,
        error: 'No local data found to migrate',
      };
    }

    // Count items
    const counts = {
      workspaces: localData.workspaces.length,
      boards: localData.workspaces.reduce((sum, w) => sum + (w.boards?.length || 0), 0),
      lists: localData.workspaces.reduce(
        (sum, w) => sum + w.boards.reduce((s, b) => s + (b.lists?.length || 0), 0),
        0
      ),
      cards: localData.workspaces.reduce(
        (sum, w) =>
          sum +
          w.boards.reduce(
            (s, b) => s + b.lists.reduce((ss, l) => ss + (l.cards?.length || 0), 0),
            0
          ),
        0
      ),
    };

    onProgress({
      phase: 'counting',
      percent: 20,
      message: `Found ${counts.workspaces} workspaces, ${counts.boards} boards, ${counts.lists} lists, ${counts.cards} cards`,
    });

    // 2. Initialize cloud adapter
    onProgress({ phase: 'connecting', percent: 30, message: 'Connecting to cloud...' });
    const cloudAdapter = new SupabaseAdapter();

    // 3. Upload workspaces
    onProgress({ phase: 'workspaces', percent: 40, message: 'Uploading workspaces...' });
    let uploadedWorkspaces = 0;
    for (const workspace of localData.workspaces) {
      await cloudAdapter.createWorkspace(workspace);
      uploadedWorkspaces++;
      onProgress({
        phase: 'workspaces',
        percent: 40 + (uploadedWorkspaces / counts.workspaces) * 10,
        message: `Uploaded workspace ${uploadedWorkspaces}/${counts.workspaces}`,
      });
    }

    // 4. Upload boards
    onProgress({ phase: 'boards', percent: 50, message: 'Uploading boards...' });
    let uploadedBoards = 0;
    for (const workspace of localData.workspaces) {
      for (const board of workspace.boards || []) {
        await cloudAdapter.createBoard(workspace.id, board);
        uploadedBoards++;
        onProgress({
          phase: 'boards',
          percent: 50 + (uploadedBoards / counts.boards) * 15,
          message: `Uploaded board ${uploadedBoards}/${counts.boards}`,
        });
      }
    }

    // 5. Upload lists
    onProgress({ phase: 'lists', percent: 65, message: 'Uploading lists...' });
    let uploadedLists = 0;
    for (const workspace of localData.workspaces) {
      for (const board of workspace.boards || []) {
        for (const list of board.lists || []) {
          await cloudAdapter.createList(board.id, list);
          uploadedLists++;
          onProgress({
            phase: 'lists',
            percent: 65 + (uploadedLists / counts.lists) * 15,
            message: `Uploaded list ${uploadedLists}/${counts.lists}`,
          });
        }
      }
    }

    // 6. Upload cards
    onProgress({ phase: 'cards', percent: 80, message: 'Uploading cards...' });
    let uploadedCards = 0;
    for (const workspace of localData.workspaces) {
      for (const board of workspace.boards || []) {
        for (const list of board.lists || []) {
          for (const card of list.cards || []) {
            await cloudAdapter.createCard(list.id, card);
            uploadedCards++;
            onProgress({
              phase: 'cards',
              percent: 80 + (uploadedCards / counts.cards) * 15,
              message: `Uploaded card ${uploadedCards}/${counts.cards}`,
            });
          }
        }
      }
    }

    onProgress({ phase: 'complete', percent: 100, message: 'Migration complete!' });

    return {
      success: true,
      ...counts,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Migration failed',
    };
  }
}

/**
 * Migrate data from Supabase to localStorage
 */
export async function migrateCloudToLocal(
  onProgress: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  try {
    onProgress({ phase: 'init', percent: 0, message: 'Starting download...' });

    // 1. Load data from cloud
    onProgress({ phase: 'loading', percent: 10, message: 'Downloading cloud data...' });
    const cloudAdapter = new SupabaseAdapter();
    const cloudData = await cloudAdapter.getAllData();

    if (!cloudData.workspaces || cloudData.workspaces.length === 0) {
      return {
        success: false,
        error: 'No cloud data found to download',
      };
    }

    // Count items
    const counts = {
      workspaces: cloudData.workspaces.length,
      boards: cloudData.workspaces.reduce((sum, w) => sum + (w.boards?.length || 0), 0),
      lists: cloudData.workspaces.reduce(
        (sum, w) => sum + w.boards.reduce((s, b) => s + (b.lists?.length || 0), 0),
        0
      ),
      cards: cloudData.workspaces.reduce(
        (sum, w) =>
          sum +
          w.boards.reduce(
            (s, b) => s + b.lists.reduce((ss, l) => ss + (l.cards?.length || 0), 0),
            0
          ),
        0
      ),
    };

    onProgress({
      phase: 'counting',
      percent: 50,
      message: `Found ${counts.workspaces} workspaces, ${counts.boards} boards, ${counts.lists} lists, ${counts.cards} cards`,
    });

    // 2. Save to localStorage
    onProgress({ phase: 'saving', percent: 70, message: 'Saving to local storage...' });
    const localAdapter = new LocalStorageAdapter();
    await localAdapter.importData(cloudData);

    onProgress({ phase: 'complete', percent: 100, message: 'Download complete!' });

    return {
      success: true,
      ...counts,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Download failed',
    };
  }
}

/**
 * Create backup of local data
 */
export function createLocalBackup(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupKey = `pix3lboard-backup-${timestamp}`;

  const currentData = localStorage.getItem('pix3lboard-data');
  if (currentData) {
    localStorage.setItem(backupKey, currentData);
  }

  return backupKey;
}

/**
 * Restore from backup
 */
export function restoreFromBackup(backupKey: string): boolean {
  const backupData = localStorage.getItem(backupKey);
  if (backupData) {
    localStorage.setItem('pix3lboard-data', backupData);
    return true;
  }
  return false;
}
