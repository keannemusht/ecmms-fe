'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Printer,
  Calendar,
  Building2,
  Briefcase,
  User,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../../lib/api';
import {
  EVALUATION_CATEGORIES,
  EVALUATOR_STATEMENTS,
  computeEvaluation,
} from '../../evaluations/evaluationCriteria';
import { BataraOfficialDocument } from '../../evaluations/page';
import { ContractEvaluation } from '../../lib/types';
import { formatDate } from '../../lib/helpers';
import { cn } from '../../components/ui';

export default function PublicEvaluationPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [previewScale, setPreviewScale] = useState<number>(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [evaluation, setEvaluation] = useState<ContractEvaluation | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [statements, setStatements] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });
  const [notes, setNotes] = useState('');
  const [evaluatorName, setEvaluatorName] = useState('');
  const [evaluatorPosition, setEvaluatorPosition] = useState('');

  // Fetch evaluation data by token
  useEffect(() => {
    if (!token) return;
    const fetchEvaluation = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/evaluations/public/${token}`);
        const data = res.data.evaluation;
        setEvaluation(data);
        setEvaluatorName(data.evaluatorName || '');
        setEvaluatorPosition(data.evaluatorPosition || '');
        setNotes(data.notes || '');

        if (data.status === 'COMPLETED') {
          setSuccess(true);
        }

        // Restore scores if existing
        if (data.scoresJson) {
          try {
            const parsed = JSON.parse(data.scoresJson);
            const numKeys: Record<number, number> = {};
            for (const [k, v] of Object.entries(parsed)) {
              numKeys[Number(k)] = Number(v);
            }
            setScores(numKeys);
          } catch {
            // ignore
          }
        }

        // Restore statements
        if (data.statementsJson) {
          try {
            const parsed = JSON.parse(data.statementsJson);
            const numKeys: Record<number, boolean> = {};
            for (const [k, v] of Object.entries(parsed)) {
              numKeys[Number(k)] = Boolean(v);
            }
            setStatements(numKeys);
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        console.error('Failed to load evaluation form:', err);
        const msg =
          err?.response?.data?.error ||
          'Tautan formulir evaluasi tidak valid atau telah kedaluwarsa. Silakan hubungi tim HRD.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluation();
  }, [token]);

  const isStaff = useMemo(() => {
    if (!evaluation?.employee?.level) return true;
    const lvl = evaluation.employee.level.toLowerCase();
    return lvl.includes('staff') || lvl.includes('supervisor') || lvl.includes('manager') || lvl.includes('leader');
  }, [evaluation]);

  // Compute live score
  const computedScore = useMemo(() => {
    return computeEvaluation(scores, isStaff);
  }, [scores, isStaff]);

  // Total required items
  const totalRequiredItems = useMemo(() => {
    let count = 0;
    for (const cat of EVALUATION_CATEGORIES) {
      if (cat.isStaffOnly && !isStaff) continue;
      for (const item of cat.items) {
        if (item.isStaffOnly && !isStaff) continue;
        count++;
      }
    }
    return count;
  }, [isStaff]);

  const answeredCount = useMemo(() => {
    let count = 0;
    for (const cat of EVALUATION_CATEGORIES) {
      if (cat.isStaffOnly && !isStaff) continue;
      for (const item of cat.items) {
        if (item.isStaffOnly && !isStaff) continue;
        if (scores[item.id] && scores[item.id] > 0) count++;
      }
    }
    return count;
  }, [scores, isStaff]);

  const isAllAnswered = answeredCount >= totalRequiredItems;

  const handleScoreChange = (itemId: number, val: number) => {
    setScores((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  const setAllDefaultScores = (val: number) => {
    const next: Record<number, number> = { ...scores };
    for (const cat of EVALUATION_CATEGORIES) {
      if (cat.isStaffOnly && !isStaff) continue;
      for (const item of cat.items) {
        if (item.isStaffOnly && !isStaff) continue;
        next[item.id] = val;
      }
    }
    setScores(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllAnswered) {
      setError(`Harap lengkapi semua penilaian (${answeredCount} dari ${totalRequiredItems} butir telah diisi).`);
      return;
    }
    if (!evaluatorName.trim()) {
      setError('Nama atasan penilai wajib diisi.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post(`/evaluations/public/${token}/submit`, {
        scores,
        statements,
        evaluatorName,
        evaluatorPosition,
        notes,
      });

      setEvaluation(res.data.evaluation);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Failed to submit evaluation:', err);
      setError(err?.response?.data?.error || 'Gagal menyimpan penilaian. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-4 text-ink">
        <Loader2 size={36} className="animate-spin text-accent mb-3" />
        <p className="text-sm font-medium text-ink-2">Memuat formulir evaluasi kontrak PT Batara Dharma Persada...</p>
      </div>
    );
  }

  if (error && !evaluation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-4 text-ink">
        <div className="max-w-md w-full bg-base border border-line rounded-xl p-6 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-expired/10 text-expired flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-base font-bold text-ink mb-1">Tautan Tidak Dapat Diakses</h2>
          <p className="text-xs text-ink-2 mb-5 leading-relaxed">{error}</p>
          <div className="text-[11px] text-ink-2 border-t border-line pt-3">
            Jika ini adalah kesalahan, hubungi Departemen HRGA PT Batara Dharma Persada untuk meminta tautan baru.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-ink antialiased">
      {/* Universal A4 Print Stylesheet */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 4mm 6mm 4mm 6mm;
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
            /* Sembunyikan seluruh UI web normal & header */
            body > * {
              display: none !important;
            }
            /* Tampilkan HANYA portal cetak Batara di root body */
            #batara-print-portal-root {
              display: block !important;
              visibility: visible !important;
              position: static !important;
              width: 100% !important;
              max-width: 100% !important;
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
        `,
      }} />

      {/* TOP HEADER */}
      <header className="no-print border-b border-line bg-base sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/img/bbp_logo_202409_LeftAligment.png"
              alt="Logo PT Batara Dharma Persada"
              className="h-9 w-auto object-contain"
            />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-accent">
                PT BATARA DHARMA PERSADA
              </div>
              <div className="text-[11px] text-ink-2 hidden sm:block">
                Sistem Monitoring & Penilaian Evaluasi Kontrak PKWT
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* SUCCESS STATE */}
        {success && evaluation && (
          <div className="no-print mb-6 space-y-4">
            <div className="bg-white dark:bg-stone-900 border-2 border-emerald-600 dark:border-emerald-500 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h2 className="text-base font-extrabold text-stone-950 dark:text-white">
                    Penilaian Kinerja Berhasil Disimpan &amp; Tersinkronisasi!
                  </h2>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
                    Data penilaian untuk <strong className="text-stone-950 dark:text-white font-bold">{evaluation.employee?.name}</strong> telah tercatat di sistem HRIS.
                    Rekomendasi hasil penilaian:{' '}
                    <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-emerald-600 text-white text-xs shadow-xs ml-1">
                      {evaluation.recommendationType === 'PERPANJANG_PKWT' || evaluation.recommendationType === 'LANJUT_KONTRAK'
                        ? `Perpanjang PKWT (${evaluation.recommendationDuration || 12} Bulan)`
                        : evaluation.recommendationType === 'ANGKAT_PKWTT'
                        ? 'Pengangkatan Karyawan Tetap (PKWTT)'
                        : 'Selesai Kontrak (Tidak Diperpanjang)'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Box for Wet Ink Signatures */}
              <div className="mt-4 pt-3.5 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 dark:bg-stone-800/70 p-3.5 rounded-lg">
                <div className="text-xs text-stone-900 dark:text-stone-100">
                  <div className="font-bold text-stone-950 dark:text-white flex items-center gap-1.5 text-xs">
                    <span>📌 Langkah Selanjutnya (Sesuai SOP):</span>
                  </div>
                  <div className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5 font-normal">
                    Silakan cetak formulir resmi 1 lembar A4 ini untuk ditandatangani basah oleh Penilai, Manager, hingga Direktur.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="shrink-0 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold py-2.5 px-5 rounded-[6px] shadow-sm transition-all cursor-pointer"
                >
                  <Printer size={16} />
                  <span>🖨️ Cetak Dokumen Resmi (1 Lembar A4)</span>
                </button>
              </div>
            </div>

            {/* Document Preview Header with Zoom Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-b border-line pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Pratinjau Dokumen Cetak Sah PT Batara Dharma Persada:
                </h3>
                <span className="text-[11px] text-ink-2">Format 1:1 Baku Sesuai Fisik A4</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-ink-2">Perbesar Layar:</span>
                <div className="inline-flex rounded-[6px] border border-line bg-surface p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setPreviewScale(1)}
                    className={cn(
                      'px-2 py-0.5 rounded transition-colors cursor-pointer',
                      previewScale === 1 ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'
                    )}
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewScale(1.15)}
                    className={cn(
                      'px-2 py-0.5 rounded transition-colors cursor-pointer',
                      previewScale === 1.15 ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'
                    )}
                  >
                    115%
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewScale(1.3)}
                    className={cn(
                      'px-2 py-0.5 rounded transition-colors cursor-pointer',
                      previewScale === 1.3 ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'
                    )}
                  >
                    130%
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ON-SCREEN PREVIEW VIEWPORT (Scrollable jika di layar kecil, disembunyikan saat cetak) */}
        {success && evaluation && (
          <div className="no-print overflow-x-auto bg-stone-300/60 p-2 sm:p-5 rounded-[8px] flex justify-start sm:justify-center shadow-inner pb-8">
            <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}>
              <BataraOfficialDocument evaluation={evaluation} isPrint={false} lang="id" />
            </div>
          </div>
        )}

        {/* FORM INPUT SECTION (Shown when not yet completed) */}
        {!success && evaluation && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-[6px] border border-expired/30 bg-expired/10 p-3.5 text-xs text-expired flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Card Info Karyawan & Kontrak */}
            <div className="bg-base border border-line rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-accent" />
                  <h2 className="text-sm font-bold text-ink">Informasi Karyawan yang Dinilai</h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                  {evaluation.contract?.contractNumber ? `No: ${evaluation.contract.contractNumber}` : 'Kontrak PKWT'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-ink-2">Nama Karyawan</div>
                  <div className="font-bold text-ink mt-0.5 text-sm">{evaluation.employee?.name}</div>
                  <div className="text-[11px] text-ink-2 font-mono">NIK: {evaluation.employee?.nik}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-semibold text-ink-2">Departemen & Jabatan</div>
                  <div className="font-semibold text-ink mt-0.5">{evaluation.employee?.department}</div>
                  <div className="text-[11px] text-ink-2">{evaluation.employee?.position}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-semibold text-ink-2">Tanggal Bergabung</div>
                  <div className="font-semibold text-ink mt-0.5">{formatDate(evaluation.employee?.joinDate)}</div>
                  <div className="text-[11px] text-ink-2">Level: {evaluation.employee?.level || 'Non-Staff'}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-semibold text-ink-2">Periode Akhir Kontrak</div>
                  <div className="font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {formatDate(evaluation.contract?.endDate || evaluation.periodEnd)}
                  </div>
                  <div className="text-[11px] text-ink-2">Kontrak Ke-{evaluation.contract?.sequence || 1}</div>
                </div>
              </div>

              {/* Data Atasan Penilai */}
              <div className="border-t border-line pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink-2 block mb-1">
                    Nama Atasan Penilai <span className="text-expired">*</span>
                  </label>
                  <input
                    type="text"
                    value={evaluatorName}
                    onChange={(e) => setEvaluatorName(e.target.value)}
                    placeholder="Contoh: Hendra Wijaya"
                    className="w-full rounded-[6px] border border-line bg-surface py-2 px-3 text-xs text-ink placeholder:text-ink-2/40 focus:border-accent focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink-2 block mb-1">
                    Jabatan Atasan Penilai
                  </label>
                  <input
                    type="text"
                    value={evaluatorPosition}
                    onChange={(e) => setEvaluatorPosition(e.target.value)}
                    placeholder="Contoh: Supervisor Produksi"
                    className="w-full rounded-[6px] border border-line bg-surface py-2 px-3 text-xs text-ink placeholder:text-ink-2/40 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick Fill Toolbar */}
            <div className="bg-base border border-line rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-ink">Progress Penilaian:</span>
                <span className={cn('font-bold', isAllAnswered ? 'text-emerald-600' : 'text-amber-600')}>
                  {answeredCount} / {totalRequiredItems} Butir Diisi
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-ink-2 uppercase font-bold mr-1">Isi Cepat:</span>
                <button
                  type="button"
                  onClick={() => setAllDefaultScores(3)}
                  className="text-[11px] font-semibold py-1 px-2.5 rounded bg-surface border border-line hover:border-accent text-ink transition-colors"
                  title="Isi semua butir dengan nilai 3 (Baik)"
                >
                  Set Semua 3 (Baik)
                </button>
                <button
                  type="button"
                  onClick={() => setAllDefaultScores(4)}
                  className="text-[11px] font-semibold py-1 px-2.5 rounded bg-surface border border-line hover:border-accent text-ink transition-colors"
                  title="Isi semua butir dengan nilai 4 (Sangat Baik)"
                >
                  Set Semua 4 (Sangat Baik)
                </button>
              </div>
            </div>

            {/* Scale Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-base border border-line rounded-lg p-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 font-bold flex items-center justify-center text-xs shrink-0">1</span>
                <span>1 = Kurang</span>
              </div>
              <div className="bg-base border border-line rounded-lg p-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-xs shrink-0">2</span>
                <span>2 = Cukup</span>
              </div>
              <div className="bg-base border border-line rounded-lg p-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0">3</span>
                <span>3 = Baik</span>
              </div>
              <div className="bg-base border border-line rounded-lg p-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-xs shrink-0">4</span>
                <span>4 = Sangat Baik</span>
              </div>
            </div>

            {/* 29 QUESTIONS GROUPED BY CATEGORY */}
            <div className="space-y-4">
              {EVALUATION_CATEGORIES.map((category) => {
                if (category.isStaffOnly && !isStaff) return null;
                return (
                  <div key={category.code} className="bg-base border border-line rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-surface/80 border-b border-line px-4 py-2.5 flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                        {category.title}
                      </h3>
                      {category.isStaffOnly && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                          Khusus Staff
                        </span>
                      )}
                    </div>

                    <div className="divide-y divide-line">
                      {category.items.map((item) => {
                        if (item.isStaffOnly && !isStaff) return null;
                        const currentVal = scores[item.id] || 0;
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              'p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                              currentVal > 0 ? 'bg-base' : 'bg-surface/30'
                            )}
                          >
                            <div className="text-xs text-ink font-medium leading-relaxed pr-2">
                              <span className="font-bold text-accent mr-1.5">{item.id}.</span>
                              {item.label}
                            </div>

                            {/* 1-4 Rating Options */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {[1, 2, 3, 4].map((v) => {
                                const isSelected = currentVal === v;
                                return (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => handleScoreChange(item.id, v)}
                                    className={cn(
                                      'w-9 h-8 sm:w-10 sm:h-9 rounded-[6px] text-xs font-bold border transition-all flex items-center justify-center cursor-pointer',
                                      isSelected
                                        ? v === 4
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105'
                                          : v === 3
                                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs scale-105'
                                          : v === 2
                                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs scale-105'
                                          : 'bg-rose-600 text-white border-rose-600 shadow-xs scale-105'
                                        : 'bg-surface border-line text-ink-2 hover:border-accent hover:text-ink'
                                    )}
                                  >
                                    {v}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* STATEMENTS CHECKLIST (Pernyataan Penilai) */}
            <div className="bg-base border border-line rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink border-b border-line pb-2 flex items-center gap-2">
                <ShieldCheck size={16} className="text-accent" />
                <span>Pernyataan Komitmen Penilai</span>
              </h3>
              <div className="space-y-2.5 pt-1">
                {EVALUATOR_STATEMENTS.map((stmt) => (
                  <label key={stmt.id} className="flex items-start gap-2.5 text-xs text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(statements[stmt.id])}
                      onChange={(e) =>
                        setStatements((prev) => ({
                          ...prev,
                          [stmt.id]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-line text-accent focus:ring-accent"
                    />
                    <span className="leading-relaxed text-ink-2 font-medium">{stmt.text}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* CATATAN KHUSUS PENILAI */}
            <div className="bg-base border border-line rounded-xl p-4 sm:p-5 shadow-xs space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ink block">
                Catatan Khusus dari Penilai (Opsional):
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan evaluasi perilaku, pencapaian proyek, saran pengembangan karyawan, atau catatan penting lainnya..."
                className="w-full rounded-[6px] border border-line bg-surface p-3 text-xs text-ink placeholder:text-ink-2/40 focus:border-accent focus:outline-none"
              />
            </div>

            {/* LIVE SCORE & RECOMMENDATION SUMMARY CARD (STICKY OR PROMINENT) */}
            <div className="bg-base border-2 border-accent/40 rounded-xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-2">
                  Hasil Perhitungan Sementara (Otomatis)
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-xs text-ink-2">Rata-rata: </span>
                    <span className="text-base font-bold text-accent">
                      {computedScore.count > 0 ? computedScore.average.toFixed(2) : '0.00'} / 4.00
                    </span>
                  </div>
                  <span className="text-ink-2">&bull;</span>
                  <div>
                    <span className="text-xs text-ink-2">Predikat: </span>
                    <span className="text-xs font-bold text-ink">{computedScore.grade}</span>
                  </div>
                  <span className="text-ink-2">&bull;</span>
                  <div>
                    <span className="text-xs text-ink-2">Rekomendasi: </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {computedScore.recommendationType === 'LANJUT_KONTRAK'
                        ? `Lanjut Kontrak (${computedScore.recommendationDuration || 12} Bulan)`
                        : computedScore.recommendationType === 'SELESAI_KONTRAK'
                        ? 'Tidak Diperpanjang'
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !isAllAnswered}
                className={cn(
                  'py-3 px-6 rounded-[6px] text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0',
                  submitting || !isAllAnswered
                    ? 'bg-ink-2/30 cursor-not-allowed opacity-70'
                    : 'bg-accent hover:bg-accent/90 shadow-md hover:scale-[1.02]'
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Menyimpan Penilaian...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan & Kirim Penilaian</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Portal ke document.body khusus cetak printer / Save as PDF browser */}
      {mounted && evaluation && createPortal(
        <div id="batara-print-portal-root">
          <BataraOfficialDocument evaluation={evaluation} isPrint={true} lang="id" />
        </div>,
        document.body
      )}
    </div>
  );
}
