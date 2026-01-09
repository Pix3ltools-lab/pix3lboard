'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Board, List as ListType, Card as CardType } from '@/types';
import { List } from './List';
import { Card } from './Card';
import { AddList } from './AddList';
import { EmptyBoard } from './EmptyBoard';
import { useSearch } from '@/lib/context/SearchContext';

interface KanbanBoardProps {
  board: Board;
  onCardClick?: (cardId: string) => void;
  onAddCard?: (listId: string, title: string) => void;
  onAddList?: (name: string) => void;
  onRenameList?: (listId: string, newName: string) => void;
  onDeleteList?: (listId: string) => void;
  onReorderLists?: (boardId: string, listIds: string[]) => void;
  onMoveCard?: (cardId: string, targetListId: string, targetIndex: number) => void;
}

export function KanbanBoard({
  board,
  onCardClick,
  onAddCard,
  onAddList,
  onRenameList,
  onDeleteList,
  onReorderLists,
  onMoveCard,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [activeList, setActiveList] = useState<ListType | null>(null);
  const { filterCards } = useSearch();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Filter cards and create filtered lists
  const filteredLists = useMemo(() => {
    return board.lists.map((list) => ({
      ...list,
      cards: filterCards(list.cards),
    }));
  }, [board.lists, filterCards]);

  const sortedLists = [...filteredLists].sort((a, b) => a.position - b.position);
  const listIds = sortedLists.map((list) => list.id);

  // Show empty state if no lists
  if (board.lists.length === 0) {
    return (
      <EmptyBoard
        onCreateList={() => {
          if (onAddList) {
            onAddList('To Do');
          }
        }}
      />
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    // Check if dragging a list
    const list = board.lists.find((l) => l.id === activeId);
    if (list) {
      setActiveList(list);
      return;
    }

    // Check if dragging a card
    for (const list of board.lists) {
      const card = list.cards.find((c) => c.id === activeId);
      if (card) {
        setActiveCard(card);
        return;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeCard) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Don't do anything if dropping on itself
    if (activeId === overId) return;

    // Find the lists
    const activeList = board.lists.find((list) =>
      list.cards.some((card) => card.id === activeId)
    );
    const overList = board.lists.find(
      (list) => list.id === overId || list.cards.some((card) => card.id === overId)
    );

    if (!activeList || !overList) return;

    // If moving between lists, trigger the move
    if (activeList.id !== overList.id) {
      const overCard = overList.cards.find((card) => card.id === overId);
      const overIndex = overCard
        ? overList.cards.findIndex((card) => card.id === overId)
        : overList.cards.length;

      if (onMoveCard) {
        onMoveCard(activeId, overList.id, overIndex);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setActiveList(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // If dragging a list
    if (activeList) {
      if (activeId !== overId && onReorderLists) {
        const oldIndex = listIds.indexOf(activeId);
        const newIndex = listIds.indexOf(overId);

        const newListIds = [...listIds];
        newListIds.splice(oldIndex, 1);
        newListIds.splice(newIndex, 0, activeId);

        onReorderLists(board.id, newListIds);
      }
      return;
    }

    // If dragging a card within the same list
    if (activeCard) {
      const activeList = board.lists.find((list) =>
        list.cards.some((card) => card.id === activeId)
      );
      const overList = board.lists.find(
        (list) => list.id === overId || list.cards.some((card) => card.id === overId)
      );

      if (!activeList || !overList) return;

      // Same list reorder
      if (activeList.id === overList.id && activeId !== overId) {
        const cards = activeList.cards;
        const oldIndex = cards.findIndex((card) => card.id === activeId);
        const newIndex = cards.findIndex((card) => card.id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && onMoveCard) {
          onMoveCard(activeId, activeList.id, newIndex);
        }
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-4 h-full items-start min-w-max">
          {/* Lists with horizontal sorting */}
          <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
            {sortedLists.map((list) => (
              <List
                key={list.id}
                list={list}
                onCardClick={onCardClick}
                onAddCard={onAddCard}
                onRenameList={onRenameList}
                onDeleteList={onDeleteList}
              />
            ))}
          </SortableContext>

          {/* Add List button */}
          {onAddList && <AddList onAdd={onAddList} />}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCard && (
          <div className="opacity-90 rotate-3 cursor-grabbing">
            <Card card={activeCard} />
          </div>
        )}
        {activeList && (
          <div className="opacity-90 cursor-grabbing">
            <List list={activeList} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
