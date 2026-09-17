'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Check, ChevronsUpDown } from 'lucide-react';
import { Employee } from '../lib/types';
import { cn } from './ui';

export interface SearchableEmployeeSelectProps {
  employees: Employee[];
  value: string;
  onSelect: (employee: Employee | null) => void;
  placeholder?: string;
  excludeEmployeeId?: string;
  targetDepartment?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
  required?: boolean;
}

export default function SearchableEmployeeSelect({
  employees = [],
  value,
  onSelect,
  placeholder = '-- Pilih Karyawan / Atasan --',
  excludeEmployeeId,
  targetDepartment,
  disabled = false,
  className,
  allowClear = true,
  clearLabel = '-- Batal Pilih (Isi Manual) --',
  required = false,
}: SearchableEmployeeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Auto focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedEmployee = useMemo(() => {
    return Array.isArray(employees) ? employees.find((e) => e.id === value) : undefined;
  }, [employees, value]);

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];

    let list = employees.filter((e) => {
      if (excludeEmployeeId && e.id === excludeEmployeeId) return false;
      return true;
    });

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const terms = q.split(/\s+/);
      list = list.filter((e) => {
        const name = (e.name || '').toLowerCase();
        const nik = (e.nik || '').toLowerCase();
        const dept = (e.department || '').toLowerCase();
        const pos = (e.position || '').toLowerCase();
        const combined = `${name} ${nik} ${dept} ${pos}`;
        return terms.every((term) => combined.includes(term));
      });
    }

    // Sort: If targetDepartment is specified, prioritize employees in the same department
    return list.sort((a, b) => {
      if (targetDepartment) {
        const aSameDept = a.department?.toLowerCase() === targetDepartment.toLowerCase();
        const bSameDept = b.department?.toLowerCase() === targetDepartment.toLowerCase();
        if (aSameDept && !bSameDept) return -1;
        if (!aSameDept && bSameDept) return 1;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [employees, excludeEmployeeId, search, targetDepartment]);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Hidden input to support form validation if required */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          value={value || ''}
          onChange={() => {}}
          required
          className="absolute inset-0 opacity-0 pointer-events-none"
        />
      )}

      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearch('');
          }
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
            e.preventDefault();
            setIsOpen(true);
            setSearch('');
          }
        }}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-[6px] border border-line bg-surface px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer select-none',
          'hover:border-accent focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
          isOpen && 'border-accent ring-1 ring-accent',
          disabled && 'cursor-not-allowed opacity-60 bg-muted'
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden pr-1">
          {selectedEmployee ? (
            <div className="truncate text-ink flex items-center gap-1.5">
              <span className="font-semibold text-ink">{selectedEmployee.name}</span>
              <span className="text-[11px] text-ink-2 truncate">
                &bull; {selectedEmployee.position || '-'}
                {selectedEmployee.department ? ` (${selectedEmployee.department})` : ''}
              </span>
            </div>
          ) : (
            <span className="text-ink-2 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selectedEmployee && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Batalkan pilihan"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
                setIsOpen(false);
              }}
              className="rounded p-0.5 text-ink-2 hover:bg-muted hover:text-ink transition-colors cursor-pointer"
            >
              <X size={13} />
            </span>
          )}
          <ChevronsUpDown size={14} className="text-ink-2 shrink-0" />
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-[8px] border border-line bg-surface shadow-xl animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="border-b border-line bg-surface p-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-2"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik untuk mencari nama, NIK, jabatan, departemen..."
                className="w-full rounded-[5px] border border-line bg-base py-1.5 pl-8 pr-7 text-xs text-ink placeholder:text-ink-2 focus:border-accent focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-line/30">
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-[5px] px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted',
                  !value && 'bg-accent/10 font-semibold text-accent'
                )}
              >
                <span className="text-ink-2 italic">{clearLabel}</span>
                {!value && <Check size={14} className="text-accent shrink-0" />}
              </button>
            )}

            {filteredEmployees.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink-2">
                Tidak ada karyawan yang cocok dengan &ldquo;{search}&rdquo;
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = emp.id === value;
                const isSameDept =
                  targetDepartment &&
                  emp.department?.toLowerCase() === targetDepartment.toLowerCase();

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      onSelect(emp);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-[5px] px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted',
                      isSelected ? 'bg-accent/10 font-semibold text-accent' : 'text-ink'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-ink truncate">{emp.name}</span>
                        {isSameDept && (
                          <span className="rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.2">
                            Dept Sama
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-ink-2 mt-0.5">
                        <span>{emp.position || 'Staf'}</span>
                        {emp.department && <span> &bull; {emp.department}</span>}
                        {emp.nik && <span className="font-mono text-[10px]"> ({emp.nik})</span>}
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="shrink-0 text-accent ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
