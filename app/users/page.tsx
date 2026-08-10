'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Power, UserCog } from 'lucide-react';
import api from '../lib/api';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import { Card, PageHeader, Badge, Button, Modal, Field, Input, Select } from '../components/ui';
import { initials, avatarHue, getApiError } from '../lib/helpers';
import { AdminUser } from '../lib/types';

const ROLE_TONES: Record<string, 'info' | 'warning' | 'active'> = {
  ADMIN: 'info',
  MANAGEMENT: 'warning',
  USER: 'active',
};

const ALL_ROLES = ['ADMIN', 'MANAGEMENT', 'USER'] as const;

export default function UsersPage() {
  const { t } = useUI();
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageMsg, setPageMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [modal, setModal] = useState<{
    open: boolean;
    editing: AdminUser | null;
    name: string;
    email: string;
    password: string;
    role: string;
    error: string;
    saving: boolean;
  }>({ open: false, editing: null, name: '', email: '', password: '', role: 'MANAGEMENT', error: '', saving: false });
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const roleOptions = ALL_ROLES.filter((r) => isAdmin || r !== 'ADMIN');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data || []);
    } catch (err) {
      setPageMsg({ type: 'error', text: getApiError(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!pageMsg) return;
    const timer = setTimeout(() => setPageMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [pageMsg]);

  const openAdd = () =>
    setModal({ open: true, editing: null, name: '', email: '', password: '', role: 'MANAGEMENT', error: '', saving: false });

  const openEdit = (u: AdminUser) =>
    setModal({ open: true, editing: u, name: u.name, email: u.email, password: '', role: u.role, error: '', saving: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModal((m) => ({ ...m, saving: true, error: '' }));
    try {
      if (modal.editing) {
        const payload: Record<string, unknown> = {
          name: modal.name,
          role: modal.role,
          isActive: modal.editing.isActive,
        };
        if (modal.password) payload.password = modal.password;
        await api.put(`/users/${modal.editing.id}`, payload);
      } else {
        await api.post('/users', {
          name: modal.name,
          email: modal.email,
          password: modal.password,
          role: modal.role,
        });
      }
      setModal((m) => ({ ...m, open: false, saving: false }));
      setPageMsg({ type: 'success', text: t.common.success });
      fetchUsers();
    } catch (err) {
      setModal((m) => ({ ...m, saving: false, error: getApiError(err) }));
    }
  };

  const toggleActive = async (u: AdminUser) => {
    try {
      await api.put(`/users/${u.id}`, { name: u.name, role: u.role, isActive: !u.isActive });
      setPageMsg({ type: 'success', text: t.common.success });
      fetchUsers();
    } catch (err) {
      setPageMsg({ type: 'error', text: getApiError(err) });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/users/${confirmDelete.id}`);
      setConfirmDelete(null);
      setPageMsg({ type: 'success', text: t.common.success });
      fetchUsers();
    } catch (err) {
      setPageMsg({ type: 'error', text: getApiError(err) });
      setConfirmDelete(null);
    }
  };

  const set = (k: 'name' | 'email' | 'password' | 'role') => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setModal((m) => ({ ...m, [k]: e.target.value }));

  return (
    <AppShell>
      <PageHeader
        title={t.users.title}
        subtitle={t.users.subtitle}
        actions={
          <Button variant="accent" onClick={openAdd}>
            <Plus size={15} /> {t.users.addUser}
          </Button>
        }
      />

      {pageMsg && (
        <div
          className={pageMsg.type === 'error' ? 'mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired' : 'mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active'}
        >
          {pageMsg.text}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th">{t.users.name}</th>
                <th className="th">{t.users.email}</th>
                <th className="th">{t.users.role}</th>
                <th className="th">{t.users.employeeLink}</th>
                <th className="th">{t.users.status}</th>
                <th className="th text-right">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={6}>{t.common.loading}</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={6}>{t.users.noData}</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="trow">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: `hsl(${avatarHue(u.name)} 45% 45%)` }}
                        >
                          {initials(u.name)}
                        </div>
                        <span className="font-semibold text-ink">{u.name}</span>
                      </div>
                    </td>
                    <td className="td font-mono text-[11px] text-ink">{u.email}</td>
                    <td className="td">
                      <Badge tone={ROLE_TONES[u.role] ?? 'neutral'}>
                        {t.role[u.role?.toLowerCase() as 'admin' | 'management' | 'user'] ?? u.role}
                      </Badge>
                    </td>
                    <td className="td text-xs">
                      {u.employee ? `${u.employee.name} (${u.employee.nik})` : '-'}
                    </td>
                    <td className="td">
                      <Badge tone={u.isActive ? 'active' : 'neutral'}>{u.isActive ? t.users.active : t.users.inactive}</Badge>
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(u)} title={u.isActive ? t.users.inactive : t.users.active}>
                          <Power size={14} className={u.isActive ? 'text-active' : 'text-ink-2'} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)} title={t.common.edit}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(u)} title={t.common.delete}>
                          <Trash2 size={14} className="text-expired" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.editing ? t.users.editTitle : t.users.addTitle}
        subtitle={t.users.subtitle}
      >
        {modal.error && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{modal.error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t.users.name} required>
            <Input value={modal.name} onChange={set('name')} required />
          </Field>
          <Field label={t.users.email} required>
            <Input type="email" value={modal.email} onChange={set('email')} placeholder="email@company.com" required disabled={Boolean(modal.editing)} />
          </Field>
          {!modal.editing && (
            <Field label={t.users.password} required>
              <Input type="password" value={modal.password} onChange={set('password')} placeholder="••••••••" required />
            </Field>
          )}
          {modal.editing && (
            <Field label={t.users.password} hint={t.users.passwordHint}>
              <Input type="password" value={modal.password} onChange={set('password')} placeholder="••••••••" />
            </Field>
          )}
          <Field label={t.users.role} required hint={!isAdmin ? t.users.adminOnly : undefined}>
            <Select value={modal.role} onChange={set('role')} disabled={Boolean(modal.editing && !isAdmin && modal.editing.role === 'ADMIN')}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>{t.role[r.toLowerCase() as 'admin' | 'management' | 'user']}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal((m) => ({ ...m, open: false }))}>{t.common.cancel}</Button>
            <Button type="submit" variant="accent" disabled={modal.saving}>
              <UserCog size={14} /> {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title={t.common.confirm} size="sm">
        <p className="text-sm text-ink">{t.users.deleteConfirm}</p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{t.common.cancel}</Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 size={14} /> {t.common.delete}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
