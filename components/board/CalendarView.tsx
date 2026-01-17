'use client';

import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import { Board, Card } from '@/types';
import { CARD_TYPES } from '@/lib/constants';

interface CalendarViewProps {
  board: Board;
  onCardClick: (cardId: string) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    card: Card;
    listName: string;
    eventType: 'dueDate' | 'meetingDate';
  };
}

export function CalendarView({ board, onCardClick }: CalendarViewProps) {
  // Convert cards with dates to calendar events
  const events = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];

    board.lists.forEach((list) => {
      list.cards.forEach((card) => {
        const cardType = CARD_TYPES.find((t) => t.value === card.type);

        // Add event for dueDate
        if (card.dueDate) {
          const isOverdue = new Date(card.dueDate) < new Date();
          calendarEvents.push({
            id: `${card.id}-due`,
            title: card.title,
            start: card.dueDate,
            backgroundColor: isOverdue ? '#ef4444' : '#3b82f6',
            borderColor: isOverdue ? '#dc2626' : '#2563eb',
            textColor: '#ffffff',
            extendedProps: {
              card,
              listName: list.name,
              eventType: 'dueDate',
            },
          });
        }

        // Add event for meetingDate (for meeting type cards)
        if (card.type === 'meeting' && card.meetingDate) {
          calendarEvents.push({
            id: `${card.id}-meeting`,
            title: `${cardType?.icon || ''} ${card.title}`,
            start: card.meetingDate,
            backgroundColor: '#8b5cf6',
            borderColor: '#7c3aed',
            textColor: '#ffffff',
            extendedProps: {
              card,
              listName: list.name,
              eventType: 'meetingDate',
            },
          });
        }
      });
    });

    return calendarEvents;
  }, [board.lists]);

  const handleEventClick = (info: EventClickArg) => {
    const card = info.event.extendedProps.card as Card;
    if (card) {
      onCardClick(card.id);
    }
  };

  return (
    <div className="h-full p-4 overflow-auto calendar-container">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventClick={handleEventClick}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek',
        }}
        height="auto"
        eventDisplay="block"
        dayMaxEvents={3}
        moreLinkClick="popover"
        eventDidMount={(info) => {
          // Add tooltip with list name and event type
          const { listName, eventType } = info.event.extendedProps;
          const typeLabel = eventType === 'meetingDate' ? 'Meeting' : 'Due';
          info.el.title = `${info.event.title}\n${typeLabel} - List: ${listName}`;
        }}
      />
    </div>
  );
}
