'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  Users,
  FileText,
  Calendar,
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  AlertCircle,
  FileWarning,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useToast } from '../context/ToastContext';
import AppShell from '../components/AppShell';
import {
  Card,
  Badge,
  BadgeTone,
  Button,
  Modal,
  Input,
  cn,
} from '../components/ui';
import { formatDate, getApiError } from '../lib/helpers';

interface DuplicateEmployeeRecord {
  id: string;
  nik: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string;
  position: string;
  level: string | null;
  employmentType: string;
  joinDate: string;
  contractsCount: number;
  contracts: Array<{
    id: string;
    sequence: number;
    contractNumber: string | null;
    startDate: string;
    endDate: string;
    status: string;
  }>;
}

interface DuplicateEmployeeGroup {
  normalizedName: string;
  displayName: string;
  count: number;
  records: DuplicateEmployeeRecord[];
  recommendation: string;
}

interface DuplicateContractNumber {
  contractNumber: string;
  count: number;
  employees: Array<{
    contractId: string;
    employeeId: string;
    nik: string;
    name: string;
    department: string;
    position: string;
    sequence: number;
    startDate: string;
    endDate: string;
    status: string;
  }>;
}

interface DateAnomaly {
  contractId: string;
  employeeId: string;
  nik: string;
  name: string;
  contractNumber: string | null;
  startDate: string;
  endDate: string;
  issue: string;
}

interface MissingInfoItem {
  employeeId: string;
  nik: string;
  name: string;
  department: string;
  position: string;
  missing: string[];
}

interface ReconciliationSummary {
  totalEmployees: number;
  duplicateNameCount: number;
  duplicateContractNoCount: number;
  dateAnomaliesCount: number;
  missingInfoCount: number;
}

