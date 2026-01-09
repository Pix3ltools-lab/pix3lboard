import { AppData } from '@/types';
import { validateAppData } from '@/lib/utils/validation';

/**
 * Import app data from JSON file with validation
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

        resolve(data);
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
