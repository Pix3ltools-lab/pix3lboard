'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, User, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/lib/context/NotificationContext';
import type { NotificationType } from '@/types';

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'assignment':
      return <User className="h-4 w-4 text-blue-500" />;
    case 'comment':
    case 'mention':
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    case 'due_date':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'due_date_passed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Bell className="h-4 w-4 text-text-secondary" />;
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ora';
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return date.toLocaleDateString('it-IT');
}

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md hover:bg-bg-secondary transition-colors"
        aria-label="Notifiche"
      >
        <Bell className="h-5 w-5 text-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-bg-primary border border-bg-tertiary rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-bg-tertiary">
            <span className="text-sm font-medium text-text-primary">
              Notifiche {unreadCount > 0 && `(${unreadCount})`}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Segna tutte lette
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-secondary text-sm">
                Nessuna notifica
              </div>
            ) : (
              <div className="py-1">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-bg-secondary transition-colors ${
                      !notification.isRead ? 'bg-bg-secondary/50' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type as NotificationType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-text-secondary/70 mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 bg-accent-primary rounded-full" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
