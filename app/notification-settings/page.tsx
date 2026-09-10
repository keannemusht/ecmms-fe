'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Clock, History, Plus, Pencil, Mail, MessageSquare, Power, Trash2, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useUI } from '../context/UIContext';
import { useToast } from '../context/ToastContext';
import AppShell from '../components/AppShell';
import {
  Card,
  PageHeader,
  Badge,
  Button,
  Modal,
  Field,
  Input,
  Textarea,
  EmptyState,
  Pagination,
  cn,
} from '../components/ui';
import { formatDateTime, getApiError } from '../lib/helpers';
import { NotificationRule, NotificationLog, NotificationChannel } from '../lib/types';
import { Role } from '../context/AuthContext';

const CHANNELS: NotificationChannel[] = ['EMAIL', 'WHATSAPP', 'IN_APP'];
const TARGET_ROLES: Role[] = ['ADMIN', 'MANAGEMENT', 'USER'];
const PAGE_SIZE = 10;

const channelMeta: Record<string, { icon: React.ElementType; labelKey: string; tone: 'info' | 'active' | 'neutral' }> = {
  EMAIL: { icon: Mail, labelKey: 'channelEmail', tone: 'info' },
  WHATSAPP: { icon: MessageSquare, labelKey: 'channelWa', tone: 'active' },
  IN_APP: { icon: Bell, labelKey: 'channelInapp', tone: 'neutral' },
};

interface RuleForm {
  name: string;
  daysBefore: number;
  channels: NotificationChannel[];
  targetRoles: Role[];
  template: string;
  isActive: boolean;
}

const emptyForm: RuleForm = {
  name: '',
  daysBefore: 30,
  channels: ['EMAIL'],
  targetRoles: ['USER', 'MANAGEMENT'],
  template: '',
  isActive: true,
};

