// Utilidades generales: fechas locales, formato, escape y helpers numéricos.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const pad = (n) => String(n).padStart(2, '0');
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const round1 = (v) => Math.round(v * 10) / 10;

// ---- Fechas (siempre en hora local del dispositivo, formato YYYY-MM-DD) ----
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const weekday = (s) => parseYmd(s).getDay(); // 0 = domingo
export const mondayOf = (s) => { const wd = weekday(s); return addDays(s, wd === 0 ? -6 : 1 - wd); };
export const weekDates = (s) => { const m = mondayOf(s); return Array.from({ length: 7 }, (_, i) => addDays(m, i)); };
export const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
export const dateRange = (from, to) => { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; };

export function isoWeek(s) {
  const d = parseYmd(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t - y0) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad(w)}`;
}

export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAYS_S = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DAYS_L = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MONTHS_S = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lunes primero

export const fmtLong = (s) => { const d = parseYmd(s); return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
export const fmtShort = (s) => { const d = parseYmd(s); return `${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };
export const fmtDM = (s) => { const d = parseYmd(s); return `${d.getDate()}/${d.getMonth() + 1}`; };

export const toMin = (hhmm) => { if (!hhmm) return null; const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0); };
export const fromMin = (m) => `${pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad(((m % 60) + 60) % 60)}`;
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

export function fmtDur(min) {
  if (min == null || !isFinite(min)) return '—';
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
export const fmtHM = (min) => (min == null || !isFinite(min)) ? '—' : `${Math.floor(min / 60)}h ${pad(Math.round(min % 60))}`;
export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
export function fmtPace(secPerKm) {
  if (!secPerKm || !isFinite(secPerKm)) return '—';
  return `${Math.floor(secPerKm / 60)}:${pad(Math.round(secPerKm % 60))} /km`;
}
/** "mm:ss" o "h:mm:ss" → segundos */
export function parseClock(str) {
  if (str == null || str === '') return null;
  const parts = String(str).trim().split(':').map((p) => Number(p.replace(',', '.')));
  if (parts.some((p) => !isFinite(p))) return null;
  if (parts.length === 1) return Math.round(parts[0] * 60); // minutos
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
}
export const fmtKg = (v) => v == null ? '—' : `${round1(v).toFixed(1).replace('.', ',')}`;
export const fmtNum1 = (v) => v == null || !isFinite(v) ? '—' : round1(v).toFixed(1).replace('.', ',');

/** Acepta coma o punto decimal. */
export function parseDec(v) {
  if (v == null) return null;
  let s = String(v).trim().replace(/\s/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s.replace(/[^\d.\-]/g, ''));
  return isFinite(n) ? n : null;
}

export const avg = (arr) => { const v = arr.filter((x) => x != null && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
export const sum = (arr) => arr.filter((x) => x != null && isFinite(x)).reduce((a, b) => a + b, 0);

/** Pendiente por regresión lineal simple (y por unidad de x). */
export function slope(points) {
  const p = points.filter((q) => q.y != null);
  if (p.length < 2) return null;
  const n = p.length, mx = avg(p.map((q) => q.x)), my = avg(p.map((q) => q.y));
  let num = 0, den = 0;
  for (const q of p) { num += (q.x - mx) * (q.y - my); den += (q.x - mx) ** 2; }
  return den ? num / den : null;
}

export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Buen día' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
