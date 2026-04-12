'use client';

import { useState, useCallback } from 'react';
import { useData } from '@/lib/context/DataContext';
import { Requirement, TestCase } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Link, X } from 'lucide-react';

const PRIORITY_OPTIONS = ['high', 'medium', 'low'] as const;
const STATUS_OPTIONS = ['draft', 'approved', 'implemented', 'verified'] as const;

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-accent-danger/10 text-accent-danger',
  medium: 'bg-accent-warning/10 text-accent-warning',
  low: 'bg-accent-success/10 text-accent-success',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-bg-tertiary text-text-secondary',
  approved: 'bg-accent-secondary/10 text-accent-secondary',
  implemented: 'bg-accent-warning/10 text-accent-warning',
  verified: 'bg-accent-success/10 text-accent-success',
};

interface RequirementsTabProps {
  boardId: string;
  requirements: Requirement[];
  onRefresh: () => void;
}

interface CreateForm {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface EditForm {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'approved' | 'implemented' | 'verified';
}

export function RequirementsTab({ boardId, requirements, onRefresh }: RequirementsTabProps) {
  const { getBoard } = useData();
  const board = getBoard(boardId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedTestCases, setExpandedTestCases] = useState<Record<string, TestCase[]>>({});
  const [loadingTestCases, setLoadingTestCases] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateForm>({ title: '', description: '', priority: 'medium' });
  const [editForm, setEditForm] = useState<EditForm>({ title: '', description: '', priority: 'medium', status: 'draft' });
  const [saving, setSaving] = useState(false);

  // Card link state
  const [linkingCardForReq, setLinkingCardForReq] = useState<string | null>(null);
  const [cardSearch, setCardSearch] = useState('');

  const allCards = board?.lists.flatMap(l => l.cards) ?? [];
  const filteredCards = allCards.filter(c =>
    cardSearch.trim().length > 0 &&
    (c.title.toLowerCase().includes(cardSearch.toLowerCase()) || c.id.includes(cardSearch))
  );

  const handleExpand = useCallback(async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!expandedTestCases[id]) {
      setLoadingTestCases(id);
      try {
        const req = requirements.find(r => r.id === id);
        const linkedCardIds = new Set(req?.linkedCardIds ?? []);
        const res = await fetch(`/api/test-cases?boardId=${boardId}`);
        if (res.ok) {
          const data = await res.json();
          const linked = (data.testCases as TestCase[]).filter(tc =>
            tc.requirementId === id ||
            (tc.cardId != null && linkedCardIds.has(tc.cardId))
          );
          setExpandedTestCases(prev => ({ ...prev, [id]: linked }));
        }
      } finally {
        setLoadingTestCases(null);
      }
    }
  }, [expandedId, expandedTestCases, boardId, requirements]);

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, ...createForm }),
      });
      if (res.ok) {
        setCreateForm({ title: '', description: '', priority: 'medium' });
        setShowCreateForm(false);
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditStart = (req: Requirement) => {
    setEditingId(req.id);
    setEditForm({ title: req.title, description: req.description ?? '', priority: req.priority, status: req.status });
  };

  const handleEditSave = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/requirements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this requirement? This cannot be undone.')) return;
    await fetch(`/api/requirements/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const handleLinkCard = async (requirementId: string, cardId: string) => {
    await fetch(`/api/requirements/${requirementId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId }),
    });
    setLinkingCardForReq(null);
    setCardSearch('');
    onRefresh();
  };

  const handleUnlinkCard = async (requirementId: string, cardId: string) => {
    await fetch(`/api/requirements/${requirementId}/cards/${cardId}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className="space-y-3">
      {/* Create button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreateForm(v => !v)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Requirement
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-bg-secondary border border-accent-primary/30 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-text-primary">New Requirement</h3>
          <Input
            label="Title"
            value={createForm.title}
            onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Requirement title..."
            autoFocus
          />
          <Textarea
            label="Description (optional)"
            value={createForm.description}
            onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe the requirement..."
            rows={2}
          />
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => setCreateForm(f => ({ ...f, priority: p }))}
                  className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                    createForm.priority === p ? PRIORITY_COLORS[p] : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!createForm.title.trim() || saving}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      {/* Requirements list */}
      {requirements.length === 0 && !showCreateForm && (
        <div className="text-center py-16 text-text-secondary text-sm">
          No requirements yet. Click &ldquo;New Requirement&rdquo; to create one.
        </div>
      )}

      {requirements.map(req => (
        <div key={req.id} className="bg-bg-secondary border border-bg-tertiary rounded-lg overflow-hidden">
          {/* Row */}
          {editingId === req.id ? (
            /* Edit form */
            <div className="p-4 space-y-3">
              <Input
                label="Title"
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
              <Textarea
                label="Description"
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
              <div className="flex gap-4">
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-1">Priority</label>
                  <div className="flex gap-2">
                    {PRIORITY_OPTIONS.map(p => (
                      <button
                        key={p}
                        onClick={() => setEditForm(f => ({ ...f, priority: p }))}
                        className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                          editForm.priority === p ? PRIORITY_COLORS[p] : 'bg-bg-tertiary text-text-secondary'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-1">Status</label>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => setEditForm(f => ({ ...f, status: s }))}
                        className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                          editForm.status === s ? STATUS_COLORS[s] : 'bg-bg-tertiary text-text-secondary'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button size="sm" onClick={() => handleEditSave(req.id)} disabled={!editForm.title.trim() || saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => handleExpand(req.id)}
                className="text-text-secondary hover:text-text-primary transition-colors shrink-0"
              >
                {expandedId === req.id
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />
                }
              </button>
              <span className="font-mono text-xs font-medium text-accent-primary shrink-0 w-20">{req.code}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{req.title}</p>
                {req.description && (
                  <p className="text-xs text-text-secondary truncate">{req.description}</p>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize shrink-0 ${PRIORITY_COLORS[req.priority] ?? ''}`}>
                {req.priority}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize shrink-0 ${STATUS_COLORS[req.status] ?? ''}`}>
                {req.status}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <div className="w-14 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${(req.coveragePercent ?? 0) === 100 ? 'bg-accent-success' : 'bg-accent-warning'}`}
                    style={{ width: `${req.coveragePercent ?? 0}%` }}
                  />
                </div>
                <span className="text-xs text-text-secondary w-7 text-right">{req.coveragePercent ?? 0}%</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleEditStart(req)}
                  className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(req.id)}
                  className="p-1.5 text-text-secondary hover:text-accent-danger hover:bg-accent-danger/10 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Expanded section */}
          {expandedId === req.id && editingId !== req.id && (
            <div className="border-t border-bg-tertiary px-4 py-3 space-y-3 bg-bg-primary/30">

              {/* Linked cards */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Linked Cards</p>
                  <button
                    onClick={() => setLinkingCardForReq(linkingCardForReq === req.id ? null : req.id)}
                    className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
                  >
                    <Link className="h-3 w-3" />
                    Link card
                  </button>
                </div>

                {linkingCardForReq === req.id && (
                  <div className="mb-2 relative">
                    <Input
                      value={cardSearch}
                      onChange={e => setCardSearch(e.target.value)}
                      placeholder="Search cards by title…"
                      autoFocus
                    />
                    {filteredCards.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCards.map(card => (
                          <button
                            key={card.id}
                            onClick={() => handleLinkCard(req.id, card.id)}
                            className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
                          >
                            {card.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {(req.linkedCardIds ?? []).length === 0 ? (
                    <span className="text-xs text-text-secondary">No cards linked</span>
                  ) : (
                    req.linkedCardIds!.map(cardId => {
                      const card = allCards.find(c => c.id === cardId);
                      return (
                        <span
                          key={cardId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary text-xs"
                        >
                          {card?.title ?? cardId}
                          <button
                            onClick={() => handleUnlinkCard(req.id, cardId)}
                            className="hover:text-accent-danger transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Linked test cases */}
              <div>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Test Cases</p>
                {loadingTestCases === req.id ? (
                  <p className="text-xs text-text-secondary">Loading…</p>
                ) : (expandedTestCases[req.id] ?? []).length === 0 ? (
                  <p className="text-xs text-text-secondary">No test cases linked to this requirement</p>
                ) : (
                  <div className="space-y-1">
                    {expandedTestCases[req.id].map(tc => (
                      <div key={tc.id} className="flex items-center gap-3 px-2 py-1.5 rounded bg-bg-secondary border border-bg-tertiary">
                        <span className="font-mono text-xs text-accent-primary shrink-0">{tc.code}</span>
                        <span className="text-xs text-text-primary flex-1 truncate">{tc.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary capitalize shrink-0">{tc.type}</span>
                        {tc.latestResult && (
                          <span className={`text-xs px-1.5 py-0.5 rounded capitalize shrink-0 ${
                            tc.latestResult === 'passed' ? 'bg-accent-success/10 text-accent-success'
                            : tc.latestResult === 'failed' ? 'bg-accent-danger/10 text-accent-danger'
                            : 'bg-bg-tertiary text-text-secondary'
                          }`}>
                            {tc.latestResult}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
