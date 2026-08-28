'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-surface border border-line rounded-[10px]', className)} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <h1 className="font-heading text-lg font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export type BadgeTone = 'active' | 'warning' | 'expired' | 'info' | 'neutral';

export function Badge({
  tone = 'neutral',
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span className={cn('badge', `badge-${tone}`, className)} {...rest}>
      {children}
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button className={cn('btn', `btn-${variant}`, `btn-${size}`, className)} {...rest}>
      {children}
    </button>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn('input', className)} {...rest} />;
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn('input', className)} {...rest}>
        {children}
      </select>
    );
  }
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn('input', 'min-h-[72px]', className)} {...rest} />;
  }
);

export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-semibold text-ink">{label} {required && <span className="text-expired">*</span>}</label>
      {children}
      {hint && <p className="text-[11px] text-ink-2">{hint}</p>}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'active',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  tone?: BadgeTone;
}) {
  const colorMap: Record<BadgeTone, string> = {
    active: 'text-active',
    warning: 'text-warning',
    expired: 'text-expired',
    info: 'text-info',
    neutral: 'text-ink-2',
  };
  const bgMap: Record<BadgeTone, string> = {
    active: 'bg-active/10',
    warning: 'bg-warning/10',
    expired: 'bg-expired/10',
    info: 'bg-info/10',
    neutral: 'bg-muted',
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">{label}</p>
          <p className="mt-2 font-heading text-2xl sm:text-[26px] font-bold text-ink leading-none">{value}</p>
          {sub && <div className="mt-2 text-[11px] text-ink-2">{sub}</div>}
        </div>
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px]', colorMap[tone], bgMap[tone])}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
    </Card>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('w-full max-w-[calc(100%-1rem)] rounded-[10px] border border-line bg-surface shadow-2xl my-auto', sizeClass)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4">
          <div>
            <h3 className="font-heading text-base font-bold text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-ink-2">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-[6px] p-1 text-ink-2 hover:bg-muted hover:text-ink shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">{children}</div>
        {footer && <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-line px-4 py-3.5 sm:px-5 sm:py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-muted text-ink-2">
        <Icon size={20} />
      </div>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-ink-2">{description}</p>}
    </div>
  );
}

export function ProgressBar({ value, tone = 'active' }: { value: number; tone?: BadgeTone }) {
  const clamped = Math.max(0, Math.min(100, value));
  const barClass = {
    active: 'bg-active',
    warning: 'bg-warning',
    expired: 'bg-expired',
    info: 'bg-info',
    neutral: 'bg-ink-2',
  }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all duration-200', barClass)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center w-full">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold border',
                  state === 'done' && 'border-active bg-active text-white',
                  state === 'current' && 'border-accent bg-accent-soft text-ink',
                  state === 'todo' && 'border-line bg-surface text-ink-2'
                )}
              >
                {i + 1}
              </span>
              <span className={cn('hidden sm:block text-[11px] font-semibold', state === 'todo' ? 'text-ink-2' : 'text-ink')}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('mx-2 h-px flex-1', state === 'done' ? 'bg-active' : 'bg-line')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
  previousLabel,
  nextLabel,
  pageInfoLabel,
  pageOfLabel,
  pageSize = 10,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
  pageInfoLabel: string;
  pageOfLabel: string;
  pageSize?: number;
}) {
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const fmt = (s: string) =>
    s.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(total)).replace('{current}', String(page));

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  const pageBtn = (p: number, active: boolean) =>
    cn(
      'flex h-8 w-8 items-center justify-center rounded-[6px] border text-xs font-semibold transition-colors',
      active ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink-2 hover:bg-muted hover:text-ink'
    );

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row">
      <p className="text-xs text-ink-2">{fmt(pageInfoLabel)}</p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-[6px] border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {previousLabel}
        </button>
        {start > 1 && <span className="px-1 text-xs text-ink-2">…</span>}
        {pages.map((p) => (
          <button key={p} type="button" onClick={() => onPage(p)} className={pageBtn(p, p === page)} aria-label={fmt(pageOfLabel)}>
            {p}
          </button>
        ))}
        {end < totalPages && <span className="px-1 text-xs text-ink-2">…</span>}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-[6px] border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
