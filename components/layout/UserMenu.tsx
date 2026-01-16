'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Key, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';

export function UserMenu() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get initials from name or email
  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg-secondary transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white text-sm font-medium">
          {getInitials()}
        </div>
        <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-bg-primary border border-bg-tertiary rounded-lg shadow-lg py-2 z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-bg-tertiary">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-primary flex items-center justify-center text-white font-medium">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                {user.name && (
                  <p className="text-sm font-medium text-text-primary truncate">
                    {user.name}
                  </p>
                )}
                <p className="text-xs text-text-secondary truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {user.is_admin && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin');
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
              >
                <Shield className="h-4 w-4 text-text-secondary" />
                Admin Panel
              </button>
            )}
            <button
              onClick={() => {
                setIsOpen(false);
                setShowChangePassword(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <Key className="h-4 w-4 text-text-secondary" />
              Change Password
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <LogOut className="h-4 w-4 text-text-secondary" />
              Logout
            </button>
          </div>
        </div>
      )}

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
}
