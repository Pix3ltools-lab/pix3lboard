'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { StorageIndicator } from './StorageIndicator';

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
          className="text-xl font-bold text-text-primary hover:text-accent-primary transition-colors"
        >
          <span>Pix<span style={{ color: '#ef4444' }}>3</span><span style={{ color: '#3b82f6' }}>l</span>Board</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {showStorage && <StorageIndicator />}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
