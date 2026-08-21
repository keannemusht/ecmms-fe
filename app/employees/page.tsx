'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Search, Trash2, FileSpreadsheet, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
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
  Select,
  cn,
} from '../components/ui';
import { formatDate, contractStatusTone, contractStatusKey, initials, avatarHue, getApiError, parseExcelDate, pickExcelValue, pickExcelJoinDate } from '../lib/helpers';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { Employee, ReferenceItem } from '../lib/types';

export default function EmployeesPage() {
  const { user } = useAuth();
  const { t } = useUI();
  const router = useRouter();
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<ReferenceItem[]>([]);
  const [positions, setPositions] = useState<ReferenceItem[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [formData, setFormData] = useState({
    nik: '',
    name: '',
    email: '',
    phone: '',
    department: 'Technology',
    position: '',
    employmentType: 'PKWT',
    joinDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get('search');
    if (q) setSearch(q);
  }, []);

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data || [])).catch(() => {});
    api.get('/positions').then((res) => setPositions(res.data || [])).catch(() => {});
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (department) params.append('department', department);
      if (employmentType) params.append('employmentType', employmentType);
      const res = await api.get(`/employees?${params.toString()}`);
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, department, employmentType]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openAdd = () => {
    setEditing(null);
    setFormData({
      nik: '',
      name: '',
      email: '',
      phone: '',
      department: 'Technology',
      position: '',
      employmentType: 'PKWT',
      joinDate: new Date().toISOString().split('T')[0],
    });
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setFormData({
      nik: emp.nik,
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      department: emp.department,
      position: emp.position,
      employmentType: emp.employmentType,
      joinDate: emp.joinDate.split('T')[0],
    });
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      if (editing) {
        await api.put(`/employees/${editing.id}`, formData);
      } else {
        await api.post('/employees', formData);
      }
      setFormSuccess(t.common.success);
      fetchEmployees();
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 1000);
    } catch (err) {
      setFormError(getApiError(err));
    }
  };

  const onPickImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportFile(e.target.files?.[0] || null);
    e.target.value = '';
  };

  const handleImportSubmit = async () => {
    if (!importFile || importing) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const formatted = data.map((row) => {
          const rawJoinDate = pickExcelJoinDate(row);
          const parsedJoinDate = parseExcelDate(rawJoinDate);
          const fallbackJoinDate = rawJoinDate === '' || rawJoinDate === null || rawJoinDate === undefined
            ? new Date().toISOString().split('T')[0]
            : '';
          return {
            nik: String(pickExcelValue(row, ['NIK', 'Nik', 'No. KTP', 'ID Karyawan']) ?? ''),
            name: String(pickExcelValue(row, ['Nama', 'Name']) ?? ''),
            email: String(pickExcelValue(row, ['Email', 'E-mail']) ?? ''),
            phone: String(pickExcelValue(row, ['Telepon', 'Phone', 'No. HP', 'HP']) ?? ''),
            department: String(pickExcelValue(row, ['Departemen', 'Department', 'Divisi']) ?? 'Technology'),
            position: String(pickExcelValue(row, ['Jabatan', 'Position', 'Posisi']) ?? 'Staff'),
            employmentType: String(pickExcelValue(row, ['Jenis', 'Type', 'Employment Type', 'Jenis Hubungan Kerja']) ?? 'PKWT'),
            joinDate: parsedJoinDate || fallbackJoinDate,
            contractNumber: String(pickExcelValue(row, ['No Kontrak', 'No. Kontrak', 'Contract Number', 'Nomor Kontrak', 'Kontrak']) ?? ''),
            contractStartDate: parseExcelDate(pickExcelValue(row, ['Tgl Mulai Kontrak', 'Tanggal Mulai Kontrak', 'Mulai Kontrak', 'Contract Start Date', 'Contract Start', 'Start Date Kontrak', 'Tgl Mulai']) ?? ''),
            contractEndDate: parseExcelDate(pickExcelValue(row, ['Tgl Berakhir Kontrak', 'Tanggal Berakhir Kontrak', 'Berakhir Kontrak', 'Contract End Date', 'Contract End', 'End Date Kontrak', 'Tgl Berakhir']) ?? ''),
            contractType: String(pickExcelValue(row, ['Jenis Kontrak', 'Contract Type', 'Tipe Kontrak']) ?? ''),
            contractNotes: String(pickExcelValue(row, ['Catatan Kontrak', 'Notes', 'Keterangan']) ?? ''),
          };
        });

        const res = await api.post('/employees/bulk-import', { employees: formatted });
        toast.success(res.data.message);
        setShowImportModal(false);
        setImportFile(null);
        fetchEmployees();
      } catch {
        toast.error(t.common.error);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsBinaryString(importFile);
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await toast.confirm(`${t.employees.deleteConfirm} (${name})`, {
      title: t.common.confirm,
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const set = (k: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [k]: e.target.value });

  return (
    <AppShell>
      <PageHeader
        title={t.employees.title}
        subtitle={t.employees.subtitle}
        actions={
          user?.role !== 'USER' ? (
            <>
              <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                <Upload size={15} className="text-accent" /> {t.employees.bulkImport}
              </Button>
              <Button variant="accent" onClick={openAdd}>
                <Plus size={15} /> {t.employees.addEmployee}
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Filters */}
      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:w-80">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.employees.searchPlaceholder}
              className="pl-9"
            />
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full sm:w-44">
              <option value="">{t.common.allDepartment}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </Select>
            <Select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="w-full sm:w-40">
              <option value="">{t.common.allType}</option>
              <option value="PKWT">{t.employmentType.PKWT}</option>
              <option value="PKWTT">{t.employmentType.PKWTT}</option>
              <option value="MAGANG">{t.employmentType.MAGANG}</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th">{t.employees.employeeId}</th>
                <th className="th">{t.employees.name}</th>
                <th className="th">{t.employees.department}</th>
                <th className="th">{t.employees.contractType}</th>
                <th className="th">{t.employees.contractHistory}</th>
                <th className="th">{t.employees.joinDate}</th>
                <th className="th">{t.common.status}</th>
                <th className="th text-right">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={8}>{t.common.loading}</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={8}>{t.employees.noData}</td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const contractHistory = (emp.contracts || []).slice().sort((a, b) => a.sequence - b.sequence);
                  const activeContract =
                    contractHistory.find((c) => c.status === 'AKTIF' || c.status === 'AKAN_BERAKHIR') ||
                    contractHistory[contractHistory.length - 1];
                  return (
                    <tr
                      key={emp.id}
                      className="trow cursor-pointer"
                      onClick={() => router.push(`/employees/${emp.id}`)}
                    >
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: `hsl(${avatarHue(emp.name)} 45% 45%)` }}
                          >
                            {initials(emp.name)}
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-ink">{emp.nik}</span>
                        </div>
                      </td>
                      <td className="td">
                        <div className="font-semibold text-ink">{emp.name}</div>
                        <div className="text-[11px] text-ink-2">{emp.email}</div>
                      </td>
                      <td className="td">
                        <div className="text-xs">{emp.department}</div>
                        <div className="text-[11px] text-ink-2">{emp.position}</div>
                      </td>
                      <td className="td">
                        <Badge tone={emp.employmentType === 'PKWTT' ? 'active' : emp.employmentType === 'PKWT' ? 'info' : 'neutral'}>
                          {t.employmentType[emp.employmentType as 'PKWT'] ?? emp.employmentType}
                        </Badge>
                      </td>
                      <td className="td">
                        {contractHistory.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {contractHistory.map((c) => (
                              <span
                                key={c.id}
                                className={cn(
                                  'rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold',
                                  c.status === 'DIPERPANJANG'
                                    ? 'bg-warning/10 text-warning'
                                    : c.status === 'DIANGKAT_TETAP'
                                      ? 'bg-active/10 text-active'
                                      : 'bg-accent-soft text-accent'
                                )}
                                title={`${c.contractNumber} · ${formatDate(c.startDate)} — ${formatDate(c.endDate)}`}
                              >
                                {t.common.seqPrefix}{c.sequence}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-ink-2">-</span>
                        )}
                      </td>
                      <td className="td text-xs">{formatDate(emp.joinDate)}</td>
                      <td className="td">
                        {activeContract ? (
                          <Badge tone={contractStatusTone(activeContract.status)}>
                            {t.status[contractStatusKey(activeContract.status) as 'aktif'] ?? activeContract.status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-ink-2">-</span>
                        )}
                      </td>
                      <td className="td text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {user?.role !== 'USER' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(emp);
                              }}
                              className="btn btn-secondary btn-sm"
                              title={t.common.edit}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {user?.role === 'ADMIN' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(emp.id, emp.name);
                              }}
                              className="btn btn-secondary btn-sm text-expired"
                              title={t.common.delete}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Employee Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t.employees.editTitle : t.employees.addEmployee}
        subtitle={t.employees.title}
      >
        {formError && (
          <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>
        )}
        {formSuccess && (
          <div className="mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active">{formSuccess}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.employees.employeeId} required>
              <Input value={formData.nik} onChange={set('nik')} placeholder="EMP-2026-001" required disabled={Boolean(editing)} />
            </Field>
            <Field label={t.employees.name} required>
              <Input value={formData.name} onChange={set('name')} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.employees.email} required>
              <Input type="email" value={formData.email} onChange={set('email')} placeholder="email@company.com" required />
            </Field>
            <Field label={t.employees.phone}>
              <Input value={formData.phone} onChange={set('phone')} placeholder="081234567890" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.employees.department} required>
              <Select value={formData.department} onChange={set('department')}>
                {departments.filter((d) => d.isActive).map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </Select>
            </Field>
            <Field label={t.employees.position} required>
              <Select value={formData.position} onChange={set('position')}>
                {positions.filter((p) => p.isActive).map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.employees.contractType} required>
              <Select value={formData.employmentType} onChange={set('employmentType')}>
                <option value="PKWT">{t.employmentType.PKWT}</option>
                <option value="PKWTT">{t.employmentType.PKWTT}</option>
                <option value="MAGANG">{t.employmentType.MAGANG}</option>
              </Select>
            </Field>
            <Field label={t.employees.joinDate} required>
              <Input type="date" value={formData.joinDate} onChange={set('joinDate')} required />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>{t.common.cancel}</Button>
            <Button type="submit" variant="primary">{t.common.save}</Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal open={showImportModal} onClose={() => setShowImportModal(false)} title={t.employees.importTitle}>
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
              <FileSpreadsheet size={22} />
            </div>
            <p className="text-xs text-ink-2">{t.employees.importSubtitle}</p>
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={onPickImportFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-[6px] border border-dashed px-4 py-4 text-xs font-semibold transition-colors',
              importFile
                ? 'border-active/40 bg-active/10 text-ink'
                : 'border-line bg-base text-ink-2 hover:border-accent hover:text-accent'
            )}
          >
            <FileSpreadsheet size={16} className={importFile ? 'text-active' : 'text-accent'} />
            {importFile ? importFile.name : t.employees.chooseFile}
          </button>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button type="button" variant="primary" onClick={handleImportSubmit} disabled={!importFile || importing}>
              <Upload size={14} /> {importing ? t.common.loading : t.employees.importBtn}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
