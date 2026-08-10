'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, Briefcase, Mail, Phone, Calendar, FileCheck, History, User } from 'lucide-react';
import api from '../../lib/api';
import { useUI } from '../../context/UIContext';
import AppShell from '../../components/AppShell';
import { Card, PageHeader, Badge, cn } from '../../components/ui';
import {
  formatDate,
  contractStatusTone,
  contractStatusKey,
  initials,
  avatarHue,
} from '../../lib/helpers';
import { Employee } from '../../lib/types';

const CHANGE_TYPES: Record<string, string> = {
  INITIAL_CREATION: 'initial',
  EXTEND_CONTRACT: 'extend',
  CONVERT_TO_PERMANENT: 'convert',
  UPLOAD_DOCUMENT: 'uploadDoc',
  UPDATE_DETAILS: 'update',
};

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { t } = useUI();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'profile' | 'history'>('profile');

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/employees/${id}`);
        setEmployee(res.data);
      } catch (err) {
        console.error('Failed to load employee detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24 text-xs text-ink-2">{t.common.loading}</div>
      </AppShell>
    );
  }

  if (!employee) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24 text-xs text-ink-2">{t.common.noData}</div>
      </AppShell>
    );
  }

  const activeContract = employee.contracts?.find((c) => c.status === 'AKTIF' || c.status === 'AKAN_BERAKHIR');

  return (
    <AppShell>
      <PageHeader
        title={employee.name}
        subtitle={`${t.employeeDetail.contractNo}: ${employee.nik}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/employees" className="btn btn-secondary btn-sm">
              <ArrowLeft size={14} /> {t.common.back}
            </Link>
          </div>
        }
      />

      {/* Profile header */}
      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-[10px] text-lg font-bold text-white"
              style={{ backgroundColor: `hsl(${avatarHue(employee.name)} 45% 45%)` }}
            >
              {initials(employee.name)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-ink">{employee.name}</h3>
                <Badge tone={employee.employmentType === 'PKWTT' ? 'active' : employee.employmentType === 'PKWT' ? 'info' : 'neutral'}>
                  {t.employmentType[employee.employmentType as 'PKWT'] ?? employee.employmentType}
                </Badge>
                {activeContract && (
                  <Badge tone={contractStatusTone(activeContract.status)}>
                    {t.status[contractStatusKey(activeContract.status) as 'aktif'] ?? activeContract.status}
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-2">
                <span className="flex items-center gap-1.5"><Building2 size={13} className="text-accent" /> {employee.department}</span>
                <span className="flex items-center gap-1.5"><Briefcase size={13} className="text-accent" /> {employee.position}</span>
                <span className="flex items-center gap-1.5"><Mail size={13} className="text-accent" /> {employee.email}</span>
                {employee.phone && (
                  <span className="flex items-center gap-1.5"><Phone size={13} className="text-accent" /> {employee.phone}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-[6px] border border-line bg-muted px-4 py-3">
            <Calendar size={15} className="text-accent" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">{t.employees.joinDate}</p>
              <p className="text-sm font-bold text-ink">{formatDate(employee.joinDate)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-line">
        {(
          [
            { key: 'profile', label: t.employeeDetail.tabs.profile },
            { key: 'history', label: t.employeeDetail.tabs.history },
          ] as const
        ).map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
              tab === tb.key ? 'border-accent text-ink' : 'border-transparent text-ink-2 hover:text-ink'
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
              <User size={15} className="text-accent" /> {t.employeeDetail.personal}
            </h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {[
                { k: t.employees.employeeId, v: employee.nik },
                { k: t.employees.name, v: employee.name },
                { k: t.employees.email, v: employee.email },
                { k: t.employees.phone, v: employee.phone || '-' },
                { k: t.employees.joinDate, v: formatDate(employee.joinDate) },
                { k: t.employees.contractType, v: t.employmentType[employee.employmentType as 'PKWT'] ?? employee.employmentType },
              ].map((row) => (
                <div key={row.k} className="border-b border-line pb-3 last:border-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">{row.k}</dt>
                  <dd className="mt-1 text-xs font-medium text-ink">{row.v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
              <FileCheck size={15} className="text-accent" /> {t.employeeDetail.contract}
            </h3>
            {activeContract ? (
              <div className="space-y-3">
                <div className="rounded-[6px] border border-line bg-muted p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-ink">{activeContract.contractNumber}</span>
                    <Badge tone={contractStatusTone(activeContract.status)}>
                      {t.status[contractStatusKey(activeContract.status) as 'aktif'] ?? activeContract.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-ink-2">{t.employeeDetail.startDate}</p>
                      <p className="font-semibold text-ink">{formatDate(activeContract.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-ink-2">{t.employeeDetail.endDate}</p>
                      <p className="font-semibold text-ink">{formatDate(activeContract.endDate)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-2">{t.employeeDetail.noActiveContract}</p>
            )}
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <Card className="p-5">
          <h3 className="mb-6 flex items-center gap-2 text-sm font-bold text-ink">
            <History size={15} className="text-accent" /> {t.employeeDetail.tabs.history}
          </h3>
          {!employee.contracts?.length ? (
            <p className="py-6 text-center text-xs text-ink-2">{t.employeeDetail.noHistory}</p>
          ) : (
            <div className="ml-4 space-y-6 border-l border-line pl-6">
              {employee.contracts.map((c) => (
                <div key={c.id} className="relative">
                  <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-accent bg-surface" />
                  <div className="rounded-[6px] border border-line bg-muted/50 p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileCheck size={15} className="text-accent" />
                        <h4 className="font-mono text-xs font-bold text-ink">{c.contractNumber}</h4>
                        <Badge tone={contractStatusTone(c.status)}>
                          {t.status[contractStatusKey(c.status) as 'aktif'] ?? c.status}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-ink-2">
                        {formatDate(c.startDate)} — {formatDate(c.endDate)}
                      </span>
                    </div>

                    {c.notes && (
                      <p className="mb-3 rounded-[6px] border border-line bg-surface p-2.5 text-xs text-ink-2">
                        <span className="font-semibold text-ink">{t.common.notes}:</span> {c.notes}
                      </p>
                    )}

                    {c.history && c.history.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                        {c.history.map((h) => {
                          const typeKey = CHANGE_TYPES[h.changeType];
                          return (
                            <div key={h.id} className="flex items-center justify-between gap-3 text-[11px]">
                              <span className="text-ink">
                                <span className="font-semibold">{typeKey ? t.employeeDetail[typeKey as 'initial'] : h.changeType}</span>
                                {h.changedBy?.name && (
                                  <span className="text-ink-2"> · {t.employeeDetail.changedBy}: {h.changedBy.name}</span>
                                )}
                              </span>
                              <span className="shrink-0 text-ink-2">{formatDate(h.createdAt)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </AppShell>
  );
}
