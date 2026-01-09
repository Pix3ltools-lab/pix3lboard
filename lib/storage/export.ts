import { AppData } from '@/types';

/**
 * Export app data as JSON file download
 */
export function exportData(data: AppData): void {
  try {
    const json = JSON.stringify(data, null, 2);
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
