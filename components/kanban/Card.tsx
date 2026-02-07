'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card as CardType } from '@/types';
import { formatRelative } from '@/lib/utils/date';
import { Clock, Tag, Star, User, Users, AlertCircle, CheckSquare, BookOpen } from 'lucide-react';
import { CARD_TYPES } from '@/lib/constants';
import { useUI } from '@/lib/context/UIContext';
import { clsx } from 'clsx';

interface CardProps {
  card: CardType;
  onClick?: () => void;
}

export function Card({ card, onClick }: CardProps) {
  const { compactMode } = useUI();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cardType = CARD_TYPES.find((t) => t.value === card.type);
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  // Severity colors for bug type
  const severityColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        "group bg-bg-primary rounded-lg border-2 border-bg-tertiary cursor-pointer hover:border-accent-primary transition-all hover:shadow-md touch-none",
        compactMode ? "p-2" : "p-3"
      )}
    >
      {/* Header row with type and job number */}
      {(cardType || card.jobNumber) && (
        <div className={clsx(
          "flex items-center justify-between gap-2",
          compactMode ? "mb-1" : "mb-2"
        )}>
          {/* Card type indicator */}
          {cardType && (
            <div className="flex items-center gap-1">
              <span className={compactMode ? "text-xs" : "text-sm"}>{cardType.icon}</span>
              {!compactMode && <span className="text-xs text-text-secondary">{cardType.label}</span>}
            </div>
          )}

          {/* Job Number badge */}
          {card.jobNumber && (
            <div className="px-1.5 py-0.5 bg-bg-secondary border border-bg-tertiary rounded text-xs font-mono text-text-primary">
              {card.jobNumber}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <h4 className={clsx(
        "text-sm font-medium text-text-primary",
        compactMode ? "mb-1 line-clamp-2" : "mb-2 line-clamp-3"
      )}>
        {card.title}
      </h4>

      {/* Description preview - hidden in compact mode */}
      {!compactMode && card.description && (
        <p className="text-xs text-text-secondary mb-2 line-clamp-2">
          {card.description}
        </p>
      )}

      {/* Thumbnail - smaller in compact mode */}
      {card.thumbnail && (
        <div className={clsx("rounded overflow-hidden", compactMode ? "mb-1" : "mb-2")}>
          <img
            src={card.thumbnail}
            alt=""
            className={clsx("w-full object-cover", compactMode ? "h-16" : "h-24")}
          />
        </div>
      )}

      {/* Responsible - show user name if linked, otherwise legacy text */}
      {(card.responsibleUserName || card.responsible) && (
        <div className={clsx("flex items-center gap-1 text-xs", compactMode ? "mb-1" : "mb-2")}>
          <User className="h-3 w-3 text-accent-primary" />
          <span className="text-text-primary font-medium truncate">
            {card.responsibleUserName || card.responsible}
          </span>
        </div>
      )}

      {/* Metadata row */}
      <div className={clsx(
        "flex items-center text-xs text-text-secondary flex-wrap",
        compactMode ? "gap-2" : "gap-3"
      )}>
        {/* Bug severity */}
        {card.type === 'bug' && card.severity && (
          <div className="flex items-center gap-1">
            <AlertCircle
              className="h-3 w-3"
              style={{ color: severityColors[card.severity] }}
            />
            {!compactMode && <span className="capitalize">{card.severity}</span>}
          </div>
        )}

        {/* Feature priority */}
        {card.type === 'feature' && card.priority && (
          <div className="px-1.5 py-0.5 bg-accent-primary/20 text-accent-primary rounded text-xs font-medium">
            P{card.priority === 'high' ? '1' : card.priority === 'medium' ? '2' : '3'}
          </div>
        )}

        {/* Feature effort */}
        {card.type === 'feature' && card.effort && (
          <div className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs font-medium">
            {card.effort === 'small' ? 'S' : card.effort === 'medium' ? 'M' : 'L'}
          </div>
        )}

        {/* Meeting attendees */}
        {card.type === 'meeting' && card.attendees && card.attendees.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{card.attendees.length}</span>
          </div>
        )}

        {/* Rating */}
        {card.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-accent-warning text-accent-warning" />
            <span>{card.rating}/5</span>
          </div>
        )}

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            <span>{card.tags.length}</span>
          </div>
        )}

        {/* Checklist */}
        {card.checklist && card.checklist.length > 0 && (
          <div className={`flex items-center gap-1 ${
            card.checklist.every(item => item.checked) ? 'text-accent-success' : ''
          }`}>
            <CheckSquare className="h-3 w-3" />
            <span>{card.checklist.filter(item => item.checked).length}/{card.checklist.length}</span>
          </div>
        )}

        {/* Due date */}
        {card.dueDate && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-accent-danger' : ''}`}>
            <Clock className="h-3 w-3" />
            <span>{formatRelative(card.dueDate)}</span>
          </div>
        )}

        {/* Wiki page */}
        {card.wikiPageId && (
          <div className="flex items-center gap-1 text-accent-primary">
            <BookOpen className="h-3 w-3" />
            {!compactMode && <span>Wiki</span>}
          </div>
        )}
      </div>

      {/* AI Tool badge - hidden in compact mode */}
      {!compactMode && card.aiTool && (
        <div className="mt-2 pt-2 border-t border-bg-tertiary">
          <span className="text-xs text-text-secondary">🤖 {card.aiTool}</span>
        </div>
      )}
    </div>
  );
}
