'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Power } from 'lucide-react';
import api from '../lib/api';
import { useUI } from '../context/UIContext';
import AppShell from './AppShell';
import { Card, PageHeader, Badge, Button, Modal, Field, Input, EmptyState } from './ui';
import { formatDate, getApiError } from '../lib/helpers';
import { ReferenceItem } from '../lib/types';

interface Props {
  endpoint: '/departments' | '/positions';
  dict: 'departments' | 'positions';
  icon: React.ElementType;
  addIcon: React.ElementType;
}

export default function ReferenceData({ endpoint, dict, icon: Icon, addIcon: AddIcon }: Props) {
  const { t } = useUI();
  const d = t[dict];

  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageMsg, setPageMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [modal, setModal] = useState<{ open: boolean; editing: ReferenceItem | null; name: string; error: string; saving: boolean }>({
    open: false,
    editing: null,
    name: '',
    error: '',
    saving: false,
  });
  const [confirmDelete, setConfirmDelete] = useState<ReferenceItem | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(endpoint);
      setItems(res.data || []);
    } catch (err) {
      setPageMsg({ type: 'error', text: getApiError(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pageMsg) return;
    const timer = setTimeout(() => setPageMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [pageMsg]);

  const openAdd = () => setModal({ open: true, editing: null, name: '', error: '', saving: false });

  const openEdit = (item: ReferenceItem) => setModal({ open: true, editing: item, name: item.name, error: '', saving: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.name.trim()) {
      setModal({ ...modal, error: t.common.required });
      return;
    }
    setModal({ ...modal, saving: true, error: '' });
    try {
      if (modal.editing) {
        await api.put(`${endpoint}/${modal.editing.id}`, { name: modal.name.trim() });
        setPageMsg({ type: 'success', text: t.common.success });
      } else {
        await api.post(endpoint, { name: modal.name.trim() });
        setPageMsg({ type: 'success', text: t.common.success });
      }
      setModal({ ...modal, open: false, saving: false });
      fetchItems();
    } catch (err) {
      setModal({ ...modal, saving: false, error: getApiError(err) });
    }
  };

  const toggleActive = async (item: ReferenceItem) => {
    try {
      await api.put(`${endpoint}/${item.id}`, { isActive: !item.isActive });
      setPageMsg({ type: 'success', text: t.common.success });
      fetchItems();
    } catch (err) {
      setPageMsg({ type: 'error', text: getApiError(err) });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`${endpoint}/${confirmDelete.id}`);
      setConfirmDelete(null);
      setPageMsg({ type: 'success', text: t.common.success });
      fetchItems();
    } catch (err) {
      setPageMsg({ type: 'error', text: getApiError(err) });
      setConfirmDelete(null);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={d.title}
        subtitle={d.subtitle}
        actions={
          <Button variant="accent" onClick={openAdd}>
            <AddIcon size={15} /> {d.add}
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
        {loading ? (
          <div className="flex items-center justify-center py-16 text-xs text-ink-2">{t.common.loading}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={Icon} title={d.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">{d.name}</th>
                  <th className="th">{d.isActive}</th>
                  <th className="th">{d.created}</th>
                  <th className="th text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="trow">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-muted text-ink-2">
                          <Icon size={14} />
                        </div>
                        <span className="font-semibold text-ink">{item.name}</span>
                      </div>
                    </td>
                    <td className="td">
                      <Badge tone={item.isActive ? 'active' : 'neutral'}>
                        {item.isActive ? d.isActive : d.inactive}
                      </Badge>
                    </td>
                    <td className="td text-xs">{formatDate(item.createdAt)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(item)} title={item.isActive ? d.inactive : d.isActive}>
                          <Power size={14} className={item.isActive ? 'text-active' : 'text-ink-2'} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title={t.common.edit}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(item)} title={t.common.delete}>
                          <Trash2 size={14} className="text-expired" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.editing ? d.editTitle : d.addTitle}
        subtitle={d.subtitle}
      >
        {modal.error && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{modal.error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={d.name} required>
            <Input value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} autoFocus required />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal({ ...modal, open: false })}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="accent" disabled={modal.saving}>
              <Plus size={14} /> {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title={t.common.confirm} size="sm">
        <p className="text-sm text-ink">{d.deleteConfirm}</p>
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
