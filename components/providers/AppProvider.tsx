'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/context/AuthContext';
import { DataProvider } from '@/lib/context/DataContext';
import { UIProvider } from '@/lib/context/UIContext';
import { SearchProvider } from '@/lib/context/SearchContext';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        <UIProvider>
          <SearchProvider>{children}</SearchProvider>
        </UIProvider>
      </DataProvider>
    </AuthProvider>
  );
}
