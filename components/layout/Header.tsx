'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { StorageIndicator } from './StorageIndicator';
import { UserMenu } from '../auth/UserMenu';

const APP_VERSION = '1.2.0';

interface HeaderProps {
  showStorage?: boolean;
}

export function Header({ showStorage = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-bg-tertiary bg-bg-primary/95 backdrop-blur">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo/Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-text-primary hover:text-accent-primary transition-colors"
        >
          <span>Pix<span style={{ color: '#ef4444' }}>3</span><span style={{ color: '#3b82f6' }}>l</span>Board</span>
          <span className="text-xs font-normal text-text-secondary">v{APP_VERSION}</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {showStorage && <StorageIndicator />}
          <Link
            href="/settings"
            className="p-2 hover:bg-secondary-bg rounded-md transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5 text-secondary-text hover:text-primary-text" />
          </Link>
          <UserMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
