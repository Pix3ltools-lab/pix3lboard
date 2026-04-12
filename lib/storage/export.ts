import { AppData } from '@/types';

/**
 * Export app data (including traceability) as JSON file download.
 * Fetches traceability data from the API before downloading.
 */
export async function exportData(data: AppData): Promise<void> {
  try {
    // Collect all board IDs across all workspaces
    const boardIds: string[] = [];
    for (const ws of data.workspaces) {
      for (const board of ws.boards) {
        boardIds.push(board.id);
      }
    }

    // Fetch traceability data if there are any boards
    let traceability: AppData['traceability'] = undefined;
    if (boardIds.length > 0) {
      try {
        const res = await fetch(`/api/traceability/export?boardIds=${boardIds.join(',')}`);
        if (res.ok) {
          traceability = await res.json();
        }
      } catch {
        // Non-fatal: export without traceability if fetch fails
      }
    }

    const exportPayload: AppData = { ...data, traceability };
    const json = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `pix3lboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export data');
  }
}
