'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Search, LogOut, User as UserIcon, ChevronDown, Menu, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import NotificationBell from './NotificationBell';
import { cn } from './ui';
import { initials, avatarHue } from '../lib/helpers';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, lang, setLang, t, toggleMobileMenu } = useUI();
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
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-3 sm:px-6">
      <div className="flex items-center gap-2">
        {/* Mobile menu trigger button */}
        <button
          onClick={toggleMobileMenu}
          className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-line bg-base text-ink-2 hover:bg-muted hover:text-ink md:hidden shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} />
        </button>

        {/* Search */}
        <form onSubmit={onSearch} className="relative w-40 sm:w-64 md:w-72">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.topbar.searchPlaceholder}
            aria-label={t.common.search}
            className="w-full rounded-[6px] border border-line bg-base py-1.5 pl-8 pr-2.5 text-xs text-ink placeholder:text-ink-2/70 focus:border-accent focus:outline-none"
          />
        </form>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <NotificationBell />

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-[6px] border border-line bg-base py-1 pl-1 pr-1.5 transition-colors hover:bg-muted"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
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
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-[8px] border border-line bg-surface py-1 shadow-2xl"
            >
              {/* User header */}
              <div className="border-b border-line bg-muted/40 px-3 py-2">
                <p className="truncate text-xs font-bold text-ink">{user?.name}</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-ink-2">{user?.role}</p>
              </div>

              {/* Navigation link - Temporarily hidden */}
              {/* <div className="py-1">
                <button
                  role="menuitem"
                  onClick={goProfile}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-muted"
                >
                  <UserIcon size={15} className="text-ink-2" />
                  {t.nav.myProfile}
                </button>
              </div>
              <div className="my-1 h-px bg-line" /> */}

              {/* Settings controls inside dropdown */}
              <div className="space-y-1.5 px-3 py-1.5">
                {/* Language switcher */}
                <div className="flex items-center justify-between text-xs font-medium text-ink">
                  <span className="flex items-center gap-2 text-ink-2">
                    <Globe size={14} /> {t.topbar.language}
                  </span>
                  <div className="flex items-center rounded-[6px] border border-line bg-base p-0.5" role="group" aria-label={t.topbar.language}>
                    {(['id', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLang(l)}
                        className={cn(
                          'rounded-[4px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider leading-none transition-all duration-150',
                          lang === l
                            ? 'bg-surface text-ink shadow-xs border border-line/60'
                            : 'text-ink-2/60 hover:text-ink hover:bg-muted/40'
                        )}
                        aria-pressed={lang === l}
                        title={l === 'id' ? 'Bahasa Indonesia' : 'English'}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme toggle */}
                <div className="flex items-center justify-between text-xs font-medium text-ink">
                  <span className="flex items-center gap-2 text-ink-2">
                    {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                    {theme === 'light' ? t.topbar.themeDark : t.topbar.themeLight}
                  </span>
                  <button
                    onClick={toggleTheme}
                    className="flex h-7 items-center gap-1.5 rounded-[6px] border border-line bg-base px-2 text-[11px] font-semibold text-ink-2 hover:bg-muted hover:text-ink transition-colors"
                  >
                    {theme === 'light' ? 'Dark' : 'Light'}
                  </button>
                </div>
              </div>

              <div className="my-1 h-px bg-line" />

              {/* Logout */}
              <div className="py-0.5">
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-expired transition-colors hover:bg-expired/10"
                >
                  <LogOut size={15} />
                  {t.nav.logout}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
