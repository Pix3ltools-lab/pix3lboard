'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '@/lib/context/AuthContext';
import { ExternalLink } from 'lucide-react';

const APP_VERSION = '2.8.0';

export function Header() {
  const { isAuthenticated } = useAuth();

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
          <a
            href={process.env.NEXT_PUBLIC_PIX3LWIKI_URL || 'https://wiki.pix3ltools.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Pix3lWiki
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <ThemeToggle />
          {isAuthenticated && <NotificationBell />}
          {isAuthenticated && <UserMenu />}
        </div>
      </div>
    </header>
  );
}
