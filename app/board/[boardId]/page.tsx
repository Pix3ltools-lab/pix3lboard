'use client';

/**
 * Board Redirect Page
 *
 * Resolves the correct workspace for a board and redirects to the full URL.
 * Used by notification links that don't know the workspace context.
 *
 * Handles:
 * - Own boards → /workspace/{workspaceId}/board/{boardId}
 * - Shared boards → /workspace/__shared__/board/{boardId}
 * - No access → error page or login redirect
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useData } from '@/lib/context/DataContext';
import { Spinner } from '@/components/ui/Spinner';

export default function BoardRedirectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { workspaces, isInitialized } = useData();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth check
    if (authLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      const returnUrl = `/board/${boardId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Wait for data to load
    if (!isInitialized) return;

    // Find the workspace containing this board
    let targetWorkspaceId: string | null = null;

    for (const workspace of workspaces) {
      const board = workspace.boards?.find(b => b.id === boardId);
      if (board) {
        // Prefer own workspace over __shared__ if both exist
        if (workspace.id !== '__shared__') {
          targetWorkspaceId = workspace.id;
          break;
        } else if (!targetWorkspaceId) {
          targetWorkspaceId = '__shared__';
        }
      }
    }

    if (targetWorkspaceId) {
      // Build the full URL with query params
      const queryString = searchParams.toString();
      const fullUrl = `/workspace/${targetWorkspaceId}/board/${boardId}${queryString ? `?${queryString}` : ''}`;
      router.replace(fullUrl);
    } else {
      // Board not found or no access
      setError('Board not found or access denied');
    }
  }, [authLoading, isAuthenticated, isInitialized, workspaces, boardId, searchParams, router]);

  // Show loading while resolving
  if (authLoading || (!error && isAuthenticated && !isInitialized)) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if board not found
  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-text-primary mb-2">
            {error}
          </h1>
          <p className="text-text-secondary mb-6">
            The board may have been deleted or you don&apos;t have permission to access it.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  // Default loading state
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
