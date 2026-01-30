'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface AttendeesListProps {
  value: string[];
  onChange: (attendees: string[]) => void;
  disabled?: boolean;
}

const MAX_ATTENDEES = 5;

export function AttendeesList({ value, onChange, disabled = false }: AttendeesListProps) {
  const [newAttendee, setNewAttendee] = useState('');

  const handleAdd = () => {
    if (newAttendee.trim() && value.length < MAX_ATTENDEES) {
      onChange([...value, newAttendee.trim()]);
      setNewAttendee('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        Attendees (max {MAX_ATTENDEES})
      </label>

      {/* Existing attendees */}
      {value.length > 0 && (
        <div className="space-y-2 mb-2">
          {value.map((attendee, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-2 p-2 bg-bg-secondary rounded border border-bg-tertiary"
            >
              <span className="text-sm text-text-primary">{attendee}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="text-text-secondary hover:text-accent-danger transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new attendee */}
      {!disabled && value.length < MAX_ATTENDEES && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newAttendee}
            onChange={(e) => setNewAttendee(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add attendee..."
            className="flex-1 px-3 py-2 bg-bg-secondary border border-bg-tertiary rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-colors text-sm"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newAttendee.trim()}
            className="px-3 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {value.length >= MAX_ATTENDEES && (
        <p className="text-xs text-text-secondary mt-2">
          Maximum number of attendees reached
        </p>
      )}
    </div>
  );
}
