'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import { cn, Modal, Button } from '../components/ui';
import { useUI } from './UIContext';

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_CLASS =
  '!rounded-[10px] !border !bg-surface !p-3.5 !text-[13px] !font-medium !text-ink !shadow-2xl !cursor-default';

const TOAST_BORDER: Record<string, string> = {
  success: '!border-active/30',
  error: '!border-expired/30',
  info: '!border-info/30',
  warning: '!border-warning/30',
};

const TOAST_PROGRESS: Record<string, string> = {
  success: '!bg-active',
  error: '!bg-expired',
  info: '!bg-info',
  warning: '!bg-warning',
};

const TOAST_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  success: { icon: CheckCircle2, color: 'text-active' },
  error: { icon: XCircle, color: 'text-expired' },
  info: { icon: Info, color: 'text-info' },
  warning: { icon: AlertTriangle, color: 'text-warning' },
};

function ToastIcon({ type }: { type: string }) {
  const meta = TOAST_ICON[type] ?? TOAST_ICON.info;
  const Icon = meta.icon;
  return <Icon size={18} className={cn('mt-0.5 shrink-0', meta.color)} />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useUI();
  const [confirmState, setConfirmState] = useState<
    | (ConfirmOptions & {
        message: string;
        resolve: (value: boolean) => void;
      })
    | null
  >(null);

  const notify = useCallback((type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    toast[type](message, {
      icon: <ToastIcon type={type} />,
      className: cn(TOAST_CLASS, TOAST_BORDER[type]),
      progressClassName: TOAST_PROGRESS[type],
    });
  }, []);

  const value: ToastContextType = {
    success: (message) => notify('success', message),
    error: (message) => notify('error', message),
    info: (message) => notify('info', message),
    warning: (message) => notify('warning', message),
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
        toastClassName={cn(TOAST_CLASS)}
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
