'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Search, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import NotificationBell from './NotificationBell';
import { cn } from './ui';
import { initials, avatarHue } from '../lib/helpers';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, lang, toggleLang, t } = useUI();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/employees?search=${encodeURIComponent(query.trim())}` : '/employees');
    setQuery('');
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    if (profileOpen) document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  const goProfile = () => {
    setProfileOpen(false);
    router.push('/my-profile');
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6">
      {/* Search */}
      <form onSubmit={onSearch} className="relative w-52 sm:w-72">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.topbar.searchPlaceholder}
          aria-label={t.common.search}
          className="w-full rounded-[6px] border border-line bg-base py-2 pl-9 pr-3 text-xs text-ink placeholder:text-ink-2/70 focus:border-accent focus:outline-none"
        />
      </form>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Language toggle */}
        <div className="flex items-center overflow-hidden rounded-[6px] border border-line bg-base" role="group" aria-label={t.topbar.language}>
          {(['id', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => toggleLang()}
              className={cn(
                'px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide leading-none transition-opacity duration-150',
                lang === l ? 'text-ink opacity-100' : 'text-ink-2 opacity-40 hover:opacity-80'
              )}
              aria-pressed={lang === l}
              title={l === 'id' ? 'Bahasa Indonesia' : 'English'}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-[6px] border border-line bg-base p-2 text-ink-2 hover:bg-muted hover:text-ink"
          title={theme === 'light' ? t.topbar.themeDark : t.topbar.themeLight}
          aria-label={theme === 'light' ? t.topbar.themeDark : t.topbar.themeLight}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

        {/* Notification bell */}
        <NotificationBell />

        {/* Profile dropdown */}
        <div className="relative pl-1" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-[6px] border border-line bg-base py-1 pl-1 pr-1.5 transition-colors hover:bg-muted"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: `hsl(${avatarHue(user?.name)} 45% 45%)` }}
            >
              {initials(user?.name)}
            </div>
            <div className="hidden text-left lg:block">
              <p className="max-w-[120px] truncate text-xs font-semibold text-ink">{user?.name}</p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-ink-2">{user?.role}</p>
            </div>
            <ChevronDown
              size={14}
              className={cn('shrink-0 text-ink-2 transition-transform duration-150', profileOpen && 'rotate-180')}
            />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-[8px] border border-line bg-surface py-1 shadow-2xl"
            >
              <button
                role="menuitem"
                onClick={goProfile}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-muted"
              >
                <UserIcon size={14} className="text-ink-2" />
                {t.nav.myProfile}
              </button>
              <div className="my-1 h-px bg-line" />
              <button
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-expired transition-colors hover:bg-expired/10"
              >
                <LogOut size={14} />
                {t.nav.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
