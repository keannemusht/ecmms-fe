'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sun,
  Moon,
  Search,
  LogOut,
  ChevronDown,
  Menu,
  Globe,
  User as UserIcon,
  FileText,
  Award,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  X,
  CornerDownLeft,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import NotificationBell from './NotificationBell';
import { Badge, cn } from './ui';
import { initials, avatarHue, contractStatusTone, contractStatusKey, formatDate } from '../lib/helpers';
import { useDebouncedValue } from '../lib/useDebouncedValue';

interface QuickEmployee {
  id: string;
  nik: string;
  name: string;
  department: string;
  position: string;
  level?: string | null;
  employmentType: string;
  contracts?: Array<{
    id: string;
    contractNumber: string | null;
    status: string;
    sequence: number;
    endDate: string;
  }>;
}

interface QuickContract {
  id: string;
  contractNumber: string | null;
  status: string;
  contractType: string;
  startDate: string;
  endDate: string;
  sequence: number;
  employee: {
    id: string;
    name: string;
    nik: string;
    department: string;
    position: string;
  };
}

interface QuickEvaluation {
  id: string;
  documentNumber: string | null;
  ratingGrade: string | null;
  recommendationType: string | null;
  evaluationDate: string | null;
  employee: {
    id: string;
    name: string;
    department: string;
    position: string;
  };
}