export default function NotificationSettingsPage() {
  const { t, lang } = useUI();
  const toast = useToast();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [runningCron, setRunningCron] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<NotificationRule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchRules = useCallback(async () => {
    try {
      const res = await api.get('/notifications/rules');
      setRules(res.data || []);
    } catch (err) {
      console.error('Failed to fetch notification rules:', err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const res = await api.get(`/notifications/logs?page=${page}&limit=${PAGE_SIZE}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch notification logs:', err);
    } finally {
      setLogsLoading(false);
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  const openEdit = (rule: NotificationRule) => {
    setEditing(rule);
    setForm({
      name: rule.name,
      daysBefore: rule.daysBefore,
      channels: [...rule.channels],
      targetRoles: [...rule.targetRoles],
      template: rule.template,
      isActive: rule.isActive,
    });
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  const toggleActive = async (rule: NotificationRule) => {
    try {
      await api.put(`/notifications/rules/${rule.id}`, { isActive: !rule.isActive });
      fetchRules();
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      if (editing) {
        await api.put(`/notifications/rules/${editing.id}`, form);
      } else {
        await api.post('/notifications/rules', form);
      }
      setFormSuccess(t.common.success);
      fetchRules();
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 900);
    } catch (err) {
      setFormError(getApiError(err));
    }
  };

  const set = (k: 'name' | 'template') => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [k]: e.target.value });

  const setDaysBefore = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, daysBefore: Number(e.target.value) });

  const toggleChannel = (c: NotificationChannel) =>
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(c) ? f.channels.filter((x) => x !== c) : [...f.channels, c],
    }));

  const toggleRole = (r: Role) =>
    setForm((f) => ({
      ...f,
      targetRoles: f.targetRoles.includes(r) ? f.targetRoles.filter((x) => x !== r) : [...f.targetRoles, r],
    }));

  const deleteLog = async (id: string, recipient: string) => {
    const confirmed = await toast.confirm(`${t.notifications.deleteLogConfirm} (${recipient})`, {
      title: t.notifications.deleteLog,
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/notifications/logs/${id}`);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success(t.common.success);
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const clearLogs = async () => {
    const confirmed = await toast.confirm(t.notifications.clearLogsConfirm, {
      title: t.notifications.clearLogs,
      confirmLabel: t.notifications.clearLogs,
      danger: true,
    });
    if (!confirmed) return;
    try {
      const res = await api.delete('/notifications/logs');
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
      setPage(1);
      toast.success(res.data?.message || t.common.success);
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const handleRunCron = async () => {
    setRunningCron(true);
    try {
      const res = await api.post('/notifications/run-cron');
      toast.success(res.data?.message || t.common.success);
      fetchLogs();
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setRunningCron(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={t.notifications.rules}
        subtitle={t.notifications.subtitle}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleRunCron} disabled={runningCron}>
              <RefreshCw size={14} className={cn(runningCron && 'animate-spin')} />
              {runningCron ? t.common.loading : t.notifications.runCheck}
            </Button>
            <Button variant="accent" onClick={openAdd}>
              <Plus size={15} /> {t.notifications.addRule}
            </Button>
          </div>
        }
      />

      {/* Rules */}
      <Card className="mb-5 p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
          <Clock size={15} className="text-accent" /> {t.notifications.rules}
        </h3>
        {loading ? (
          <p className="py-8 text-center text-xs text-ink-2">{t.common.loading}</p>
        ) : rules.length === 0 ? (
          <EmptyState icon={Bell} title={t.notifications.empty} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rules.map((r) => {
              return (
                <div key={r.id} className="rounded-[6px] border border-line bg-muted/40 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink">{r.name}</span>
                    <Badge tone={r.isActive ? 'active' : 'neutral'}>
                      {r.isActive ? t.notifications.isActive : t.notifications.isInactive}
                    </Badge>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-[4px] bg-accent-soft px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
                      H-{r.daysBefore}
                    </span>
                    {r.channels.map((c) => {
                      const ch = channelMeta[c] ?? channelMeta.IN_APP;
                      const Icon = ch.icon;
                      return (
                        <span key={c} className="flex items-center gap-1 text-[11px] text-ink-2">
                          <Icon size={12} /> {t.notifications[ch.labelKey as 'channelEmail']}
                        </span>
                      );
                    })}
                    {r.targetRoles.map((role) => (
                      <span
                        key={role}
                        className="rounded-[4px] bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-2"
                      >
                        {t.role[role.toLowerCase() as 'admin' | 'management' | 'user']}
                      </span>
                    ))}
                  </div>
                  <p className="mb-3 rounded-[6px] border border-line bg-surface p-2 text-[11px] italic text-ink-2">
                    “{r.template}”
                  </p>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleActive(r)}
                      className={cn(
                        'btn btn-ghost btn-sm',
                        r.isActive ? 'text-active hover:text-active/80' : 'text-ink-2 hover:text-ink'
                      )}
                      title={r.isActive ? (lang === 'en' ? 'Click to deactivate' : 'Klik untuk nonaktifkan') : (lang === 'en' ? 'Click to activate' : 'Klik untuk aktifkan')}
                    >
                      <Power size={13} /> {r.isActive ? t.notifications.isActive : t.notifications.isInactive}
                    </button>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                      <Pencil size={12} /> {t.common.edit}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Logs */}
      <Card className="overflow-hidden">
        <div className="border-b border-line p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <History size={15} className="text-accent" /> {t.notifications.logs}
            </h3>
            {logs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearLogs} title={t.notifications.clearLogs}>
                <Trash2 size={13} className="text-expired" /> {t.notifications.clearLogs}
              </Button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-ink-2">{t.notifications.logsSubtitle}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table min-w-[640px]">
            <thead>
              <tr>
                <th className="th">{t.notifications.recipient}</th>
                <th className="th">{t.notifications.channel}</th>
                <th className="th">{t.common.details}</th>
                <th className="th">{t.common.status}</th>
                <th className="th">{t.notifications.sentAt}</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td className="td py-8 text-center text-xs text-ink-2" colSpan={6}>{t.common.loading}</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="td py-8 text-center text-xs text-ink-2" colSpan={6}>{t.notifications.noLogs}</td>
                </tr>
              ) : (
                logs.map((l) => {
                  const ch = channelMeta[l.channel];
                  return (
                    <tr key={l.id} className="trow">
                      <td className="td text-xs font-semibold text-ink">
                        {l.recipient}
                        {l.contract?.employee?.name && (
                          <div className="text-[10px] font-normal text-ink-2">{l.contract.employee.name}</div>
                        )}
                      </td>
                      <td className="td">
                        <Badge tone={ch?.tone ?? 'neutral'}>{ch ? t.notifications[ch.labelKey as 'channelEmail'] : l.channel}</Badge>
                      </td>
                      <td className="td max-w-sm truncate text-xs">{l.message}</td>
                      <td className="td">
                        <Badge tone={l.status === 'SENT' ? 'active' : 'expired'}>
                          {l.status === 'SENT' ? t.notifications.statusSent : t.notifications.statusFailed}
                        </Badge>
                      </td>
                      <td className="td text-xs">{formatDateTime(l.sentAt)}</td>
                      <td className="td text-right">
                        <Button variant="ghost" size="sm" onClick={() => deleteLog(l.id, l.recipient)} title={t.notifications.deleteLog}>
                          <Trash2 size={13} className="text-expired" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
      </Card>

      {/* Rule Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t.notifications.editRule : t.notifications.addRule}
        size="lg"
      >
        {formError && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>}
        {formSuccess && <div className="mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active">{formSuccess}</div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.notifications.ruleName} required>
              <Input value={form.name} onChange={set('name')} placeholder="Reminder H-30" required />
            </Field>
            <Field label={t.notifications.daysBefore} required>
              <Input type="number" min={0} value={form.daysBefore} onChange={setDaysBefore} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.notifications.channel} required>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => {
                  const ch = channelMeta[c];
                  const Icon = ch.icon;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleChannel(c)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-[6px] border px-3 py-2 text-xs font-semibold transition-colors',
                        form.channels.includes(c)
                          ? 'border-accent bg-accent-soft text-ink'
                          : 'border-line bg-base text-ink-2 hover:border-accent'
                      )}
                    >
                      <Icon size={13} /> {t.notifications[ch.labelKey as 'channelEmail']}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label={t.notifications.targetRole} required>
              <div className="flex flex-wrap gap-2">
                {TARGET_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-[6px] border px-3 py-2 text-xs font-semibold transition-colors',
                      form.targetRoles.includes(r)
                        ? 'border-accent bg-accent-soft text-ink'
                        : 'border-line bg-base text-ink-2 hover:border-accent'
                    )}
                  >
                    {t.role[r.toLowerCase() as 'admin' | 'management' | 'user']}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <Field label={t.notifications.template} required>
            <Textarea value={form.template} onChange={set('template')} placeholder="Kontrak {nama} akan berakhir pada {tanggal}" required />
          </Field>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent-brand)]"
            />
            {t.notifications.isActive}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>{t.common.cancel}</Button>
            <Button type="submit" variant="accent">{t.common.save}</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
