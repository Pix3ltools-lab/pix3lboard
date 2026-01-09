'use client';

import { useEffect, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { clsx } from 'clsx';
import { useData } from '@/lib/context/DataContext';
import { StorageInfo } from '@/types';

export function StorageIndicator() {
  const { getStorageSize, isInitialized } = useData();
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    bytes: 0,
    mb: 0,
    percentage: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isInitialized) return;

    // Update storage info every 2 seconds
    const updateStorage = () => {
      const info = getStorageSize();
      setStorageInfo(info);
    };

    updateStorage();
    const interval = setInterval(updateStorage, 2000);

    return () => clearInterval(interval);
  }, [getStorageSize, mounted, isInitialized]);

  const getStatusColor = () => {
    if (storageInfo.percentage >= 80) return 'text-accent-danger';
    if (storageInfo.percentage >= 60) return 'text-accent-warning';
    return 'text-accent-success';
  };

  const getBarColor = () => {
    if (storageInfo.percentage >= 80) return 'bg-accent-danger';
    if (storageInfo.percentage >= 60) return 'bg-accent-warning';
    return 'bg-accent-success';
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <HardDrive className={clsx('h-4 w-4', getStatusColor())} />
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={clsx('h-full transition-all', getBarColor())}
            style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
          />
        </div>
        <span className="text-text-secondary whitespace-nowrap">
          {storageInfo.mb.toFixed(1)} MB / 5 MB
        </span>
      </div>
    </div>
  );
}