interface QuickSearchResults {
  employees: QuickEmployee[];
  contracts: QuickContract[];
  evaluations: QuickEvaluation[];
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, lang, setLang, t, toggleMobileMenu } = useUI();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [results, setResults] = useState<QuickSearchResults>({ employees: [], contracts: [], evaluations: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Flatten items for unified keyboard navigation
  const flatItems = useMemo(() => {
    const items: Array<{
      type: 'employee' | 'contract' | 'evaluation';
      id: string;
      title: string;
      url: string;
    }> = [];

    results.employees.forEach((emp) => {
      items.push({
        type: 'employee',
        id: emp.id,
        title: emp.name,
        url: `/employees/${emp.id}`,
      });
    });

    results.contracts.forEach((c) => {
      items.push({
        type: 'contract',
        id: c.id,
        title: c.contractNumber || 'No. Kontrak',
        url: `/contracts?contract=${c.id}`,
      });
    });

    results.evaluations.forEach((ev) => {
      items.push({
        type: 'evaluation',
        id: ev.id,
        title: ev.documentNumber || ev.employee?.name || 'Penilaian',
        url: `/evaluations?search=${encodeURIComponent(ev.documentNumber || ev.employee?.name || '')}`,
      });
    });

    return items;
  }, [results]);

  // Fetch search results
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResults({ employees: [], contracts: [], evaluations: [] });
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    api
      .get(`/search/quick?q=${encodeURIComponent(trimmed)}`)
      .then((res) => {
        if (!cancelled) {
          setResults(res.data || { employees: [], contracts: [], evaluations: [] });
          setIsDropdownOpen(true);
          setHighlightedIndex(-1);
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('Quick search error:', err);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Click outside to close dropdowns
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleSelectItem = (url: string) => {
    setIsDropdownOpen(false);
    setQuery('');
    router.push(url);
    setTimeout(() => {
      window.dispatchEvent(new Event('popstate'));
    }, 60);
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (highlightedIndex >= 0 && flatItems[highlightedIndex]) {
      handleSelectItem(flatItems[highlightedIndex].url);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsDropdownOpen(false);
    router.push(`/employees?search=${encodeURIComponent(trimmed)}`);
    setQuery('');
    setTimeout(() => {
      window.dispatchEvent(new Event('popstate'));
    }, 60);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) {
      if (e.key === 'ArrowDown' && (flatItems.length > 0 || query.trim().length > 0)) {
        setIsDropdownOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
  };

  const totalResults = results.employees.length + results.contracts.length + results.evaluations.length;

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

        {/* Global Search with Live Dropdown */}
        <div ref={searchContainerRef} className="relative w-44 sm:w-72 md:w-80 lg:w-96">
          <form onSubmit={onSearchSubmit} className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim().length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              onFocus={() => {
                if (query.trim().length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={t.topbar.searchPlaceholder}
              aria-label={t.common.search}
              className="w-full rounded-[8px] border border-line bg-base py-1.5 pl-9 pr-8 text-xs text-ink placeholder:text-ink-2/70 focus:border-accent focus:bg-surface focus:outline-none focus:ring-1 focus:ring-accent transition-all duration-150"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setIsDropdownOpen(false);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink transition-colors"
                title="Clear"
              >
                {isSearching ? <Loader2 size={13} className="animate-spin text-accent" /> : <X size={13} />}
              </button>
            )}
          </form>

          {/* Search Dropdown Panel */}
          {isDropdownOpen && query.trim().length > 0 && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[330px] sm:w-[460px] md:w-[520px] max-h-[75vh] overflow-y-auto rounded-xl border border-line bg-surface/98 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150 py-2 divide-y divide-line/60">
              {/* Searching Indicator */}
              {isSearching && totalResults === 0 && (
                <div className="flex items-center justify-center gap-2 p-6 text-xs text-ink-2">
                  <Loader2 size={16} className="animate-spin text-accent" />
                  <span>{t.common.loading}</span>
                </div>
              )}

              {/* No Results */}
              {!isSearching && totalResults === 0 && (
                <div className="p-5 text-center">
                  <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-ink-2">
                    <Search size={16} />
                  </div>
                  <p className="text-xs font-semibold text-ink">
                    {t.topbar.noResults} <span className="text-accent font-bold">"{query}"</span>
                  </p>
                  <p className="mt-1 text-[11px] text-ink-2">
                    Coba cari dengan NIK, nama lengkap, departemen, atau no. kontrak lainnya.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelectItem(`/employees?search=${encodeURIComponent(query.trim())}`)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-[6px] bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent hover:text-white transition-colors"
                  >
                    <span>{t.topbar.viewAllEmployees}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}

              {/* Group: Employees */}
              {results.employees.length > 0 && (
                <div className="p-1.5">
                  <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-2">
                    <span className="flex items-center gap-1.5">
                      <UserIcon size={12} className="text-accent" />
                      {t.topbar.searchEmployees}
                    </span>
                    <span className="rounded-full bg-muted px-1.5 py-0.2 text-[9px] font-semibold text-ink-2">
                      {results.employees.length}
                    </span>
                  </div>

                  <div className="mt-0.5 space-y-0.5">
                    {results.employees.map((emp) => {
                      const itemIndex = flatItems.findIndex((i) => i.type === 'employee' && i.id === emp.id);
                      const isHighlighted = itemIndex === highlightedIndex;
                      const activeContract = emp.contracts?.[0];

                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleSelectItem(`/employees/${emp.id}`)}
                          onMouseEnter={() => setHighlightedIndex(itemIndex)}
                          className={cn(
                            'group flex items-center justify-between gap-2.5 rounded-[8px] px-2.5 py-2 cursor-pointer transition-all duration-100',
                            isHighlighted ? 'bg-accent/10 ring-1 ring-accent/30' : 'hover:bg-muted/60'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 shadow-xs"
                              style={{ backgroundColor: `hsl(${avatarHue(emp.name)} 45% 45%)` }}
                            >
                              {initials(emp.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-ink group-hover:text-accent transition-colors">
                                {emp.name}
                              </p>
                              <p className="truncate text-[11px] text-ink-2">
                                <span className="font-mono font-medium">{emp.nik}</span> • {emp.position} •{' '}
                                <span className="text-ink-2/80">{emp.department}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {emp.employmentType === 'PKWTT' ? (
                              <Badge tone="neutral" className="text-[10px]">
                                Tetap (PKWTT)
                              </Badge>
                            ) : activeContract ? (
                              <Badge tone={contractStatusTone(activeContract.status as any)} className="text-[10px]">
                                {t.status[contractStatusKey(activeContract.status) as 'aktif'] ?? activeContract.status}
                              </Badge>
                            ) : null}
                            <ArrowUpRight
                              size={14}
                              className="text-ink-2/50 group-hover:text-accent transition-colors"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group: Contracts */}
              {results.contracts.length > 0 && (
                <div className="p-1.5">
                  <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-2">
                    <span className="flex items-center gap-1.5">
                      <FileText size={12} className="text-accent" />
                      {t.topbar.searchContracts}
                    </span>
                    <span className="rounded-full bg-muted px-1.5 py-0.2 text-[9px] font-semibold text-ink-2">
                      {results.contracts.length}
                    </span>
                  </div>

                  <div className="mt-0.5 space-y-0.5">
                    {results.contracts.map((c) => {
                      const itemIndex = flatItems.findIndex((i) => i.type === 'contract' && i.id === c.id);
                      const isHighlighted = itemIndex === highlightedIndex;

                      return (
                        <div
                          key={c.id}
                          onClick={() => handleSelectItem(`/contracts?contract=${c.id}`)}
                          onMouseEnter={() => setHighlightedIndex(itemIndex)}
                          className={cn(
                            'group flex items-center justify-between gap-2.5 rounded-[8px] px-2.5 py-2 cursor-pointer transition-all duration-100',
                            isHighlighted ? 'bg-accent/10 ring-1 ring-accent/30' : 'hover:bg-muted/60'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-muted/80 text-ink shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                              <FileText size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-mono font-bold text-ink group-hover:text-accent transition-colors">
                                {c.contractNumber || 'Tanpa No. Kontrak'}
                              </p>
                              <p className="truncate text-[11px] text-ink-2">
                                <span className="font-semibold text-ink/90">{c.employee?.name}</span> •{' '}
                                {c.employee?.department || '-'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden sm:inline text-[10px] text-ink-2">
                              {formatDate(c.endDate)}
                            </span>
                            <Badge tone={contractStatusTone(c.status as any)} className="text-[10px]">
                              {t.status[contractStatusKey(c.status) as 'aktif'] ?? c.status}
                            </Badge>
                            <ArrowUpRight
                              size={14}
                              className="text-ink-2/50 group-hover:text-accent transition-colors"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group: Evaluations */}
              {results.evaluations.length > 0 && (
                <div className="p-1.5">
                  <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-2">
                    <span className="flex items-center gap-1.5">
                      <Award size={12} className="text-accent" />
                      {t.topbar.searchEvaluations}
                    </span>
                    <span className="rounded-full bg-muted px-1.5 py-0.2 text-[9px] font-semibold text-ink-2">
                      {results.evaluations.length}
                    </span>
                  </div>

                  <div className="mt-0.5 space-y-0.5">
                    {results.evaluations.map((ev) => {
                      const itemIndex = flatItems.findIndex((i) => i.type === 'evaluation' && i.id === ev.id);
                      const isHighlighted = itemIndex === highlightedIndex;

                      return (
                        <div
                          key={ev.id}
                          onClick={() =>
                            handleSelectItem(
                              `/evaluations?search=${encodeURIComponent(ev.documentNumber || ev.employee?.name || '')}`
                            )
                          }
                          onMouseEnter={() => setHighlightedIndex(itemIndex)}
                          className={cn(
                            'group flex items-center justify-between gap-2.5 rounded-[8px] px-2.5 py-2 cursor-pointer transition-all duration-100',
                            isHighlighted ? 'bg-accent/10 ring-1 ring-accent/30' : 'hover:bg-muted/60'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-muted/80 text-ink shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                              <Award size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-mono font-bold text-ink group-hover:text-accent transition-colors">
                                {ev.documentNumber || 'Form Evaluasi'}
                              </p>
                              <p className="truncate text-[11px] text-ink-2">
                                <span className="font-semibold text-ink/90">{ev.employee?.name}</span> •{' '}
                                {ev.employee?.department || '-'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {ev.ratingGrade && (
                              <Badge tone="info" className="text-[10px]">
                                {ev.ratingGrade}
                              </Badge>
                            )}
                            <ArrowUpRight
                              size={14}
                              className="text-ink-2/50 group-hover:text-accent transition-colors"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Navigation Shortcuts */}
              {totalResults > 0 && (
                <div className="bg-muted/30 p-2 space-y-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectItem(`/employees?search=${encodeURIComponent(query.trim())}`)}
                      className="flex items-center justify-between rounded-[6px] border border-line/60 bg-base px-2.5 py-1.5 text-[11px] font-medium text-ink hover:border-accent hover:text-accent transition-colors"
                    >
                      <span className="truncate">{t.topbar.viewAllEmployees}</span>
                      <CornerDownLeft size={11} className="text-ink-2 shrink-0 ml-1" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectItem(`/contracts?search=${encodeURIComponent(query.trim())}`)}
                      className="flex items-center justify-between rounded-[6px] border border-line/60 bg-base px-2.5 py-1.5 text-[11px] font-medium text-ink hover:border-accent hover:text-accent transition-colors"
                    >
                      <span className="truncate">{t.topbar.viewAllContracts}</span>
                      <ArrowRight size={11} className="text-ink-2 shrink-0 ml-1" />
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-ink-2/70 pt-0.5">{t.topbar.searchTip}</p>
                </div>
              )}
            </div>
          )}
        </div>
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
              <p className="text-[10px] font-semibold text-ink-2">
                {user?.role ? (t.role[user.role.toLowerCase() as 'admin' | 'management' | 'user'] ?? user.role) : ''}
              </p>
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
                <p className="text-[10px] font-semibold text-ink-2">
                  {user?.role ? (t.role[user.role.toLowerCase() as 'admin' | 'management' | 'user'] ?? user.role) : ''}
                </p>
              </div>

              {/* Settings controls inside dropdown */}
              <div className="space-y-1.5 px-3 py-1.5">
                {/* Language switcher */}
                <div className="flex items-center justify-between text-xs font-medium text-ink">
                  <span className="flex items-center gap-2 text-ink-2">
                    <Globe size={14} /> {t.topbar.language}
                  </span>
                  <div
                    className="flex items-center rounded-[6px] border border-line bg-base p-0.5"
                    role="group"
                    aria-label={t.topbar.language}
                  >
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
