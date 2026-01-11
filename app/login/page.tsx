/**
 * Login Page
 * Email/password authentication for cloud mode users
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useData } from '@/lib/context/DataContext';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isAuthenticated, isLoading } = useAuth();
  const { workspaces, isInitialized, storageMode } = useData();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (hasRedirected) return; // Prevent multiple redirects
    if (!isLoading && isAuthenticated && isInitialized) {
      // If in cloud mode, wait a bit for data to load from Supabase
      if (storageMode === 'cloud') {
        // Give it 1 second to load cloud data
        const timer = setTimeout(() => {
          setHasRedirected(true);

          // If user has workspaces, redirect to first workspace
          if (workspaces.length > 0) {
            const firstWorkspace = workspaces[0];
            const firstBoard = firstWorkspace.boards[0];

            if (firstBoard) {
              router.push(`/workspace/${firstWorkspace.id}/board/${firstBoard.id}`);
            } else {
              router.push(`/workspace/${firstWorkspace.id}`);
            }
          } else {
            // No workspaces, go to welcome page
            router.push('/');
          }
        }, 1000);

        return () => clearTimeout(timer);
      } else {
        // Local mode, redirect immediately
        setHasRedirected(true);
        router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, isInitialized, workspaces, router, storageMode, hasRedirected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await signIn(email, password);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      // Redirect to home (handled by useEffect)
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-bg via-secondary-bg to-primary-bg">
        <div className="text-secondary-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-bg via-secondary-bg to-primary-bg p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-text mb-2">
            Pix3lBoard
          </h1>
          <p className="text-secondary-text">Sign in to access cloud mode</p>
        </div>

        {/* Login Card */}
        <div className="bg-primary-bg border border-primary-border rounded-lg p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-primary-text mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 bg-secondary-bg border border-primary-border rounded-md text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 focus:ring-accent-primary"
                placeholder="your.email@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-primary-text mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 bg-secondary-bg border border-primary-border rounded-md text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 focus:ring-accent-primary"
                placeholder="Enter your password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Local Mode Link */}
          <div className="mt-6 pt-6 border-t border-primary-border">
            <p className="text-sm text-secondary-text text-center mb-3">
              Don&apos;t have an account or prefer privacy?
            </p>
            <Button
              variant="secondary"
              onClick={() => router.push('/')}
              className="w-full"
            >
              Use Local Mode (No Account Required)
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-secondary-text mt-4">
          Only authorized users can access cloud mode.
          <br />
          Contact your administrator for account creation.
        </p>
      </div>
    </div>
  );
}
