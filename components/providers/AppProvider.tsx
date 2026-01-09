'use client';

import { ReactNode } from 'react';
import { DataProvider } from '@/lib/context/DataContext';
import { UIProvider } from '@/lib/context/UIContext';
import { SearchProvider } from '@/lib/context/SearchContext';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <UIProvider>
        <SearchProvider>{children}</SearchProvider>
      </UIProvider>
    </DataProvider>
  );
}
