'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  RefreshCw,
  Award,
  FileText,
  Pencil,
  Trash2,
  MessageSquare,
  UserX,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  RotateCcw,
  X,
  Lock,
  FileCheck2,
  Check,
  Mail,
  Copy,
  Printer,
  Clock,
  Send,
} from 'lucide-react';
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
  Pagination,
  cn,
} from '../components/ui';
import {
  formatDate,
  contractStatusTone,
  contractStatusKey,
  daysUntil,
  getApiError,
  toISODate,
  calculateContractEndDate,
  getNextDayISODate,
} from '../lib/helpers';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { Contract, Employee, ContractEvaluation } from '../lib/types';
import SearchableEmployeeSelect from '../components/SearchableEmployeeSelect';

const STATUS_FILTERS = [
  { labelKey: 'allStatus', value: '' },
  { labelKey: 'aktif', value: 'AKTIF' },
  { labelKey: 'akanBerakhir', value: 'AKAN_BERAKHIR' },
  { labelKey: 'expired', value: 'EXPIRED' },
  { labelKey: 'resign', value: 'RESIGN' },
];

const defaultStartDate = new Date().toISOString().split('T')[0];
const defaultEndDate = calculateContractEndDate(defaultStartDate, 12);

export default function ContractsPage() {
  const { user } = useAuth();
  const { t } = useUI();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // Sorting & Date Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'endDate' | 'startDate' | 'contractNumber' | 'employeeName' | 'sequence' | 'status'>('employeeName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dateType, setDateType] = useState<'endDate' | 'startDate'>('endDate');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Contract | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [contractEvaluation, setContractEvaluation] = useState<ContractEvaluation | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [waSending, setWaSending] = useState(false);

  const [newDurationMonths, setNewDurationMonths] = useState<6 | 12>(12);
  const [extendDurationMonths, setExtendDurationMonths] = useState<6 | 12>(12);
  const [editDurationMonths, setEditDurationMonths] = useState<6 | 12>(12);

  const [evaluatorForm, setEvaluatorForm] = useState({
    evaluatorEmployeeId: '',
    evaluatorName: '',
    evaluatorPosition: '',
    evaluatorEmail: '',
    evaluatorPhone: '',
  });
  const [sendingLink, setSendingLink] = useState(false);
  const [sendingChannel, setSendingChannel] = useState<'EMAIL' | 'WHATSAPP' | 'COPY' | null>(null);
  const [lastActionChannel, setLastActionChannel] = useState<'EMAIL' | 'WHATSAPP' | 'COPY' | null>(null);
  const [sendLinkSuccess, setSendLinkSuccess] = useState('');
  const [sendLinkError, setSendLinkError] = useState('');
  const [generatedEvalUrl, setGeneratedEvalUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState('');

  const [newContractData, setNewContractData] = useState({
    employeeId: '',
    contractNumber: '',
    contractType: 'PKWT',
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    notes: '',
  });

  const [editData, setEditData] = useState({
    contractNumber: '',
    contractType: 'PKWT',
    status: 'AKTIF',
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    notes: '',
    sequence: 1,
  });

  const [extendData, setExtendData] = useState({
    actionType: 'PERPANJANG_PKWT',
    newContractNumber: '',
    newStartDate: defaultStartDate,
    newEndDate: defaultEndDate,
    notes: '',
  });

  const [suggestedNewContractNumber, setSuggestedNewContractNumber] = useState('');
  const [isNotNewestContract, setIsNotNewestContract] = useState(false);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const activeDateSortCount = useMemo(() => {
    let count = 0;
    if (dateFrom || dateTo) count += 1;
    if (sortBy !== 'employeeName' || sortOrder !== 'asc') count += 1;
    return count;
  }, [dateFrom, dateTo, sortBy, sortOrder]);

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSortBy('employeeName');
    setSortOrder('asc');
    setDateType('endDate');
  };

  const applyPreset = (preset: 'thisMonth' | 'next30' | 'next60' | 'thisYear') => {
    const now = new Date();
    if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(toISODate(start));
      setDateTo(toISODate(end));
    } else if (preset === 'next30') {
      const start = new Date(now);
      const end = new Date(now.getTime() + 30 * 86400000);
      setDateFrom(toISODate(start));
      setDateTo(toISODate(end));
    } else if (preset === 'next60') {
      const start = new Date(now);
      const end = new Date(now.getTime() + 60 * 86400000);
      setDateFrom(toISODate(start));
      setDateTo(toISODate(end));
    } else if (preset === 'thisYear') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setDateFrom(toISODate(start));
      setDateTo(toISODate(end));
    }
  };

  const handleSortHeader = (col: 'sequence' | 'contractNumber' | 'employeeName' | 'startDate' | 'endDate' | 'status') => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (dateFrom || dateTo) params.append('dateType', dateType);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);
      const res = await api.get(`/contracts?${params.toString()}`);
      setContracts(res.data.contracts || []);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, dateType, dateFrom, dateTo, sortBy, sortOrder]);

  const displayContracts = useMemo(() => {
    let list = [...contracts];

    // Client-side date filter safeguard
    if (dateFrom || dateTo) {
      list = list.filter((c) => {
        const target = dateType === 'startDate' ? c.startDate : c.endDate;
        if (!target) return false;
        const d = toISODate(new Date(target));
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
    }

    // Client-side sort safeguard
    list.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'endDate') {
        comp = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      } else if (sortBy === 'startDate') {
        comp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      } else if (sortBy === 'employeeName') {
        comp = (a.employee?.name || '').localeCompare(b.employee?.name || '');
      } else if (sortBy === 'contractNumber') {
        comp = (a.contractNumber || '').localeCompare(b.contractNumber || '');
      } else if (sortBy === 'sequence') {
        comp = (a.sequence || 0) - (b.sequence || 0);
      } else if (sortBy === 'status') {
        comp = (a.status || '').localeCompare(b.status || '');
      }
      return sortOrder === 'desc' ? -comp : comp;
    });

    return list;
  }, [contracts, dateType, dateFrom, dateTo, sortBy, sortOrder]);

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
    setPage(1);
  }, [statusFilter, debouncedSearch, dateType, dateFrom, dateTo, sortBy, sortOrder]);

  const lastOpenedContractId = useRef<string | null>(null);

  useEffect(() => {
    const readParams = () => {
      const sp = new URLSearchParams(window.location.search);
      const s = sp.get('status');
      if (s !== null) setStatusFilter(s);
      const q = sp.get('search');
      if (q !== null) setSearch(q);
      const contractId = sp.get('contract');
      if (contractId && lastOpenedContractId.current !== contractId) {
        const c = contracts.find((x) => x.id === contractId);
        if (c) {
          lastOpenedContractId.current = contractId;
          openDetailModalFor(c);
        } else {
          api
            .get(`/contracts/${contractId}`)
            .then((res) => {
              if (res.data) {
                lastOpenedContractId.current = contractId;
                openDetailModalFor(res.data);
              }
            })
            .catch(() => {});
        }
      }
    };

    readParams();
    window.addEventListener('popstate', readParams);
    return () => window.removeEventListener('popstate', readParams);
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
    if (!contractEvaluation) {
      setFormError('Tindak lanjut terkunci: Karyawan belum memiliki form penilaian kontrak.');
      return;
    }
    if (isNotNewestContract) {
      setFormError('Tindak lanjut hanya dapat diproses pada kontrak terbaru karyawan.');
      return;
    }
    setFormError('');
    setFormSuccess('');
    try {
      const finalContractNumber = extendData.newContractNumber.trim() || undefined;
      const payload = {
        ...extendData,
        newContractNumber: finalContractNumber,
      };
      await api.post(`/contracts/${selectedContract.id}/extend`, payload);
      setFormSuccess(t.common.success);
      fetchContracts();
      fetchEmployees();
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
    const startStr = toISODate(new Date(c.startDate));
    const endStr = toISODate(new Date(c.endDate));
    const dStart = new Date(startStr);
    const dEnd = new Date(endStr);
    const diffMonths = (dEnd.getFullYear() - dStart.getFullYear()) * 12 + (dEnd.getMonth() - dStart.getMonth());
    const dur: 6 | 12 = diffMonths <= 8 ? 6 : 12;
    setEditDurationMonths(dur);
    setEditData({
      contractNumber: c.contractNumber || '',
      contractType: c.contractType,
      status: c.status,
      startDate: startStr,
      endDate: endStr,
      notes: c.notes || '',
      sequence: c.sequence || 1,
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

  const handleSelectEvaluatorEmployee = (emp: Employee | null) => {
    if (emp) {
      setEvaluatorForm({
        evaluatorEmployeeId: emp.id,
        evaluatorName: emp.name,
        evaluatorPosition: emp.position || '',
        evaluatorEmail: emp.email || '',
        evaluatorPhone: emp.phone || '',
      });
      setSendLinkError('');
    } else {
      setEvaluatorForm({
        evaluatorEmployeeId: '',
        evaluatorName: '',
        evaluatorPosition: '',
        evaluatorEmail: '',
        evaluatorPhone: '',
      });
    }
  };

  const handleSendEvaluationLink = async (channel: 'EMAIL' | 'WHATSAPP' | 'COPY') => {
    if (!selectedContract?.employeeId) return;
    if (!evaluatorForm.evaluatorName.trim()) {
      setSendLinkError('Nama atasan penilai wajib diisi.');
      return;
    }
    if (channel === 'EMAIL' && !evaluatorForm.evaluatorEmail?.trim()) {
      setSendLinkError('Email atasan penilai wajib diisi untuk mengirim via Email.');
      return;
    }

    // Buka tab/window baru secara sinkron saat user mengklik tombol
    // Ini mencegah browser (Chrome/Edge/Safari) memblokir popup karena operasi async
    let waPopup: Window | null = null;
    if (channel === 'WHATSAPP') {
      waPopup = window.open('', '_blank');
    }

    try {
      setSendingLink(true);
      setSendingChannel(channel);
      setSendLinkError('');
      setSendLinkSuccess('');
      const res = await api.post('/evaluations/send-link', {
        employeeId: selectedContract.employeeId,
        contractId: selectedContract.id,
        evaluatorName: evaluatorForm.evaluatorName.trim(),
        evaluatorPosition: evaluatorForm.evaluatorPosition?.trim() || undefined,
        evaluatorEmail: evaluatorForm.evaluatorEmail?.trim() || undefined,
        evaluatorPhone: evaluatorForm.evaluatorPhone?.trim() || undefined,
        sendEmailNow: channel === 'EMAIL',
        frontendBaseUrl: window.location.origin,
      });

      const updatedEval = res.data.evaluation;
      setContractEvaluation(updatedEval);
      const fullUrl = res.data.evaluationUrl || `${window.location.origin}/evaluate/${updatedEval.accessToken}`;
      setGeneratedEvalUrl(fullUrl);
      setLastActionChannel(channel);

      if (channel === 'COPY') {
        setLastWhatsAppUrl('');
        if (waPopup) waPopup.close();
        await navigator.clipboard.writeText(fullUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
        setSendLinkSuccess('Tautan form evaluasi berhasil disalin ke clipboard!');
      } else if (channel === 'WHATSAPP') {
        const waUrl = res.data.whatsappUrl;
        if (waUrl) {
          setLastWhatsAppUrl(waUrl);
          if (waPopup) {
            waPopup.location.href = waUrl;
          } else {
            window.location.href = waUrl;
          }
          setSendLinkSuccess(
            evaluatorForm.evaluatorPhone?.trim()
              ? `Tautan WhatsApp siap untuk ${evaluatorForm.evaluatorPhone}. Jika tab WhatsApp belum terbuka otomatis, silakan klik tombol di bawah.`
              : 'Tautan WhatsApp siap (silakan pilih kontak di WhatsApp). Jika tab WhatsApp belum terbuka otomatis, silakan klik tombol di bawah.'
          );
        } else {
          setLastWhatsAppUrl('');
          if (waPopup) waPopup.close();
          await navigator.clipboard.writeText(fullUrl);
          setSendLinkSuccess('Tautan berhasil dibuat dan disalin ke clipboard.');
        }
      } else if (channel === 'EMAIL') {
        setLastWhatsAppUrl('');
        if (waPopup) waPopup.close();
        if (res.data.emailSent) {
          setSendLinkSuccess(`Email undangan evaluasi berhasil dikirimkan ke ${evaluatorForm.evaluatorEmail}`);
        } else {
          setSendLinkSuccess(`Tautan evaluasi siap: ${res.data.emailError || 'Email tidak terkirim, gunakan opsi WhatsApp atau Salin Tautan di bawah.'}`);
        }
      }
    } catch (err: any) {
      if (waPopup) waPopup.close();
      console.error('Failed to send evaluation link:', err);
      setSendLinkError(getApiError(err));
    } finally {
      setSendingLink(false);
      setSendingChannel(null);
    }
  };

  const openExtendModalFor = useCallback(async (c: Contract) => {
    setSelectedContract(c);
    const dept = c.employee?.department?.substring(0, 3).toUpperCase() || 'EMP';
    const newStartDate = getNextDayISODate(toISODate(new Date(c.endDate)));
    const initialDur = 12;
    setExtendDurationMonths(initialDur);
    const newEndDate = calculateContractEndDate(newStartDate, initialDur);
    const generatedNo = `PKWT/${new Date().getFullYear()}/${dept}/${Math.floor(Math.random() * 900 + 100)}`;
    setSuggestedNewContractNumber(generatedNo);

    // Pastikan apakah c merupakan kontrak paling baru dari karyawan ini
    const emp = employees.find((e) => e.id === c.employeeId);
    const allEmpContracts = emp?.contracts || contracts.filter((x) => x.employeeId === c.employeeId);
    const maxSeq = Math.max(...allEmpContracts.map((x) => x.sequence || 0), 0);
    const isNewest = (c.sequence || 0) >= maxSeq;
    setIsNotNewestContract(!isNewest);

    setExtendData({
      actionType: 'PERPANJANG_PKWT',
      newContractNumber: '', // Dikosongkan agar placeholder form tampil
      newStartDate,
      newEndDate,
      notes: '', // Dikosongkan agar placeholder catatan tampil rapi
    });
    setContractEvaluation(null);
    setFormError('');
    setFormSuccess('');
    setSendLinkSuccess('');
    setSendLinkError('');
    setGeneratedEvalUrl('');
    setCopiedLink(false);
    setLastWhatsAppUrl('');
    setLastActionChannel(null);
    setSendingChannel(null);
    setEvaluatorForm({
      evaluatorEmployeeId: '',
      evaluatorName: '',
      evaluatorPosition: '',
      evaluatorEmail: '',
      evaluatorPhone: '',
    });
    setShowExtendModal(true);

    try {
      setEvalLoading(true);
      const res = await api.get(`/evaluations/contract/${c.id}`);
      let evalData = res.data.evaluation;
      if (!evalData && c.employeeId) {
        const empRes = await api.get(`/evaluations?employeeId=${c.employeeId}`);
        const list = empRes.data.evaluations || [];
        if (list.length > 0) {
          const directMatch = list.find((ev: any) => ev.contractId === c.id);
          evalData = directMatch || list[0];
        }
      }

      if (evalData) {
        setContractEvaluation(evalData);
        if (evalData.accessToken) {
          setGeneratedEvalUrl(`${window.location.origin}/evaluate/${evalData.accessToken}`);
        }
        setEvaluatorForm({
          evaluatorEmployeeId: '',
          evaluatorName: evalData.evaluatorName || '',
          evaluatorPosition: evalData.evaluatorPosition || '',
          evaluatorEmail: evalData.evaluatorEmail || '',
          evaluatorPhone: evalData.evaluatorPhone || '',
        });

        if (evalData.status === 'COMPLETED') {
          if (evalData.recommendationDuration) {
            const dur: 6 | 12 = Number(evalData.recommendationDuration) === 6 ? 6 : 12;
            setExtendDurationMonths(dur);
            setExtendData((prev) => ({
              ...prev,
              actionType: 'PERPANJANG_PKWT',
              newEndDate: calculateContractEndDate(prev.newStartDate, dur),
            }));
          } else if (evalData.recommendationType === 'SELESAI_KONTRAK') {
            setExtendData((prev) => ({
              ...prev,
              actionType: 'SELESAI_KONTRAK',
            }));
          } else if (evalData.recommendationType === 'ANGKAT_PKWTT') {
            setExtendData((prev) => ({
              ...prev,
              actionType: 'ANGKAT_TETAP',
            }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load contract evaluation:', err);
    } finally {
      setEvalLoading(false);
    }
  }, [employees, contracts]);

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
    const start = emp?.joinDate ? toISODate(new Date(emp.joinDate)) : newContractData.startDate;
    const end = newContractData.contractType === 'PKWT'
      ? calculateContractEndDate(start, newDurationMonths)
      : newContractData.endDate;
    setNewContractData({
      ...newContractData,
      employeeId,
      startDate: start,
      endDate: end,
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
            <Button variant="accent" onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
              <Plus size={15} /> {t.contracts.addContract}
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.contracts.searchPlaceholder} className="pl-9" />
            </div>

            {/* Filter & Sort Drawer Button */}
            <Button
              type="button"
              variant={isFilterOpen || activeDateSortCount > 0 ? 'accent' : 'secondary'}
              size="sm"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="gap-1.5 shrink-0"
              title={t.contracts.filterAndSort}
            >
              <SlidersHorizontal size={14} />
              <span>{t.contracts.filterBtn}</span>
              {activeDateSortCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-accent dark:bg-ink dark:text-accent">
                  {activeDateSortCount}
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
            {(activeDateSortCount > 0 || dateFrom || dateTo) && (
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
                  statusFilter === st.value ? 'bg-accent text-white dark:text-ink shadow-xs' : 'bg-muted text-ink-2 hover:text-ink'
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
              {/* Kolom 1: Urutkan Berdasarkan & Arah (Asc / Desc) */}
              <div className="space-y-2 lg:col-span-4 rounded-[6px] border border-line/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <ArrowUpDown size={13} className="text-accent" />
                    {t.contracts.sortBy}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-xs"
                  >
                    <option value="endDate">{t.contracts.endDate} ({t.contracts.dateEnd})</option>
                    <option value="startDate">{t.contracts.startDate} ({t.contracts.dateStart})</option>
                    <option value="employeeName">{t.contracts.employee} (A-Z)</option>
                    <option value="contractNumber">{t.contracts.contractNo}</option>
                    <option value="sequence">{t.contracts.sequence}</option>
                    <option value="status">{t.common.status}</option>
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

              {/* Kolom 2: Filter By Date (Tanggal Berakhir / Mulai, Range Tanggal & Presets) */}
              <div className="space-y-2 lg:col-span-8 rounded-[6px] border border-line/60 bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <Calendar size={13} className="text-accent" />
                    {t.contracts.filterByDate}
                  </span>

                  {/* Date Field Selector (End Date vs Start Date) */}
                  <div className="flex items-center gap-1 bg-surface rounded-[4px] border border-line p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDateType('endDate')}
                      className={cn(
                        'px-2 py-0.5 rounded-[3px] font-medium transition-colors',
                        dateType === 'endDate' ? 'bg-accent text-white dark:text-ink font-semibold' : 'text-ink-2 hover:text-ink'
                      )}
                    >
                      {t.contracts.endDate}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateType('startDate')}
                      className={cn(
                        'px-2 py-0.5 rounded-[3px] font-medium transition-colors',
                        dateType === 'startDate' ? 'bg-accent text-white dark:text-ink font-semibold' : 'text-ink-2 hover:text-ink'
                      )}
                    >
                      {t.contracts.startDate}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
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
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
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
                    onClick={() => applyPreset('next30')}
                    className="rounded-[4px] border border-line bg-surface px-2 py-0.5 text-ink hover:border-accent hover:text-accent transition-colors"
                  >
                    {t.contracts.next30Days}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('next60')}
                    className="rounded-[4px] border border-line bg-surface px-2 py-0.5 text-ink hover:border-accent hover:text-accent transition-colors"
                  >
                    {t.contracts.next60Days}
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
                {(dateFrom || dateTo) && (
                  <span className="inline-flex items-center gap-1 rounded-[4px] bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
                    <Calendar size={12} />
                    {dateType === 'endDate' ? t.contracts.endDate : t.contracts.startDate}: {dateFrom || '...'} s/d {dateTo || '...'}
                    <button
                      type="button"
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="ml-1 hover:text-expired"
                    >
                      <X size={12} />
                    </button>
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
                  className="text-xs text-ink-2 hover:text-ink"
                >
                  <RotateCcw size={13} /> {t.contracts.resetFilter}
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

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table min-w-[850px]">
            <thead>
              <tr>
                <th
                  className="th cursor-pointer select-none hover:text-accent transition-colors"
                  onClick={() => handleSortHeader('sequence')}
                  title={`${t.contracts.sortBy} ${t.contracts.sequence}`}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.contracts.sequence}</span>
                    {sortBy === 'sequence' && (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    )}
                  </div>
                </th>
                <th
                  className="th cursor-pointer select-none hover:text-accent transition-colors"
                  onClick={() => handleSortHeader('contractNumber')}
                  title={`${t.contracts.sortBy} ${t.contracts.contractNo}`}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.contracts.contractNo}</span>
                    {sortBy === 'contractNumber' && (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    )}
                  </div>
                </th>
                <th
                  className="th cursor-pointer select-none hover:text-accent transition-colors"
                  onClick={() => handleSortHeader('employeeName')}
                  title={`${t.contracts.sortBy} ${t.contracts.employee}`}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.contracts.employee}</span>
                    {sortBy === 'employeeName' && (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    )}
                  </div>
                </th>
                <th className="th">{t.contracts.contractType}</th>
                <th
                  className="th cursor-pointer select-none hover:text-accent transition-colors"
                  onClick={() => handleSortHeader('startDate')}
                  title={`${t.contracts.sortBy} ${t.contracts.startDate}`}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.contracts.startDate}</span>
                    {sortBy === 'startDate' && (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    )}
                  </div>
                </th>
                <th
                  className="th cursor-pointer select-none hover:text-accent transition-colors"
                  onClick={() => handleSortHeader('endDate')}
                  title={`${t.contracts.sortBy} ${t.contracts.endDate}`}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.contracts.endDate}</span>
                    {sortBy === 'endDate' && (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    )}
                  </div>
                </th>
                <th
                  className="th cursor-pointer select-none hover:text-accent transition-colors"
                  onClick={() => handleSortHeader('status')}
                  title={`${t.contracts.sortBy} ${t.common.status}`}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.common.status}</span>
                    {sortBy === 'status' && (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    )}
                  </div>
                </th>
                {user?.role !== 'USER' && <th className="th text-right">{t.common.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={8}>{t.common.loading}</td>
                </tr>
              ) : displayContracts.length === 0 ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={8}>{t.common.noData}</td>
                </tr>
              ) : (
                displayContracts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c) => (
                  <tr key={c.id} className="trow cursor-pointer" onClick={() => openDetailModalFor(c)}>
                    <td className="td">
                      <span className="rounded-[4px] bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">
                        {t.common.seqPrefix}{c.sequence}
                      </span>
                    </td>
                    <td className="td font-mono text-[11px] font-semibold text-ink">{c.contractNumber || '-'}</td>
                    <td className="td">
                      <div className="font-semibold text-ink">{c.employee?.name}</div>
                      <div className="text-[11px] text-ink-2">{c.employee?.department} — {c.employee?.position}</div>
                    </td>
                    <td className="td">
                      <Badge tone="info">{t.employmentType[c.contractType as 'PKWT'] ?? c.contractType}</Badge>
                    </td>
                    <td className="td text-xs">{formatDate(c.startDate)}</td>
                    <td className="td text-xs">
                      {c.contractType === 'PKWTT' || new Date(c.endDate).getFullYear() >= 2099 ? (
                        <span className="font-semibold text-accent">Tetap</span>
                      ) : (
                        <>
                          {formatDate(c.endDate)}
                          {c.status === 'AKAN_BERAKHIR' && daysUntil(c.endDate) !== null && daysUntil(c.endDate)! <= 30 && (
                            <div className="mt-0.5 text-[10px] font-semibold text-warning">
                              {daysUntil(c.endDate)} {t.dashboard.days}
                            </div>
                          )}
                        </>
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
                          {['AKTIF', 'AKAN_BERAKHIR', 'EXPIRED'].includes(c.status) &&
                            c.contractType !== 'PKWTT' &&
                            c.employee?.employmentType !== 'PKWTT' &&
                            (() => {
                              const emp = employees.find((e) => e.id === c.employeeId);
                              const allContracts = emp?.contracts || contracts.filter((x) => x.employeeId === c.employeeId);
                              const maxSeq = Math.max(...allContracts.map((x) => x.sequence || 0), 0);
                              return (c.sequence || 0) >= maxSeq;
                            })() && (
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

        <Pagination
          page={page}
          totalPages={Math.ceil(displayContracts.length / PAGE_SIZE)}
          total={displayContracts.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          previousLabel={t.common.previous}
          nextLabel={t.common.next}
          pageInfoLabel={t.common.pageInfo}
          pageOfLabel={t.common.pageOf}
        />
      </Card>

      {/* Add Contract Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title={t.contracts.addTitle} subtitle={t.contracts.addSubtitle}>
        {formError && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>}
        {formSuccess && <div className="mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active">{formSuccess}</div>}
        <form onSubmit={handleCreateContract} className="space-y-3.5">
          <Field label={t.contracts.employeeSelect} required>
            <SearchableEmployeeSelect
              employees={employees}
              value={newContractData.employeeId}
              placeholder={`-- Cari atau ${t.contracts.employeeSelect} --`}
              clearLabel="-- Batalkan Pilihan Karyawan --"
              required
              onSelect={(emp) => {
                const empId = emp ? emp.id : '';
                const start = emp?.joinDate ? toISODate(new Date(emp.joinDate)) : newContractData.startDate;
                const end = newContractData.contractType === 'PKWT'
                  ? calculateContractEndDate(start, newDurationMonths)
                  : newContractData.endDate;
                setNewContractData({
                  ...newContractData,
                  employeeId: empId,
                  startDate: start,
                  endDate: end,
                });
              }}
            />
          </Field>
          {selectedEmployee && (
            <div className="flex flex-col gap-1 rounded-[6px] border border-accent/30 bg-accent/10 px-3 py-2.5 text-xs text-ink sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>{t.contracts.joinDateInfo}</span>
                <span className="font-bold">{formatDate(selectedEmployee.joinDate)}</span>
                <span className="text-accent">·</span>
                <span>{t.contracts.nextSequence}:</span>
                <span className="font-bold">{t.common.seqPrefix}{Math.max(1, (selectedEmployee.contracts?.length || 0) + 1)}</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.contracts.contractNoLabel}>
              <Input value={newContractData.contractNumber} onChange={setNew('contractNumber')} placeholder="PKWT/2026/TECH/001 (Opsional)" />
            </Field>
            <Field label={t.contracts.typeLabel} required>
              <Select
                value={newContractData.contractType}
                onChange={(e) => {
                  const val = e.target.value;
                  const end = val === 'PKWT'
                    ? calculateContractEndDate(newContractData.startDate, newDurationMonths)
                    : newContractData.endDate;
                  setNewContractData({ ...newContractData, contractType: val, endDate: end });
                }}
              >
                <option value="PKWT">{t.employmentType.PKWT}</option>
                <option value="PKWTT">{t.employmentType.PKWTT}</option>
                <option value="MAGANG">{t.employmentType.MAGANG}</option>
              </Select>
            </Field>
          </div>

          {newContractData.contractType === 'PKWT' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t.contracts.dateStartLabel} required>
                  <Input
                    type="date"
                    value={newContractData.startDate}
                    onChange={(e) => {
                      const start = e.target.value;
                      setNewContractData({
                        ...newContractData,
                        startDate: start,
                        endDate: calculateContractEndDate(start, newDurationMonths),
                      });
                    }}
                    required
                  />
                </Field>

                <Field label={t.contracts.durationLabel} required>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewDurationMonths(6);
                        setNewContractData((prev) => ({
                          ...prev,
                          endDate: calculateContractEndDate(prev.startDate, 6),
                        }));
                      }}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-2 px-3 rounded-[6px] text-xs font-bold border transition-colors',
                        newDurationMonths === 6
                          ? 'bg-accent text-white border-accent shadow-xs'
                          : 'bg-surface border-line text-ink-2 hover:border-accent hover:text-ink'
                      )}
                    >
                      {newDurationMonths === 6 && <Check size={14} />}
                      <span>{t.contracts.duration6}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewDurationMonths(12);
                        setNewContractData((prev) => ({
                          ...prev,
                          endDate: calculateContractEndDate(prev.startDate, 12),
                        }));
                      }}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-2 px-3 rounded-[6px] text-xs font-bold border transition-colors',
                        newDurationMonths === 12
                          ? 'bg-accent text-white border-accent shadow-xs'
                          : 'bg-surface border-line text-ink-2 hover:border-accent hover:text-ink'
                      )}
                    >
                      {newDurationMonths === 12 && <Check size={14} />}
                      <span>{t.contracts.duration12}</span>
                    </button>
                  </div>
                </Field>
              </div>

              {/* Auto-calculated End Date Card */}
              <div className="rounded-[6px] border border-line bg-surface/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-2">
                    {t.contracts.autoEndDate}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Calendar size={15} className="text-accent shrink-0" />
                    <span className="text-sm font-bold text-ink">
                      {formatDate(newContractData.endDate)}
                    </span>
                    <Badge tone="info" className="text-[10px]">
                      {newDurationMonths} Bulan
                    </Badge>
                  </div>
                </div>
                <div className="text-[11px] text-ink-2">
                  {formatDate(newContractData.startDate)} s/d {formatDate(newContractData.endDate)}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.contracts.dateStartLabel} required>
                <Input type="date" value={newContractData.startDate} onChange={setNew('startDate')} required />
              </Field>
              <Field label={t.contracts.dateEndLabel} required>
                <Input type="date" value={newContractData.endDate} onChange={setNew('endDate')} required />
              </Field>
            </div>
          )}
          <Field label={t.contracts.notesLabel}>
            <Textarea value={newContractData.notes} onChange={setNew('notes')} placeholder={t.common.notes} />
          </Field>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-full sm:w-auto">{t.common.cancel}</Button>
            <Button type="submit" variant="primary" className="w-full sm:w-auto">{t.contracts.save}</Button>
          </div>
        </form>
      </Modal>

      {/* Extend / Convert / Resign Modal */}
      <Modal
        open={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        title={t.contracts.extendTitle}
        subtitle={`${t.contracts.extendFor}: ${selectedContract?.employee?.name}${selectedContract?.contractNumber ? ` (${selectedContract.contractNumber})` : ''} · ${t.contracts.sequence} ${selectedContract?.sequence || 1}`}
        size="lg"
      >
        {formError && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>}
        {formSuccess && <div className="mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active">{formSuccess}</div>}

        {isNotNewestContract && (
          <div className="mb-4 flex items-center gap-2 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired font-medium">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              Perhatian: Kontrak ini (Ke-{selectedContract?.sequence}) bukan kontrak terbaru karyawan. Tindak lanjut keputusan hanya dapat dilakukan pada kontrak terbaru.
            </span>
          </div>
        )}

        <form onSubmit={handleExtendContract} className="space-y-4">
          {/* Evaluation Status Card */}
          {evalLoading ? (
            <div className="flex items-center gap-2 rounded-[6px] border border-line bg-surface p-3 text-xs text-ink-2">
              <Loader2 size={16} className="animate-spin text-accent" />
              <span>Memeriksa status form penilaian kontrak...</span>
            </div>
          ) : contractEvaluation && contractEvaluation.status === 'COMPLETED' ? (
            <div className="rounded-[8px] border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Penilaian Selesai &bull; No: {contractEvaluation.documentNumber || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {contractEvaluation.accessToken && (
                    <Link
                      href={`/evaluate/${contractEvaluation.accessToken}`}
                      target="_blank"
                      className="flex items-center gap-1.5 rounded-[5px] border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors shadow-xs"
                    >
                      <Printer size={13} />
                      <span>Cetak Form TTD Basah</span>
                      <ExternalLink size={11} />
                    </Link>
                  )}
                  <Link
                    href={`/evaluations?search=${encodeURIComponent(contractEvaluation.documentNumber || contractEvaluation.employee?.name || '')}`}
                    target="_blank"
                    className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                  >
                    <span>{t.contracts.evalViewForm}</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                <div>
                  <div className="text-[10px] uppercase text-ink-2">{t.contracts.evalScore}</div>
                  <div className="font-bold text-ink">{Number(contractEvaluation.averageScore || 0).toFixed(2)} / 4.00</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-2">Predikat</div>
                  <div className="font-bold text-ink">{contractEvaluation.ratingGrade || '-'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-2">{t.contracts.evalRecommendation}</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    {contractEvaluation.recommendationType === 'PERPANJANG_PKWT' && contractEvaluation.recommendationDuration
                      ? `${contractEvaluation.recommendationDuration} Bulan`
                      : contractEvaluation.recommendationType === 'ANGKAT_PKWTT'
                      ? 'Angkat Tetap'
                      : contractEvaluation.recommendationType === 'SELESAI_KONTRAK'
                      ? 'Selesai Kontrak'
                      : '-'}
                  </div>
                </div>
              </div>

              {/* Fallback HR Manual Edit option */}
              <div className="pt-2 border-t border-emerald-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-ink-2">
                <span>
                  Penilai: <strong>{contractEvaluation.evaluatorName || 'Atasan'}</strong> ({contractEvaluation.evaluatorPosition || 'Atasan Langsung'})
                </span>
                <Link
                  href={`/evaluations?search=${encodeURIComponent(contractEvaluation.documentNumber || contractEvaluation.employee?.name || '')}`}
                  target="_blank"
                  className="text-accent hover:underline font-semibold"
                >
                  Koreksi / Edit Nilai Manual (HR) &rarr;
                </Link>
              </div>
            </div>
          ) : contractEvaluation && contractEvaluation.status === 'WAITING_EVALUATION' ? (
            <div className="rounded-[8px] border border-blue-500/30 bg-blue-500/5 p-3.5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <Clock size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-blue-700 dark:text-blue-300">
                      Tautan Evaluasi Digital Telah Dikirimkan
                    </div>
                    <div className="text-[11px] text-ink-2 mt-0.5 leading-relaxed">
                      Menunggu penilaian dari: <strong>{contractEvaluation.evaluatorName || 'Atasan'}</strong>{' '}
                      {contractEvaluation.evaluatorPosition ? `(${contractEvaluation.evaluatorPosition})` : ''}
                      {contractEvaluation.evaluatorEmail ? ` &bull; ${contractEvaluation.evaluatorEmail}` : ''}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 shrink-0">
                  Menunggu Penilaian
                </span>
              </div>

              {sendLinkSuccess && (
                <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    {lastActionChannel === 'EMAIL' && <Mail size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    {lastActionChannel === 'WHATSAPP' && <MessageSquare size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    {lastActionChannel === 'COPY' && <Copy size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    <span>{sendLinkSuccess}</span>
                  </div>
                  {lastActionChannel === 'WHATSAPP' && lastWhatsAppUrl && (
                    <div className="pt-1">
                      <a
                        href={lastWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-[5px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        <span>Buka WhatsApp Sekarang &rarr;</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
              {sendLinkError && (
                <div className="rounded border border-expired/30 bg-expired/10 p-2 text-xs text-expired">
                  {sendLinkError}
                </div>
              )}

              {/* Quick Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-500/15">
                <button
                  type="button"
                  onClick={() => handleSendEvaluationLink('COPY')}
                  disabled={sendingLink}
                  className="inline-flex items-center gap-1.5 rounded-[5px] border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-accent hover:text-accent transition-colors shadow-xs cursor-pointer"
                >
                  <Copy size={13} />
                  <span>{copiedLink ? 'Tersalin!' : 'Salin Tautan'}</span>
                </button>

                {contractEvaluation.evaluatorPhone && (
                  <button
                    type="button"
                    onClick={() => handleSendEvaluationLink('WHATSAPP')}
                    disabled={sendingLink}
                    className="inline-flex items-center gap-1.5 rounded-[5px] border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors shadow-xs cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    <span>Buka WhatsApp</span>
                  </button>
                )}

                {contractEvaluation.evaluatorEmail && (
                  <button
                    type="button"
                    onClick={() => handleSendEvaluationLink('EMAIL')}
                    disabled={sendingLink}
                    className="inline-flex items-center gap-1.5 rounded-[5px] border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition-colors shadow-xs cursor-pointer"
                  >
                    <Mail size={13} />
                    <span>{sendingLink && sendingChannel === 'EMAIL' ? 'Mengirim...' : 'Kirim Ulang Email'}</span>
                  </button>
                )}

                <Link
                  href="/evaluations"
                  target="_blank"
                  className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                >
                  <span>Input Manual di Sistem (Bypass) &rarr;</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[8px] border border-amber-500/30 bg-amber-500/5 p-4 space-y-3.5">
              <div className="flex items-start justify-between gap-2 border-b border-amber-500/20 pb-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                      Form Penilaian Belum Ada (Wajib Dilengkapi)
                    </div>
                    <div className="text-[11px] text-ink-2 mt-0.5 leading-relaxed">
                      Karyawan belum memiliki form penilaian kontrak. Kirimkan tautan digital ke atasan langsung (proses cepat ±2-3 menit) atau lakukan input manual.
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                  Butuh Penilaian
                </span>
              </div>

              {sendLinkSuccess && (
                <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    {lastActionChannel === 'EMAIL' && <Mail size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    {lastActionChannel === 'WHATSAPP' && <MessageSquare size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    {lastActionChannel === 'COPY' && <Copy size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    <span>{sendLinkSuccess}</span>
                  </div>
                  {lastActionChannel === 'WHATSAPP' && lastWhatsAppUrl && (
                    <div className="pt-1">
                      <a
                        href={lastWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-[5px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        <span>Buka WhatsApp Sekarang &rarr;</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
              {sendLinkError && (
                <div className="rounded border border-expired/30 bg-expired/10 p-2.5 text-xs text-expired">
                  {sendLinkError}
                </div>
              )}

              {/* Section 1: Kirim Tautan Digital ke Atasan */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center justify-between">
                  <span>Opsi 1: Kirim Tautan Pengisian ke Atasan Langsung (Anti-Overdue)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-ink-2 block mb-1">
                      Pilih Atasan dari Daftar Karyawan:
                    </label>
                    <SearchableEmployeeSelect
                      employees={employees}
                      value={evaluatorForm.evaluatorEmployeeId}
                      excludeEmployeeId={selectedContract?.employeeId}
                      targetDepartment={selectedContract?.employee?.department}
                      placeholder="-- Cari atau Pilih Atasan / Supervisor --"
                      clearLabel="-- Batal Pilih (Isi Manual) --"
                      onSelect={handleSelectEvaluatorEmployee}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-ink-2 block mb-1">
                      Nama Atasan Penilai: <span className="text-expired">*</span>
                    </label>
                    <input
                      type="text"
                      value={evaluatorForm.evaluatorName}
                      onChange={(e) => setEvaluatorForm({ ...evaluatorForm, evaluatorName: e.target.value })}
                      placeholder="Contoh: Hendra Wijaya"
                      className="w-full rounded-[6px] border border-line bg-surface py-1.5 px-2.5 text-xs text-ink focus:border-accent focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-ink-2 block mb-1">
                      Jabatan Atasan:
                    </label>
                    <input
                      type="text"
                      value={evaluatorForm.evaluatorPosition}
                      onChange={(e) => setEvaluatorForm({ ...evaluatorForm, evaluatorPosition: e.target.value })}
                      placeholder="Contoh: Supervisor Tambang"
                      className="w-full rounded-[6px] border border-line bg-surface py-1.5 px-2.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-ink-2 block mb-1">
                      Email Atasan:
                    </label>
                    <input
                      type="email"
                      value={evaluatorForm.evaluatorEmail}
                      onChange={(e) => setEvaluatorForm({ ...evaluatorForm, evaluatorEmail: e.target.value })}
                      placeholder="atasan@bataramining.com"
                      className="w-full rounded-[6px] border border-line bg-surface py-1.5 px-2.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-ink-2 block mb-1">
                      No. WhatsApp Atasan:
                    </label>
                    <input
                      type="tel"
                      value={evaluatorForm.evaluatorPhone}
                      onChange={(e) => setEvaluatorForm({ ...evaluatorForm, evaluatorPhone: e.target.value })}
                      placeholder="08123456789"
                      className="w-full rounded-[6px] border border-line bg-surface py-1.5 px-2.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Buttons to Send / Copy */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSendEvaluationLink('EMAIL')}
                    disabled={sendingLink || !evaluatorForm.evaluatorName.trim()}
                    className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent hover:bg-accent/90 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Mail size={13} />
                    <span>{sendingLink && sendingChannel === 'EMAIL' ? 'Mengirim...' : 'Kirim via Email'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendEvaluationLink('WHATSAPP')}
                    disabled={sendingLink || !evaluatorForm.evaluatorName.trim()}
                    className="inline-flex items-center gap-1.5 rounded-[6px] border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <MessageSquare size={13} />
                    <span>{sendingLink && sendingChannel === 'WHATSAPP' ? 'Membuka...' : 'Kirim via WhatsApp'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendEvaluationLink('COPY')}
                    disabled={sendingLink || !evaluatorForm.evaluatorName.trim()}
                    className="inline-flex items-center gap-1.5 rounded-[6px] border border-line bg-surface hover:border-accent text-ink px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Copy size={13} />
                    <span>{sendingLink && sendingChannel === 'COPY' ? 'Membuat...' : (copiedLink ? 'Tersalin!' : 'Buat & Salin Tautan')}</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Fallback Input Manual oleh HR */}
              <div className="pt-3 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-[11px] text-ink-2">
                  <span className="font-semibold text-ink">Opsi 2:</span> Jaga-jaga berkas fisik sudah ada atau terjadi kesalahan atasan:
                </div>
                <Link
                  href="/evaluations"
                  target="_blank"
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors shadow-xs"
                >
                  <FileCheck2 size={13} />
                  <span>Input / Koreksi Manual di Sistem &rarr;</span>
                </Link>
              </div>
            </div>
          )}

          <Field label={t.contracts.decisionLabel} required>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                <RefreshCw size={16} className="text-accent shrink-0" />
                <span>{t.contracts.extendAction}</span>
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
                <Award size={16} className="text-active shrink-0" />
                <span>{t.contracts.convertAction}</span>
              </button>
              <button
                type="button"
                onClick={() => setExtendData({ ...extendData, actionType: 'SELESAI_KONTRAK' })}
                className={cn(
                  'flex items-center gap-2 rounded-[6px] border p-3 text-left text-xs font-bold transition-colors',
                  extendData.actionType === 'SELESAI_KONTRAK'
                    ? 'border-expired bg-expired/10 text-ink'
                    : 'border-line bg-base text-ink-2 hover:border-expired'
                )}
              >
                <UserX size={16} className="text-expired shrink-0" />
                <span>{t.contracts.resignAction}</span>
              </button>
            </div>
          </Field>

          {extendData.actionType === 'PERPANJANG_PKWT' ? (
            <>
              <Field label={t.contracts.newContractNo}>
                <Input
                  value={extendData.newContractNumber}
                  onChange={setExt('newContractNumber')}
                  placeholder={`${suggestedNewContractNumber} (Opsional)`}
                />
              </Field>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={t.contracts.newStart} required>
                    <Input
                      type="date"
                      value={extendData.newStartDate}
                      onChange={(e) => {
                        const start = e.target.value;
                        setExtendData((prev) => ({
                          ...prev,
                          newStartDate: start,
                          newEndDate: calculateContractEndDate(start, extendDurationMonths),
                        }));
                      }}
                      required
                    />
                  </Field>

                  <Field label={t.contracts.durationLabel} required>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExtendDurationMonths(6);
                          setExtendData((prev) => ({
                            ...prev,
                            newEndDate: calculateContractEndDate(prev.newStartDate, 6),
                          }));
                        }}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-2 px-3 rounded-[6px] text-xs font-bold border transition-colors',
                          extendDurationMonths === 6
                            ? 'bg-accent text-white border-accent shadow-xs'
                            : 'bg-surface border-line text-ink-2 hover:border-accent hover:text-ink'
                        )}
                      >
                        {extendDurationMonths === 6 && <Check size={14} />}
                        <span>{t.contracts.duration6}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setExtendDurationMonths(12);
                          setExtendData((prev) => ({
                            ...prev,
                            newEndDate: calculateContractEndDate(prev.newStartDate, 12),
                          }));
                        }}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-2 px-3 rounded-[6px] text-xs font-bold border transition-colors',
                          extendDurationMonths === 12
                            ? 'bg-accent text-white border-accent shadow-xs'
                            : 'bg-surface border-line text-ink-2 hover:border-accent hover:text-ink'
                        )}
                      >
                        {extendDurationMonths === 12 && <Check size={14} />}
                        <span>{t.contracts.duration12}</span>
                      </button>
                    </div>
                  </Field>
                </div>

                {/* Auto-calculated End Date Card */}
                <div className="rounded-[6px] border border-line bg-surface/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-2">
                      <span>{t.contracts.autoEndDate}</span>
                      {contractEvaluation?.recommendationDuration === extendDurationMonths && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold lowercase">
                          ({t.contracts.recDurationNotice})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Calendar size={15} className="text-accent shrink-0" />
                      <span className="text-sm font-bold text-ink">
                        {formatDate(extendData.newEndDate)}
                      </span>
                      <Badge tone="info" className="text-[10px]">
                        {extendDurationMonths} Bulan
                      </Badge>
                    </div>
                  </div>
                  <div className="text-[11px] text-ink-2">
                    {formatDate(extendData.newStartDate)} s/d {formatDate(extendData.newEndDate)}
                  </div>
                </div>
              </div>
            </>
          ) : extendData.actionType === 'ANGKAT_TETAP' ? (
            <div className="rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-ink">
              {t.contracts.convertNote}
            </div>
          ) : (
            <div className="rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-ink">
              {t.contracts.resignNote}
            </div>
          )}

          <Field label={t.contracts.evalNotes}>
            <Textarea
              value={extendData.notes}
              onChange={setExt('notes')}
              placeholder={contractEvaluation?.notes || "Catatan evaluasi atau tindak lanjut kontrak (opsional)..."}
            />
          </Field>

          {!evalLoading && (!contractEvaluation || contractEvaluation.status !== 'COMPLETED') && (
            <div className="flex items-center gap-2 rounded-[6px] border border-expired/30 bg-expired/10 p-2.5 text-xs text-expired font-medium">
              <Lock size={14} className="shrink-0" />
              <span>
                {contractEvaluation?.status === 'WAITING_EVALUATION'
                  ? `Tombol keputusan terkunci: Menunggu atasan (${contractEvaluation.evaluatorName || 'Atasan'}) menyelesaikan penilaian via link online, atau lakukan input manual di menu evaluasi.`
                  : `Tombol keputusan terkunci: Lengkapi form penilaian kontrak atas nama ${selectedContract?.employee?.name} terlebih dahulu.`}
              </span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowExtendModal(false)} className="w-full sm:w-auto">{t.common.cancel}</Button>
            <Button
              type="submit"
              variant={extendData.actionType === 'SELESAI_KONTRAK' ? 'danger' : 'accent'}
              disabled={evalLoading || !contractEvaluation || contractEvaluation.status !== 'COMPLETED' || isNotNewestContract}
              className="w-full sm:w-auto"
              title={
                isNotNewestContract
                  ? 'Hanya kontrak terbaru yang dapat ditindaklanjuti.'
                  : !contractEvaluation || contractEvaluation.status !== 'COMPLETED'
                  ? 'Tombol terkunci: Form penilaian kontrak karyawan belum selesai diisi.'
                  : undefined
              }
            >
              {evalLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Memeriksa...
                </>
              ) : !contractEvaluation || contractEvaluation.status !== 'COMPLETED' ? (
                <>
                  <Lock size={14} /> Terkunci (Butuh Penilaian)
                </>
              ) : extendData.actionType === 'SELESAI_KONTRAK' ? (
                <>
                  <UserX size={14} /> {t.contracts.resignAction}
                </>
              ) : extendData.actionType === 'ANGKAT_TETAP' ? (
                <>
                  <Award size={14} /> {t.contracts.process}
                </>
              ) : (
                <>
                  <FileText size={14} /> {t.contracts.process}
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Contract Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t.contracts.editTitle}
        subtitle={
          selectedContract?.employee
            ? `${selectedContract.employee.name} (${selectedContract.employee.nik}) · ${selectedContract.employee.department}`
            : (selectedContract?.contractNumber || '')
        }
      >
        {formError && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>}
        {formSuccess && <div className="mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active">{formSuccess}</div>}
        <form onSubmit={handleEditContract} className="space-y-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t.contracts.contractNoLabel}>
              <Input
                value={editData.contractNumber}
                onChange={setEdit('contractNumber')}
                placeholder="PKWT/2026/... (Opsional)"
              />
            </Field>
            <Field label={t.contracts.sequence} hint={t.contracts.sequenceHint}>
              <Input
                type="number"
                min={1}
                value={editData.sequence}
                onChange={(e) => setEditData({ ...editData, sequence: Math.max(1, Number(e.target.value) || 1) })}
              />
            </Field>
          </div>
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
          {editData.contractType === 'PKWT' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t.contracts.dateStartLabel} required>
                  <Input
                    type="date"
                    value={editData.startDate}
                    onChange={(e) => {
                      const start = e.target.value;
                      setEditData({
                        ...editData,
                        startDate: start,
                        endDate: calculateContractEndDate(start, editDurationMonths),
                      });
                    }}
                    required
                  />
                </Field>

                <Field label={t.contracts.durationLabel} required>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditDurationMonths(6);
                        setEditData((prev) => ({
                          ...prev,
                          endDate: calculateContractEndDate(prev.startDate, 6),
                        }));
                      }}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-2 px-3 rounded-[6px] text-xs font-bold border transition-colors',
                        editDurationMonths === 6
                          ? 'bg-accent text-white border-accent shadow-xs'
                          : 'bg-surface border-line text-ink-2 hover:border-accent hover:text-ink'
                      )}
                    >
                      {editDurationMonths === 6 && <Check size={14} />}
                      <span>{t.contracts.duration6}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditDurationMonths(12);
                        setEditData((prev) => ({
                          ...prev,
                          endDate: calculateContractEndDate(prev.startDate, 12),
                        }));
                      }}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-2 px-3 rounded-[6px] text-xs font-bold border transition-colors',
                        editDurationMonths === 12
                          ? 'bg-accent text-white border-accent shadow-xs'
                          : 'bg-surface border-line text-ink-2 hover:border-accent hover:text-ink'
                      )}
                    >
                      {editDurationMonths === 12 && <Check size={14} />}
                      <span>{t.contracts.duration12}</span>
                    </button>
                  </div>
                </Field>
              </div>

              {/* Auto-calculated End Date Card */}
              <div className="rounded-[6px] border border-line bg-surface/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-2">
                    {t.contracts.autoEndDate}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Calendar size={15} className="text-accent shrink-0" />
                    <span className="text-sm font-bold text-ink">
                      {formatDate(editData.endDate)}
                    </span>
                    <Badge tone="info" className="text-[10px]">
                      {editDurationMonths} Bulan
                    </Badge>
                  </div>
                </div>
                <div className="text-[11px] text-ink-2">
                  {formatDate(editData.startDate)} s/d {formatDate(editData.endDate)}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.contracts.dateStartLabel} required>
                <Input type="date" value={editData.startDate} onChange={setEdit('startDate')} required />
              </Field>
              <Field label={t.contracts.dateEndLabel} required>
                <Input type="date" value={editData.endDate} onChange={setEdit('endDate')} required />
              </Field>
            </div>
          )}
          <Field label={t.contracts.notesLabel}>
            <Textarea value={editData.notes} onChange={setEdit('notes')} placeholder={t.common.notes} />
          </Field>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)} className="w-full sm:w-auto">{t.common.cancel}</Button>
            <Button type="submit" variant="primary" className="w-full sm:w-auto">{t.common.save}</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Contract Modal */}
      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t.contracts.detailTitle}
        subtitle={`${t.contracts.contractNoLabel}: ${selectedContract?.contractNumber || '-'}`}
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
                <div className="text-sm font-semibold text-ink">
                  {selectedContract.contractType === 'PKWTT' || new Date(selectedContract.endDate).getFullYear() >= 2099 ? (
                    <span className="text-accent">Tetap</span>
                  ) : (
                    formatDate(selectedContract.endDate)
                  )}
                </div>
                {selectedContract.contractType !== 'PKWTT' && selectedContract.status === 'AKAN_BERAKHIR' && daysUntil(selectedContract.endDate) !== null && daysUntil(selectedContract.endDate)! <= 30 && (
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
          {t.contracts.deleteConfirm} {confirmDelete?.contractNumber || confirmDelete?.employee?.name || '-'}
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="w-full sm:w-auto">{t.common.cancel}</Button>
          <Button variant="danger" onClick={handleDeleteContract} className="w-full sm:w-auto">
            <Trash2 size={14} /> {t.common.delete}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
