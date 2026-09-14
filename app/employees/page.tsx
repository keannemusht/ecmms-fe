'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Upload,
  Search,
  Trash2,
  FileSpreadsheet,
  Pencil,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  ArrowUpDown,
  Calendar,
  RotateCcw,
  X,
} from 'lucide-react';
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
  Pagination,
  cn,
} from '../components/ui';
import { formatDate, contractStatusTone, contractStatusKey, initials, avatarHue, getApiError, parseExcelDate, pickExcelValue, pickExcelJoinDate, toISODate } from '../lib/helpers';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { Employee, ReferenceItem } from '../lib/types';
import { determineEmployeeLevel } from '../lib/employeeLevel';

const STATUS_FILTERS = [
  { labelKey: 'allStatus', value: '' },
  { labelKey: 'aktif', value: 'AKTIF' },
  { labelKey: 'akanBerakhir', value: 'AKAN_BERAKHIR' },
  { labelKey: 'expired', value: 'EXPIRED' },
  { labelKey: 'resign', value: 'RESIGN' },
];

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
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'nik' | 'department' | 'joinDate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

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
    department: 'Produksi',
    position: '',
    level: 'Staff',
    employmentType: 'PKWT',
    joinDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const readQuery = () => {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get('search');
      if (q !== null) setSearch(q);
    };
    readQuery();
    window.addEventListener('popstate', readQuery);
    return () => window.removeEventListener('popstate', readQuery);
  }, []);

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data || [])).catch(() => {});
    api.get('/positions').then((res) => setPositions(res.data || [])).catch(() => {});
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (department) count += 1;
    if (employmentType) count += 1;
    if (statusFilter) count += 1;
    if (dateFrom || dateTo) count += 1;
    if (sortBy !== 'name' || sortOrder !== 'asc') count += 1;
    return count;
  }, [department, employmentType, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const resetFilters = () => {
    setSearch('');
    setDepartment('');
    setEmploymentType('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setSortBy('name');
    setSortOrder('asc');
  };

  const applyPreset = (preset: 'thisMonth' | 'thisYear') => {
    const now = new Date();
    if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(toISODate(start));
      setDateTo(toISODate(end));
    } else if (preset === 'thisYear') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setDateFrom(toISODate(start));
      setDateTo(toISODate(end));
    }
  };

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (department) params.append('department', department);
      if (employmentType) params.append('employmentType', employmentType);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);
      const res = await api.get(`/employees?${params.toString()}`);
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, department, employmentType, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const displayEmployees = useMemo(() => {
    let list = [...employees];

    // Status filter safeguard
    if (statusFilter) {
      list = list.filter((emp) => {
        const contractHistory = (emp.contracts || []).slice().sort((a, b) => a.sequence - b.sequence);
        const activeContract =
          contractHistory.find((c) => c.status === 'AKTIF' || c.status === 'AKAN_BERAKHIR') ||
          contractHistory[contractHistory.length - 1];
        return activeContract?.status === statusFilter;
      });
    }

    // Date range safeguard (joinDate)
    if (dateFrom || dateTo) {
      list = list.filter((emp) => {
        if (!emp.joinDate) return false;
        const d = toISODate(new Date(emp.joinDate));
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
    }

    list.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'name') {
        comp = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'nik') {
        comp = (a.nik || '').localeCompare(b.nik || '');
      } else if (sortBy === 'department') {
        comp = (a.department || '').localeCompare(b.department || '');
      } else if (sortBy === 'joinDate') {
        comp = new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime();
      }
      return sortOrder === 'desc' ? -comp : comp;
    });
    return list;
  }, [employees, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const handleSortHeader = (col: 'name' | 'nik' | 'department' | 'joinDate') => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, department, employmentType, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const openAdd = () => {
    setEditing(null);
    const initialPos = positions[0]?.name || '';
    setFormData({
      nik: '',
      name: '',
      email: '',
      phone: '',
      department: departments[0]?.name || 'Produksi',
      position: initialPos,
      level: determineEmployeeLevel(initialPos),
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
      email: emp.email || '',
      phone: emp.phone || '',
      department: emp.department,
      position: emp.position,
      level: emp.level || determineEmployeeLevel(emp.position),
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
        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

        // Detect if this is the wide multi-stage HR format (columns with PKWT 1, PKWT 2, PKWT 3)
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
          const rowStr = (rawRows[i] || []).join(' ').toLowerCase();
          if (rowStr.includes('nrp') && (rowStr.includes('nama') || rowStr.includes('karyawan'))) {
            headerRowIdx = i;
            break;
          }
        }

        const formatted: Array<Record<string, unknown>> = [];

        if (headerRowIdx !== -1) {
          // Multi-column HR format
          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const r = rawRows[i] as unknown[];
            if (!r || !r[1]) continue;
            const nik = String(r[1]).trim();
            const name = String(r[2] || '').trim();
            if (!nik || !name) continue;

            const position = String(r[3] || 'Staff').trim();
            const department = String(r[4] || 'Operations').trim();
            const joinDate = parseExcelDate(r[5]) || new Date().toISOString().split('T')[0];

            const rekomendasi = String(r[17] || '').trim();
            const statusAktif = String(r[19] || '').trim();
            const isTetap = statusAktif.toLowerCase().includes('tetap') || rekomendasi.toLowerCase().includes('tetap');
            const isResign = statusAktif.toLowerCase().includes('resign') || rekomendasi.toLowerCase().includes('resign');
            const empType = isTetap ? 'PKWTT' : 'PKWT';

            const contracts: Array<{ startDate: string; endDate: string; type: string; notes: string }> = [];
            const p1Start = parseExcelDate(r[6]);
            const p1End = parseExcelDate(r[7]);
            if (p1Start && p1End) contracts.push({ startDate: p1Start, endDate: p1End, type: 'PKWT', notes: 'PKWT 1' });

            const p2Start = parseExcelDate(r[10]);
            const p2End = parseExcelDate(r[11]);
            if (p2Start && p2End) contracts.push({ startDate: p2Start, endDate: p2End, type: 'PKWT', notes: 'PKWT 2' });

            const p3Start = parseExcelDate(r[14]);
            const p3End = parseExcelDate(r[15]);
            if (p3Start && p3End) {
              contracts.push({
                startDate: p3Start,
                endDate: p3End,
                type: isTetap ? 'PKWTT' : 'PKWT',
                notes: isTetap ? 'PKWTT / Diangkat Tetap' : 'PKWT 3 / Lanjutan',
              });
            }

            if (isResign && contracts.length > 0) {
              contracts[contracts.length - 1].notes += ' - Resign';
            }

            if (contracts.length === 0) {
              formatted.push({
                nik,
                name,
                email: '',
                phone: '',
                department,
                position,
                employmentType: empType,
                joinDate,
                contractNumber: '',
                contractStartDate: '',
                contractEndDate: '',
                contractType: empType,
                contractNotes: isResign ? 'Resign' : '',
              });
            } else {
              contracts.forEach((c) => {
                formatted.push({
                  nik,
                  name,
                  email: '',
                  phone: '',
                  department,
                  position,
                  employmentType: empType,
                  joinDate,
                  contractNumber: '',
                  contractStartDate: c.startDate,
                  contractEndDate: c.endDate,
                  contractType: c.type,
                  contractNotes: c.notes,
                });
              });
            }
          }
        } else {
          // Standard flat format
          const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
          data.forEach((row) => {
            const rawJoinDate = pickExcelJoinDate(row);
            const parsedJoinDate = parseExcelDate(rawJoinDate);
            const fallbackJoinDate = new Date().toISOString().split('T')[0];

            const rawType = String(pickExcelValue(row, ['Jenis', 'Type', 'Employment Type', 'Jenis Hubungan Kerja', 'Jenis(PKWT/PKWTT/MAGANG)']) ?? 'PKWT').trim().toUpperCase();
            const status = String(pickExcelValue(row, ['Status', 'Keterangan', 'Status Tahapan Aktif']) ?? '').trim();
            const isTetap = rawType.includes('TETAP') || rawType.includes('PKWTT') ||
                            status.toLowerCase().includes('tetap') || status.toLowerCase().includes('pkwtt');
            const employmentType = isTetap ? 'PKWTT' : rawType.includes('MAGANG') ? 'MAGANG' : 'PKWT';

            const excelLevel = String(pickExcelValue(row, ['Level', 'Golongan', 'Grade', 'Jenjang', 'Level Karyawan']) ?? '').trim();
            const pos = String(pickExcelValue(row, ['Jabatan', 'Position', 'Posisi', 'Jabatan / Posisi']) ?? 'Staff').trim();
            const level = excelLevel || determineEmployeeLevel(pos);

            formatted.push({
              nik: String(pickExcelValue(row, ['NIK', 'Nik', 'NRP', 'No. KTP', 'ID Karyawan']) ?? '').trim(),
              name: String(pickExcelValue(row, ['Nama', 'Name', 'Nama Karyawan']) ?? '').trim(),
              email: String(pickExcelValue(row, ['Email', 'E-mail']) ?? '').trim(),
              phone: String(pickExcelValue(row, ['Telepon', 'Phone', 'No. HP', 'HP']) ?? '').trim(),
              department: String(pickExcelValue(row, ['Departemen', 'Department', 'Divisi', 'Dept']) ?? 'Operations').trim(),
              position: pos,
              level,
              employmentType,
              joinDate: parsedJoinDate || fallbackJoinDate,
              contractNumber: String(pickExcelValue(row, ['No Kontrak', 'No. Kontrak', 'Contract Number', 'Nomor Kontrak', 'Kontrak']) ?? '').trim(),
              contractStartDate: parseExcelDate(pickExcelValue(row, ['Tgl Mulai Kontrak', 'Tanggal Mulai Kontrak', 'Mulai Kontrak', 'Contract Start Date', 'Contract Start', 'Start Date Kontrak', 'Tgl Mulai'])),
              contractEndDate: parseExcelDate(pickExcelValue(row, ['Tgl Berakhir Kontrak', 'Tanggal Berakhir Kontrak', 'Berakhir Kontrak', 'Contract End Date', 'Contract End', 'End Date Kontrak', 'Tgl Berakhir', 'Tgl Akhir'])),
              contractType: employmentType,
              contractNotes: status || '',
            });
          });
        }

        const res = await api.post('/employees/bulk-import', { employees: formatted });
        toast.success(res.data.message);
        setShowImportModal(false);
        setImportFile(null);
        fetchEmployees();
      } catch (err) {
        toast.error(getApiError(err) || t.common.error);
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

  const set = (k: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    if (k === 'position') {
      const suggestedLevel = determineEmployeeLevel(val);
      setFormData((prev) => ({ ...prev, position: val, level: suggestedLevel }));
    } else {
      setFormData((prev) => ({ ...prev, [k]: val }));
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={t.employees.title}
        subtitle={t.employees.subtitle}
        actions={
          user?.role !== 'USER' ? (
            <>
              <Button variant="secondary" onClick={() => setShowImportModal(true)} className="w-full sm:w-auto">
                <Upload size={15} className="text-accent" /> {t.employees.bulkImport}
              </Button>
              <Button variant="accent" onClick={openAdd} className="w-full sm:w-auto">
                <Plus size={15} /> {t.employees.addEmployee}
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Filters */}
      {/* Filters & Actions Bar */}
      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.employees.searchPlaceholder}
                className="pl-9"
              />
            </div>

            {/* Filter Drawer Button */}
            <Button
              type="button"
              variant={isFilterOpen || activeFilterCount > 0 ? 'accent' : 'secondary'}
              size="sm"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="gap-1.5 shrink-0"
              title={t.contracts.filterAndSort}
            >
              <SlidersHorizontal size={14} />
              <span>{t.contracts.filterBtn}</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-accent dark:bg-ink dark:text-accent">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Quick Ascending / Descending Button */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="gap-1.5 shrink-0 font-medium"
              title={`${t.contracts.sortOrder}: ${sortOrder === 'asc' ? t.contracts.ascending : t.contracts.descending}`}
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUp size={14} className="text-accent" />
                  <span className="text-xs">{t.contracts.ascending}</span>
                </>
              ) : (
                <>
                  <ArrowDown size={14} className="text-accent" />
                  <span className="text-xs">{t.contracts.descending}</span>
                </>
              )}
            </Button>

            {/* Reset Filter Button */}
            {(activeFilterCount > 0 || search || department || employmentType || statusFilter || dateFrom || dateTo) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="gap-1 text-xs text-ink-2 hover:text-expired"
                title={t.contracts.resetFilter}
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">{t.contracts.resetFilter}</span>
              </Button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st.value}
                onClick={() => setStatusFilter(st.value)}
                className={cn(
                  'rounded-[4px] px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  statusFilter === st.value
                    ? 'bg-accent text-white dark:text-ink shadow-xs'
                    : 'bg-muted text-ink-2 hover:text-ink'
                )}
              >
                {t.status[st.labelKey as 'aktif'] ?? t.common.all}
              </button>
            ))}
          </div>
        </div>

        {/* Expandable Filter & Sort Drawer / Panel */}
        {isFilterOpen && (
          <div className="mt-3.5 border-t border-line pt-3.5 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Kolom 1: Urutkan Berdasarkan & Arah */}
              <div className="space-y-2 lg:col-span-4 rounded-[6px] border border-line/60 bg-muted/20 p-3">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <ArrowUpDown size={13} className="text-accent" />
                  {t.contracts.sortBy}
                </span>

                <div className="grid grid-cols-1 gap-2">
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-xs"
                  >
                    <option value="name">{t.employees.name} (A-Z)</option>
                    <option value="nik">{t.employees.employeeId}</option>
                    <option value="department">{t.employees.department}</option>
                    <option value="joinDate">{t.employees.joinDate}</option>
                  </Select>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-ink-2 shrink-0">{t.contracts.sortOrder}:</span>
                    <div className="grid grid-cols-2 gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => setSortOrder('asc')}
                        className={cn(
                          'flex items-center justify-center gap-1.5 rounded-[4px] border py-1 px-2 text-xs font-semibold transition-all',
                          sortOrder === 'asc'
                            ? 'border-accent bg-accent/15 text-accent shadow-xs'
                            : 'border-line bg-surface text-ink-2 hover:text-ink'
                        )}
                      >
                        <ArrowUp size={13} />
                        <span>{t.contracts.ascending}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortOrder('desc')}
                        className={cn(
                          'flex items-center justify-center gap-1.5 rounded-[4px] border py-1 px-2 text-xs font-semibold transition-all',
                          sortOrder === 'desc'
                            ? 'border-accent bg-accent/15 text-accent shadow-xs'
                            : 'border-line bg-surface text-ink-2 hover:text-ink'
                        )}
                      >
                        <ArrowDown size={13} />
                        <span>{t.contracts.descending}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kolom 2: Departemen & Jenis Hubungan Kerja */}
              <div className="space-y-2 lg:col-span-4 rounded-[6px] border border-line/60 bg-muted/20 p-3">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <SlidersHorizontal size={13} className="text-accent" />
                  Kategori Karyawan
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <Field label={t.employees.department}>
                    <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="text-xs h-9">
                      <option value="">{t.common.allDepartment}</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t.employees.contractType}>
                    <Select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="text-xs h-9">
                      <option value="">{t.common.allType}</option>
                      <option value="PKWT">{t.employmentType.PKWT}</option>
                      <option value="PKWTT">{t.employmentType.PKWTT}</option>
                      <option value="MAGANG">{t.employmentType.MAGANG}</option>
                    </Select>
                  </Field>
                </div>
              </div>

              {/* Kolom 3: Filter Tanggal Bergabung */}
              <div className="space-y-2 lg:col-span-4 rounded-[6px] border border-line/60 bg-muted/20 p-3">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Calendar size={13} className="text-accent" />
                  {t.employees.joinDate}
                </span>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <Field label={t.contracts.dateFrom}>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="text-xs h-9"
                    />
                  </Field>
                  <Field label={t.contracts.dateTo}>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="text-xs h-9"
                    />
                  </Field>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px]">
                  <span className="text-ink-2 font-medium mr-1">{t.contracts.quickPresets}:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('thisMonth')}
                    className="rounded-[4px] border border-line bg-surface px-2 py-0.5 text-ink hover:border-accent hover:text-accent transition-colors"
                  >
                    {t.contracts.thisMonth}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('thisYear')}
                    className="rounded-[4px] border border-line bg-surface px-2 py-0.5 text-ink hover:border-accent hover:text-accent transition-colors"
                  >
                    {t.contracts.thisYear}
                  </button>
                  {(dateFrom || dateTo) && (
                    <button
                      type="button"
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="rounded-[4px] bg-expired/10 text-expired px-2 py-0.5 font-medium hover:bg-expired/20 transition-colors"
                    >
                      {t.contracts.allDates}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filter Chips & Close Button */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/50 pt-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {department && (
                  <span className="inline-flex items-center gap-1 rounded-[4px] bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
                    Dept: {department}
                    <button type="button" onClick={() => setDepartment('')} className="ml-1 hover:text-expired"><X size={12} /></button>
                  </span>
                )}
                {employmentType && (
                  <span className="inline-flex items-center gap-1 rounded-[4px] bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
                    Jenis: {employmentType}
                    <button type="button" onClick={() => setEmploymentType('')} className="ml-1 hover:text-expired"><X size={12} /></button>
                  </span>
                )}
                {(dateFrom || dateTo) && (
                  <span className="inline-flex items-center gap-1 rounded-[4px] bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
                    <Calendar size={12} />
                    Join: {dateFrom || '...'} s/d {dateTo || '...'}
                    <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} className="ml-1 hover:text-expired"><X size={12} /></button>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-[4px] bg-muted px-2 py-1 text-[11px] font-medium text-ink-2">
                  <ArrowUpDown size={12} />
                  {t.contracts.sortBy}: <strong className="text-ink">{sortBy}</strong> ({sortOrder.toUpperCase()})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs text-ink-2 hover:text-expired"
                >
                  <RotateCcw size={12} /> {t.contracts.resetFilter}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsFilterOpen(false)}
                  className="text-xs"
                >
                  {t.contracts.closeFilter}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table min-w-[800px]">
            <thead>
              <tr>
                <th
                  className="th cursor-pointer select-none hover:text-accent transition-colors"
                  onClick={() => handleSortHeader('nik')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.employees.employeeId}</span>
                    {sortBy === 'nik' && (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    )}
                  </div>
                </th>
                <th
                  className="th cursor-pointer select-none hover:text-accent transition-colors"
                  onClick={() => handleSortHeader('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.employees.name}</span>
                    {sortBy === 'name' && (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    )}
                  </div>
                </th>
                <th
                  className="th cursor-pointer select-none hover:text-accent transition-colors"
                  onClick={() => handleSortHeader('department')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.employees.department}</span>
                    {sortBy === 'department' && (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    )}
                  </div>
                </th>
                <th className="th">{t.employees.contractType}</th>
                <th className="th">{t.employees.contractHistory}</th>
                <th
                  className="th cursor-pointer select-none hover:text-accent transition-colors"
                  onClick={() => handleSortHeader('joinDate')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.employees.joinDate}</span>
                    {sortBy === 'joinDate' && (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    )}
                  </div>
                </th>
                <th className="th">{t.common.status}</th>
                <th className="th text-right">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={8}>{t.common.loading}</td>
                </tr>
              ) : displayEmployees.length === 0 ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={8}>{t.employees.noData}</td>
                </tr>
              ) : (
                displayEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((emp) => {
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
                        <div className="text-xs font-medium text-ink">{emp.department}</div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-ink-2">
                          <span>{emp.position}</span>
                          {emp.level && (
                            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2 border border-border">
                              {emp.level}
                            </span>
                          )}
                        </div>
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
                                    : c.status === 'RESIGN'
                                      ? 'bg-stone-500/10 text-stone-600 dark:text-stone-400'
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

        <Pagination
          page={page}
          totalPages={Math.ceil(employees.length / PAGE_SIZE)}
          total={employees.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          previousLabel={t.common.previous}
          nextLabel={t.common.next}
          pageInfoLabel={t.common.pageInfo}
          pageOfLabel={t.common.pageOf}
        />
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
              <Input
                value={formData.position}
                onChange={set('position')}
                placeholder="Masukkan jabatan..."
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.employees.level} required>
              <Select value={formData.level} onChange={set('level')}>
                <option value="Director">Director</option>
                <option value="Manager">Manager</option>
                <option value="Staff">Staff</option>
                <option value="Non-Staff">Non-Staff</option>
              </Select>
            </Field>
            <Field label={t.employees.contractType} required>
              <Select value={formData.employmentType} onChange={set('employmentType')}>
                <option value="PKWT">{t.employmentType.PKWT}</option>
                <option value="PKWTT">{t.employmentType.PKWTT}</option>
                <option value="MAGANG">{t.employmentType.MAGANG}</option>
              </Select>
            </Field>
          </div>
          <div>
            <Field label={t.employees.joinDate} required>
              <Input type="date" value={formData.joinDate} onChange={set('joinDate')} required />
            </Field>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="w-full sm:w-auto">{t.common.cancel}</Button>
            <Button type="submit" variant="primary" className="w-full sm:w-auto">{t.common.save}</Button>
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

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button type="button" variant="primary" onClick={handleImportSubmit} disabled={!importFile || importing} className="w-full sm:w-auto">
              <Upload size={14} /> {importing ? t.common.loading : t.employees.importBtn}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