export default function ReconcilePage() {
  const { user } = useAuth();
  const { t } = useUI();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [duplicateEmployees, setDuplicateEmployees] = useState<DuplicateEmployeeGroup[]>([]);
  const [duplicateContracts, setDuplicateContracts] = useState<DuplicateContractNumber[]>([]);
  const [dateAnomalies, setDateAnomalies] = useState<DateAnomaly[]>([]);
  const [missingInfo, setMissingInfo] = useState<MissingInfoItem[]>([]);

  const [activeTab, setActiveTab] = useState<'duplicates' | 'contracts' | 'dates' | 'missing'>('duplicates');
  const [searchQuery, setSearchQuery] = useState('');

  // Merge modal state
  const [selectedGroup, setSelectedGroup] = useState<DuplicateEmployeeGroup | null>(null);
  const [primaryRecordId, setPrimaryRecordId] = useState<string>('');
  const [duplicateRecordId, setDuplicateRecordId] = useState<string>('');
  const [targetNik, setTargetNik] = useState<string>('');
  const [targetName, setTargetName] = useState<string>('');
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [targetDept, setTargetDept] = useState<string>('');
  const [targetPos, setTargetPos] = useState<string>('');
  const [merging, setMerging] = useState(false);

  // Quick edit modal for contract number
  const [editContractModal, setEditContractModal] = useState<{
    open: boolean;
    contractId: string;
    employeeName: string;
    currentNumber: string;
    newNumber: string;
  }>({
    open: false,
    contractId: '',
    employeeName: '',
    currentNumber: '',
    newNumber: '',
  });

  // Quick edit modal for dates
  const [editDateModal, setEditDateModal] = useState<{
    open: boolean;
    contractId: string;
    employeeName: string;
    startDate: string;
    endDate: string;
  }>({
    open: false,
    contractId: '',
    employeeName: '',
    startDate: '',
    endDate: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/reconcile/analysis');
      setSummary(res.data.summary);
      setDuplicateEmployees(res.data.duplicateEmployees || []);
      setDuplicateContracts(res.data.duplicateContractNumbers || []);
      setDateAnomalies(res.data.dateAnomalies || []);
      setMissingInfo(res.data.missingInfo || []);
    } catch (err) {
      toast.error(getApiError(err) || 'Gagal memuat data analisis rekonsiliasi.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle open merge modal
  const handleOpenMerge = (group: DuplicateEmployeeGroup) => {
    setSelectedGroup(group);
    // Suggest primary as the one with either more contracts or complete email/phone
    const sorted = [...group.records].sort((a, b) => {
      const aScore = (a.email ? 2 : 0) + (a.phone ? 1 : 0) + a.contractsCount;
      const bScore = (b.email ? 2 : 0) + (b.phone ? 1 : 0) + b.contractsCount;
      return bScore - aScore;
    });

    const primary = sorted[0];
    const duplicate = sorted[1] || sorted[0];

    setPrimaryRecordId(primary.id);
    setDuplicateRecordId(duplicate.id);
    setTargetNik(primary.nik);
    setTargetName(primary.name);
    setTargetEmail(primary.email || duplicate.email || '');
    setTargetPhone(primary.phone || duplicate.phone || '');
    setTargetDept(primary.department);
    setTargetPos(primary.position);
  };

  // Handle execute merge
  const handleExecuteMerge = async () => {
    if (!primaryRecordId || !duplicateRecordId) return;
    if (primaryRecordId === duplicateRecordId) {
      toast.error('Data utama dan data duplikat tidak boleh sama.');
      return;
    }

    try {
      setMerging(true);
      const res = await api.post('/reconcile/merge-employees', {
        primaryEmployeeId: primaryRecordId,
        duplicateEmployeeId: duplicateRecordId,
        targetNik,
        targetName,
        targetEmail,
        targetPhone,
        targetDept,
        targetPos,
      });

      toast.success(res.data.message || t.reconcile.successMerge);
      setSelectedGroup(null);
      await fetchData();
    } catch (err) {
      toast.error(getApiError(err) || 'Gagal menggabungkan data.');
    } finally {
      setMerging(false);
    }
  };

  // Handle save contract number
  const handleSaveContractNumber = async () => {
    if (!editContractModal.contractId || !editContractModal.newNumber.trim()) return;
    try {
      await api.put('/reconcile/fix-contract-number', {
        contractId: editContractModal.contractId,
        newContractNumber: editContractModal.newNumber.trim(),
      });
      toast.success('Nomor kontrak berhasil diperbarui.');
      setEditContractModal({ ...editContractModal, open: false });
      await fetchData();
    } catch (err) {
      toast.error(getApiError(err) || 'Gagal memperbarui nomor kontrak.');
    }
  };

  // Handle save contract dates
  const handleSaveContractDate = async () => {
    if (!editDateModal.contractId || !editDateModal.startDate || !editDateModal.endDate) return;
    try {
      await api.put('/reconcile/fix-contract-date', {
        contractId: editDateModal.contractId,
        startDate: editDateModal.startDate,
        endDate: editDateModal.endDate,
      });
      toast.success('Tanggal kontrak berhasil diperbarui.');
      setEditDateModal({ ...editDateModal, open: false });
      await fetchData();
    } catch (err) {
      toast.error(getApiError(err) || 'Gagal memperbarui tanggal kontrak.');
    }
  };

  // Filtered lists
  const filteredDuplicateEmployees = useMemo(() => {
    if (!searchQuery) return duplicateEmployees;
    const q = searchQuery.toLowerCase();
    return duplicateEmployees.filter(
      (g) =>
        g.displayName.toLowerCase().includes(q) ||
        g.records.some((r) => r.nik.toLowerCase().includes(q) || r.department.toLowerCase().includes(q))
    );
  }, [duplicateEmployees, searchQuery]);

  const filteredDuplicateContracts = useMemo(() => {
    if (!searchQuery) return duplicateContracts;
    const q = searchQuery.toLowerCase();
    return duplicateContracts.filter(
      (c) =>
        c.contractNumber.toLowerCase().includes(q) ||
        c.employees.some((e) => e.name.toLowerCase().includes(q) || e.nik.toLowerCase().includes(q))
    );
  }, [duplicateContracts, searchQuery]);

  const filteredDateAnomalies = useMemo(() => {
    if (!searchQuery) return dateAnomalies;
    const q = searchQuery.toLowerCase();
    return dateAnomalies.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.nik.toLowerCase().includes(q) ||
        (d.contractNumber && d.contractNumber.toLowerCase().includes(q))
    );
  }, [dateAnomalies, searchQuery]);

  const filteredMissingInfo = useMemo(() => {
    if (!searchQuery) return missingInfo;
    const q = searchQuery.toLowerCase();
    return missingInfo.filter(
      (m) => m.name.toLowerCase().includes(q) || m.nik.toLowerCase().includes(q) || m.department.toLowerCase().includes(q)
    );
  }, [missingInfo, searchQuery]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink sm:text-2xl">{t.reconcile.title}</h1>
              <Badge tone="warning" className="flex items-center gap-1 font-mono text-[11px]">
                <Sparkles size={12} /> Auto-Detector
              </Badge>
            </div>
            <p className="mt-1 text-xs text-ink-2 sm:text-sm">{t.reconcile.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={fetchData} disabled={loading} className="w-full sm:w-auto">
              <RefreshCw size={14} className={loading ? 'animate-spin text-accent' : 'text-accent'} />
              {t.reconcile.refreshBtn}
            </Button>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Card
            className={cn(
              'cursor-pointer transition-all border p-4',
              activeTab === 'duplicates'
                ? 'border-accent bg-accent-soft/40 shadow-xs'
                : 'border-line hover:border-line-hover bg-surface'
            )}
            onClick={() => setActiveTab('duplicates')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-2">Duplikasi Nama (Beda NIK)</span>
              <Users size={16} className="text-accent" />
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">
              {summary ? summary.duplicateNameCount : '-'}
            </div>
            <div className="mt-1 text-[11px] text-ink-muted">
              {summary && summary.duplicateNameCount > 0 ? (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <AlertTriangle size={11} /> Perlu digabungkan
                </span>
              ) : (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 size={11} /> Tidak ada duplikat
                </span>
              )}
            </div>
          </Card>

          <Card
            className={cn(
              'cursor-pointer transition-all border p-4',
              activeTab === 'contracts'
                ? 'border-accent bg-accent-soft/40 shadow-xs'
                : 'border-line hover:border-line-hover bg-surface'
            )}
            onClick={() => setActiveTab('contracts')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-2">Duplikasi No. Kontrak</span>
              <FileWarning size={16} className="text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">
              {summary ? summary.duplicateContractNoCount : '-'}
            </div>
            <div className="mt-1 text-[11px] text-ink-muted">
              {summary && summary.duplicateContractNoCount > 0 ? (
                <span className="text-amber-600 font-medium">Nomor dipakai jamak</span>
              ) : (
                <span className="text-emerald-600 font-medium">Semua unik</span>
              )}
            </div>
          </Card>

          <Card
            className={cn(
              'cursor-pointer transition-all border p-4',
              activeTab === 'dates'
                ? 'border-accent bg-accent-soft/40 shadow-xs'
                : 'border-line hover:border-line-hover bg-surface'
            )}
            onClick={() => setActiveTab('dates')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-2">Anomali Tanggal Kontrak</span>
              <Calendar size={16} className="text-red-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">
              {summary ? summary.dateAnomaliesCount : '-'}
            </div>
            <div className="mt-1 text-[11px] text-ink-muted">
              {summary && summary.dateAnomaliesCount > 0 ? (
                <span className="text-red-600 font-medium">Tanggal terbalik / minus</span>
              ) : (
                <span className="text-emerald-600 font-medium">Tanggal valid</span>
              )}
            </div>
          </Card>

          <Card
            className={cn(
              'cursor-pointer transition-all border p-4',
              activeTab === 'missing'
                ? 'border-accent bg-accent-soft/40 shadow-xs'
                : 'border-line hover:border-line-hover bg-surface'
            )}
            onClick={() => setActiveTab('missing')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-2">Data Tidak Lengkap</span>
              <AlertCircle size={16} className="text-sky-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">
              {summary ? summary.missingInfoCount : '-'}
            </div>
            <div className="mt-1 text-[11px] text-ink-muted">
              <span>Tanpa email/telepon</span>
            </div>
          </Card>
        </div>

        {/* Tab Controls & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('duplicates')}
              className={cn(
                'rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === 'duplicates'
                  ? 'bg-ink text-surface font-semibold'
                  : 'bg-muted text-ink-2 hover:bg-muted-hover hover:text-ink'
              )}
            >
              {t.reconcile.tabDuplicateName} ({duplicateEmployees.length})
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={cn(
                'rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === 'contracts'
                  ? 'bg-ink text-surface font-semibold'
                  : 'bg-muted text-ink-2 hover:bg-muted-hover hover:text-ink'
              )}
            >
              {t.reconcile.tabDuplicateContract} ({duplicateContracts.length})
            </button>
            <button
              onClick={() => setActiveTab('dates')}
              className={cn(
                'rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === 'dates'
                  ? 'bg-ink text-surface font-semibold'
                  : 'bg-muted text-ink-2 hover:bg-muted-hover hover:text-ink'
              )}
            >
              {t.reconcile.tabDateAnomalies} ({dateAnomalies.length})
            </button>
            <button
              onClick={() => setActiveTab('missing')}
              className={cn(
                'rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === 'missing'
                  ? 'bg-ink text-surface font-semibold'
                  : 'bg-muted text-ink-2 hover:bg-muted-hover hover:text-ink'
              )}
            >
              {t.reconcile.tabMissingInfo} ({missingInfo.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              type="text"
              placeholder="Cari nama atau NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>

        {/* Tab 1: Duplicate Employees */}
        {activeTab === 'duplicates' && (
          <div className="space-y-4">
            {filteredDuplicateEmployees.length === 0 ? (
              <Card className="p-8 text-center bg-surface">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-ink">Tidak ada duplikasi nama karyawan</p>
                <p className="text-xs text-ink-2 mt-1">{t.reconcile.noIssuesFound}</p>
              </Card>
            ) : (
              filteredDuplicateEmployees.map((group, idx) => (
                <Card key={idx} className="p-4 sm:p-5 border border-line bg-surface space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink">{group.displayName}</span>
                        <Badge tone="warning">{group.count} Record Terpisah</Badge>
                      </div>
                      <p className="text-xs text-amber-700 mt-0.5">{group.recommendation}</p>
                    </div>
                    {user?.role === 'ADMIN' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenMerge(group)}
                        className="flex items-center gap-1.5 shrink-0"
                      >
                        <GitCompare size={14} />
                        {t.reconcile.mergeBtn}
                      </Button>
                    )}
                  </div>

                  {/* Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.records.map((rec, rIdx) => (
                      <div
                        key={rec.id}
                        className="rounded-lg border border-line/80 bg-muted/40 p-3 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-ink">NIK: {rec.nik}</span>
                          <Badge tone="neutral" className="text-[10px]">
                            {rec.contractsCount} Kontrak
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-ink-2">
                          <div>
                            <span className="text-ink-muted">Departemen:</span> {rec.department}
                          </div>
                          <div>
                            <span className="text-ink-muted">Jabatan:</span> {rec.position}
                          </div>
                          <div>
                            <span className="text-ink-muted">Email:</span> {rec.email || '-'}
                          </div>
                          <div>
                            <span className="text-ink-muted">Telepon:</span> {rec.phone || '-'}
                          </div>
                          <div>
                            <span className="text-ink-muted">Join Date:</span> {formatDate(rec.joinDate)}
                          </div>
                        </div>

                        {/* List of Contracts */}
                        <div className="mt-2 border-t border-line/50 pt-2 space-y-1">
                          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                            Riwayat Kontrak:
                          </span>
                          {rec.contracts.length === 0 ? (
                            <p className="text-[11px] italic text-ink-muted">Belum ada kontrak tercatat</p>
                          ) : (
                            rec.contracts.map((c) => (
                              <div
                                key={c.id}
                                className="flex items-center justify-between text-[11px] bg-surface rounded px-2 py-1 border border-line/40"
                              >
                                <span className="font-medium text-ink">
                                  Ke-{c.sequence}: {formatDate(c.startDate)} s/d {formatDate(c.endDate)}
                                </span>
                                <div className="flex items-center gap-1">
                                  {c.contractNumber && (
                                    <span className="text-[10px] text-ink-muted font-mono">{c.contractNumber}</span>
                                  )}
                                  <Badge tone={c.status === 'AKTIF' ? 'active' : 'neutral'} className="text-[9px]">
                                    {c.status}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Duplicate Contract Numbers */}
        {activeTab === 'contracts' && (
          <div className="space-y-4">
            {filteredDuplicateContracts.length === 0 ? (
              <Card className="p-8 text-center bg-surface">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-ink">Tidak ada nomor kontrak ganda</p>
                <p className="text-xs text-ink-2 mt-1">{t.reconcile.noIssuesFound}</p>
              </Card>
            ) : (
              filteredDuplicateContracts.map((dup, idx) => (
                <Card key={idx} className="p-4 sm:p-5 border border-line bg-surface space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink">No. Kontrak: {dup.contractNumber}</span>
                      <Badge tone="warning">{dup.count} Karyawan Berbeda</Badge>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table min-w-full">
                      <thead>
                        <tr>
                          <th>NIK</th>
                          <th>Nama Karyawan</th>
                          <th>Departemen</th>
                          <th>Periode Kontrak</th>
                          <th>Status</th>
                          <th className="text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dup.employees.map((emp) => (
                          <tr key={emp.contractId}>
                            <td className="font-mono text-xs">{emp.nik}</td>
                            <td className="font-medium text-ink">{emp.name}</td>
                            <td className="text-xs text-ink-2">{emp.department}</td>
                            <td className="text-xs">
                              {formatDate(emp.startDate)} s/d {formatDate(emp.endDate)}
                            </td>
                            <td>
                              <Badge tone={emp.status === 'AKTIF' ? 'active' : 'neutral'} className="text-[10px]">
                                {emp.status}
                              </Badge>
                            </td>
                            <td className="text-right">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setEditContractModal({
                                    open: true,
                                    contractId: emp.contractId,
                                    employeeName: emp.name,
                                    currentNumber: dup.contractNumber,
                                    newNumber: dup.contractNumber,
                                  })
                                }
                              >
                                Koreksi No
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Contract Date Anomalies */}
        {activeTab === 'dates' && (
          <div className="space-y-4">
            {filteredDateAnomalies.length === 0 ? (
              <Card className="p-8 text-center bg-surface">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-ink">Semua tanggal kontrak valid</p>
                <p className="text-xs text-ink-2 mt-1">{t.reconcile.noIssuesFound}</p>
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden bg-surface border border-line">
                <div className="overflow-x-auto">
                  <table className="table min-w-full">
                    <thead>
                      <tr>
                        <th>NIK</th>
                        <th>Nama</th>
                        <th>Tgl Mulai</th>
                        <th>Tgl Berakhir</th>
                        <th>Deskripsi Anomali</th>
                        <th className="text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDateAnomalies.map((ano) => (
                        <tr key={ano.contractId}>
                          <td className="font-mono text-xs">{ano.nik}</td>
                          <td className="font-medium text-ink">{ano.name}</td>
                          <td className="text-xs font-mono text-red-600 font-medium">{ano.startDate}</td>
                          <td className="text-xs font-mono text-red-600 font-medium">{ano.endDate}</td>
                          <td className="text-xs text-amber-700">{ano.issue}</td>
                          <td className="text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setEditDateModal({
                                  open: true,
                                  contractId: ano.contractId,
                                  employeeName: ano.name,
                                  startDate: ano.startDate,
                                  endDate: ano.endDate,
                                })
                              }
                            >
                              Perbaiki Tanggal
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Tab 4: Missing Info */}
        {activeTab === 'missing' && (
          <div className="space-y-4">
            {filteredMissingInfo.length === 0 ? (
              <Card className="p-8 text-center bg-surface">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-ink">Data karyawan lengkap</p>
                <p className="text-xs text-ink-2 mt-1">{t.reconcile.noIssuesFound}</p>
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden bg-surface border border-line">
                <div className="overflow-x-auto">
                  <table className="table min-w-full">
                    <thead>
                      <tr>
                        <th>NIK</th>
                        <th>Nama Karyawan</th>
                        <th>Departemen</th>
                        <th>Jabatan</th>
                        <th>Informasi Yang Kosong</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMissingInfo.map((m) => (
                        <tr key={m.employeeId}>
                          <td className="font-mono text-xs">{m.nik}</td>
                          <td className="font-medium text-ink">{m.name}</td>
                          <td className="text-xs text-ink-2">{m.department}</td>
                          <td className="text-xs text-ink-2">{m.position}</td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {m.missing.map((mis, idx) => (
                                <Badge key={idx} tone="warning" className="text-[10px]">
                                  {mis}
                                </Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Merge Employee Modal */}
        <Modal
          open={!!selectedGroup}
          onClose={() => !merging && setSelectedGroup(null)}
          title={t.reconcile.mergeModalTitle}
        >
          {selectedGroup && (
            <div className="space-y-4">
              <p className="text-xs text-ink-2">{t.reconcile.mergeModalSubtitle}</p>

              {/* Step 1: Select Primary Record */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink">{t.reconcile.selectPrimaryNik}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedGroup.records.map((rec) => {
                    const isSelected = primaryRecordId === rec.id;
                    return (
                      <div
                        key={rec.id}
                        onClick={() => {
                          setPrimaryRecordId(rec.id);
                          // the other is duplicate
                          const other = selectedGroup.records.find((r) => r.id !== rec.id);
                          if (other) setDuplicateRecordId(other.id);
                          setTargetNik(rec.nik);
                          setTargetName(rec.name);
                          if (rec.email) setTargetEmail(rec.email);
                          if (rec.phone) setTargetPhone(rec.phone);
                        }}
                        className={cn(
                          'cursor-pointer rounded-lg border p-3 transition-all text-xs space-y-1',
                          isSelected
                            ? 'border-accent bg-accent-soft text-ink font-medium shadow-xs ring-1 ring-accent'
                            : 'border-line bg-muted/40 text-ink-2 hover:bg-muted'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold">{rec.nik}</span>
                          {isSelected && <Badge tone="active">Utama (Dipertahankan)</Badge>}
                        </div>
                        <div>Dept: {rec.department}</div>
                        <div>Email: {rec.email || '-'}</div>
                        <div>Kontrak: {rec.contractsCount} riwayat</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Final Data Preview / Customization */}
              <div className="rounded-lg bg-surface border border-line p-3 space-y-3">
                <span className="text-xs font-semibold text-ink">Hasil Akhir Data Setelah Digabung:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-ink-muted">NIK Final</label>
                    <Input
                      value={targetNik}
                      onChange={(e) => setTargetNik(e.target.value)}
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-muted">Nama Final</label>
                    <Input
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-muted">Email Final</label>
                    <Input
                      value={targetEmail}
                      onChange={(e) => setTargetEmail(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-muted">No. Telepon Final</label>
                    <Input
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="rounded bg-amber-50 dark:bg-amber-950/30 p-2 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Semua riwayat kontrak dari kedua record akan digabungkan secara kronologis berdasarkan tanggal mulai.
                    Record duplikat yang tidak dipilih akan dihapus secara aman dari sistem.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button variant="secondary" onClick={() => setSelectedGroup(null)} disabled={merging}>
                  {t.common.cancel}
                </Button>
                <Button variant="primary" onClick={handleExecuteMerge} disabled={merging}>
                  {merging ? t.common.loading : t.reconcile.mergeConfirm}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Contract Number Modal */}
        <Modal
          open={editContractModal.open}
          onClose={() => setEditContractModal({ ...editContractModal, open: false })}
          title="Koreksi Nomor Kontrak"
        >
          <div className="space-y-4">
            <p className="text-xs text-ink-2">
              Ubah nomor kontrak untuk karyawan <strong>{editContractModal.employeeName}</strong> agar tidak ganda.
            </p>
            <div>
              <label className="text-xs font-medium text-ink">Nomor Kontrak Baru</label>
              <Input
                value={editContractModal.newNumber}
                onChange={(e) => setEditContractModal({ ...editContractModal, newNumber: e.target.value })}
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button
                variant="secondary"
                onClick={() => setEditContractModal({ ...editContractModal, open: false })}
              >
                Batal
              </Button>
              <Button variant="primary" onClick={handleSaveContractNumber}>
                Simpan Nomor
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Contract Dates Modal */}
        <Modal
          open={editDateModal.open}
          onClose={() => setEditDateModal({ ...editDateModal, open: false })}
          title="Perbaiki Tanggal Kontrak"
        >
          <div className="space-y-4">
            <p className="text-xs text-ink-2">
              Koreksi tanggal untuk karyawan <strong>{editDateModal.employeeName}</strong>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-ink">Tanggal Mulai</label>
                <Input
                  type="date"
                  value={editDateModal.startDate}
                  onChange={(e) => setEditDateModal({ ...editDateModal, startDate: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink">Tanggal Berakhir</label>
                <Input
                  type="date"
                  value={editDateModal.endDate}
                  onChange={(e) => setEditDateModal({ ...editDateModal, endDate: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button variant="secondary" onClick={() => setEditDateModal({ ...editDateModal, open: false })}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSaveContractDate}>
                Simpan Tanggal
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
