'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth, Role } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck2,
  Bell,
  SlidersHorizontal,
  BarChart3,
  UserCog,
  ScrollText,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  BriefcaseBusiness,
  X,
} from 'lucide-react';
import { cn } from './ui';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  roles: Role[];
  match: (p: string) => boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGEMENT'], match: (p) => p === '/dashboard' },
  { href: '/employees', labelKey: 'employees', icon: Users, roles: ['ADMIN', 'MANAGEMENT'], match: (p) => p.startsWith('/employees') },
  { href: '/contracts', labelKey: 'contracts', icon: FileText, roles: ['ADMIN', 'MANAGEMENT'], match: (p) => p.startsWith('/contracts') },
  { href: '/submissions', labelKey: 'submissions', icon: FileCheck2, roles: ['ADMIN', 'MANAGEMENT', 'USER'], match: (p) => p.startsWith('/submissions') },
  { href: '/notifications', labelKey: 'notifications', icon: Bell, roles: ['ADMIN', 'MANAGEMENT', 'USER'], match: (p) => p.startsWith('/notifications') },
  { href: '/notification-settings', labelKey: 'notificationSettings', icon: SlidersHorizontal, roles: ['ADMIN'], match: (p) => p.startsWith('/notification-settings') },
  { href: '/reports', labelKey: 'reports', icon: BarChart3, roles: ['ADMIN', 'MANAGEMENT'], match: (p) => p.startsWith('/reports') },
  { href: '/departments', labelKey: 'departments', icon: Building2, roles: ['ADMIN', 'MANAGEMENT'], match: (p) => p.startsWith('/departments') },
  { href: '/positions', labelKey: 'positions', icon: BriefcaseBusiness, roles: ['ADMIN', 'MANAGEMENT'], match: (p) => p.startsWith('/positions') },
  { href: '/users', labelKey: 'users', icon: UserCog, roles: ['ADMIN'], match: (p) => p.startsWith('/users') },
  { href: '/audit-logs', labelKey: 'auditLogs', icon: ScrollText, roles: ['ADMIN'], match: (p) => p.startsWith('/audit-logs') },
  { href: '/my-profile', labelKey: 'myProfile', icon: User, roles: ['USER'], match: (p) => p.startsWith('/my-profile') },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const { t, mobileMenuOpen, closeMobileMenu } = useUI();

  const role: Role = user?.role ?? 'USER';
  const filtered = navItems.filter((item) => item.roles.includes(role));

  const renderNavItems = (isMobile = false) => (
    <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
      {filtered.map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (isMobile) closeMobileMenu();
            }}
            title={!isMobile && collapsed ? t.nav[item.labelKey as keyof typeof t.nav] : undefined}
            className={cn(
              'flex h-10 items-center gap-3 rounded-[6px] px-3 text-[13px] font-medium transition-colors duration-150',
              !isMobile && collapsed && 'justify-center',
              active
                ? 'border-l-2 border-accent bg-accent-soft font-semibold text-ink'
                : 'border-l-2 border-transparent text-ink-2 hover:bg-muted hover:text-ink'
            )}
          >
            <Icon size={18} className={cn('shrink-0', active ? 'text-accent' : '')} />
            {(isMobile || !collapsed) && <span className="truncate">{t.nav[item.labelKey as keyof typeof t.nav]}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs" onClick={closeMobileMenu} />
          <div className="relative flex w-72 max-w-[80vw] flex-col border-r border-line bg-surface shadow-2xl z-10">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Link href="/dashboard" onClick={closeMobileMenu} className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-surface">
                  <Image src="/img/BATARA.png" alt="BATARA" width={32} height={32} className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-heading text-sm font-bold text-ink">{t.appName}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-ink-2">{t.nav.logoSub}</span>
                </div>
              </Link>
              <button
                onClick={closeMobileMenu}
                className="rounded-[6px] p-1.5 text-ink-2 hover:bg-muted hover:text-ink"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {renderNavItems(true)}

            <div className="m-3 flex items-center gap-2.5 rounded-[6px] border border-line bg-muted/60 px-3 py-2.5">
              <ShieldCheck size={15} className="shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-ink">{t.role[role.toLowerCase() as 'admin' | 'management' | 'user']}</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-ink-2">{t.role.mode}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden h-full flex-col border-r border-line bg-surface transition-all duration-200 md:flex',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className={cn('flex h-16 items-center border-b border-line', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-surface">
              <Image src="/img/BATARA.png" alt="BATARA" width={32} height={32} className="h-full w-full object-contain" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-heading text-sm font-bold text-ink">{t.appName}</span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-ink-2">{t.nav.logoSub}</span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-[6px] p-1 text-ink-2 hover:bg-muted hover:text-ink"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="rounded-[6px] p-1 text-ink-2 hover:bg-muted hover:text-ink"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {renderNavItems(false)}

        {!collapsed && (
          <div className="m-2 flex items-center gap-2.5 rounded-[6px] border border-line bg-muted/60 px-3 py-2.5">
            <ShieldCheck size={15} className="shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-ink">{t.role[role.toLowerCase() as 'admin' | 'management' | 'user']}</p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-ink-2">{t.role.mode}</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
