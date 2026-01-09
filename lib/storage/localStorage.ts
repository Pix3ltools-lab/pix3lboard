import { AppData, StorageResult, StorageInfo } from '@/types';
import { STORAGE_KEY, MAX_SIZE_MB, WARNING_THRESHOLD_MB } from '@/lib/constants';

class LocalStorageService {
  /**
   * Save data to localStorage with size checking
   */
  save(data: AppData): StorageResult {
    try {
      const json = JSON.stringify(data);
      const sizeBytes = new Blob([json]).size;
      const sizeMB = sizeBytes / (1024 * 1024);

      // Block if over limit
      if (sizeMB > MAX_SIZE_MB) {
        return {
          success: false,
          size: sizeMB,
          error: `Storage limit exceeded (${MAX_SIZE_MB}MB). Please export and delete old data.`,
        };
      }

      // Warn if approaching limit
      if (sizeMB > WARNING_THRESHOLD_MB) {
        console.warn(`Storage at ${sizeMB.toFixed(2)}MB / ${MAX_SIZE_MB}MB`);
      }

      localStorage.setItem(STORAGE_KEY, json);
      return { success: true, size: sizeMB };
    } catch (error) {
      console.error('Storage save error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage save failed',
      };
    }
  }

  /**
   * Load data from localStorage
   */
  load(): AppData | null {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return null;

      const data = JSON.parse(json) as AppData;
      return data;
    } catch (error) {
      console.error('Storage load error:', error);
      return null;
    }
  }

  /**
   * Get current storage size info
   */
  getSize(): StorageInfo {
    try {
      const json = localStorage.getItem(STORAGE_KEY) || '{}';
      const bytes = new Blob([json]).size;
      const mb = bytes / (1024 * 1024);
      const percentage = (mb / MAX_SIZE_MB) * 100;

      return { bytes, mb, percentage };
    } catch (error) {
      console.error('Storage size calculation error:', error);
      return { bytes: 0, mb: 0, percentage: 0 };
    }
  }

  /**
   * Clear all data from localStorage
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const storage = new LocalStorageService();
