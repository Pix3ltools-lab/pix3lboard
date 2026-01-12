/**
 * Upstash Redis Storage
 * Simple key-value storage for user workspaces
 * Uses @vercel/kv package (compatible with Upstash)
 */

import { kv } from '@vercel/kv';
import type { Workspace } from '@/types';

interface UserData {
  workspaces: Workspace[];
  version: string;
  lastModified: string;
}

/**
 * Load all workspaces for a user
 */
export async function loadUserData(userId: string): Promise<Workspace[]> {
  try {
    const data = await kv.get<UserData>(`user:${userId}:data`);
    return data?.workspaces || [];
  } catch (error) {
    console.error('[UpstashRedis] Load error:', error);
    return [];
  }
}

/**
 * Save all workspaces for a user
 */
export async function saveUserData(
  userId: string,
  workspaces: Workspace[]
): Promise<boolean> {
  try {
    const data: UserData = {
      workspaces,
      version: '2.0.0',
      lastModified: new Date().toISOString(),
    };

    await kv.set(`user:${userId}:data`, data);
    return true;
  } catch (error) {
    console.error('[UpstashRedis] Save error:', error);
    return false;
  }
}

/**
 * Clear all data for a user (used on account deletion)
 */
export async function clearUserData(userId: string): Promise<boolean> {
  try {
    await kv.del(`user:${userId}:data`);
    return true;
  } catch (error) {
    console.error('[UpstashRedis] Clear error:', error);
    return false;
  }
}
