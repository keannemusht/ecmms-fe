'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Clock, ChevronRight, CalendarClock, FileCheck2, MessageSquare, Siren, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useUI } from '../context/UIContext';
import { useToast } from '../context/ToastContext';
import AppShell from '../components/AppShell';
import { Card, PageHeader, Button, EmptyState, Pagination, cn } from '../components/ui';
import { formatDateTime, getApiError } from '../lib/helpers';
import { InAppNotification } from '../lib/types';

type Category = 'all' | 'expiration' | 'submission' | 'escalation';

const PAGE_SIZE = 10;

export default function NotificationsPage() {
  const { t } = useUI();
  const toast = useToast();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(PAGE_SIZE));
      if (category !== 'all') params.append('category', category);
      const res = await api.get(`/notifications/in-app?${params.toString()}`);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/in-app/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const openNotification = (n: InAppNotification) => {
    if (n.link) window.open(n.link, '_blank');
    if (!n.isRead) markAsRead(n.id);
  };

  const sendWhatsApp = async (n: InAppNotification) => {
    try {
      const res = await api.post(`/notifications/in-app/${n.id}/send-whatsapp`);
      const link: string = res.data.link;
      window.open(link, '_blank');
      markAsRead(n.id);
    } catch (err) {
      console.error('Failed to build WhatsApp link:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/in-app/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const clearAll = async () => {
    const confirmed = await toast.confirm(t.notifications.clearAllConfirm, {
      title: t.notifications.clearAll,
      confirmLabel: t.notifications.clearAll,
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.delete('/notifications/in-app');
      setNotifications([]);
      setUnreadCount(0);
      setTotal(0);
      setTotalPages(1);
      setPage(1);
      toast.success(t.common.success);
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const categoryMeta: Record<Category, { icon: React.ElementType; label: string }> = {
    all: { icon: Bell, label: t.notifications.categoryAll },
    expiration: { icon: CalendarClock, label: t.notifications.categoryExpiration },
    submission: { icon: FileCheck2, label: t.notifications.categorySubmission },
    escalation: { icon: Siren, label: t.notifications.categoryEscalation },
  };

  return (
    <AppShell>
      <PageHeader
        title={t.notifications.title}
        subtitle={t.notifications.subtitle}
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={markAllRead}>
                <CheckCheck size={14} /> {t.notifications.markAllRead}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} title={t.notifications.clearAll}>
                <Trash2 size={14} className="text-expired" /> {t.notifications.clearAll}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {(Object.keys(categoryMeta) as Category[]).map((key) => {
          const meta = categoryMeta[key];
          const Icon = meta.icon;
          return (
            <button
              key={key}
              onClick={() => {
                setCategory(key);
                setPage(1);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[11px] font-semibold transition-colors',
                category === key ? 'bg-accent text-white dark:text-ink' : 'bg-muted text-ink-2 hover:text-ink'
              )}
            >
              <Icon size={13} />
              {meta.label}
              {key === 'all' && unreadCount > 0 && (
                <span className="rounded-full bg-expired px-1.5 text-[10px] font-bold text-white">{unreadCount}</span>
              )}
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-ink-2">{t.common.loading}</div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={t.notifications.empty}
            description={t.notifications.subtitle}
          />
        ) : (
          <div className="divide-y divide-line">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => openNotification(n)}
                className={cn(
                  'cursor-pointer p-4 transition-colors',
                  n.isRead ? 'hover:bg-muted/50' : 'bg-accent-soft/30 hover:bg-accent-soft/60'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                      <p className="text-sm font-semibold text-ink">{n.title}</p>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-2">{n.message}</p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-2">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {formatDateTime(n.createdAt)}
                      </span>
                      {n.link && (
                        <span className="flex items-center gap-0.5 font-semibold text-accent">
                          {t.common.open} <ChevronRight size={11} />
                        </span>
                      )}
                      {n.whatsappPhone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendWhatsApp(n);
                          }}
                          className="flex items-center gap-1 rounded-[4px] bg-active/10 px-2 py-0.5 font-semibold text-active hover:bg-active/20"
                        >
                          <MessageSquare size={11} /> {t.notifications.sendWhatsApp}
                        </button>
                      )}
                    </div>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      className="btn btn-ghost btn-sm shrink-0"
                      title={t.notifications.markAllRead}
                    >
                      <Check size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPage={setPage}
            previousLabel={t.common.previous}
            nextLabel={t.common.next}
            pageInfoLabel={t.common.pageInfo}
            pageOfLabel={t.common.pageOf}
          />
        )}
      </Card>
    </AppShell>
  );
}
