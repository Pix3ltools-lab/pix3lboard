'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FlaskConical, Plus, Play, Unlink, Bug, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { TestCase, TestRun } from '@/types';
import { BoardPermissions } from '@/lib/utils/boardPermissions';

interface Requirement {
  id: string;
  code: string;
  title: string;
}

interface TestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  boardId: string;
  listId: string;
  permissions?: BoardPermissions;
  onCreateBugCard: (title: string) => void;
}

const RESULT_COLORS: Record<string, string> = {
  passed: 'bg-accent-success/10 text-accent-success border-accent-success/20',
  failed: 'bg-accent-danger/10 text-accent-danger border-accent-danger/20',
  pending: 'bg-bg-tertiary text-text-secondary border-bg-tertiary',
};

const TYPE_COLORS: Record<string, string> = {
  manual: 'bg-accent-secondary/10 text-accent-secondary',
  automated: 'bg-accent-primary/10 text-accent-primary',
};

export function TestsModal({ isOpen, onClose, cardId, boardId, listId, permissions, onCreateBugCard }: TestsModalProps) {
  const canEdit = permissions?.canEditCards ?? true;

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);

  // Search for linking existing test cases
  const [boardTestCases, setBoardTestCases] = useState<TestCase[]>([]);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // New test case form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'manual' | 'automated'>('manual');
  const [savingNew, setSavingNew] = useState(false);

  // Run form state per test case
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<'passed' | 'failed' | 'pending'>('passed');
  const [runNotes, setRunNotes] = useState('');
  const [savingRun, setSavingRun] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const [tcRes, reqRes] = await Promise.all([
        fetch(`/api/test-cases?cardId=${cardId}`),
        fetch(`/api/requirements?cardId=${cardId}`),
      ]);
      if (tcRes.ok) {
        const data = await tcRes.json();
        setTestCases(data.testCases ?? []);
      }
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequirements(data.requirements ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [isOpen, cardId]);

  const fetchBoardTestCases = useCallback(async () => {
    const res = await fetch(`/api/test-cases?boardId=${boardId}`);
    if (res.ok) {
      const data = await res.json();
      setBoardTestCases(data.testCases ?? []);
    }
  }, [boardId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (showSearch) fetchBoardTestCases();
  }, [showSearch, fetchBoardTestCases]);

  const handleLinkExisting = async (tc: TestCase) => {
    await fetch(`/api/test-cases/${tc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId }),
    });
    setSearch('');
    setShowSearch(false);
    fetchData();
  };

  const handleCreateNew = async () => {
    if (!newTitle.trim()) return;
    setSavingNew(true);
    try {
      await fetch('/api/test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, cardId, title: newTitle.trim(), type: newType }),
      });
      setNewTitle('');
      setNewType('manual');
      setShowNewForm(false);
      fetchData();
    } finally {
      setSavingNew(false);
    }
  };

  const handleUnlink = async (tc: TestCase) => {
    await fetch(`/api/test-cases/${tc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: null }),
    });
    fetchData();
  };

  const handleRun = async (tc: TestCase) => {
    setSavingRun(true);
    try {
      await fetch(`/api/test-cases/${tc.id}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: runResult, notes: runNotes }),
      });
      setRunningId(null);
      setRunResult('passed');
      setRunNotes('');
      fetchData();
    } finally {
      setSavingRun(false);
    }
  };

  const handleCreateBug = (tc: TestCase) => {
    onCreateBugCard(`[${tc.code}] ${tc.title}`);
    onClose();
  };

  const filteredBoard = boardTestCases.filter(tc =>
    !testCases.find(linked => linked.id === tc.id) &&
    tc.cardId !== cardId &&
    search.trim().length > 0 &&
    (tc.title.toLowerCase().includes(search.toLowerCase()) || tc.code.toLowerCase().includes(search.toLowerCase()))
  );

  // Summary
  const total = testCases.length;
  const passed = testCases.filter(tc => tc.latestResult === 'passed').length;
  const failed = testCases.filter(tc => tc.latestResult === 'failed').length;
  const pending = testCases.filter(tc => tc.latestResult === 'pending').length;
  const coverage = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tests" size="lg">
      <div className="space-y-4">
        {/* Linked requirements */}
        {requirements.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {requirements.map(r => (
              <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary text-xs font-mono font-medium">
                {r.code}
              </span>
            ))}
          </div>
        )}

        {/* Top bar: search + new */}
        {canEdit && (
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                placeholder="Link existing test case…"
              />
              {showSearch && filteredBoard.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredBoard.map(tc => (
                    <button
                      key={tc.id}
                      onClick={() => handleLinkExisting(tc)}
                      className="w-full px-3 py-2 text-left hover:bg-bg-tertiary transition-colors flex items-center gap-2"
                    >
                      <span className="font-mono text-xs text-accent-primary">{tc.code}</span>
                      <span className="text-sm text-text-primary truncate">{tc.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button size="sm" onClick={() => setShowNewForm(v => !v)} className="flex items-center gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              New test
            </Button>
          </div>
        )}

        {/* New test form */}
        {showNewForm && (
          <div className="bg-bg-secondary border border-accent-primary/30 rounded-lg p-3 space-y-3">
            <Input
              label="Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Test case title…"
              autoFocus
            />
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1">Type</label>
              <div className="flex gap-2">
                {(['manual', 'automated'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewType(t)}
                    className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                      newType === t ? TYPE_COLORS[t] : 'bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreateNew} disabled={!newTitle.trim() || savingNew}>
                {savingNew ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        )}

        {/* Test cases list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
          </div>
        ) : testCases.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">No test cases linked to this card.</p>
        ) : (
          <div className="space-y-2">
            {testCases.map(tc => (
              <div
                key={tc.id}
                className={`rounded-lg border overflow-hidden ${
                  tc.latestResult === 'failed' ? 'border-accent-danger/40' : 'border-bg-tertiary'
                }`}
              >
                <div className="flex items-center gap-3 px-3 py-2.5 bg-bg-secondary">
                  <span className="font-mono text-xs font-medium text-accent-primary shrink-0">{tc.code}</span>
                  <span className="text-sm text-text-primary flex-1 truncate">{tc.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize shrink-0 ${TYPE_COLORS[tc.type] ?? ''}`}>
                    {tc.type}
                  </span>
                  {tc.latestResult && (
                    <span className={`text-xs px-2 py-0.5 rounded border capitalize shrink-0 ${RESULT_COLORS[tc.latestResult] ?? ''}`}>
                      {tc.latestResult}
                    </span>
                  )}
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          if (runningId === tc.id) { setRunningId(null); return; }
                          setRunningId(tc.id);
                          setRunResult('passed');
                          setRunNotes('');
                        }}
                        className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded transition-colors"
                        title="Run test"
                      >
                        {runningId === tc.id ? <ChevronUp className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      {tc.latestResult === 'failed' && (
                        <button
                          onClick={() => handleCreateBug(tc)}
                          className="p-1.5 text-text-secondary hover:text-accent-danger hover:bg-accent-danger/10 rounded transition-colors"
                          title="Create bug card"
                        >
                          <Bug className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleUnlink(tc)}
                        className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
                        title="Unlink"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline run form */}
                {runningId === tc.id && (
                  <div className="px-3 py-2.5 border-t border-bg-tertiary bg-bg-primary/30 space-y-2">
                    <div className="flex gap-2">
                      {(['passed', 'failed', 'pending'] as const).map(r => (
                        <button
                          key={r}
                          onClick={() => setRunResult(r)}
                          className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors border ${
                            runResult === r ? RESULT_COLORS[r] : 'border-bg-tertiary text-text-secondary bg-bg-tertiary'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={runNotes}
                      onChange={e => setRunNotes(e.target.value)}
                      placeholder="Notes (optional)…"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setRunningId(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => handleRun(tc)} disabled={savingRun}>
                        {savingRun ? 'Saving…' : 'Record result'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer summary */}
        {total > 0 && (
          <div className="flex items-center gap-4 pt-2 border-t border-bg-tertiary text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <FlaskConical className="h-3.5 w-3.5" />
              {total} total
            </span>
            <span className="text-accent-success">{passed} passed</span>
            <span className="text-accent-danger">{failed} failed</span>
            <span className="text-text-secondary">{pending} pending</span>
            <span className="ml-auto font-medium text-text-primary">{coverage}% coverage</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
