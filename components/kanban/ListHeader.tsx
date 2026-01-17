'use client';

import { useState } from 'react';
import { MoreVertical, Edit, Trash2, Palette } from 'lucide-react';

// Preset colors for lists
const LIST_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
];

interface ListHeaderProps {
  name: string;
  cardCount: number;
  color?: string;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  onColorChange?: (color: string) => void;
}

export function ListHeader({ name, cardCount, color, onRename, onDelete, onColorChange }: ListHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleSubmit = () => {
    if (editName.trim() && editName !== name && onRename) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditName(name);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-3 px-1">
      {isEditing ? (
        <input
          autoFocus
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          className="flex-1 bg-bg-primary border border-accent-primary rounded px-2 py-1 text-sm font-semibold text-text-primary outline-none"
        />
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <h3 className="font-semibold text-text-primary">{name}</h3>
          <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded-full">
            {cardCount}
          </span>
        </div>
      )}

      {!isEditing && (onRename || onDelete) && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-text-secondary" />
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 mt-1 w-40 bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg z-20 py-1">
                {onRename && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary transition-colors flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Rename
                  </button>
                )}
                {onColorChange && (
                  <button
                    onClick={() => {
                      setShowColorPicker(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary transition-colors flex items-center gap-2"
                  >
                    <Palette className="h-4 w-4" />
                    Color
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-accent-danger hover:bg-accent-danger/10 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}

          {/* Color Picker */}
          {showColorPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowColorPicker(false)}
              />
              <div className="absolute right-0 mt-1 bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg z-20 p-3 w-32">
                <p className="text-xs text-text-secondary mb-2">List color</p>
                <div className="flex flex-wrap gap-2">
                  {LIST_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        onColorChange?.(c.value);
                        setShowColorPicker(false);
                      }}
                      className={`w-8 h-8 flex-shrink-0 rounded-lg border-2 transition-all ${
                        color === c.value
                          ? 'border-accent-primary scale-110'
                          : 'border-transparent hover:border-bg-tertiary'
                      }`}
                      style={{ backgroundColor: c.value || 'var(--bg-tertiary)' }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
