'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { List as ListType } from '@/types';
import { ListHeader } from './ListHeader';
import { Card } from './Card';
import { AddCard } from './AddCard';

interface ListProps {
  list: ListType;
  onCardClick?: (cardId: string) => void;
  onAddCard?: (listId: string, title: string) => void;
  onRenameList?: (listId: string, newName: string) => void;
  onDeleteList?: (listId: string) => void;
}

export function List({
  list,
  onCardClick,
  onAddCard,
  onRenameList,
  onDeleteList,
}: ListProps) {
  const sortedCards = [...list.cards].sort((a, b) => a.position - b.position);
  const cardIds = sortedCards.map((card) => card.id);

  // Make the list itself sortable (for horizontal reordering)
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: 'list',
      list,
    },
  });

  // Make the list droppable for cards
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: list.id,
    data: {
      type: 'list',
      list,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setSortableRef}
      style={{
        ...style,
        height: 'calc(100vh - 280px)',
        maxHeight: 'calc(100vh - 280px)',
      }}
      className="flex-shrink-0 w-72 bg-bg-secondary rounded-lg p-3 flex flex-col"
    >
      {/* List header with drag handle */}
      <div {...attributes} {...listeners} className="flex-shrink-0">
        <ListHeader
          name={list.name}
          cardCount={list.cards.length}
          onRename={onRenameList ? (newName) => onRenameList(list.id, newName) : undefined}
          onDelete={onDeleteList ? () => onDeleteList(list.id) : undefined}
        />
      </div>

      {/* Cards droppable area */}
      <div
        ref={setDroppableRef}
        className="flex-1 overflow-y-auto space-y-2 my-2 scrollbar-thin"
        style={{ minHeight: 0 }}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {sortedCards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onClick={onCardClick ? () => onCardClick(card.id) : undefined}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add card button */}
      {onAddCard && <AddCard onAdd={(title) => onAddCard(list.id, title)} />}
    </div>
  );
}
