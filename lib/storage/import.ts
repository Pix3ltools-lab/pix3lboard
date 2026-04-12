import { AppData } from '@/types';
import { validateAppData } from '@/lib/utils/validation';

/**
 * Import app data from JSON file with validation.
 * Parses workspaces and traceability data; traceability must be imported
 * after the workspace POST so foreign keys (board_id, card_id) already exist.
 */
export async function importData(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') {
          throw new Error('Failed to read file');
        }

        const data = JSON.parse(result);

        // Validate structure
        if (!validateAppData(data)) {
          throw new Error('Invalid data structure. Please check the file format.');
        }

        resolve(data as AppData);
      } catch (error) {
        if (error instanceof SyntaxError) {
          reject(new Error('Invalid JSON format'));
        } else if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error('Failed to import data'));
        }
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Import traceability data from an AppData export payload.
 * Called after workspaces have been saved so FK references are valid.
 */
export async function importTraceability(data: AppData): Promise<void> {
  if (!data.traceability) return;
  const { requirements, requirementCards, testCases, testRuns } = data.traceability;
  if (!requirements?.length && !requirementCards?.length && !testCases?.length && !testRuns?.length) return;

  const res = await fetch('/api/traceability/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirements, requirementCards, testCases, testRuns }),
  });

  if (!res.ok) {
    // Non-fatal — workspace already imported, just log
    console.warn('Traceability import failed:', await res.text());
  }
}
