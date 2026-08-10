'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, CalendarClock, Send, AlertTriangle, BadgeCheck } from 'lucide-react';
import api from '../lib/api';
import { useUI } from '../context/UIContext';
import AppShell from '../components/AppShell';
import { Card, PageHeader, Badge, Button, Modal, Field, Textarea, ProgressBar, cn } from '../components/ui';
import { formatDate, daysUntil, initials, avatarHue, contractStatusTone, contractStatusKey, getApiError } from '../lib/helpers';
import { Employee } from '../lib/types';

export default function MyProfilePage() {
  const { t } = useUI();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const meRes = await api.get('/auth/me');
      const me = meRes.data;
      if (me.employeeId) {
        const empRes = await api.get(`/employees/${me.employeeId}`);
        setEmployee(empRes.data);
      } else {
        setEmployee(null);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      await api.post('/submissions', { submissionType: 'EXTENSION', reason });
      setFormSuccess(t.submissions.successMsg);
      setTimeout(() => {
        setShowModal(false);
        setReason('');
        setFormSuccess('');
      }, 1000);
    } catch (err) {
      setFormError(getApiError(err));
    }
  };

  const activeContract = employee?.contracts?.find((c) => c.status === 'AKTIF' || c.status === 'AKAN_BERAKHIR');

  const contractProgress = (() => {
    if (!activeContract) return null;
    const start = new Date(activeContract.startDate).getTime();
    const end = new Date(activeContract.endDate).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  })();

  const remaining = activeContract ? daysUntil(activeContract.endDate) : null;
  const progressTone = remaining !== null && remaining <= 7 ? 'expired' : remaining !== null && remaining <= 30 ? 'warning' : 'active';

  return (
    <AppShell>
      <PageHeader title={t.profile.title} subtitle={t.profile.subtitle} />

      {loading ? (
        <Card className="p-12 text-center text-xs text-ink-2">{t.common.loading}</Card>
      ) : !employee ? (
        <Card className="p-12 text-center text-xs text-ink-2">{t.profile.noActiveContract}</Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Personal info */}
          <Card className="p-5 lg:col-span-2">
            <div className="mb-5 flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-[10px] text-lg font-bold text-white"
                style={{ backgroundColor: `hsl(${avatarHue(employee.name)} 45% 45%)` }}
              >
                {initials(employee.name)}
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-ink">{employee.name}</h3>
                <p className="text-xs text-ink-2">{employee.position} · {employee.department}</p>
              </div>
              <Badge tone={employee.employmentType === 'PKWTT' ? 'active' : 'info'} className="ml-auto">
                {t.employmentType[employee.employmentType as 'PKWT'] ?? employee.employmentType}
              </Badge>
            </div>

            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
              <User size={15} className="text-accent" /> {t.profile.personal}
            </h4>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {[
                { k: t.employees.employeeId, v: employee.nik },
                { k: t.employees.email, v: employee.email },
                { k: t.employees.phone, v: employee.phone || '-' },
                { k: t.employees.department, v: employee.department },
                { k: t.employees.position, v: employee.position },
                { k: t.employees.joinDate, v: formatDate(employee.joinDate) },
              ].map((row) => (
                <div key={row.k} className="border-b border-line pb-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">{row.k}</dt>
                  <dd className="mt-1 text-xs font-medium text-ink">{row.v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Contract info */}
          <Card className="p-5">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
              <CalendarClock size={15} className="text-accent" /> {t.profile.contractInfo}
            </h4>

            {activeContract ? (
              <div className="space-y-4">
                <div className="rounded-[6px] border border-line bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-ink">{activeContract.contractNumber}</span>
                    <Badge tone={contractStatusTone(activeContract.status)}>
                      {t.status[contractStatusKey(activeContract.status) as 'aktif'] ?? activeContract.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-ink-2">{t.profile.startDate}</p>
                      <p className="font-semibold text-ink">{formatDate(activeContract.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-ink-2">{t.profile.endDate}</p>
                      <p className="font-semibold text-ink">{formatDate(activeContract.endDate)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-ink">{t.profile.progressLabel}</span>
                    <span className="font-mono font-bold text-ink">{contractProgress ?? 0}%</span>
                  </div>
                  <ProgressBar value={contractProgress ?? 0} tone={progressTone} />
                </div>

                <div className="flex items-center justify-between rounded-[6px] border border-line bg-muted/50 px-3 py-2.5">
                  <span className="text-[11px] text-ink-2">{t.profile.daysRemaining}</span>
                  <span className={cn('font-mono text-sm font-bold', remaining !== null && remaining <= 30 ? 'text-warning' : 'text-active')}>
                    {remaining === null ? '-' : remaining}
                  </span>
                </div>

                {remaining !== null && remaining <= 60 && (
                  <div
                    className={cn(
                      'flex items-start gap-2 rounded-[6px] border p-3 text-[11px]',
                      remaining <= 7 ? 'border-expired/30 bg-expired/10 text-expired' : 'border-warning/30 bg-warning/10 text-warning'
                    )}
                  >
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>{remaining <= 7 ? t.profile.overdue : t.profile.expiringSoon}</span>
                  </div>
                )}

                <Button variant="accent" className="w-full" onClick={() => setShowModal(true)}>
                  <Send size={14} /> {t.profile.requestRenewal}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <BadgeCheck size={24} className="text-active" />
                <p className="text-xs text-ink-2">{t.profile.noActiveContract}</p>
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t.profile.requestRenewal} subtitle={t.profile.renewalHint}>
        {formError && <div className="mb-4 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-xs text-expired">{formError}</div>}
        {formSuccess && <div className="mb-4 rounded-[6px] border border-active/30 bg-active/10 p-3 text-xs text-active">{formSuccess}</div>}
        <form onSubmit={handleRenewal} className="space-y-4">
          <Field label={t.profile.renewalReason} required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.profile.renewalReason} required className="min-h-[96px]" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>{t.common.cancel}</Button>
            <Button type="submit" variant="accent">
              <Send size={14} /> {t.profile.sendRequest}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
