'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Pencil, Trash2, Power, UserCog, Search, Check, ChevronsUpDown, X } from 'lucide-react';
import api from '../lib/api';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import { Card, PageHeader, Badge, Button, Modal, Field, Input, Select, Pagination, cn } from '../components/ui';
import { initials, avatarHue, getApiError } from '../lib/helpers';
import { AdminUser, Employee } from '../lib/types';

const ROLE_TONES: Record<string, 'info' | 'warning' | 'active'> = {
  ADMIN: 'info',
  MANAGEMENT: 'warning',
  USER: 'active',
};

const ALL_ROLES = ['ADMIN', 'MANAGEMENT'] as const;

function SearchableEmployeeSelect({
  employees,
  value,
  onSelect,
}: {
  employees: Employee[];
  value: string;
  onSelect: (employee: Employee | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedEmployee = useMemo(() => {
    return Array.isArray(employees) ? employees.find((e) => e.id === value) : undefined;
  }, [employees, value]);

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.nik && e.nik.toLowerCase().includes(q)) ||
        (e.department && e.department.toLowerCase().includes(q))
    );
  }, [employees, search]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-[6px] border border-line bg-surface px-3 py-2 text-left text-xs transition-colors hover:border-accent focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
          isOpen && 'border-accent ring-1 ring-accent'
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {selectedEmployee ? (
            <span className="truncate font-semibold text-ink">
              {selectedEmployee.name}{' '}
              <span className="font-normal text-ink-2">
                ({selectedEmployee.nik}) — {selectedEmployee.department}
              </span>
            </span>
          ) : (
            <span className="text-ink-2">-- Tidak Terhubung / Akun Khusus --</span>
          )}
        </div>
        <ChevronsUpDown size={14} className="shrink-0 text-ink-2" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-[8px] border border-line bg-surface shadow-2xl">
          <div className="border-b border-line p-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-2" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, NIK, atau departemen..."
                className="w-full rounded-[4px] border border-line bg-base py-1.5 pl-8 pr-7 text-xs text-ink placeholder:text-ink-2 focus:border-accent focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-[4px] px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted',
                !value && 'bg-accent/10 font-semibold text-accent'
              )}
            >
              <span>-- Tidak Terhubung / Akun Khusus --</span>
              {!value && <Check size={14} className="text-accent" />}
            </button>

            {filteredEmployees.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink-2">
                Tidak ada karyawan yang cocok dengan &ldquo;{search}&rdquo;
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = emp.id === value;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      onSelect(emp);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-[4px] px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted',
                      isSelected ? 'bg-accent/10 font-semibold text-accent' : 'text-ink'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-semibold">{emp.name}</div>
                      <div className="truncate text-[11px] text-ink-2">
                        NIK: <span className="font-mono">{emp.nik}</span> · {emp.department}
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="shrink-0 text-accent" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const { t } = useUI();
  const { user } = useAuth();
  const PAGE_SIZE = 10;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageMsg, setPageMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [modal, setModal] = useState<{
    open: boolean;
    editing: AdminUser | null;
    name: string;
    email: string;
    password: string;
    role: string;
    employeeId: string;
    error: string;
    saving: boolean;
  }>({ open: false, editing: null, name: '', email: '', password: '', role: 'MANAGEMENT', employeeId: '', error: '', saving: false });
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

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      const list = Array.isArray(res.data) ? res.data : (res.data?.employees || []);
      setEmployees(list);
    } catch (err) {
      console.error('Failed to load employees for user linking:', err);
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!pageMsg) return;
    const timer = setTimeout(() => setPageMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [pageMsg]);

  const openAdd = () =>
    setModal({ open: true, editing: null, name: '', email: '', password: '', role: 'MANAGEMENT', employeeId: '', error: '', saving: false });

  const openEdit = (u: AdminUser) =>
    setModal({
      open: true,
      editing: u,
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      employeeId: u.employeeId || '',
      error: '',
      saving: false,
    });

  const handleSelectEmployee = (selectedEmp: Employee | null) => {
    setModal((m) => ({
      ...m,
      employeeId: selectedEmp ? selectedEmp.id : '',
      name: selectedEmp ? selectedEmp.name : m.name,
      email: selectedEmp && selectedEmp.email && !m.editing ? selectedEmp.email : m.email,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModal((m) => ({ ...m, saving: true, error: '' }));
    try {
      if (modal.editing) {
        const payload: Record<string, unknown> = {
          name: modal.name,
          role: modal.role,
          isActive: modal.editing.isActive,
          employeeId: modal.employeeId || null,
        };
        if (modal.password) payload.password = modal.password;
        await api.put(`/users/${modal.editing.id}`, payload);
      } else {
        await api.post('/users', {
          name: modal.name,
          email: modal.email,
          password: modal.password,
          role: modal.role,
          employeeId: modal.employeeId || null,
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
          <table className="table min-w-[700px]">
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
                users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((u) => (
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

        <Pagination
          page={page}
          totalPages={Math.ceil(users.length / PAGE_SIZE)}
          total={users.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          previousLabel={t.common.previous}
          nextLabel={t.common.next}
          pageInfoLabel={t.common.pageInfo}
          pageOfLabel={t.common.pageOf}
        />
      </Card>

      <Modal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.editing ? t.users.editTitle : t.users.addTitle}
        subtitle={t.users.subtitle}
      >
        {modal.error && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{modal.error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t.users.employeeLink || 'Hubungkan ke Karyawan'} hint="Cari dan pilih karyawan berdasarkan nama, NIK, atau departemen (opsional)">
            <SearchableEmployeeSelect
              employees={employees}
              value={modal.employeeId}
              onSelect={handleSelectEmployee}
            />
          </Field>
          <Field label={t.users.name} required>
            <Input value={modal.name} onChange={set('name')} required placeholder="Nama Lengkap User" />
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
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal((m) => ({ ...m, open: false }))} className="w-full sm:w-auto">{t.common.cancel}</Button>
            <Button type="submit" variant="accent" disabled={modal.saving} className="w-full sm:w-auto">
              <UserCog size={14} /> {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title={t.common.confirm} size="sm">
        <p className="text-sm text-ink">{t.users.deleteConfirm}</p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="w-full sm:w-auto">{t.common.cancel}</Button>
          <Button variant="danger" onClick={handleDelete} className="w-full sm:w-auto">
            <Trash2 size={14} /> {t.common.delete}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
