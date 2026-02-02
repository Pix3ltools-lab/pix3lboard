'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/context/AuthContext';
import { DataProvider } from '@/lib/context/DataContext';
import { UIProvider } from '@/lib/context/UIContext';
import { SearchProvider } from '@/lib/context/SearchContext';
import { NotificationProvider } from '@/lib/context/NotificationContext';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <DataProvider>
          <UIProvider>
            <SearchProvider>{children}</SearchProvider>
          </UIProvider>
        </DataProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
