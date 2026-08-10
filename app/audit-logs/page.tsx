'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import api from '../lib/api';
import { useUI } from '../context/UIContext';
import AppShell from '../components/AppShell';
import { Card, PageHeader, Badge, Input, Pagination } from '../components/ui';
import { formatDateTime } from '../lib/helpers';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { AuditLog } from '../lib/types';

const PAGE_SIZE = 10;

function actionTone(action: string): 'active' | 'expired' | 'warning' | 'info' | 'neutral' {
  const a = action.toUpperCase();
  if (a.includes('DELETE') || a.includes('REJECT') || a.includes('RESET')) return 'expired';
  if (a.includes('CREATE') || a.includes('APPROVE')) return 'active';
  if (a.includes('LOGIN') || a.includes('LOGOUT')) return 'info';
  if (a.includes('UPDATE')) return 'warning';
  return 'neutral';
}

export default function AuditLogsPage() {
  const { t } = useUI();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (debouncedSearch) params.append('search', debouncedSearch);
    params.append('page', String(page));
    params.append('limit', String(PAGE_SIZE));

    api
      .get(`/audit-logs?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to fetch audit logs:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch]);

  return (
    <AppShell>
      <PageHeader title={t.audit.title} subtitle={t.audit.subtitle} />

      <Card className="mb-4 p-3">
        <div className="relative w-full md:w-80">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t.audit.searchPlaceholder}
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th">{t.audit.user}</th>
                <th className="th">{t.audit.action}</th>
                <th className="th">{t.audit.entity}</th>
                <th className="th">{t.common.details}</th>
                <th className="th">{t.audit.ip}</th>
                <th className="th">{t.audit.timestamp}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={6}>{t.common.loading}</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="td py-10 text-center text-xs text-ink-2" colSpan={6}>{t.audit.noData}</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="trow">
                    <td className="td">
                      {log.user ? (
                        <div className="font-semibold text-ink">
                          {log.user.name}
                          <span className="ml-1.5 text-[10px] font-normal text-ink-2">
                            {t.role[log.user.role?.toLowerCase() as 'admin' | 'management' | 'user'] ?? log.user.role}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-2">-</span>
                      )}
                    </td>
                    <td className="td">
                      <Badge tone={actionTone(log.action)} className="font-mono">{log.action}</Badge>
                    </td>
                    <td className="td font-mono text-[11px] text-ink">{log.entity}</td>
                    <td className="td max-w-sm truncate text-xs">{log.details || '-'}</td>
                    <td className="td font-mono text-[11px] text-ink-2">{log.ipAddress || '-'}</td>
                    <td className="td text-xs">{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          previousLabel={t.common.previous}
          nextLabel={t.common.next}
          pageInfoLabel={t.common.pageInfo}
          pageOfLabel={t.common.pageOf}
        />
      </Card>
    </AppShell>
  );
}
