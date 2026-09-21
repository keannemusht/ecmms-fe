'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  Printer,
  FileCheck2,
  Trash2,
  Pencil,
  X,
  ChevronsUpDown,
  Check,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import api from '../lib/api';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import {
  Card,
  PageHeader,
  Badge,
  Button,
  Modal,
  Field,
  Input,
  Pagination,
  cn,
} from '../components/ui';
import { formatDate, getApiError } from '../lib/helpers';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { Employee, ContractEvaluation } from '../lib/types';
import {
  EVALUATION_CATEGORIES,
  EVALUATOR_STATEMENTS,
  computeEvaluation,
  getLocalizedGrade,
} from './evaluationCriteria';

/**
 * Komponen form isian nama & jabatan pihak pengesahan dengan fitur dropdown pencarian karyawan
 * dan saran jabatan otomatis sesuai struktur organisasi.
 */
function ApprovalPersonPicker({
  label,
  roleTitle,
  nameValue,
  onNameChange,
  namePlaceholder,
  posValue,
  onPosChange,
  posPlaceholder,
  employees,
  preferredDepartment,
  defaultPosSuggestions = [],
  nameLabel = 'Nama',
  posLabel = 'Jabatan',
  searchPlaceholder = 'Cari nama, NIK, jabatan, dept...',
  sameDeptBadge = 'Dept.',
  otherEmployeesLabel = 'Karyawan Lainnya',
  noMatchingLabel = 'Tidak ada karyawan yang cocok.',
  dropdownTooltip = 'Pilih dari dropdown karyawan',
}: {
  label: string;
  roleTitle: string;
  nameValue: string;
  onNameChange: (val: string) => void;
  namePlaceholder: string;
  posValue: string;
  onPosChange: (val: string) => void;
  posPlaceholder: string;
  employees: Employee[];
  preferredDepartment?: string;
  defaultPosSuggestions?: string[];
  nameLabel?: string;
  posLabel?: string;
  searchPlaceholder?: string;
  sameDeptBadge?: string;
  otherEmployeesLabel?: string;
  noMatchingLabel?: string;
  dropdownTooltip?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.nik && e.nik.toLowerCase().includes(q)) ||
          (e.position && e.position.toLowerCase().includes(q)) ||
          (e.department && e.department.toLowerCase().includes(q))
      );
    }
    return list;
  }, [employees, search]);

  const { sameDept, otherDept } = useMemo(() => {
    if (!preferredDepartment) return { sameDept: [], otherDept: filteredEmployees };
    const same = filteredEmployees.filter(
      (e) => (e.department || '').toLowerCase() === preferredDepartment.toLowerCase()
    );
    const other = filteredEmployees.filter(
      (e) => (e.department || '').toLowerCase() !== preferredDepartment.toLowerCase()
    );
    return { sameDept: same, otherDept: other };
  }, [filteredEmployees, preferredDepartment]);

  const handleSelect = (emp: Employee) => {
    onNameChange(emp.name);
    if (emp.position) {
      onPosChange(emp.position);
    }
    setOpen(false);
  };

  const datalistId = `pos-list-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

  return (
    <div className="rounded-[6px] border border-line bg-surface/70 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-ink">{label}</span>
        <span className="text-[10px] text-ink-2 bg-muted px-2 py-0.5 rounded font-medium">
          {roleTitle}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Form isian Nama dengan dropdown popover */}
        <div ref={pickerRef} className="relative">
          <label className="text-[10px] font-semibold text-ink-2 block mb-1">{nameLabel}</label>
          <div className="relative">
            <input
              type="text"
              value={nameValue}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={namePlaceholder}
              className="w-full rounded-[6px] border border-line bg-surface py-2 pl-2.5 pr-7 text-xs text-ink placeholder:text-ink-2/40 focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setOpen(!open);
                setSearch('');
              }}
              title={dropdownTooltip}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-ink-2 hover:text-accent hover:bg-muted transition-colors"
            >
              <ChevronsUpDown size={13} />
            </button>
          </div>

          {open && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-[8px] border border-line bg-surface shadow-2xl">
              <div className="border-b border-line p-2">
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-[4px] border border-line bg-base py-1 px-2.5 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div className="max-h-52 overflow-y-auto p-1 divide-y divide-line/40">
                {preferredDepartment && sameDept.length > 0 && (
                  <div className="pb-1">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                      {sameDeptBadge} {preferredDepartment}
                    </div>
                    {sameDept.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleSelect(emp)}
                        className="flex w-full items-center justify-between rounded-[4px] px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-ink truncate">{emp.name}</div>
                          <div className="text-[10px] text-ink-2 font-mono truncate">
                            {emp.position} · {emp.department}
                          </div>
                        </div>
                        {nameValue === emp.name && <Check size={13} className="text-accent shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  {preferredDepartment && sameDept.length > 0 && otherDept.length > 0 && (
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-2 mt-1">
                      {otherEmployeesLabel}
                    </div>
                  )}
                  {otherDept.length === 0 && sameDept.length === 0 ? (
                    <div className="px-3 py-3 text-center text-xs text-ink-2">
                      {noMatchingLabel}
                    </div>
                  ) : (
                    otherDept.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleSelect(emp)}
                        className="flex w-full items-center justify-between rounded-[4px] px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-ink truncate">{emp.name}</div>
                          <div className="text-[10px] text-ink-2 font-mono truncate">
                            {emp.position} · {emp.department}
                          </div>
                        </div>
                        {nameValue === emp.name && <Check size={13} className="text-accent shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form isian Jabatan dengan autocomplete datalist */}
        <div>
          <label className="text-[10px] font-semibold text-ink-2 block mb-1">{posLabel}</label>
          <input
            type="text"
            list={datalistId}
            value={posValue}
            onChange={(e) => onPosChange(e.target.value)}
            placeholder={posPlaceholder}
            className="w-full rounded-[6px] border border-line bg-surface py-2 px-2.5 text-xs text-ink placeholder:text-ink-2/40 focus:border-accent focus:outline-none"
          />
          <datalist id={datalistId}>
            {defaultPosSuggestions.map((pos) => (
              <option key={pos} value={pos} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}

/**
 * Komponen cetak & pratinjau resmi Form Penilaian Kontrak Karyawan PT Batara Dharma Persada
 * Format 1:1 sesuai template dokumen resmi (Image 2).
 */
export function BataraOfficialDocument({
  evaluation,
  isPrint = false,
  lang = 'id',
}: {
  evaluation: ContractEvaluation;
  isPrint?: boolean;
  lang?: string;
}) {
  const parsedScores: Record<string, number> = useMemo(() => {
    try {
      return JSON.parse(evaluation.scoresJson || '{}');
    } catch {
      return {};
    }
  }, [evaluation.scoresJson]);

  const parsedStatements: Record<string, boolean> = useMemo(() => {
    try {
      return JSON.parse(evaluation.statementsJson || '{}');
    } catch {
      return {};
    }
  }, [evaluation.statementsJson]);

  const formatDocDate = (d: string | Date | null | undefined) => {
    if (!d) return '';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return '';
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yy = dt.getFullYear();
      return `${dd}/${mm}/${yy}`;
    } catch {
      return '';
    }
  };

  const physicalCategories = useMemo(() => [
    {
      code: 'A',
      title: 'A. PRESTASI KERJA',
      items: [
        { id: 1, label: '1. Kualitas Hasil Kerja' },
        { id: 2, label: '2. Keterampilan/Kemampuan' },
        { id: 3, label: '3. Efisiensi dan efektifitas' },
      ],
    },
    {
      code: 'B',
      title: 'B. TANGGUNG JAWAB',
      items: [
        { id: 4, label: '4. Terhadap tugas' },
        { id: 5, label: '5. Terhadap keberlangsungan perusahaan' },
        { id: 6, label: '6. Berani mengambil resiko' },
      ],
    },
    {
      code: 'C',
      title: 'C. KETAATAN',
      items: [
        { id: 7, label: '7. Mentaati ketentuan jam kerja' },
        { id: 8, label: '8. Disiplin' },
        { id: 9, label: '9. Menaati ketentuan Perusahaan' },
      ],
    },
    {
      code: 'D',
      title: 'D. DEDIKASI',
      items: [
        { id: 10, label: '10. Menggunakan wewenang jabatan dengan tanggungjawab' },
        { id: 11, label: '11. Memberikan hasil sesuai rencana kerja' },
        { id: 12, label: '12. Ikhlas melaksanakan pekerjaan' },
      ],
    },
    {
      code: 'E',
      title: 'E. KERJASAMA',
      items: [
        { id: 13, label: '13. Memahami hubungan kerja dengan departemen lain' },
        { id: 14, label: '14. Mampu bekerjasama dengan rekan kerja' },
        { id: 15, label: '15. Mampu menerima keputusan yang telah diambil' },
      ],
    },
    {
      code: 'F',
      title: 'F. KOMPETENSI KERJA',
      items: [
        { id: 16, label: '16. Inisiatif' },
        { id: 17, label: '17. Inovatif' },
        { id: 18, label: '18. Aktif dalam memberikan saran yang konstruktif' },
      ],
    },
    {
      code: 'G',
      title: 'G. KEPEMIMPINAN',
      items: [
        { id: 19, label: '19. Mampu mengambil keputusan' },
        { id: 20, label: '20. Tegas dan objektif' },
        { id: 21, label: '21. Mampu menentukan prioritas kerja' },
        { id: 22, label: '22. Mampu melakukan koordinasi dengan baik' },
      ],
    },
    {
      code: 'H',
      title: 'H. KEPEMIMPINAN (KHUSUS STAFF)',
      items: [
        { id: 23, label: '23. Mampu mengontrol kualitas bawahan' },
        { id: 24, label: '24. Mampu menjadi panutan bagi bawahan' },
        { id: 25, label: '25. Memahami kemampuan bawahan' },
        { id: 26, label: '26. Mampu memberikan motivasi dan pembinaan' },
      ],
    },
    {
      code: 'I',
      title: 'I. MORAL',
      items: [
        { id: 27, label: '27. Kejujuran' },
        { id: 28, label: '28. Kesopanan' },
        { id: 29, label: '29. Kesusilaan' },
      ],
    },
  ], []);

  // Recommendation checkbox states
  const recType = (evaluation.recommendationType || '').toUpperCase().trim();
  const recDuration = evaluation.recommendationDuration;

  const isKaryawanTetap =
    recType === 'KARYAWAN_TETAP' ||
    recType === 'ANGKAT_PKWTT' ||
    recType === 'TETAP';

  const isKontrak6 =
    (recType === 'LANJUT_KONTRAK' || recType === 'PERPANJANG_PKWT') &&
    recDuration === 6;

  const isKontrak12 =
    (recType === 'LANJUT_KONTRAK' || recType === 'PERPANJANG_PKWT') &&
    (recDuration === 12 || (!isKontrak6 && !isKaryawanTetap && recDuration !== 3));

  const isTidakDiperpanjang =
    recType === 'SELESAI_KONTRAK' ||
    recType === 'TIDAK_DIPERPANJANG' ||
    recType === 'HABIS_KONTRAK';

  return (
    <div
      className={cn(
        'bg-white text-black font-sans border-[1.5px] border-black text-[8.5px] leading-tight select-text',
        isPrint ? 'w-full' : 'w-[794px] min-w-[760px] shrink-0 shadow-2xl mx-auto'
      )}
      style={{ boxSizing: 'border-box' }}
    >
      {/* 1. HEADER (3 Kolom Sesuai Dokumen Fisik Resmi) */}
      <div className="grid grid-cols-12 border-b-[1.5px] border-black">
        {/* Kolom 1: Logo Batara & Nama PT */}
        <div className="col-span-3 border-r-[1.5px] border-black p-2.5 flex items-center justify-center text-center">
          <img
            src="/img/bbp_logo_202409_LeftAligment.png"
            alt="PT Batara Dharma Persada"
            className="h-12 max-h-12 w-auto max-w-[95%] object-contain mx-auto"
          />
        </div>

        {/* Kolom 2: Judul Dokumen & Nomor */}
        <div className="col-span-5 border-r-[1.5px] border-black p-2 flex flex-col items-center justify-center text-center">
          <div className="font-bold text-[12px] tracking-wider uppercase text-black">FORM PENILAIAN</div>
          <div className="font-bold text-[10.5px] tracking-wider uppercase text-black mt-0.5">KONTRAK KARYAWAN</div>
          <div className="text-[8px] font-semibold mt-2 text-black">
            NO : {evaluation.documentNumber ? (
              <span className="font-mono font-bold">{evaluation.documentNumber}</span>
            ) : (
              '____________________(di isi oleh HR)'
            )}
          </div>
        </div>

        {/* Kolom 3: Tabel Info Karyawan 7 Baris */}
        <div className="col-span-4 p-0 text-[8px] text-black">
          <table className="w-full table-fixed border-collapse h-full">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-[84px] pl-2 py-[2.5px] font-bold whitespace-nowrap text-left">Nama</td>
                <td className="w-[10px] py-[2.5px] font-bold text-center">:</td>
                <td className="pl-1 pr-2 py-[2.5px] font-bold uppercase truncate text-left">
                  {evaluation.employee?.name || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="pl-2 py-[2.5px] font-bold whitespace-nowrap text-left">NRP</td>
                <td className="py-[2.5px] font-bold text-center">:</td>
                <td className="pl-1 pr-2 py-[2.5px] font-bold font-mono text-left">
                  {evaluation.employee?.nik || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="pl-2 py-[2.5px] font-bold whitespace-nowrap text-left">Jabatan</td>
                <td className="py-[2.5px] font-bold text-center">:</td>
                <td className="pl-1 pr-2 py-[2.5px] font-bold uppercase truncate text-left">
                  {evaluation.employee?.position || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="pl-2 py-[2.5px] font-bold whitespace-nowrap text-left">Departemen</td>
                <td className="py-[2.5px] font-bold text-center">:</td>
                <td className="pl-1 pr-2 py-[2.5px] font-bold uppercase truncate text-left">
                  {evaluation.employee?.department || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="pl-2 py-[2.5px] font-bold whitespace-nowrap text-left">PKWT ke</td>
                <td className="py-[2.5px] font-bold text-center">:</td>
                <td className="pl-1 pr-2 py-[2.5px] font-bold font-mono text-left">
                  {evaluation.contract?.sequence ? String(evaluation.contract.sequence) : (evaluation.contract?.contractNumber ? evaluation.contract.contractNumber : '')}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="pl-2 py-[2.5px] font-bold whitespace-nowrap text-left">Tgl Awal PKWT</td>
                <td className="py-[2.5px] font-bold text-center">:</td>
                <td className="pl-1 pr-2 py-[2.5px] font-bold font-mono text-left">
                  {evaluation.contract?.startDate ? formatDocDate(evaluation.contract.startDate) : ''}
                </td>
              </tr>
              <tr>
                <td className="pl-2 py-[2.5px] font-bold whitespace-nowrap text-left">Tgl Akhir PKWT</td>
                <td className="py-[2.5px] font-bold text-center">:</td>
                <td className="pl-1 pr-2 py-[2.5px] font-bold font-mono text-left">
                  {evaluation.contract?.endDate ? formatDocDate(evaluation.contract.endDate) : (evaluation.periodEnd ? formatDocDate(evaluation.periodEnd) : '')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. MOHON PERHATIAN! BANNER */}
      <div className="border-b-[1.5px] border-black py-1 px-3 text-center text-[8.5px] font-bold uppercase tracking-wide bg-white">
        <div>MOHON PERHATIAN!</div>
        <div className="font-normal text-[7.5px] normal-case mt-0.5">
          Silahkan melakukan penilaian terhadap bawahan Saudara secara objektif
        </div>
      </div>

      {/* 3. MAIN CONTENT: 2 KOLOM (KIRI 6, KANAN 6) */}
      <div className="grid grid-cols-12 border-b-[1.5px] border-black">
        {/* KOLOM KIRI: Unsur Penilaian 1 - 29 + Nilai Total */}
        <div className="col-span-6 border-r-[1.5px] border-black">
          <table className="w-full border-collapse text-[8px] text-black">
            <thead>
              <tr className="border-b border-black">
                <th className="border-r border-black px-2.5 py-1 text-center font-bold uppercase">
                  UNSUR PENILAIAN
                </th>
                <th className="w-12 px-1 py-1 text-center font-bold uppercase">
                  NILAI
                </th>
              </tr>
            </thead>
            <tbody>
              {physicalCategories.map((cat) => (
                <React.Fragment key={cat.code}>
                  <tr className="border-b border-black font-bold">
                    <td colSpan={2} className="px-2.5 py-[2px] text-[7.5px] uppercase">
                      {cat.title}
                    </td>
                  </tr>
                  {cat.items.map((item) => (
                    <tr key={item.id} className="border-b border-black">
                      <td className="border-r border-black px-2.5 py-[2px] leading-tight">
                        {item.label}
                      </td>
                      <td className="text-center font-bold font-mono px-1 py-[2px]">
                        {parsedScores[item.id] !== undefined ? parsedScores[item.id] : ''}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr className="font-bold">
                <td className="border-r border-black px-2.5 py-1 text-center uppercase tracking-wider font-bold">
                  NILAI TOTAL
                </td>
                <td className="text-center font-mono text-[9px] px-1 py-1 font-bold">
                  {evaluation.totalScore || ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* KOLOM KANAN: Pernyataan, Parameter & Rata-rata, Rumus, Rekomendasi */}
        <div className="col-span-6 p-2.5 flex flex-col justify-between space-y-2.5">
          {/* Box 1: Pernyataan Dari Penilai */}
          <div className="border-[1.5px] border-black">
            <table className="w-full border-collapse text-[8px] text-black">
              <thead>
                <tr className="border-b-[1.5px] border-black">
                  <th className="border-r-[1.5px] border-black px-2.5 py-1 text-center font-bold uppercase">
                    PERNYATAAN DARI PENILAI
                  </th>
                  <th className="w-20 px-1 py-1 text-center font-bold uppercase">
                    YA/TIDAK*
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black">
                  <td className="border-r border-black px-2.5 py-1 leading-snug">
                    Saya sudah berusaha secara maksimal untuk memberikan petunjuk dan pembinaan
                  </td>
                  <td className="text-center font-bold px-1 py-1">
                    {parsedStatements[1] === false ? 'TIDAK' : parsedStatements[1] === true ? 'YA' : 'YA / TIDAK*'}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border-r border-black px-2.5 py-1 leading-snug">
                    Saya sudah berusaha melatih semaksimal mungkin agar Ybs mampu melakukan hal yang diharapkan
                  </td>
                  <td className="text-center font-bold px-1 py-1">
                    {parsedStatements[2] === false ? 'TIDAK' : parsedStatements[2] === true ? 'YA' : 'YA / TIDAK*'}
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-black px-2.5 py-1 leading-snug">
                    Saya sudah berusaha untuk menghindari kemunduran performansi bawahan saya
                  </td>
                  <td className="text-center font-bold px-1 py-1">
                    {parsedStatements[3] === false ? 'TIDAK' : parsedStatements[3] === true ? 'YA' : 'YA / TIDAK*'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Box 2: Keterangan Penilaian & Parameter */}
          <div className="border-[1.5px] border-black">
            <div className="border-b border-black py-1 text-center font-bold uppercase text-[8px] tracking-wide">
              KETERANGAN PENILAIAN
            </div>
            <div className="border-b border-black py-1 text-center font-bold uppercase text-[8px] tracking-wide">
              PARAMETER PENILAIAN
            </div>
            <table className="w-full border-collapse text-[8px] text-black">
              <tbody>
                <tr className="border-b border-black">
                  <td className="w-14 border-r border-black text-center font-bold py-1">1</td>
                  <td className="px-2.5 py-1 font-semibold">TIDAK MEMUASKAN</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="w-14 border-r border-black text-center font-bold py-1">2</td>
                  <td className="px-2.5 py-1 font-semibold">KURANG MEMUASKAN</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="w-14 border-r border-black text-center font-bold py-1">3</td>
                  <td className="px-2.5 py-1 font-semibold">CUKUP MEMUASKAN</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="w-14 border-r border-black text-center font-bold py-1">4</td>
                  <td className="px-2.5 py-1 font-semibold">MEMUASKAN</td>
                </tr>
              </tbody>
            </table>
            <div className="px-2.5 py-1.5 font-bold text-[8px] flex items-center gap-2">
              <span>Nilai Rata-rata :</span>
              <span className="font-mono text-[8.5px]">
                {evaluation.averageScore !== undefined && evaluation.averageScore !== null
                  ? Number(evaluation.averageScore).toFixed(2)
                  : ''}
              </span>
            </div>
          </div>

          {/* Box 3: Rumus (rata-rata) */}
          <div className="border-[1.5px] border-black p-2.5 text-[8px] font-bold text-black">
            <div className="flex items-center justify-between gap-2">
              <div className="shrink-0 font-bold">
                Rumus (rata-rata) :
              </div>
              <div className="flex-1 flex items-center justify-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="px-2 pb-0.5 text-center leading-tight">Jumlah Penilaian Prestasi Kerja</span>
                  <span className="w-full border-b border-black"></span>
                  <span className="px-2 pt-0.5 text-center leading-tight">Jumlah Unsur Penilaian</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pl-1 font-bold whitespace-nowrap">
                  <span>=</span>
                  <span>Hasil</span>
                </div>
              </div>
            </div>
          </div>

          {/* Box 4: Rekomendasi Penilaian (4 Checkboxes) */}
          <div className="flex flex-col gap-2.5 pt-1 pb-1">
            <div className="text-center font-bold text-[8.5px] tracking-wide mb-0.5">
              Rekomendasi Penilaian
            </div>
            <div className="space-y-2.5 px-4">
              {/* Karyawan Tetap */}
              <div className="flex items-center gap-3 text-[8px] font-bold">
                <div className="w-[18px] h-[18px] border-[1.5px] border-black flex items-center justify-center shrink-0">
                  {isKaryawanTetap && <span className="text-[12px] leading-none font-bold">✓</span>}
                </div>
                <span>Karyawan Tetap</span>
              </div>

              {/* Kontrak 6 Bulan */}
              <div className="flex items-center gap-3 text-[8px] font-bold">
                <div className="w-[18px] h-[18px] border-[1.5px] border-black flex items-center justify-center shrink-0">
                  {isKontrak6 && <span className="text-[12px] leading-none font-bold">✓</span>}
                </div>
                <span>Kontrak 6 Bulan</span>
              </div>

              {/* Kontrak 12 Bulan */}
              <div className="flex items-center gap-3 text-[8px] font-bold">
                <div className="w-[18px] h-[18px] border-[1.5px] border-black flex items-center justify-center shrink-0">
                  {isKontrak12 && <span className="text-[12px] leading-none font-bold">✓</span>}
                </div>
                <span>Kontrak 12 Bulan</span>
              </div>

              {/* Tidak Diperpanjang */}
              <div className="flex items-center gap-3 text-[8px] font-bold">
                <div className="w-[18px] h-[18px] border-[1.5px] border-black flex items-center justify-center shrink-0">
                  {isTidakDiperpanjang && <span className="text-[12px] leading-none font-bold">✓</span>}
                </div>
                <span>Tidak Diperpanjang</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TANDA TANGAN (4 Kolom Sesuai Image 2) */}
      <div className="grid grid-cols-4 divide-x-[1.5px] divide-black border-b-[1.5px] border-black">
        {/* DINILAI OLEH */}
        <div>
          <div className="border-b border-black text-center font-bold py-1 uppercase text-[8px] whitespace-nowrap text-black">
            DINILAI OLEH
          </div>
          <table className="w-full border-collapse text-[8px] text-black">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">NAMA</td>
                <td className="px-2 py-[2px] font-semibold uppercase truncate">
                  {evaluation.evaluatorName || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">JABATAN</td>
                <td className="px-2 py-[2px] font-semibold uppercase truncate">
                  {evaluation.evaluatorPosition || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">TANGGAL</td>
                <td className="px-2 py-[2px] font-mono">
                  {evaluation.evaluationDate ? formatDocDate(evaluation.evaluationDate) : ''}
                </td>
              </tr>
              <tr>
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">TTD</td>
                <td className="px-2 py-[2px] h-10"></td>
              </tr>
            </tbody>
          </table>
          <div className="border-t border-black py-1 text-center text-[7px] font-normal whitespace-nowrap">
            Dinilai oleh Atasan Langsung
          </div>
        </div>

        {/* DIKETAHUI OLEH */}
        <div>
          <div className="border-b border-black text-center font-bold py-1 uppercase text-[8px] whitespace-nowrap text-black">
            DIKETAHUI OLEH
          </div>
          <table className="w-full border-collapse text-[8px] text-black">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">NAMA</td>
                <td className="px-2 py-[2px] font-semibold uppercase truncate">
                  {evaluation.knownByName || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">JABATAN</td>
                <td className="px-2 py-[2px] font-semibold uppercase truncate">
                  {evaluation.knownByPosition || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">TANGGAL</td>
                <td className="px-2 py-[2px] font-mono">
                  {evaluation.evaluationDate ? formatDocDate(evaluation.evaluationDate) : ''}
                </td>
              </tr>
              <tr>
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">TTD</td>
                <td className="px-2 py-[2px] h-10"></td>
              </tr>
            </tbody>
          </table>
          <div className="border-t border-black py-1 text-center text-[7px] font-normal">
            Diketahui oleh atasan penilai
          </div>
        </div>

        {/* DIPERIKSA OLEH */}
        <div>
          <div className="border-b border-black text-center font-bold py-1 uppercase text-[8px] whitespace-nowrap text-black">
            DIPERIKSA OLEH
          </div>
          <table className="w-full border-collapse text-[8px] text-black">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">NAMA</td>
                <td className="px-2 py-[2px] font-semibold uppercase truncate">
                  {evaluation.checkedByName || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">JABATAN</td>
                <td className="px-2 py-[2px] font-semibold uppercase truncate">
                  {evaluation.checkedByPosition || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">TANGGAL</td>
                <td className="px-2 py-[2px] font-mono">
                  {evaluation.submittedDate ? formatDocDate(evaluation.submittedDate) : (evaluation.evaluationDate ? formatDocDate(evaluation.evaluationDate) : '')}
                </td>
              </tr>
              <tr>
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">TTD</td>
                <td className="px-2 py-[2px] h-10"></td>
              </tr>
            </tbody>
          </table>
          <div className="border-t border-black py-1 text-center text-[7px] font-normal">
            Diperiksa oleh Dept. HRGA
          </div>
        </div>

        {/* DISETUJUI OLEH */}
        <div>
          <div className="border-b border-black text-center font-bold py-1 uppercase text-[8px] whitespace-nowrap text-black">
            DISETUJUI OLEH
          </div>
          <table className="w-full border-collapse text-[8px] text-black">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">NAMA</td>
                <td className="px-2 py-[2px] font-semibold uppercase truncate">
                  {evaluation.approvedByName || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">JABATAN</td>
                <td className="px-2 py-[2px] font-semibold uppercase truncate">
                  {evaluation.approvedByPosition || ''}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">TANGGAL</td>
                <td className="px-2 py-[2px] font-mono">
                  {evaluation.submittedDate ? formatDocDate(evaluation.submittedDate) : (evaluation.evaluationDate ? formatDocDate(evaluation.evaluationDate) : '')}
                </td>
              </tr>
              <tr>
                <td className="w-11 border-r border-black px-1.5 py-[2px] font-bold">TTD</td>
                <td className="px-2 py-[2px] h-10"></td>
              </tr>
            </tbody>
          </table>
          <div className="border-t border-black py-1 text-center text-[6.8px] font-normal whitespace-nowrap px-0.5">
            Disetujui oleh PJO/Direksi
          </div>
        </div>
      </div>

      {/* 5. DILAKUKAN PENILAIAN & DISERAHKAN HRGA */}
      <div className="grid grid-cols-2 divide-x-[1.5px] divide-black border-b-[1.5px] border-black text-[7.5px] px-3 py-1.5">
        <div>
          Dilakukan penilaian pada tanggal : &nbsp;
          {evaluation.evaluationDate ? (
            <span className="font-bold underline">{formatDocDate(evaluation.evaluationDate)}</span>
          ) : (
            '________________________'
          )}
        </div>
        <div className="pl-3">
          Diserahkan HRGA pada tanggal : &nbsp;
          {evaluation.submittedDate ? (
            <span className="font-bold underline">{formatDocDate(evaluation.submittedDate)}</span>
          ) : (
            '________________________'
          )}
        </div>
      </div>

      {/* 6. CATATAN KHUSUS DARI PENILAI */}
      <div className="p-2 text-[8px]">
        <div className="font-bold uppercase">Catatan Khusus dari Penilai :</div>
        <div className="min-h-[48px] italic text-stone-800 mt-1 whitespace-pre-wrap leading-relaxed">
          {evaluation.notes || ''}
        </div>
      </div>
    </div>
  );
}

export default function EvaluationsPage() {
  const { t, lang } = useUI();
  const { user } = useAuth();
  const PAGE_SIZE = 10;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [evaluations, setEvaluations] = useState<ContractEvaluation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [pageMsg, setPageMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<ContractEvaluation | null>(null);
  const [viewingEvaluation, setViewingEvaluation] = useState<ContractEvaluation | null>(null);
  const [modalZoom, setModalZoom] = useState<'fit' | '100%' | '115%'>('fit');
  const [confirmDelete, setConfirmDelete] = useState<ContractEvaluation | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [statements, setStatements] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });
  const [evaluatorName, setEvaluatorName] = useState('');
  const [evaluatorPosition, setEvaluatorPosition] = useState('');
  const [knownByName, setKnownByName] = useState('');
  const [knownByPosition, setKnownByPosition] = useState('');
  const [checkedByName, setCheckedByName] = useState('');
  const [checkedByPosition, setCheckedByPosition] = useState('');
  const [approvedByName, setApprovedByName] = useState('');
  const [approvedByPosition, setApprovedByPosition] = useState('');
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Search Combobox State
  const [empComboboxOpen, setEmpComboboxOpen] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      const res = await api.get(`/evaluations?${params.toString()}`);
      setEvaluations(res.data?.evaluations || []);
    } catch (err) {
      setPageMsg({ type: 'error', text: getApiError(err) });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      const list = Array.isArray(res.data) ? res.data : res.data?.employees || [];
      setEmployees(list);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  useEffect(() => {
    fetchEvaluations();
    fetchEmployees();
  }, [fetchEvaluations]);

  // Close combobox on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setEmpComboboxOpen(false);
      }
    }
    if (empComboboxOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [empComboboxOpen]);

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  const latestContract = useMemo(() => {
    if (!selectedEmployee?.contracts || selectedEmployee.contracts.length === 0) return null;
    return [...selectedEmployee.contracts].sort((a, b) => b.sequence - a.sequence)[0];
  }, [selectedEmployee]);

  // Filtered employees for combobox
  const filteredEmployeesForSelect = useMemo(() => {
    if (!empSearch.trim()) return employees;
    const q = empSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.nik && e.nik.toLowerCase().includes(q)) ||
        (e.department && e.department.toLowerCase().includes(q))
    );
  }, [employees, empSearch]);

  // Live Score Computation
  const computedScore = useMemo(() => {
    return computeEvaluation(scores, isStaff);
  }, [scores, isStaff]);

  // Suggested document number format for placeholder and default
  const suggestedDocNumber = useMemo(() => {
    const now = new Date();
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return `${Math.floor(Math.random() * 900 + 100)}/BDP-HRGA-SITE/${romanMonths[now.getMonth()]}/${now.getFullYear()}`;
  }, [showModal]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingEvaluation(null);
    setSelectedEmployeeId('');
    setDocNumber('');
    setIsStaff(false);
    // Do not pre-fill scores or statements: leave clean for user to rate
    setScores({});
    setStatements({});
    setEvaluatorName('');
    setEvaluatorPosition('');
    setKnownByName('');
    setKnownByPosition('');
    setCheckedByName('');
    setCheckedByPosition('');
    setApprovedByName('');
    setApprovedByPosition('');
    setEvaluationDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setModalError('');
    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (ev: ContractEvaluation) => {
    setEditingEvaluation(ev);
    setSelectedEmployeeId(ev.employeeId);
    setDocNumber(ev.documentNumber || '');
    setIsStaff(ev.employeeLevel !== 'Worker' && ev.employeeLevel !== 'Non-Staff');
    try {
      const parsedScores = JSON.parse(ev.scoresJson || '{}');
      setScores(parsedScores);
    } catch {
      setScores({});
    }
    try {
      const parsedStatements = JSON.parse(ev.statementsJson || '{}');
      setStatements(parsedStatements);
    } catch {
      setStatements({ 1: true, 2: true, 3: true });
    }
    setEvaluatorName(ev.evaluatorName || '');
    setEvaluatorPosition(ev.evaluatorPosition || '');
    setKnownByName(ev.knownByName || '');
    setKnownByPosition(ev.knownByPosition || '');
    setCheckedByName(ev.checkedByName || '');
    setCheckedByPosition(ev.checkedByPosition || '');
    setApprovedByName(ev.approvedByName || '');
    setApprovedByPosition(ev.approvedByPosition || '');
    setEvaluationDate(ev.evaluationDate ? ev.evaluationDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setNotes(ev.notes || '');
    setModalError('');
    setShowModal(true);
  };

  // When an employee is selected in form
  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployeeId(emp.id);
    const lvl = (emp.level || '').toLowerCase().trim();
    const isWorker = lvl === 'worker' || lvl === 'non-staff';
    setIsStaff(!isWorker);
    setEmpComboboxOpen(false);
  };

  // Handle score change for an item
  const handleScoreChange = (itemId: number, val: number) => {
    setScores((prev) => ({ ...prev, [itemId]: val }));
  };

  // Handle statement YA/TIDAK change
  const handleStatementChange = (statementId: number, val: boolean) => {
    setStatements((prev) => ({ ...prev, [statementId]: val }));
  };

  // Submit evaluation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setModalError(t.evaluations.selectEmployeeRequired);
      return;
    }

    setSaving(true);
    setModalError('');

    try {
      const payload = {
        employeeId: selectedEmployeeId,
        contractId: latestContract?.id || null,
        documentNumber: docNumber.trim() || suggestedDocNumber,
        periodEnd: latestContract?.endDate || null,
        employeeLevel: selectedEmployee?.level || (isStaff ? 'Supervisor' : 'Worker'),
        scores,
        statements,
        evaluatorName,
        evaluatorPosition,
        knownByName,
        knownByPosition,
        checkedByName,
        checkedByPosition,
        approvedByName,
        approvedByPosition,
        evaluationDate,
        submittedDate: evaluationDate,
        notes,
        status: 'COMPLETED',
      };

      if (editingEvaluation) {
        await api.put(`/evaluations/${editingEvaluation.id}`, payload);
      } else {
        await api.post('/evaluations', payload);
      }

      setShowModal(false);
      setPageMsg({ type: 'success', text: t.evaluations.saveSuccess });
      fetchEvaluations();
    } catch (err) {
      setModalError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/evaluations/${confirmDelete.id}`);
      setConfirmDelete(null);
      setPageMsg({ type: 'success', text: t.evaluations.deleteSuccess });
      fetchEvaluations();
    } catch (err) {
      setPageMsg({ type: 'error', text: getApiError(err) });
      setConfirmDelete(null);
    }
  };

  // Filter evaluations in table (comprehensive general search)
  const filteredEvaluations = useMemo(() => {
    if (!debouncedSearch.trim()) return evaluations;
    const q = debouncedSearch.toLowerCase().trim();
    return evaluations.filter(
      (ev) =>
        (ev.documentNumber && ev.documentNumber.toLowerCase().includes(q)) ||
        (ev.employee?.name && ev.employee.name.toLowerCase().includes(q)) ||
        (ev.employee?.nik && ev.employee.nik.toLowerCase().includes(q)) ||
        (ev.employee?.department && ev.employee.department.toLowerCase().includes(q)) ||
        (ev.employee?.position && ev.employee.position.toLowerCase().includes(q)) ||
        (ev.contract?.contractNumber && ev.contract.contractNumber.toLowerCase().includes(q)) ||
        (ev.evaluatorName && ev.evaluatorName.toLowerCase().includes(q)) ||
        (ev.ratingGrade && ev.ratingGrade.toLowerCase().includes(q)) ||
        (ev.recommendationType && ev.recommendationType.toLowerCase().includes(q)) ||
        (ev.notes && ev.notes.toLowerCase().includes(q))
    );
  }, [evaluations, debouncedSearch]);

  return (
    <AppShell>
      <PageHeader
        title={t.evaluations.title}
        subtitle={t.evaluations.subtitle}
        actions={
          <Button variant="accent" onClick={openCreateModal}>
            <Plus size={15} /> {t.evaluations.newEvaluation}
          </Button>
        }
      />

      {pageMsg && (
        <div
          className={
            pageMsg.type === 'error'
              ? 'mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired'
              : 'mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active'
          }
        >
          {pageMsg.text}
        </div>
      )}

      {/* Filter Card */}
      <Card className="mb-4 p-3 sm:p-4">
        <div className="relative w-full sm:max-w-md">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'en'
                ? 'Search employee, NIK, position, dept, doc no., contract no...'
                : 'Cari nama karyawan, NIK, jabatan, departemen, no. dokumen, no. kontrak...'
            }
            className="pl-9 w-full"
          />
        </div>
      </Card>

      {/* Table Card */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table min-w-[720px]">
            <thead>
              <tr>
                <th className="th">{t.evaluations.docNo}</th>
                <th className="th">{t.evaluations.employee}</th>
                <th className="th">{t.evaluations.department}</th>
                <th className="th">{t.evaluations.contractEnd}</th>
                <th className="th">{t.evaluations.averageScore}</th>
                <th className="th">{t.evaluations.recommendation}</th>
                <th className="th">{t.evaluations.date}</th>
                <th className="th text-right">{t.evaluations.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="td py-10 text-center text-xs text-ink-2">
                    {t.common.loading}
                  </td>
                </tr>
              ) : filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="td py-10 text-center text-xs text-ink-2">
                    {t.evaluations.noData}
                  </td>
                </tr>
              ) : (
                filteredEvaluations
                  .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                  .map((ev) => (
                    <tr key={ev.id} className="trow">
                      <td className="td font-mono text-[11px] font-semibold text-ink">
                        {ev.documentNumber || '-'}
                      </td>
                      <td className="td">
                        <div className="font-semibold text-ink">{ev.employee?.name}</div>
                        <div className="text-[11px] text-ink-2 font-mono">
                          NRP: {ev.employee?.nik} · {ev.employee?.position}
                        </div>
                      </td>
                      <td className="td text-xs font-medium text-ink">{ev.employee?.department}</td>
                      <td className="td text-xs font-medium text-ink">
                        {ev.periodEnd ? formatDate(ev.periodEnd) : '-'}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-ink">
                            {ev.averageScore.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-ink-2 font-medium">
                            ({getLocalizedGrade(ev.ratingGrade, lang)})
                          </span>
                        </div>
                      </td>
                      <td className="td">
                        <Badge
                          tone={
                            ev.recommendationType === 'LANJUT_KONTRAK'
                              ? ev.recommendationDuration === 12
                                ? 'active'
                                : 'warning'
                              : 'expired'
                          }
                        >
                          {ev.recommendationType === 'LANJUT_KONTRAK'
                            ? (lang === 'en'
                                ? `Extend ${ev.recommendationDuration} Months`
                                : `Lanjut ${ev.recommendationDuration} Bulan`)
                            : t.evaluations.endContract}
                        </Badge>
                      </td>
                      <td className="td text-xs text-ink-2">
                        {ev.evaluationDate ? formatDate(ev.evaluationDate) : '-'}
                      </td>
                      <td className="td text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setViewingEvaluation(ev)}
                            title={lang === 'en' ? 'View / Print Evaluation Form' : 'Lihat / Cetak Form Penilaian'}
                          >
                            <Printer size={14} /> {lang === 'en' ? 'Print' : 'Cetak'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(ev)}
                            title={lang === 'en' ? 'Edit Evaluation' : 'Ubah Penilaian'}
                          >
                            <Pencil size={14} />
                          </Button>
                          {(user?.role === 'ADMIN' || user?.role === 'MANAGEMENT') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmDelete(ev)}
                              title={lang === 'en' ? 'Delete Evaluation' : 'Hapus Penilaian'}
                              className="text-expired hover:bg-expired/10 hover:text-expired"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
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
          totalPages={Math.ceil(filteredEvaluations.length / PAGE_SIZE)}
          total={filteredEvaluations.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          previousLabel={t.common.previous}
          nextLabel={t.common.next}
          pageInfoLabel={t.common.pageInfo}
          pageOfLabel={t.common.pageOf}
        />
      </Card>

      {/* Modal Buat Penilaian Baru */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingEvaluation ? t.evaluations.editTitle : t.evaluations.addTitle}
        subtitle={t.evaluations.formSubtitle}
        size="lg"
      >
        {modalError && (
          <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">
            {modalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Header Identitas Karyawan */}
          <div className="rounded-[8px] border border-line bg-muted/30 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
              1. {lang === 'en' ? 'Document & Employee Identity' : 'Identitas Dokumen & Karyawan'}
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t.evaluations.selectEmployee} required>
                <div ref={comboboxRef} className="relative w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setEmpComboboxOpen(!empComboboxOpen);
                      setEmpSearch('');
                    }}
                    className="flex h-10 w-full items-center justify-between rounded-[6px] border border-line bg-surface px-3 py-2 text-left text-xs transition-colors hover:border-accent"
                  >
                    {selectedEmployee ? (
                      <span className="truncate font-semibold text-ink">
                        {selectedEmployee.name} ({selectedEmployee.nik}) - {selectedEmployee.department}
                      </span>
                    ) : (
                      <span className="text-ink-2">{t.evaluations.selectEmployeePlaceholder}</span>
                    )}
                    <ChevronsUpDown size={14} className="shrink-0 text-ink-2" />
                  </button>

                  {empComboboxOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-[8px] border border-line bg-surface shadow-2xl">
                      <div className="border-b border-line p-2">
                        <input
                          type="text"
                          autoFocus
                          value={empSearch}
                          onChange={(e) => setEmpSearch(e.target.value)}
                          placeholder={t.evaluations.searchEmpPlaceholder}
                          className="w-full rounded-[4px] border border-line bg-base py-1.5 px-3 text-xs text-ink focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto p-1">
                        {filteredEmployeesForSelect.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => handleSelectEmployee(emp)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-[4px] px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted',
                              emp.id === selectedEmployeeId && 'bg-accent/10 font-semibold text-accent'
                            )}
                          >
                            <div>
                              <div className="font-semibold">{emp.name}</div>
                              <div className="text-[11px] text-ink-2 font-mono">
                                NRP: {emp.nik} · {emp.department} · {emp.position}
                              </div>
                            </div>
                            {emp.id === selectedEmployeeId && <Check size={14} className="text-accent" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              <Field label={t.evaluations.formDocNo}>
                <Input
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder={lang === 'en' ? `e.g. ${suggestedDocNumber}` : `Contoh: ${suggestedDocNumber}`}
                />
              </Field>
            </div>

            {selectedEmployee && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs border-t border-line">
                <div>
                  <span className="text-ink-2 text-[10px] block">{t.evaluations.nrp}:</span>
                  <span className="font-mono font-bold text-ink">{selectedEmployee.nik}</span>
                </div>
                <div>
                  <span className="text-ink-2 text-[10px] block">{t.evaluations.position}:</span>
                  <span className="font-semibold text-ink">{selectedEmployee.position}</span>
                </div>
                <div>
                  <span className="text-ink-2 text-[10px] block">{t.evaluations.department}:</span>
                  <span className="font-semibold text-ink">{selectedEmployee.department}</span>
                </div>
                <div>
                  <span className="text-ink-2 text-[10px] block">{t.evaluations.contractEnd}:</span>
                  <span className="font-semibold text-warning">
                    {latestContract ? formatDate(latestContract.endDate) : '-'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <label className="text-xs font-semibold text-ink flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStaff}
                  onChange={(e) => setIsStaff(e.target.checked)}
                  className="rounded border-line text-accent focus:ring-accent"
                />
                {t.evaluations.staffToggle}
              </label>
            </div>
          </div>

          {/* Sticky Summary Bar */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2.5 rounded-[8px] border border-accent/40 bg-accent/10 p-2.5 sm:p-3 shadow-md backdrop-blur">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-accent shrink-0" />
              <span className="text-xs font-bold text-ink">{t.evaluations.scoreSummary}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
              <div>
                {t.evaluations.totalScore}: <strong className="font-mono text-ink text-sm">{computedScore.total}</strong>
              </div>
              <div>
                {t.evaluations.averageScore}:{' '}
                <strong className="font-mono text-accent text-sm font-bold">
                  {computedScore.count > 0 ? computedScore.average.toFixed(2) : '-'}
                </strong>{' '}
                {computedScore.count > 0 && computedScore.grade !== '-' && (
                  <span className="text-[11px] text-ink-2">({getLocalizedGrade(computedScore.grade, lang)})</span>
                )}
              </div>
              <div>
                {t.evaluations.recommendation}:{' '}
                {computedScore.count > 0 && computedScore.recommendationType !== '-' ? (
                  <Badge
                    tone={
                      computedScore.recommendationType === 'LANJUT_KONTRAK'
                        ? computedScore.recommendationDuration === 12
                          ? 'active'
                          : 'warning'
                        : 'expired'
                    }
                  >
                    {computedScore.recommendationType === 'LANJUT_KONTRAK'
                      ? (lang === 'en'
                          ? `Extend ${computedScore.recommendationDuration} Months`
                          : `Perpanjang ${computedScore.recommendationDuration} Bulan`)
                      : t.evaluations.endContract}
                  </Badge>
                ) : (
                  <span className="text-xs text-ink-2 italic font-mono">{lang === 'en' ? 'Pending evaluation' : 'Belum dinilai'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Tabel Unsur Penilaian 29 Butir */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                {t.evaluations.evalCriteriaTitle}
              </h4>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {EVALUATION_CATEGORIES.map((cat) => {
                if (cat.isStaffOnly && !isStaff) return null;
                return (
                  <div key={cat.code} className="rounded-[6px] border border-line bg-surface overflow-hidden">
                    <div className="bg-muted/60 px-3 py-1.5 text-xs font-bold text-ink flex items-center justify-between">
                      <span>{lang === 'en' ? cat.titleEn : cat.title}</span>
                      {cat.isStaffOnly && (
                        <span className="text-[10px] uppercase font-bold text-info bg-info/10 px-1.5 py-0.5 rounded">
                          {lang === 'en' ? 'Staff Only' : 'Khusus Staff'}
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-line/60">
                      {cat.items.map((item) => {
                        const currentScore = scores[item.id];
                        return (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 text-xs hover:bg-muted/20 gap-2"
                          >
                            <span className="text-ink">
                              <span className="font-semibold text-ink-2 mr-1.5">{item.id}.</span>
                              {lang === 'en' ? item.labelEn : item.label}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              {[1, 2, 3, 4].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => handleScoreChange(item.id, v)}
                                  className={cn(
                                    'h-7 w-8 rounded text-xs font-bold transition-colors border',
                                    currentScore === v
                                      ? 'bg-accent text-white border-accent shadow-sm'
                                      : 'bg-base text-ink-2 border-line hover:border-accent'
                                  )}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pernyataan Penilai */}
          <div className="rounded-[8px] border border-line bg-muted/30 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
              {t.evaluations.evalStatementsTitle}
            </h4>
            <div className="space-y-2">
              {EVALUATOR_STATEMENTS.map((stmt) => {
                const val = statements[stmt.id];
                return (
                  <div
                    key={stmt.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/60 pb-2 text-xs"
                  >
                    <span className="text-ink">{lang === 'en' ? stmt.textEn : stmt.text}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStatementChange(stmt.id, true)}
                        className={cn(
                          'px-2.5 py-1 rounded text-[11px] font-bold border transition-colors',
                          val === true
                            ? 'bg-active text-white border-active'
                            : 'bg-base text-ink-2 border-line hover:border-active'
                        )}
                      >
                        {t.evaluations.yes}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatementChange(stmt.id, false)}
                        className={cn(
                          'px-2.5 py-1 rounded text-[11px] font-bold border transition-colors',
                          val === false
                            ? 'bg-expired text-white border-expired'
                            : 'bg-base text-ink-2 border-line hover:border-expired'
                        )}
                      >
                        {t.evaluations.no}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tanda Tangan / Identitas Pengesahan */}
          <div className="rounded-[8px] border border-line bg-muted/30 p-4 space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                {t.evaluations.evalSignatoriesTitle}
              </h4>
              <p className="text-[11px] text-ink-2 mt-0.5">
                {t.evaluations.evalSignatoriesHint}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ApprovalPersonPicker
                label={t.evaluations.evaluatorDirect}
                roleTitle={t.evaluations.evaluatorDirectRole}
                nameValue={evaluatorName}
                onNameChange={setEvaluatorName}
                namePlaceholder={t.evaluations.evaluatorDirectNamePlaceholder}
                posValue={evaluatorPosition}
                onPosChange={setEvaluatorPosition}
                posPlaceholder={t.evaluations.evaluatorDirectPosPlaceholder}
                employees={employees}
                preferredDepartment={selectedEmployee?.department}
                defaultPosSuggestions={['Group Leader', 'Foreman', 'Supervisor', 'Team Leader', 'Chief']}
                nameLabel={t.evaluations.nameLabel}
                posLabel={t.evaluations.positionLabel}
                searchPlaceholder={t.evaluations.searchDropdownPlaceholder}
                sameDeptBadge={t.evaluations.sameDeptBadge}
                otherEmployeesLabel={t.evaluations.otherEmployees}
                noMatchingLabel={t.evaluations.noMatchingEmployees}
                dropdownTooltip={t.evaluations.chooseEmployeeDropdown}
              />

              <ApprovalPersonPicker
                label={t.evaluations.knownBy}
                roleTitle={t.evaluations.knownByRole}
                nameValue={knownByName}
                onNameChange={setKnownByName}
                namePlaceholder={t.evaluations.knownByNamePlaceholder}
                posValue={knownByPosition}
                onPosChange={setKnownByPosition}
                posPlaceholder={t.evaluations.knownByPosPlaceholder}
                employees={employees}
                preferredDepartment={selectedEmployee?.department}
                defaultPosSuggestions={['Supervisor', 'Section Head', 'Superintendent', 'Manager']}
                nameLabel={t.evaluations.nameLabel}
                posLabel={t.evaluations.positionLabel}
                searchPlaceholder={t.evaluations.searchDropdownPlaceholder}
                sameDeptBadge={t.evaluations.sameDeptBadge}
                otherEmployeesLabel={t.evaluations.otherEmployees}
                noMatchingLabel={t.evaluations.noMatchingEmployees}
                dropdownTooltip={t.evaluations.chooseEmployeeDropdown}
              />

              <ApprovalPersonPicker
                label={t.evaluations.checkedBy}
                roleTitle={t.evaluations.checkedByRole}
                nameValue={checkedByName}
                onNameChange={setCheckedByName}
                namePlaceholder={t.evaluations.checkedByNamePlaceholder}
                posValue={checkedByPosition}
                onPosChange={setCheckedByPosition}
                posPlaceholder={t.evaluations.checkedByPosPlaceholder}
                employees={employees}
                preferredDepartment="HRGA"
                defaultPosSuggestions={['Spv HRGA', 'HRGA Section Head', 'HR Officer', 'HRGA Superintendent', 'Personnel Officer']}
                nameLabel={t.evaluations.nameLabel}
                posLabel={t.evaluations.positionLabel}
                searchPlaceholder={t.evaluations.searchDropdownPlaceholder}
                sameDeptBadge={t.evaluations.sameDeptBadge}
                otherEmployeesLabel={t.evaluations.otherEmployees}
                noMatchingLabel={t.evaluations.noMatchingEmployees}
                dropdownTooltip={t.evaluations.chooseEmployeeDropdown}
              />

              <ApprovalPersonPicker
                label={t.evaluations.approvedBy}
                roleTitle={t.evaluations.approvedByRole}
                nameValue={approvedByName}
                onNameChange={setApprovedByName}
                namePlaceholder={t.evaluations.approvedByNamePlaceholder}
                posValue={approvedByPosition}
                onPosChange={setApprovedByPosition}
                posPlaceholder={t.evaluations.approvedByPosPlaceholder}
                employees={employees}
                defaultPosSuggestions={['Project Manager', 'Deputy Project Manager', 'General Manager', 'KTT', 'Direktur Operasional', 'Direktur']}
                nameLabel={t.evaluations.nameLabel}
                posLabel={t.evaluations.positionLabel}
                searchPlaceholder={t.evaluations.searchDropdownPlaceholder}
                sameDeptBadge={t.evaluations.sameDeptBadge}
                otherEmployeesLabel={t.evaluations.otherEmployees}
                noMatchingLabel={t.evaluations.noMatchingEmployees}
                dropdownTooltip={t.evaluations.chooseEmployeeDropdown}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-line">
              <Field label={t.evaluations.evalDate}>
                <Input
                  type="date"
                  value={evaluationDate}
                  onChange={(e) => setEvaluationDate(e.target.value)}
                />
              </Field>
              <Field label={t.evaluations.evalNotes}>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.evaluations.evalNotesPlaceholder}
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={saving || !selectedEmployeeId || computedScore.count === 0}
              className="w-full sm:w-auto"
              title={
                !selectedEmployeeId
                  ? (lang === 'en' ? 'Select an employee first' : 'Pilih karyawan terlebih dahulu')
                  : computedScore.count === 0
                  ? (lang === 'en' ? 'Provide ratings for criteria first' : 'Beri nilai pada unsur penilaian terlebih dahulu')
                  : undefined
              }
            >
              <FileCheck2 size={14} /> {saving ? t.evaluations.savingBtn : t.evaluations.saveBtn}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal View & Cetak Format Resmi Batara */}
      {viewingEvaluation && (
        <Modal
          open={Boolean(viewingEvaluation)}
          onClose={() => setViewingEvaluation(null)}
          title={lang === 'en' ? 'Print Preview - Official Evaluation Form' : 'Pratinjau Dokumen - Form Penilaian Resmi'}
          subtitle={lang === 'en' ? 'Official PT Batara Dharma Persada contract evaluation print format' : 'Format resmi cetak form evaluasi kontrak PT Batara Dharma Persada'}
          size="xl"
        >
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-line pb-2.5">
            <div className="text-xs text-ink-2">
              {lang === 'en'
                ? 'Standard 1-Page A4 portrait layout. Click button to print or save as PDF.'
                : 'Format 1 lembar A4 portrait resmi. Klik tombol untuk cetak atau simpan sebagai PDF.'}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-surface-2 border border-line rounded-[6px] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setModalZoom('fit')}
                  className={cn(
                    'px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer',
                    modalZoom === 'fit' ? 'bg-white text-ink shadow-xs font-bold' : 'text-ink-2 hover:text-ink'
                  )}
                  title={lang === 'en' ? 'Fit to Screen' : 'Pas di Layar'}
                >
                  {lang === 'en' ? 'Fit' : 'Pas'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalZoom('100%')}
                  className={cn(
                    'px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer',
                    modalZoom === '100%' ? 'bg-white text-ink shadow-xs font-bold' : 'text-ink-2 hover:text-ink'
                  )}
                  title="100% Original"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setModalZoom('115%')}
                  className={cn(
                    'px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer',
                    modalZoom === '115%' ? 'bg-white text-ink shadow-xs font-bold' : 'text-ink-2 hover:text-ink'
                  )}
                  title={lang === 'en' ? 'Enlarge 115%' : 'Perbesar 115%'}
                >
                  115%
                </button>
              </div>

              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  window.print();
                }}
                className="shrink-0"
              >
                <Printer size={14} /> {lang === 'en' ? 'Print / Download PDF' : 'Cetak / Unduh PDF'}
              </Button>
            </div>
          </div>

          {/* Mobile scroll hint */}
          <div className="mb-2 sm:hidden flex items-center gap-1.5 text-[10.5px] text-ink-2 bg-muted/60 px-2.5 py-1.5 rounded-[6px]">
            <span>👉</span>
            <span>{lang === 'en' ? 'Swipe horizontally to inspect full A4 document' : 'Geser ke samping untuk melihat seluruh formulir A4'}</span>
          </div>

          {/* Scrollable on-screen preview viewport with centered A4 sheet */}
          <div className="max-h-[66vh] overflow-y-auto overflow-x-auto bg-stone-300/60 p-2 sm:p-5 rounded-[8px] flex justify-start sm:justify-center shadow-inner">
            <div
              style={{
                transform: modalZoom === 'fit' ? 'scale(0.82)' : modalZoom === '115%' ? 'scale(1.15)' : 'scale(1)',
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-in-out',
                marginBottom: modalZoom === 'fit' ? '-140px' : modalZoom === '115%' ? '140px' : '0px',
              }}
            >
              <BataraOfficialDocument evaluation={viewingEvaluation} isPrint={false} lang={lang} />
            </div>
          </div>
        </Modal>
      )}

      {/* Portal ke document.body khusus cetak printer / Save as PDF browser (bebas dari overflow modal) */}
      {mounted && viewingEvaluation && createPortal(
        <div id="batara-print-portal-root">
          <BataraOfficialDocument evaluation={viewingEvaluation} isPrint={true} lang={lang} />
        </div>,
        document.body
      )}

      {/* CSS Print Stylesheet Universal */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 5mm 7mm 5mm 7mm;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* Sembunyikan seluruh UI web normal & modal */
            body > * {
              display: none !important;
            }
            /* Tampilkan HANYA portal cetak Batara di root body */
            #batara-print-portal-root {
              display: block !important;
              visibility: visible !important;
              position: static !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-sizing: border-box !important;
              overflow: visible !important;
            }
            #batara-print-portal-root * {
              visibility: visible !important;
            }
          }
          @media screen {
            #batara-print-portal-root {
              display: none !important;
            }
          }
        `
      }} />

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={t.common.confirm}
        size="sm"
      >
        <p className="text-sm text-ink">
          {t.evaluations.deleteConfirmTitle} <strong>{confirmDelete?.employee?.name}</strong>?
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="w-full sm:w-auto">
            {t.common.cancel}
          </Button>
          <Button variant="danger" onClick={handleDelete} className="w-full sm:w-auto">
            <Trash2 size={14} /> {t.common.delete}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
