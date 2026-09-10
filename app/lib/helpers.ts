import { BadgeTone } from '../components/ui';

interface ApiErrorBody {
  error?: string;
  message?: string;
}

export function getApiError(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const body = (err as { response?: { data?: ApiErrorBody } }).response?.data;
    if (body?.error) return body.error;
    if (body?.message) return body.message;
  }
  if (err instanceof Error) return err.message;
  return 'Terjadi kesalahan yang tidak diketahui.';
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function daysUntil(value?: string | Date | null): number | null {
  if (!value) return null;
  const end = new Date(value);
  if (isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
}

export function initials(name?: string | null): string {
  if (!name) return '--';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const AVATAR_HUES = [24, 180, 210, 260, 320, 90, 140, 30];

export function avatarHue(name?: string | null): number {
  if (!name) return 24;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return AVATAR_HUES[hash % AVATAR_HUES.length];
}

export function contractStatusTone(status?: string): BadgeTone {
  switch (status) {
    case 'AKTIF':
      return 'active';
    case 'AKAN_BERAKHIR':
      return 'warning';
    case 'EXPIRED':
      return 'expired';
    case 'DIPERPANJANG':
      return 'info';
    case 'DIANGKAT_TETAP':
      return 'info';
    case 'RESIGN':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function contractStatusKey(status?: string): string {
  switch (status) {
    case 'AKTIF':
      return 'aktif';
    case 'AKAN_BERAKHIR':
      return 'akanBerakhir';
    case 'EXPIRED':
      return 'expired';
    case 'DIPERPANJANG':
      return 'diperpanjang';
    case 'DIANGKAT_TETAP':
      return 'diangkatTetap';
    case 'RESIGN':
      return 'resign';
    default:
      return status || '';
  }
}

export function employmentTypeKey(type?: string): string {
  return type || '';
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4,
  may: 5, mei: 5, jun: 6, jul: 7,
  aug: 8, agu: 8, sep: 9,
  oct: 10, okt: 10, nov: 11, dec: 12, des: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formats a date into 'YYYY-MM-DD' using local time. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildDate(y: number, mo: number, day: number): string {
  const d = new Date(y, mo - 1, day);
  if (isNaN(d.getTime())) return '';
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return '';
  return `${y}-${pad2(mo)}-${pad2(day)}`;
}

function monthIndex(name: string): number {
  return MONTH_MAP[name.toLowerCase().slice(0, 3)] ?? -1;
}

function twoDigitYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

/**
 * Normalizes a date value from an Excel cell into 'YYYY-MM-DD' (local time).
 * Handles JS Date objects, Excel serial numbers, '21 Nov 2025', 'Nov 21 2025',
 * '21/11/25', and 'YYYY-MM-DD'. Returns '' when the value cannot be parsed.
 */
export function parseExcelDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';

  if (value instanceof Date && !isNaN(value.getTime())) {
    return toISODate(value);
  }

  if (typeof value === 'number' && isFinite(value)) {
    if (value >= 20000 && value <= 80000) {
      const d = new Date(Math.round((value - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return toISODate(d);
    }
    return '';
  }

  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return '';

    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return buildDate(Number(m[1]), Number(m[2]), Number(m[3]));

    m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
    if (m) return buildDate(twoDigitYear(Number(m[3])), Number(m[2]), Number(m[1]));

    m = s.match(/^(\d{1,2})[\s-\/]?([a-zA-Z]{3,9})[\s,-\/]*(\d{2,4})$/);
    if (m) {
      const mon = monthIndex(m[2]);
      if (mon >= 0) return buildDate(twoDigitYear(Number(m[3])), mon, Number(m[1]));
    }

    m = s.match(/^([a-zA-Z]{3,9})[\s,]+(\d{1,2})[,]?\s*(\d{2,4})$/);
    if (m) {
      const mon = monthIndex(m[1]);
      if (mon >= 0) return buildDate(twoDigitYear(Number(m[3])), mon, Number(m[2]));
    }
  }

  return '';
}

/**
 * Case-insensitive header lookup: matches a cell by any of the given header
 * names, ignoring spaces/underscores/dashes and any parenthetical hint
 * (e.g. 'JoinDate(YYYY-MM-DD)' matches 'JoinDate'). Returns the first
 * non-empty value.
 */
export function pickExcelValue(row: Record<string, unknown>, candidates: string[]): unknown {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const norm = candidate.toLowerCase().replace(/\(.*$/g, '').replace(/[\s_\-]+/g, '');
    const hit = entries.find(
      ([k]) => k.toLowerCase().replace(/\(.*$/g, '').replace(/[\s_\-]+/g, '') === norm
    );
    if (hit) {
      const v = hit[1];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
  }
  return undefined;
}

const JOIN_DATE_HEADERS = [
  'Join Date', 'JoinDate', 'Tanggal Join', 'Tanggal', 'Tgl Join', 'Tgl',
  'Tanggal Bergabung', 'Tgl Bergabung', 'Tanggal Masuk', 'Tgl Masuk', 'Join',
];

/**
 * Finds the join-date value from an imported row. Tries known headers first,
 * then any column whose header looks date-related, then falls back to scanning
 * all columns for the single value that parses as a date (covers empty headers,
 * e.g. `__EMPTY_7`, or custom column names).
 */
export function pickExcelJoinDate(row: Record<string, unknown>): unknown {
  const known = pickExcelValue(row, JOIN_DATE_HEADERS);
  if (known !== undefined) return known;

  const joinishHeader = Object.entries(row).find(([k]) => /join|bergabung|masuk/i.test(k));
  if (joinishHeader) return joinishHeader[1];

  const dateishHeader = Object.entries(row).find(([k]) => /tanggal|tgl|date/i.test(k));
  if (dateishHeader) return dateishHeader[1];

  const candidates = Object.entries(row)
    .map(([k, v]) => ({ k, v, parsed: parseExcelDate(v) }))
    .filter((x) => x.parsed !== '');

  if (candidates.length === 1) return candidates[0].v;

  const preferred = candidates.find((x) => /join|tanggal|tgl|date|masuk|bergabung/i.test(x.k));
  return preferred?.v;
}
