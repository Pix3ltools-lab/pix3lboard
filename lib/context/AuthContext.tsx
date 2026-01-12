/**
 * Authentication Context
 * Manages user authentication state with Supabase
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
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lazy-load Supabase client (only on client side)
  const getClient = () => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used on client side');
    }
    return getSupabaseBrowserClient();
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let subscription: any = null;

    async function initAuth() {
      try {
        // Only run in browser
        if (typeof window === 'undefined') {
          return;
        }

        // Get initial session
        const {
          data: { session },
        } = await getClient().auth.getSession();

        if (mounted) {
          if (session?.user) {
            setUser(session.user);
          }
          setIsLoading(false);
        }

        // Listen for auth changes
        const {
          data: { subscription: authSubscription },
        } = getClient().auth.onAuthStateChange(async (event: any, session: any) => {
          if (!mounted) return;

          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            setUser(session.user);
          }
        });

        subscription = authSubscription;
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Sign in
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await getClient().auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { error: error.message };
        }

        if (data.user) {
          setUser(data.user);
        }

        return {};
      } catch (error) {
        return { error: 'An unexpected error occurred' };
      }
    },
    []
  );

  // Sign out
  const signOut = useCallback(async () => {
    if (typeof window !== 'undefined') {
      // Sign out from Supabase (this invalidates the token)
      await getClient().auth.signOut();

      // Force immediate navigation
      window.location.replace('/');
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
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
