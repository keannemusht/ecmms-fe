'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const ROLE_GATED: Record<string, string[]> = {
  USER: ['/dashboard', '/employees', '/contracts', '/reports', '/users', '/audit-logs', '/notification-settings'],
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const role = user?.role;

  useEffect(() => {
    if (!isLoading && role === 'USER' && ROLE_GATED.USER.some((p) => pathname.startsWith(p))) {
      router.replace('/my-profile');
    }
  }, [isLoading, role, pathname, router]);

  return (
    <div className="flex h-screen overflow-hidden bg-base text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
