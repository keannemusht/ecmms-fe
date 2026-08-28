'use client';

import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, XCircle, Clock, Send } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AppShell from '../components/AppShell';
import { Card, PageHeader, Badge, Button, Modal, Field, Select, Textarea, Stepper, cn } from '../components/ui';
import { formatDateTime, getApiError } from '../lib/helpers';
import { Submission } from '../lib/types';

const SUBMISSION_TYPES = ['EXTENSION', 'DATA_UPDATE', 'RESIGNATION', 'OTHER'];

function statusTone(status: string): 'active' | 'warning' | 'expired' | 'info' | 'neutral' {
  switch (status) {
    case 'DISETUJUI':
      return 'active';
    case 'DIPROSES':
      return 'info';
    case 'DITOLAK':
      return 'expired';
    default:
      return 'warning';
  }
}

function stepIndex(status: string): number {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'DIPROSES':
      return 1;
    default:
      return 2;
  }
}

export default function SubmissionsPage() {
  const { user } = useAuth();
  const { t } = useUI();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionType, setSubmissionType] = useState('EXTENSION');
  const [reason, setReason] = useState('');

  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [processStatus, setProcessStatus] = useState<'DISETUJUI' | 'DITOLAK' | 'DIPROSES'>('DISETUJUI');
  const [remarks, setRemarks] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/submissions');
      setSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      await api.post('/submissions', { submissionType, reason });
      setFormSuccess(t.submissions.successMsg);
      fetchSubmissions();
      setTimeout(() => {
        setShowSubmitModal(false);
        setReason('');
        setFormSuccess('');
      }, 1000);
    } catch (err) {
      setFormError(getApiError(err));
    }
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setFormError('');
    setFormSuccess('');
    try {
      await api.put(`/submissions/${selectedSub.id}/status`, { status: processStatus, remarks });
      setFormSuccess(t.common.success);
      fetchSubmissions();
      setTimeout(() => {
        setShowProcessModal(false);
        setFormSuccess('');
      }, 1000);
    } catch (err) {
      setFormError(getApiError(err));
    }
  };

  const openProcessModal = (sub: Submission) => {
    setSelectedSub(sub);
    setProcessStatus('DISETUJUI');
    setRemarks('');
    setShowProcessModal(true);
  };

  const isStaff = user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  return (
    <AppShell>
      <PageHeader
        title={t.submissions.title}
        subtitle={t.submissions.subtitle}
        actions={
          <Button variant="accent" onClick={() => setShowSubmitModal(true)} className="w-full sm:w-auto">
            <Plus size={15} /> {t.submissions.newSubmission}
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th">{t.submissions.employee}</th>
                <th className="th">{t.submissions.type}</th>
                <th className="th">{t.submissions.reason}</th>
                <th className="th">{t.submissions.date}</th>
                <th className="th">{t.submissions.status}</th>
                {isStaff && <th className="th text-right">{t.common.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={7}>{t.common.loading}</td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={7}>{t.submissions.noData}</td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub.id} className="trow">
                    <td className="td">
                      <div className="font-semibold text-ink">{sub.employee?.name}</div>
                      <div className="font-mono text-[10px] text-ink-2">{sub.employee?.nik}</div>
                    </td>
                    <td className="td">
                      <Badge tone="info">{t.submissionType[sub.submissionType as 'EXTENSION'] ?? sub.submissionType}</Badge>
                    </td>
                    <td className="td max-w-xs truncate text-xs">{sub.reason}</td>
                    <td className="td text-xs">{formatDateTime(sub.createdAt)}</td>
                    <td className="td">
                      <Badge tone={statusTone(sub.status)}>
                        {t.submissionStatus[sub.status as 'PENDING'] ?? sub.status}
                      </Badge>
                    </td>
                    {isStaff && (
                      <td className="td text-right">
                        <Button size="sm" variant="primary" onClick={() => openProcessModal(sub)}>
                          {t.submissions.process}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Submit Modal */}
      <Modal open={showSubmitModal} onClose={() => setShowSubmitModal(false)} title={t.submissions.newSubmission}>
        {formError && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>}
        {formSuccess && <div className="mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active">{formSuccess}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t.submissions.type} required>
            <Select value={submissionType} onChange={(e) => setSubmissionType(e.target.value)}>
              {SUBMISSION_TYPES.map((st) => (
                <option key={st} value={st}>{t.submissionType[st as 'EXTENSION']}</option>
              ))}
            </Select>
          </Field>
          <Field label={t.submissions.reason} required>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.submissions.reason}
              required
              className="min-h-[96px]"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowSubmitModal(false)}>{t.common.cancel}</Button>
            <Button type="submit" variant="accent">
              <Send size={14} /> {t.submissions.newSubmission}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Process Modal */}
      <Modal
        open={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        title={t.submissions.processTitle}
        subtitle={`${t.submissions.employee}: ${selectedSub?.employee?.name}`}
        size="lg"
      >
        {selectedSub && (
          <div className="mb-4">
            <Stepper steps={[t.submissions.steps.submit, t.submissions.steps.review, t.submissions.steps.decision]} current={stepIndex(selectedSub.status)} />
          </div>
        )}
        {formError && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>}
        {formSuccess && <div className="mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active">{formSuccess}</div>}
        <form onSubmit={handleProcess} className="space-y-4">
          <Field label={t.submissions.status} required>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'DISETUJUI', icon: CheckCircle2, activeCls: 'border-active bg-active/10 text-active' },
                  { key: 'DIPROSES', icon: Clock, activeCls: 'border-info bg-info/10 text-info' },
                  { key: 'DITOLAK', icon: XCircle, activeCls: 'border-expired bg-expired/10 text-expired' },
                ] as const
              ).map(({ key, icon: Icon, activeCls }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProcessStatus(key)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-[6px] border p-2.5 text-[11px] font-bold transition-colors',
                    processStatus === key ? activeCls : 'border-line bg-base text-ink-2 hover:border-accent'
                  )}
                >
                  <Icon size={16} />
                  {t.submissionStatus[key]}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t.common.remarks}>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={t.common.remarks} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowProcessModal(false)}>{t.common.cancel}</Button>
            <Button type="submit" variant="accent">{t.submissions.process}</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
