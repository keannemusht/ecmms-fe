'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  PieChart as PieIcon,
  ArrowUpRight,
  UserCheck,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AppShell from '../components/AppShell';
import { Card, StatCard, Badge, PageHeader, cn } from '../components/ui';
import { formatDate, daysUntil } from '../lib/helpers';
import { DashboardSummary, DashboardCharts, ChartDatum } from '../lib/types';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ContractRow {
  id: string;
  contractNumber: string;
  contractType: string;
  endDate: string;
  employee: {
    nik: string;
    name: string;
    department: string;
    position: string;
  };
}

const CHART_COLORS = ['#9C6B2E', '#2F6F5E', '#3A5C7A', '#B8862D', '#A33D3D', '#6b7280'];

const tooltipStyle = {
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  fontSize: '12px',
  color: 'var(--ink-primary)',
} as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useUI();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [expiringDays, setExpiringDays] = useState(30);
  const [expiringContracts, setExpiringContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, chartRes, expRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/charts'),
        api.get(`/dashboard/expiring-contracts?days=${expiringDays}`),
      ]);
      setSummary(sumRes.data);
      setCharts(chartRes.data);
      setExpiringContracts(expRes.data.contracts || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [expiringDays]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <AppShell>
      <PageHeader
        title={`${t.dashboard.welcome}, ${user?.name || ''}!`}
        subtitle={t.dashboard.subtitle}
        actions={
          <span className="rounded-[6px] border border-line bg-muted px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
            {t.role[((user?.role ?? 'USER') as string).toLowerCase() as 'admin' | 'management' | 'user']}
          </span>
        }
      />

      {/* Overdue alert */}
      {summary && summary.overdueCount > 0 && (
        <div className="mb-5 flex flex-col gap-3 rounded-[10px] border border-expired/30 bg-expired/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-expired/15 text-expired">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink">{t.dashboard.expiringTableTitle} · {t.dashboard.overdue}</h4>
              <p className="mt-0.5 text-[11px] text-ink-2">
                <span className="font-bold text-expired">{summary.overdueCount}</span> {t.dashboard.needsFollowUpSubtitle}
              </p>
            </div>
          </div>
          <Link href="/contracts?status=EXPIRED" className="btn btn-danger btn-sm shrink-0">
            {t.dashboard.followUpAction} <ArrowUpRight size={14} />
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          tone="info"
          label={t.dashboard.totalEmployees}
          value={loading ? '...' : summary?.employees?.total ?? 0}
          sub={
            <span>
              <strong className="text-info">{summary?.employees?.pkwt ?? 0}</strong> PKWT ·{' '}
              <strong className="text-active">{summary?.employees?.pkwtt ?? 0}</strong> PKWTT
            </span>
          }
        />
        <StatCard
          icon={CheckCircle2}
          tone="active"
          label={t.dashboard.activeContracts}
          value={loading ? '...' : summary?.contracts?.aktif ?? 0}
          sub={<span>{t.contracts.activeSummary}</span>}
        />
        <StatCard
          icon={Clock}
          tone="warning"
          label={t.dashboard.expiringSoon}
          value={loading ? '...' : summary?.contracts?.akanBerakhir ?? 0}
          sub={<span>{t.dashboard.needsFollowUp}</span>}
        />
        <StatCard
          icon={AlertTriangle}
          tone="expired"
          label={t.dashboard.pastDue}
          value={loading ? '...' : summary?.contracts?.expired ?? 0}
          sub={<span>{summary?.overdueCount ?? 0} {t.dashboard.overdue}</span>}
        />
      </div>

      {/* Charts */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-ink">{t.dashboard.departmentDistribution}</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.departmentData || []}>
                <XAxis dataKey="name" stroke="var(--ink-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--ink-secondary)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--bg-muted)' }} />
                <Bar dataKey="value" fill="#9C6B2E" radius={[4, 4, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <PieIcon size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-ink">{t.dashboard.distributionByType}</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.contractTypeData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {(charts?.contractTypeData || []).map((entry: ChartDatum, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {(charts?.contractTypeData || []).map((entry: ChartDatum, index: number) => (
              <span key={entry.name} className="flex items-center gap-1.5 text-[11px] text-ink-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                {entry.name} · {entry.value}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Expiring contracts */}
      <Card className="mb-5">
        <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Clock size={16} className="text-accent" />
              {t.dashboard.expiringTableTitle}
            </h3>
            <p className="mt-0.5 text-xs text-ink-2">{t.dashboard.expiringTableSubtitle}</p>
          </div>
          <div className="flex items-center gap-1 rounded-[6px] border border-line bg-muted p-1">
            {[7, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setExpiringDays(d)}
                className={cn(
                  'rounded-[4px] px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  expiringDays === d ? 'bg-accent text-white dark:text-ink' : 'text-ink-2 hover:text-ink'
                )}
              >
                {d} {t.dashboard.days}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th">{t.contracts.employee}</th>
                <th className="th">{t.common.details}</th>
                <th className="th">{t.contracts.contractNo}</th>
                <th className="th">{t.contracts.contractType}</th>
                <th className="th">{t.contracts.endDate}</th>
                <th className="th">{t.dashboard.daysRemaining}</th>
                <th className="th text-right">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={7}>
                    {t.common.loading}
                  </td>
                </tr>
              ) : expiringContracts.length === 0 ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={7}>
                    {t.dashboard.expiringTableEmpty}
                  </td>
                </tr>
              ) : (
                expiringContracts.map((c) => {
                  const diff = daysUntil(c.endDate);
                  const tone = diff !== null && diff <= 7 ? 'expired' : diff !== null && diff <= 30 ? 'warning' : 'active';
                  return (
                    <tr key={c.id} className="trow">
                      <td className="td">
                        <div className="font-semibold text-ink">{c.employee.name}</div>
                        <div className="font-mono text-[10px] text-ink-2">{c.employee.nik}</div>
                      </td>
                      <td className="td">
                        <div className="text-xs text-ink">{c.employee.department}</div>
                        <div className="text-[11px] text-ink-2">{c.employee.position}</div>
                      </td>
                      <td className="td font-mono text-[11px] text-ink">{c.contractNumber}</td>
                      <td className="td">
                        <Badge tone="info">{t.employmentType[c.contractType as 'PKWT'] ?? c.contractType}</Badge>
                      </td>
                      <td className="td text-xs">{formatDate(c.endDate)}</td>
                      <td className="td">
                        <Badge tone={tone}>
                          {diff === null ? '-' : diff <= 0 ? t.dashboard.overdue : `${diff} ${t.dashboard.days}`}
                        </Badge>
                      </td>
                      <td className="td text-right">
                        <Link href={`/contracts?extend=${c.id}`} className="btn btn-secondary btn-sm">
                          {t.contracts.extendAction}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Needs follow-up (overdue) */}
      <Card>
        <div className="border-b border-line p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <UserCheck size={16} className="text-expired" />
            {t.dashboard.needsFollowUp}
          </h3>
          <p className="mt-0.5 text-xs text-ink-2">{t.dashboard.needsFollowUpSubtitle}</p>
        </div>
        {!summary || summary.overdueList.length === 0 ? (
          <div className="p-10 text-center text-xs text-ink-2">{t.dashboard.expiringTableEmpty}</div>
        ) : (
          <div className="divide-y divide-line">
            {summary.overdueList.map((c) => {
              const diff = daysUntil(c.endDate);
              return (
                <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink">
                      {c.employee.name}
                      <span className="ml-2 font-mono text-[10px] font-normal text-ink-2">{c.employee.nik}</span>
                    </div>
                    <div className="text-[11px] text-ink-2">
                      {c.employee.department} · {formatDate(c.endDate)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="expired">
                      {diff === null ? '-' : `${Math.abs(diff)} ${t.dashboard.days} ${t.dashboard.overdue}`}
                    </Badge>
                    <Link href={`/contracts?extend=${c.id}`} className="btn btn-secondary btn-sm">
                      {t.dashboard.followUpAction}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
