/**
 * Authentication Context
 * Manages user authentication state with Turso database
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

// User type (matches our Turso schema)
export interface User {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check current session on mount
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (mounted && data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Login failed' };
      }

      setUser(data.user);
      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }, []);

  // Sign up
  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Registration failed' };
      }

      setUser(data.user);
      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
