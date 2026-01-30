'use client';

import { useState } from 'react';
import { ChecklistItem } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CheckSquare, Square, Trash2, Plus } from 'lucide-react';
import { generateId } from '@/lib/utils/id';

interface ChecklistSectionProps {
  value: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  disabled?: boolean;
}

export function ChecklistSection({ value, onChange, disabled = false }: ChecklistSectionProps) {
  const [newItemText, setNewItemText] = useState('');

  const completedCount = value.filter(item => item.checked).length;
  const totalCount = value.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddItem = () => {
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: generateId(),
      content: newItemText.trim(),
      checked: false,
    };

    onChange([...value, newItem]);
    setNewItemText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleToggleItem = (id: string) => {
    onChange(
      value.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    onChange(value.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-primary">
          <CheckSquare className="h-5 w-5" />
          <h3 className="font-medium">Checklist</h3>
        </div>
        {totalCount > 0 && (
          <span className="text-sm text-text-secondary">
            {completedCount}/{totalCount}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              progressPercent === 100 ? 'bg-accent-success' : 'bg-accent-primary'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Items list */}
      {value.length > 0 && (
        <div className="space-y-1">
          {value.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg-secondary group"
            >
              <button
                type="button"
                onClick={() => handleToggleItem(item.id)}
                disabled={disabled}
                className="flex-shrink-0 text-text-secondary hover:text-accent-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {item.checked ? (
                  <CheckSquare className="h-5 w-5 text-accent-success" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </button>

              <span
                className={`flex-1 text-sm ${
                  item.checked
                    ? 'line-through text-text-secondary'
                    : 'text-text-primary'
                }`}
              >
                {item.content}
              </span>

              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="flex-shrink-0 p-1 text-text-secondary hover:text-accent-danger opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add item input */}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add checklist item..."
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
