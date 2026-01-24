'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Users, Trash2, Loader2, Crown, Eye } from 'lucide-react';
import { debounce } from '@/lib/utils/debounce';

interface BoardShare {
  id: string;
  board_id: string;
  user_id: string;
  role: 'owner' | 'viewer';
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface UserSuggestion {
  id: string;
  email: string;
  name: string | null;
}

interface ShareBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
}

export function ShareBoardModal({ isOpen, onClose, boardId, boardName }: ShareBoardModalProps) {
  const [shares, setShares] = useState<BoardShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'viewer'>('viewer');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (query.length < 2) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }
        setIsSearching(true);
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data.users || []);
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setIsSearching(false);
        }
      }, 300),
    []
  );

  // Handle email input change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    debouncedSearch(value);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (user: UserSuggestion) => {
    setEmail(user.email);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchShares = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/boards/${boardId}/shares`);
      if (res.ok) {
        const data = await res.json();
        setShares(data.shares);
      }
    } catch (err) {
      console.error('Failed to fetch shares:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShares();
      setEmail('');
      setError(null);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [isOpen, boardId]);

  const handleAddShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsAdding(true);
    setError(null);

    try {
      const res = await fetch(`/api/boards/${boardId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add share');
      }

      if (data.updated) {
        // Update existing share in list
        setShares((prev) =>
          prev.map((s) => (s.user_id === data.share.user_id ? { ...s, role: data.share.role } : s))
        );
      } else {
        // Add new share to list
        setShares((prev) => [data.share, ...prev]);
      }
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add share');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/shares/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShares((prev) => prev.filter((s) => s.user_id !== userId));
      }
    } catch (err) {
      console.error('Failed to remove share:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${boardName}"`}>
      <div className="space-y-4">
        {/* Add share form */}
        <form onSubmit={handleAddShare} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={email}
                onChange={handleEmailChange}
                onFocus={() => email.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Enter email address..."
                type="email"
                disabled={isAdding}
                autoComplete="off"
              />
              {/* Autocomplete dropdown */}
              {showSuggestions && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                  {isSearching ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-text-secondary">
                      No users found
                    </div>
                  ) : (
                    suggestions.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(user)}
                        className="w-full px-3 py-2 text-left hover:bg-bg-tertiary transition-colors flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-accent-primary">
                            {(user.name || user.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text-primary truncate">
                            {user.name || user.email}
                          </p>
                          {user.name && (
                            <p className="text-xs text-text-secondary truncate">{user.email}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'owner' | 'viewer')}
              className="px-3 py-2 bg-bg-secondary border border-bg-tertiary rounded-lg text-text-primary text-sm"
              disabled={isAdding}
            >
              <option value="viewer">Viewer</option>
              <option value="owner">Owner</option>
            </select>
            <Button type="submit" disabled={isAdding || !email.trim()}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
            </Button>
          </div>
          {error && <p className="text-xs text-accent-danger">{error}</p>}
        </form>

        {/* Shares list */}
        <div className="border-t border-bg-tertiary pt-4">
          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Shared with ({shares.length})
          </h4>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
            </div>
          ) : shares.length === 0 ? (
            <p className="text-sm text-text-secondary py-4 text-center">
              This board is not shared with anyone yet
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-accent-primary">
                        {(share.user_name || share.user_email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {share.user_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-text-secondary">{share.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        share.role === 'owner'
                          ? 'bg-accent-warning/20 text-accent-warning'
                          : 'bg-bg-tertiary text-text-secondary'
                      }`}
                    >
                      {share.role === 'owner' ? (
                        <Crown className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                      {share.role === 'owner' ? 'Owner' : 'Viewer'}
                    </span>
                    <button
                      onClick={() => handleRemoveShare(share.user_id)}
                      className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-accent-danger transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="border-t border-bg-tertiary pt-4">
          <p className="text-xs text-text-secondary">
            <strong>Viewer:</strong> Can view the board but cannot make changes.
            <br />
            <strong>Owner:</strong> Can view and edit the board.
          </p>
        </div>
      </div>
    </Modal>
  );
}
