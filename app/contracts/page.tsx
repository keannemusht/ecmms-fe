'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, RefreshCw, Award, FileText, Pencil, Trash2, MessageSquare } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AppShell from '../components/AppShell';
import {
  Card,
  PageHeader,
  Badge,
  Button,
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  cn,
} from '../components/ui';
import { formatDate, contractStatusTone, contractStatusKey, daysUntil, getApiError, toISODate } from '../lib/helpers';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { Contract, Employee } from '../lib/types';

const STATUS_FILTERS = [
  { labelKey: 'allStatus', value: '' },
  { labelKey: 'aktif', value: 'AKTIF' },
  { labelKey: 'akanBerakhir', value: 'AKAN_BERAKHIR' },
  { labelKey: 'expired', value: 'EXPIRED' },
  { labelKey: 'diperpanjang', value: 'DIPERPANJANG' },
  { labelKey: 'diangkatTetap', value: 'DIANGKAT_TETAP' },
];

const defaultStartDate = new Date().toISOString().split('T')[0];
const defaultEndDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

export default function ContractsPage() {
  const { user } = useAuth();
  const { t } = useUI();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Contract | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [waSending, setWaSending] = useState(false);

  const [newContractData, setNewContractData] = useState({
    employeeId: '',
    contractNumber: '',
    contractType: 'PKWT',
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    notes: '',
  });

  const [editData, setEditData] = useState({
    contractType: 'PKWT',
    status: 'AKTIF',
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    notes: '',
  });

  const [extendData, setExtendData] = useState({
    actionType: 'PERPANJANG_PKWT',
    newContractNumber: '',
    newStartDate: defaultStartDate,
    newEndDate: defaultEndDate,
    notes: '',
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);
      const res = await api.get(`/contracts?${params.toString()}`);
      setContracts(res.data.contracts || []);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchEmployees();
  }, [fetchContracts]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get('status');
    if (s) setStatusFilter(s);
  }, []);

  const autoOpenedContract = useRef(false);
  useEffect(() => {
    if (autoOpenedContract.current || contracts.length === 0) return;
    const sp = new URLSearchParams(window.location.search);
    const contractId = sp.get('contract');
    if (!contractId) return;
    const c = contracts.find((x) => x.id === contractId);
    if (c) {
      autoOpenedContract.current = true;
      openDetailModalFor(c);
    }
  }, [contracts]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      await api.post('/contracts', newContractData);
      setFormSuccess(t.common.success);
      fetchContracts();
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess('');
      }, 1000);
    } catch (err) {
      setFormError(getApiError(err));
    }
  };

  const handleExtendContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    setFormError('');
    setFormSuccess('');
    try {
      await api.post(`/contracts/${selectedContract.id}/extend`, extendData);
      setFormSuccess(t.common.success);
      fetchContracts();
      setTimeout(() => {
        setShowExtendModal(false);
        setFormSuccess('');
      }, 1000);
    } catch (err) {
      setFormError(getApiError(err));
    }
  };

  const openEditModalFor = (c: Contract) => {
    setSelectedContract(c);
    setEditData({
      contractType: c.contractType,
      status: c.status,
      startDate: toISODate(new Date(c.startDate)),
      endDate: toISODate(new Date(c.endDate)),
      notes: c.notes || '',
    });
    setShowEditModal(true);
  };

  const openDetailModalFor = (c: Contract) => {
    setSelectedContract(c);
    setShowDetailModal(true);
  };

  const sendWhatsApp = async (c: Contract) => {
    if (waSending) return;
    setWaSending(true);
    try {
      const res = await api.post(`/contracts/${c.id}/send-whatsapp`);
      const link: string = res.data.link;
      window.open(link, '_blank');
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setWaSending(false);
    }
  };

  const handleEditContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    setFormError('');
    setFormSuccess('');
    try {
      await api.put(`/contracts/${selectedContract.id}`, editData);
      setFormSuccess(t.common.success);
      fetchContracts();
      setTimeout(() => {
        setShowEditModal(false);
        setFormSuccess('');
      }, 1000);
    } catch (err) {
      setFormError(getApiError(err));
    }
  };

  const handleDeleteContract = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/contracts/${confirmDelete.id}`);
      setConfirmDelete(null);
      fetchContracts();
    } catch (err) {
      setFormError(getApiError(err));
      setConfirmDelete(null);
    }
  };

  const setEdit = (k: keyof typeof editData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setEditData({ ...editData, [k]: e.target.value });

  const openExtendModalFor = useCallback((c: Contract) => {
    setSelectedContract(c);
    const dept = c.employee?.department?.substring(0, 3).toUpperCase() || 'EMP';
    setExtendData({
      actionType: 'PERPANJANG_PKWT',
      newContractNumber: `PKWT/${new Date().getFullYear()}/${dept}/${Math.floor(Math.random() * 900 + 100)}`,
      newStartDate: new Date(c.endDate).toISOString().split('T')[0],
      newEndDate: new Date(new Date(c.endDate).getTime() + 365 * 86400000).toISOString().split('T')[0],
      notes: `${t.contracts.extendAction}: ${c.contractNumber}`,
    });
    setShowExtendModal(true);
  }, [t]);

  const extendHandledRef = useRef(false);
  useEffect(() => {
    if (loading || extendHandledRef.current) return;
    const sp = new URLSearchParams(window.location.search);
    const extendId = sp.get('extend');
    if (extendId) {
      const c = contracts.find((x) => x.id === extendId);
      if (c) {
        openExtendModalFor(c);
        extendHandledRef.current = true;
      }
    }
  }, [loading, contracts, openExtendModalFor]);

  const setNew = (k: keyof typeof newContractData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setNewContractData({ ...newContractData, [k]: e.target.value });

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const employeeId = e.target.value;
    const emp = employees.find((x) => x.id === employeeId);
    setNewContractData({
      ...newContractData,
      employeeId,
      startDate: emp?.joinDate ? toISODate(new Date(emp.joinDate)) : newContractData.startDate,
    });
  };

  const selectedEmployee = employees.find((x) => x.id === newContractData.employeeId);
  const setExt = (k: keyof typeof extendData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setExtendData({ ...extendData, [k]: e.target.value });

  return (
    <AppShell>
      <PageHeader
        title={t.contracts.title}
        subtitle={t.contracts.subtitle}
        actions={
          user?.role !== 'USER' ? (
            <Button variant="accent" onClick={() => setShowAddModal(true)}>
              <Plus size={15} /> {t.contracts.addContract}
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-80">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.contracts.searchPlaceholder} className="pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st.value}
                onClick={() => setStatusFilter(st.value)}
                className={cn(
                  'rounded-[4px] px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  statusFilter === st.value ? 'bg-accent text-white dark:text-ink' : 'bg-muted text-ink-2 hover:text-ink'
                )}
              >
                {t.status[st.labelKey as 'aktif'] ?? t.common.all}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th">{t.contracts.contractNo}</th>
                <th className="th">{t.contracts.employee}</th>
                <th className="th">{t.contracts.contractType}</th>
                <th className="th">{t.contracts.startDate}</th>
                <th className="th">{t.contracts.endDate}</th>
                <th className="th">{t.common.status}</th>
                {user?.role !== 'USER' && <th className="th text-right">{t.common.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={7}>{t.common.loading}</td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={7}>{t.common.noData}</td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id} className="trow cursor-pointer" onClick={() => openDetailModalFor(c)}>
                    <td className="td font-mono text-[11px] font-semibold text-ink">{c.contractNumber}</td>
                    <td className="td">
                      <div className="font-semibold text-ink">{c.employee?.name}</div>
                      <div className="text-[11px] text-ink-2">{c.employee?.department} — {c.employee?.position}</div>
                    </td>
                    <td className="td">
                      <Badge tone="info">{t.employmentType[c.contractType as 'PKWT'] ?? c.contractType}</Badge>
                    </td>
                    <td className="td text-xs">{formatDate(c.startDate)}</td>
                    <td className="td text-xs">
                      {formatDate(c.endDate)}
                      {c.status === 'AKAN_BERAKHIR' && daysUntil(c.endDate) !== null && daysUntil(c.endDate)! <= 30 && (
                        <div className="mt-0.5 text-[10px] font-semibold text-warning">
                          {daysUntil(c.endDate)} {t.dashboard.days}
                        </div>
                      )}
                    </td>
                    <td className="td">
                      <Badge tone={contractStatusTone(c.status)}>
                        {t.status[contractStatusKey(c.status) as 'aktif'] ?? c.status}
                      </Badge>
                    </td>
                    {user?.role !== 'USER' && (
                      <td className="td text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {['AKTIF', 'AKAN_BERAKHIR', 'EXPIRED'].includes(c.status) && (
                            <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); openExtendModalFor(c); }}>
                              <RefreshCw size={13} /> {t.contracts.followUp}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEditModalFor(c); }} title={t.common.edit}>
                            <Pencil size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }} title={t.common.delete}>
                            <Trash2 size={14} className="text-expired" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Contract Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title={t.contracts.addTitle} subtitle={t.contracts.addSubtitle}>
        {formError && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>}
        {formSuccess && <div className="mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active">{formSuccess}</div>}
        <form onSubmit={handleCreateContract} className="space-y-3.5">
          <Field label={t.contracts.employeeSelect} required>
            <Select value={newContractData.employeeId} onChange={handleEmployeeChange} required>
              <option value="">-- {t.contracts.employeeSelect} --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.nik}) - {emp.department}
                </option>
              ))}
            </Select>
          </Field>
          {selectedEmployee && (
            <div className="flex items-center justify-between rounded-[6px] border border-accent/30 bg-accent/10 px-3 py-2.5 text-xs text-ink">
              <span>{t.contracts.joinDateInfo}</span>
              <span className="font-bold">{formatDate(selectedEmployee.joinDate)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.contracts.contractNoLabel} required>
              <Input value={newContractData.contractNumber} onChange={setNew('contractNumber')} placeholder="PKWT/2026/TECH/001" required />
            </Field>
            <Field label={t.contracts.typeLabel} required>
              <Select value={newContractData.contractType} onChange={setNew('contractType')}>
                <option value="PKWT">{t.employmentType.PKWT}</option>
                <option value="PKWTT">{t.employmentType.PKWTT}</option>
                <option value="MAGANG">{t.employmentType.MAGANG}</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.contracts.dateStartLabel} required>
              <Input type="date" value={newContractData.startDate} onChange={setNew('startDate')} required />
            </Field>
            <Field label={t.contracts.dateEndLabel} required>
              <Input type="date" value={newContractData.endDate} onChange={setNew('endDate')} required />
            </Field>
          </div>
          <Field label={t.contracts.notesLabel}>
            <Textarea value={newContractData.notes} onChange={setNew('notes')} placeholder={t.common.notes} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>{t.common.cancel}</Button>
            <Button type="submit" variant="primary">{t.contracts.save}</Button>
          </div>
        </form>
      </Modal>

      {/* Extend / Convert Modal */}
      <Modal
        open={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        title={t.contracts.extendTitle}
        subtitle={`${t.contracts.extendFor}: ${selectedContract?.employee?.name} (${selectedContract?.contractNumber})`}
        size="lg"
      >
        {formError && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>}
        {formSuccess && <div className="mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active">{formSuccess}</div>}
        <form onSubmit={handleExtendContract} className="space-y-4">
          <Field label={t.contracts.decisionLabel} required>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setExtendData({ ...extendData, actionType: 'PERPANJANG_PKWT' })}
                className={cn(
                  'flex items-center gap-2 rounded-[6px] border p-3 text-left text-xs font-bold transition-colors',
                  extendData.actionType === 'PERPANJANG_PKWT'
                    ? 'border-accent bg-accent-soft text-ink'
                    : 'border-line bg-base text-ink-2 hover:border-accent'
                )}
              >
                <RefreshCw size={16} className="text-accent" /> {t.contracts.extendAction}
              </button>
              <button
                type="button"
                onClick={() => setExtendData({ ...extendData, actionType: 'ANGKAT_TETAP' })}
                className={cn(
                  'flex items-center gap-2 rounded-[6px] border p-3 text-left text-xs font-bold transition-colors',
                  extendData.actionType === 'ANGKAT_TETAP'
                    ? 'border-active bg-active/10 text-ink'
                    : 'border-line bg-base text-ink-2 hover:border-active'
                )}
              >
                <Award size={16} className="text-active" /> {t.contracts.convertAction}
              </button>
            </div>
          </Field>

          {extendData.actionType === 'PERPANJANG_PKWT' ? (
            <>
              <Field label={t.contracts.newContractNo} required>
                <Input value={extendData.newContractNumber} onChange={setExt('newContractNumber')} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.contracts.newStart} required>
                  <Input type="date" value={extendData.newStartDate} onChange={setExt('newStartDate')} required />
                </Field>
                <Field label={t.contracts.newEnd} required>
                  <Input type="date" value={extendData.newEndDate} onChange={setExt('newEndDate')} required />
                </Field>
              </div>
            </>
          ) : (
            <div className="rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-ink">
              {t.contracts.convertNote}
            </div>
          )}

          <Field label={t.contracts.evalNotes}>
            <Textarea value={extendData.notes} onChange={setExt('notes')} placeholder={t.common.notes} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowExtendModal(false)}>{t.common.cancel}</Button>
            <Button type="submit" variant="accent">
              <FileText size={14} /> {t.contracts.process}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Contract Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t.contracts.editTitle}
        subtitle={`${t.contracts.contractNoLabel}: ${selectedContract?.contractNumber}`}
      >
        {formError && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>}
        {formSuccess && <div className="mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active">{formSuccess}</div>}
        <form onSubmit={handleEditContract} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.contracts.typeLabel} required>
              <Select value={editData.contractType} onChange={setEdit('contractType')}>
                <option value="PKWT">{t.employmentType.PKWT}</option>
                <option value="PKWTT">{t.employmentType.PKWTT}</option>
                <option value="MAGANG">{t.employmentType.MAGANG}</option>
              </Select>
            </Field>
            <Field label={t.common.status} required>
              <Select value={editData.status} onChange={setEdit('status')}>
                {STATUS_FILTERS.filter((s) => s.value).map((s) => (
                  <option key={s.value} value={s.value}>
                    {t.status[s.labelKey as 'aktif'] ?? s.value}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.contracts.dateStartLabel} required>
              <Input type="date" value={editData.startDate} onChange={setEdit('startDate')} required />
            </Field>
            <Field label={t.contracts.dateEndLabel} required>
              <Input type="date" value={editData.endDate} onChange={setEdit('endDate')} required />
            </Field>
          </div>
          <Field label={t.contracts.notesLabel}>
            <Textarea value={editData.notes} onChange={setEdit('notes')} placeholder={t.common.notes} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>{t.common.cancel}</Button>
            <Button type="submit" variant="primary">{t.common.save}</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Contract Modal */}
      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t.contracts.detailTitle}
        subtitle={`${t.contracts.contractNoLabel}: ${selectedContract?.contractNumber}`}
      >
        {selectedContract && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">{t.contracts.employee}</div>
                <div className="text-sm font-semibold text-ink">{selectedContract.employee?.name}</div>
                <div className="text-[11px] text-ink-2">{selectedContract.employee?.nik}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">{t.contracts.department}</div>
                <div className="text-sm font-semibold text-ink">{selectedContract.employee?.department}</div>
                <div className="text-[11px] text-ink-2">{selectedContract.employee?.position}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">{t.contracts.typeLabel}</div>
                <Badge tone="info">{t.employmentType[selectedContract.contractType as 'PKWT'] ?? selectedContract.contractType}</Badge>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">{t.common.status}</div>
                <Badge tone={contractStatusTone(selectedContract.status)}>
                  {t.status[contractStatusKey(selectedContract.status) as 'aktif'] ?? selectedContract.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">{t.contracts.dateStartLabel}</div>
                <div className="text-sm font-semibold text-ink">{formatDate(selectedContract.startDate)}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">{t.contracts.dateEndLabel}</div>
                <div className="text-sm font-semibold text-ink">{formatDate(selectedContract.endDate)}</div>
                {selectedContract.status === 'AKAN_BERAKHIR' && daysUntil(selectedContract.endDate) !== null && daysUntil(selectedContract.endDate)! <= 30 && (
                  <div className="mt-0.5 text-[10px] font-semibold text-warning">
                    {daysUntil(selectedContract.endDate)} {t.dashboard.days}
                  </div>
                )}
              </div>
            </div>

            {selectedContract.notes && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">{t.contracts.notesLabel}</div>
                <p className="text-sm text-ink">{selectedContract.notes}</p>
              </div>
            )}

            {formError && <div className="rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>}

            <div className="flex justify-end gap-2 pt-2">
              {user?.role !== 'USER' && selectedContract.employee?.phone && (
                <Button variant="accent" onClick={() => sendWhatsApp(selectedContract)} disabled={waSending}>
                  <MessageSquare size={14} /> {waSending ? t.common.loading : t.contracts.sendWhatsApp}
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => setShowDetailModal(false)}>{t.common.close}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title={t.common.confirm} size="sm">
        <p className="text-sm text-ink">
          {t.contracts.deleteConfirm} {confirmDelete?.contractNumber}
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{t.common.cancel}</Button>
          <Button variant="danger" onClick={handleDeleteContract}>
            <Trash2 size={14} /> {t.common.delete}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
