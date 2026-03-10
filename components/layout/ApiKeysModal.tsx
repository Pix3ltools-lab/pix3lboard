'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUI } from '@/lib/context/UIContext';
import { Trash2, Copy, Check } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

export function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
  const { showToast } = useUI();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/api-keys');
      const data = await res.json();
      if (res.ok) {
        setKeys(data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
    }
  }, [isOpen, fetchKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create API key', 'error');
        return;
      }
      setNewKeyValue(data.data.key);
      setNewKeyName('');
      setShowForm(false);
      await fetchKeys();
    } catch {
      showToast('Failed to create API key', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    setRevokingId(keyId);
    try {
      const res = await fetch(`/api/v1/api-keys/${keyId}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys(prev => prev.filter(k => k.id !== keyId));
        showToast('API key revoked', 'success');
      } else {
        showToast('Failed to revoke API key', 'error');
      }
    } catch {
      showToast('Failed to revoke API key', 'error');
    } finally {
      setRevokingId(null);
      setConfirmRevokeId(null);
    }
  };

  const handleCopy = async () => {
    if (!newKeyValue) return;
    await navigator.clipboard.writeText(newKeyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setKeys([]);
    setNewKeyName('');
    setShowForm(false);
    setNewKeyValue(null);
    setCopied(false);
    setConfirmRevokeId(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="API Keys" size="md">
      <div className="space-y-4">
        {/* New key banner */}
        {newKeyValue && (
          <div className="rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 space-y-2">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Copy this key now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-white dark:bg-bg-secondary border border-bg-tertiary rounded px-2 py-1 truncate">
                {newKeyValue}
              </code>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-1.5 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
                title="Copy"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Key list */}
        {isLoading ? (
          <p className="text-sm text-text-secondary py-2">Loading...</p>
        ) : keys.length === 0 && !newKeyValue ? (
          <p className="text-sm text-text-secondary py-2">No API keys yet.</p>
        ) : (
          <ul className="divide-y divide-bg-tertiary">
            {keys.map(k => (
              <li key={k.id} className="py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{k.name}</p>
                  <p className="text-xs text-text-secondary">
                    <span className="font-mono">{k.key_prefix}...</span>
                    {' · '}Created {formatDate(k.created_at)}
                    {' · '}Last used: {formatDate(k.last_used_at)}
                  </p>
                </div>
                {confirmRevokeId === k.id ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-text-secondary">Revoke?</span>
                    <button
                      onClick={() => handleRevoke(k.id)}
                      disabled={revokingId === k.id}
                      className="text-xs text-accent-danger hover:underline"
                    >
                      {revokingId === k.id ? 'Revoking...' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmRevokeId(null)}
                      className="text-xs text-text-secondary hover:underline"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRevokeId(k.id)}
                    className="flex-shrink-0 p-1.5 rounded hover:bg-bg-secondary transition-colors text-text-secondary hover:text-accent-danger"
                    title="Revoke"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Generate form or button */}
        {showForm ? (
          <form onSubmit={handleCreate} className="space-y-3 pt-2 border-t border-bg-tertiary">
            <Input
              label="Key name"
              placeholder="e.g. pix3lmcp server"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              required
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="pt-2 border-t border-bg-tertiary">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setNewKeyValue(null); setShowForm(true); }}
              disabled={keys.length >= 10}
            >
              + Generate new key
            </Button>
            {keys.length >= 10 && (
              <p className="text-xs text-text-secondary mt-1">Maximum of 10 keys reached.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
