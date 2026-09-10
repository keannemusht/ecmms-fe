'use client';

import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import api from '../lib/api';
import { useUI } from '../context/UIContext';
import { useToast } from '../context/ToastContext';
import AppShell from '../components/AppShell';
import { Card, PageHeader, Button, Field, Select } from '../components/ui';
import { ReferenceItem } from '../lib/types';

export default function ReportsPage() {
  const { t } = useUI();
  const toast = useToast();
  const [departments, setDepartments] = useState<ReferenceItem[]>([]);
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data || [])).catch(() => {});
  }, []);

  const handleExport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (department) params.append('department', department);
      if (employmentType) params.append('employmentType', employmentType);
      if (status) params.append('status', status);

      const response = await api.get(`/reports/contracts/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Kontrak_PKWT_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t.reports.exported);
    } catch {
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title={t.reports.title} subtitle={t.reports.subtitle} />

      <Card className="max-w-2xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-accent-soft text-accent">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">{t.reports.exportXlsx}</h3>
            <p className="text-xs text-ink-2">{t.reports.subtitle}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label={t.reports.filterDept}>
            <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">{t.common.allDepartment}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t.reports.filterType}>
              <Select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                <option value="">{t.common.allType}</option>
                <option value="PKWT">{t.employmentType.PKWT}</option>
                <option value="PKWTT">{t.employmentType.PKWTT}</option>
                <option value="MAGANG">{t.employmentType.MAGANG}</option>
              </Select>
            </Field>
            <Field label={t.reports.filterStatus}>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">{t.common.allStatus}</option>
                <option value="AKTIF">{t.status.aktif}</option>
                <option value="AKAN_BERAKHIR">{t.status.akanBerakhir}</option>
                <option value="EXPIRED">{t.status.expired}</option>
                <option value="RESIGN">{t.status.resign}</option>
              </Select>
            </Field>
          </div>

          <Button onClick={handleExport} disabled={loading} className="w-full" size="lg">
            <Download size={15} />
            {loading ? t.common.processing : t.reports.exportXlsx}
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
