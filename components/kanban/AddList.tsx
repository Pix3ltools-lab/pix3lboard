'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AddListProps {
  onAdd: (name: string) => void;
}

export function AddList({ onAdd }: AddListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
    setIsAdding(false);
  };

  const handleCancel = () => {
    setName('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex-shrink-0 w-72 p-4 bg-bg-secondary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center gap-2 text-text-secondary"
      >
        <Plus className="h-5 w-5" />
        <span className="font-medium">Add a list</span>
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-72 p-4 bg-bg-secondary rounded-lg border-2 border-accent-primary">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter list name..."
        className="w-full bg-bg-primary border border-bg-tertiary rounded px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-accent-primary"
      />
      <div className="flex items-center gap-2 mt-2">
        <Button size="sm" onClick={handleSubmit} disabled={!name.trim()}>
          Add List
        </Button>
        <button
          onClick={handleCancel}
          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
        >
          <X className="h-4 w-4 text-text-secondary" />
        </button>
      </div>
    </div>
  );
}
