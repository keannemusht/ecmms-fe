'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import { cn, Modal, Button } from '../components/ui';
import { useUI } from './UIContext';

export { toast };

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ToastContextType {
  success: (message: React.ReactNode, title?: string) => void;
  error: (message: React.ReactNode, title?: string) => void;
  info: (message: React.ReactNode, title?: string) => void;
  warning: (message: React.ReactNode, title?: string) => void;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_TITLES: Record<string, string> = {
  success: 'Berhasil',
  error: 'Gagal',
  warning: 'Peringatan',
  info: 'Informasi',
};

const TOAST_ICON: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: 'text-active', bg: 'bg-active/15' },
  error: { icon: XCircle, color: 'text-expired', bg: 'bg-expired/15' },
  info: { icon: Info, color: 'text-info', bg: 'bg-info/15' },
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/15' },
};

function ToastIconBadge({ type }: { type: string }) {
  const meta = TOAST_ICON[type] ?? TOAST_ICON.info;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
        meta.bg,
        meta.color
      )}
    >
      <Icon size={12} strokeWidth={2.6} />
    </span>
  );
}

function ToastBody({
  type,
  title,
  message,
}: {
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: React.ReactNode;
}) {
  const displayTitle = title || DEFAULT_TITLES[type];
  const hasDistinctMessage = message && message !== displayTitle;

  return (
    <div className="flex w-full flex-col min-w-0 pr-1 select-text">
      {/* Baris 1: Judul dengan icon di sebelah kanannya */}
      <div className="flex items-center gap-1.5 leading-none">
        <span className="font-bold text-[13.5px] text-ink">{displayTitle}</span>
        <ToastIconBadge type={type} />
      </div>

      {/* Baris 2: Pesan/Deskripsi rapi di baris baru */}
      {hasDistinctMessage && (
        <div className="text-[12px] font-normal leading-relaxed text-ink-2 mt-1">
          {message}
        </div>
      )}
    </div>
  );
}

export const notifyToast = {
  success: (message: React.ReactNode, title?: string) =>
    toast.success(<ToastBody type="success" title={title} message={message} />, { icon: false }),
  error: (message: React.ReactNode, title?: string) =>
    toast.error(<ToastBody type="error" title={title} message={message} />, { icon: false }),
  info: (message: React.ReactNode, title?: string) =>
    toast.info(<ToastBody type="info" title={title} message={message} />, { icon: false }),
  warning: (message: React.ReactNode, title?: string) =>
    toast.warning(<ToastBody type="warning" title={title} message={message} />, { icon: false }),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useUI();
  const [confirmState, setConfirmState] = useState<
    | (ConfirmOptions & {
        message: string;
        resolve: (value: boolean) => void;
      })
    | null
  >(null);

  const notify = useCallback((type: 'success' | 'error' | 'info' | 'warning', message: React.ReactNode, title?: string) => {
    notifyToast[type](message, title);
  }, []);

  const value: ToastContextType = {
    success: (message, title) => notify('success', message, title),
    error: (message, title) => notify('error', message, title),
    info: (message, title) => notify('info', message, title),
    warning: (message, title) => notify('warning', message, title),
    confirm: (message, options) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ message, ...options, resolve });
      }),
  };

  const closeConfirm = (result: boolean) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        position="bottom-right"
        autoClose={3500}
        newestOnTop
        closeOnClick
        pauseOnHover
        hideProgressBar={false}
      />

      <Modal
        open={Boolean(confirmState)}
        onClose={() => closeConfirm(false)}
        title={confirmState?.title ?? t.common.confirm}
        size="sm"
      >
        <p className="text-sm text-ink">{confirmState?.message}</p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => closeConfirm(false)}>
            {confirmState?.cancelLabel ?? t.common.cancel}
          </Button>
          <Button variant={confirmState?.danger ? 'danger' : 'accent'} onClick={() => closeConfirm(true)}>
            {confirmState?.confirmLabel ?? t.common.confirm}
          </Button>
        </div>
      </Modal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
