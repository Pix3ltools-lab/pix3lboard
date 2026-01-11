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
import { STORAGE_KEY } from '@/lib/constants';

interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: 'admin' | 'user' | 'viewer';
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

interface AuthContextType {
  // State
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lazy-load Supabase client (only on client side)
  const getClient = () => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used on client side');
    }
    return getSupabaseBrowserClient();
  };

  // Fetch user profile from database
  const fetchProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      try {
        const { data, error } = await getClient()
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Failed to fetch profile:', error);
          return null;
        }

        return {
          id: data.id,
          email: data.email,
          fullName: data.full_name,
          role: data.role,
          avatarUrl: data.avatar_url,
          isActive: data.is_active,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          lastLogin: data.last_login,
        };
      } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
    },
    []
  );

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const userProfile = await fetchProfile(user.id);
    setProfile(userProfile);
  }, [user, fetchProfile]);

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
            const userProfile = await fetchProfile(session.user.id);
            setProfile(userProfile);
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
            const userProfile = await fetchProfile(session.user.id);
            setProfile(userProfile);

            // Update last login
            await getClient()
              .from('user_profiles')
              .update({ last_login: new Date().toISOString() })
              .eq('id', session.user.id);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
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
  }, [fetchProfile]);

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
          const userProfile = await fetchProfile(data.user.id);
          setProfile(userProfile);

          // Check if user is active
          if (userProfile && !userProfile.isActive) {
            await getClient().auth.signOut();
            setUser(null);
            setProfile(null);
            return { error: 'Account is inactive. Contact administrator.' };
          }
        }

        return {};
      } catch (error) {
        return { error: 'An unexpected error occurred' };
      }
    },
    [fetchProfile]
  );

  // Sign out
  const signOut = useCallback(async () => {
    if (typeof window !== 'undefined') {
      console.log('[AuthContext] Starting logout process...');

      // Set flag immediately to prevent any data loading or auto-saves
      (window as any).__isLoggingOut = true;

      // Trigger final save before logout (will bypass the flag check)
      console.log('[AuthContext] Triggering final save...');
      const saveEvent = new CustomEvent('pix3lboard:saveBeforeLogout');
      window.dispatchEvent(saveEvent);

      // Wait for final save to complete (give it 500ms)
      console.log('[AuthContext] Waiting for save to complete...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Remove all data immediately
      console.log('[AuthContext] Clearing localStorage...');
      localStorage.removeItem(STORAGE_KEY);

      // DON'T reset storage mode - keep it as 'cloud' so user can login again
      // The fallback in useStorageAdapter will handle unauthenticated state

      // Sign out from Supabase (this invalidates the token)
      console.log('[AuthContext] Signing out from Supabase...');
      await getClient().auth.signOut();
      console.log('[AuthContext] Supabase signOut completed');

      // Force immediate navigation (replace is more immediate than href)
      console.log('[AuthContext] Redirecting to home...');
      window.location.replace('/');
    }
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    refreshProfile,
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
