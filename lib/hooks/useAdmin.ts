/**
 * useAdmin Hook
 * Admin operations for user management
 */

import { useState, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export function useAdmin() {
  const [isLoading, setIsLoading] = useState(false);

  // Lazy-load Supabase client (only on client side)
  const getClient = () => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used on client side');
    }
    return getSupabaseBrowserClient();
  };

  // Fetch all users (admin only)
  const fetchUsers = useCallback(async (): Promise<UserProfile[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await getClient()
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((user: any) => ({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      }));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create user (admin only)
  const createUser = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role: 'admin' | 'user' | 'viewer'
    ): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      try {
        // Get current admin user
        const {
          data: { user: currentUser },
        } = await getClient().auth.getUser();

        if (!currentUser) {
          return { success: false, error: 'Not authenticated' };
        }

        // Create auth user via Supabase Admin API
        // Note: This requires service_role key, so we'll use a workaround
        // For now, we create a profile and let the user set password via invitation

        const { data: authData, error: authError } = await getClient().auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (authError) {
          return { success: false, error: authError.message };
        }

        if (!authData.user) {
          return { success: false, error: 'Failed to create user' };
        }

        // Create user profile
        const { error: profileError } = await getClient()
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: email,
            full_name: fullName,
            role: role,
            is_active: true,
            created_by: currentUser.id,
          });

        if (profileError) {
          return { success: false, error: profileError.message };
        }

        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Update user profile (admin only)
  const updateUser = useCallback(
    async (
      userId: string,
      updates: {
        fullName?: string;
        role?: 'admin' | 'user' | 'viewer';
        isActive?: boolean;
      }
    ): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      try {
        const updateData: any = {};
        if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
        if (updates.role !== undefined) updateData.role = updates.role;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

        const { error } = await getClient()
          .from('user_profiles')
          .update(updateData)
          .eq('id', userId);

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Delete user (admin only)
  const deleteUser = useCallback(
    async (userId: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      try {
        // Note: This only deletes the profile, not the auth user
        // Deleting auth users requires admin API with service_role key
        const { error } = await getClient()
          .from('user_profiles')
          .delete()
          .eq('id', userId);

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}
