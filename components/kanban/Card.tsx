'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card as CardType } from '@/types';
import { formatRelative } from '@/lib/utils/date';
import { Clock, Tag, Star, User } from 'lucide-react';
import { CARD_TYPES } from '@/lib/constants';

interface CardProps {
  card: CardType;
  onClick?: () => void;
}

export function Card({ card, onClick }: CardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group bg-bg-primary rounded-lg border-2 border-bg-tertiary p-3 cursor-pointer hover:border-accent-primary transition-all hover:shadow-md touch-none"
    >
      {/* Card type indicator */}
      {cardType && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-sm">{cardType.icon}</span>
          <span className="text-xs text-text-secondary">{cardType.label}</span>
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm font-medium text-text-primary mb-2 line-clamp-3">
        {card.title}
      </h4>

      {/* Description preview */}
      {card.description && (
        <p className="text-xs text-text-secondary mb-2 line-clamp-2">
          {card.description}
        </p>
      )}

      {/* Responsible */}
      {card.responsible && (
        <div className="flex items-center gap-1 mb-2 text-xs">
          <User className="h-3 w-3 text-accent-primary" />
          <span className="text-text-primary font-medium">{card.responsible}</span>
        </div>
      )}

      {/* Metadata row */}
      <div className="flex items-center gap-3 text-xs text-text-secondary flex-wrap">
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

        {/* Due date */}
        {card.dueDate && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-accent-danger' : ''}`}>
            <Clock className="h-3 w-3" />
            <span>{formatRelative(card.dueDate)}</span>
          </div>
        )}
      </div>

      {/* AI Tool badge */}
      {card.aiTool && (
        <div className="mt-2 pt-2 border-t border-bg-tertiary">
          <span className="text-xs text-text-secondary">🤖 {card.aiTool}</span>
        </div>
      )}
    </div>
  );
}
