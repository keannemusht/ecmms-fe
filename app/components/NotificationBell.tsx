'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';
import { useUI } from '../context/UIContext';
import { cn } from './ui';
import { formatDateTime } from '../lib/helpers';
import { InAppNotification } from '../lib/types';

export default function NotificationBell() {
  const { t } = useUI();
  const router = useRouter();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notifications/in-app?limit=50');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/in-app/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark read:', error);
    }
  };

  const openNotification = (n: InAppNotification) => {
    if (!n.isRead) markAsRead(n.id);
    setIsOpen(false);
    if (n.contractId) {
      router.push(`/contracts?contract=${n.contractId}`);
    } else if (n.link) {
      window.open(n.link, '_blank');
    } else {
      router.push('/notifications');
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/in-app/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-[6px] border border-line bg-base p-2 text-ink-2 hover:bg-muted hover:text-ink"
        aria-label={t.nav.notifications}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-expired text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-[10px] border border-line bg-surface shadow-2xl sm:w-96">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <Bell size={15} className="shrink-0 text-accent" />
              <span className="truncate text-xs font-semibold text-ink sm:text-sm">{t.notifications.title}</span>
              {unreadCount > 0 && (
                <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  {unreadCount} {t.notifications.unread}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-medium text-accent transition-colors hover:underline"
              >
                <Check size={12} /> {t.notifications.markAllRead}
              </button>
            )}
          </div>

          <div className="max-h-80 divide-y divide-line overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-2">{t.notifications.empty}</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={cn(
                    'cursor-pointer p-3.5 text-xs transition-colors',
                    n.isRead ? 'hover:bg-muted/60' : 'bg-accent-soft/40 hover:bg-accent-soft/70'
                  )}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{n.title}</span>
                    {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  </div>
                  <p className="mb-2 leading-relaxed text-ink-2">{n.message}</p>
                  <div className="flex items-center justify-between text-[10px] text-ink-2">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {formatDateTime(n.createdAt)}
                    </span>
                    <span className="flex items-center gap-0.5 font-medium text-accent">
                      {t.common.open} <ChevronRight size={11} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
