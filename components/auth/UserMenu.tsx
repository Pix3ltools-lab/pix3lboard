/**
 * User Menu Component
 * Shows user profile and logout option
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { LogOut, User, Shield, Eye } from 'lucide-react';

export function UserMenu() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!profile) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const getRoleIcon = () => {
    switch (profile.role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'viewer':
        return <Eye className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleColor = () => {
    switch (profile.role) {
      case 'admin':
        return 'text-red-400';
      case 'viewer':
        return 'text-blue-400';
      default:
        return 'text-green-400';
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-secondary-bg transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-sm font-medium text-primary-text">
          {profile.fullName
            ? profile.fullName.charAt(0).toUpperCase()
            : profile.email.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-primary-text">
            {profile.fullName || profile.email.split('@')[0]}
          </div>
          <div className={`text-xs flex items-center gap-1 ${getRoleColor()}`}>
            {getRoleIcon()}
            <span className="capitalize">{profile.role}</span>
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-primary-bg border border-primary-border rounded-lg shadow-lg overflow-hidden z-50">
          {/* User Info */}
          <div className="p-4 border-b border-primary-border">
            <div className="font-medium text-primary-text">
              {profile.fullName || 'User'}
            </div>
            <div className="text-sm text-secondary-text">{profile.email}</div>
            <div className={`text-xs mt-1 flex items-center gap-1 ${getRoleColor()}`}>
              {getRoleIcon()}
              <span className="capitalize">{profile.role}</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Admin Dashboard Link (only for admins) */}
            {profile.role === 'admin' && (
              <button
                onClick={() => {
                  router.push('/admin/users');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-primary-text hover:bg-secondary-bg transition-colors flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Admin Dashboard
              </button>
            )}

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-secondary-bg transition-colors flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>

          {/* Cloud Mode Indicator */}
          <div className="px-4 py-2 bg-secondary-bg border-t border-primary-border">
            <div className="text-xs text-secondary-text flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Cloud Mode Active
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
