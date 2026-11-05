// Recordatorios gratuitos:
// 1) Archivo de calendario (.ics) con alarmas → el Calendario de iOS avisa aunque la app esté cerrada.
// 2) Avisos dentro de la app mientras está abierta (notificación del sistema si hay permiso).
import { settings, getConfig, updateSettings } from './store.js';
import { KIND_TO_GROUP, MEAL_SLOTS, KINDS } from './seed.js';
import { today, weekday, toMin, fromMin, nowMin, pad, addDays, ymd, WEEK_ORDER } from './util.js';
import { toast } from './ui.js';

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Lista de recordatorios de un día de la semana según la configuración. */
export async function remindersForWeekday(wd) {
  const s = settings().reminders;
  const plan = await getConfig('plan');
  const out = [];
  for (const b of plan[wd]?.blocks || []) {
    const g = KIND_TO_GROUP[b.kind];
    if (!g || !s.groups[g]?.on) continue;
    if (b.optional) continue; // menos avisos: lo opcional no notifica
    if (b.kind === 'disconnect' && !s.groups.sleep?.on) continue;
    const title = b.kind === 'wake' ? 'Es hora de despertarte' : b.kind === 'sleep' ? 'Hora de dormir' : b.title;
    out.push({ id: `b-${b.id}`, time: b.start, end: b.end, title, body: KINDS[b.kind] || '', group: g, lead: ['wake', 'sleep'].includes(b.kind) ? 0 : s.lead });
  }
  if (s.meals.on) for (const m of MEAL_SLOTS) out.push({ id: `m-${m.id}`, time: m.time, title: m.name, body: 'Registrá tu comida en PROJECT 5K', group: 'meals', lead: 0 });
  if (s.water.on) for (const t of s.water.times) out.push({ id: `w-${t}`, time: t, title: 'Hidratación', body: 'Tomá un vaso de agua', group: 'water', lead: 0 });
  if (s.tasks.on) out.push({ id: 'tasks', time: s.tasks.time, title: 'Tareas pendientes', body: 'Revisá y completá tus tareas de hoy', group: 'tasks', lead: 0 });
  if (s.dailySummary.on) out.push({ id: 'daily', time: s.dailySummary.time, title: 'Resumen del día', body: 'Marcá lo que hiciste y registrá comidas y agua', group: 'summary', lead: 0 });
  if (wd === 0 && s.checkin.on) out.push({ id: 'checkin', time: s.checkin.time, title: 'Control semanal', body: 'Peso, energía y revisión de la semana', group: 'checkin', lead: 0 });
  if (wd === 0 && s.weeklySummary.on) out.push({ id: 'weekly', time: s.weeklySummary.time, title: 'Resumen semanal', body: 'Revisá tu informe de la semana', group: 'summary', lead: 0 });
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export async function upcomingToday(limit = 3) {
  const list = await remindersForWeekday(weekday(today()));
  const now = nowMin();
  return list.filter((r) => toMin(r.time) - (r.lead || 0) >= now).slice(0, limit);
}

// ---------------------------------------------------------------------------
// ICS
// ---------------------------------------------------------------------------
const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
function fold(line) {
  // RFC 5545: líneas de máx. 75 octetos (aprox. por caracteres; suficiente para texto en español).
  const out = []; let s = line;
  while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); }
  out.push(s); return out.join('\r\n');
}
const dt = (date, hhmm) => `${date.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;

export async function buildICS() {
  const start = today();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PROJECT 5K//Recordatorios//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:PROJECT 5K'];
  // Agrupar eventos idénticos (mismo título y hora) en una sola regla semanal con varios días.
  const map = new Map();
  for (const wd of WEEK_ORDER) {
    for (const r of await remindersForWeekday(wd)) {
      const key = `${r.title}|${r.time}|${r.end || ''}|${r.lead}`;
      if (!map.has(key)) map.set(key, { ...r, days: [] });
      map.get(key).days.push(wd);
    }
  }
  let i = 0;
  for (const r of map.values()) {
    // Primera fecha (desde hoy) que caiga en alguno de los días.
    let first = start;
    for (let k = 0; k < 7; k++) { if (r.days.includes(weekday(addDays(start, k)))) { first = addDays(start, k); break; } }
    const dur = r.end ? Math.max(5, toMin(r.end) - toMin(r.time)) : 10;
    const rrule = r.days.length === 7 ? 'RRULE:FREQ=DAILY' : `RRULE:FREQ=WEEKLY;BYDAY=${r.days.map((d) => BYDAY[d]).join(',')}`;
    lines.push('BEGIN:VEVENT', `UID:p5k-${i++}-${stamp}@project5k`, `DTSTAMP:${stamp}`, `DTSTART:${dt(first, r.time)}`, `DURATION:PT${dur}M`, rrule,
      fold(`SUMMARY:${icsEsc(r.title)}`), fold(`DESCRIPTION:${icsEsc((r.body ? r.body + ' · ' : '') + 'PROJECT 5K')}`), 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', fold(`DESCRIPTION:${icsEsc(r.title)}`), `TRIGGER:-PT${r.lead || 0}M`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return { text: lines.join('\r\n') + '\r\n', count: map.size };
}

export async function shareFile(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'aborted'; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

export async function exportICS(mode = 'share') {
  const { text, count } = await buildICS();
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  if (mode === 'open') {
    // Abrir el .ics directamente: en Safari muestra "Añadir todo" al calendario.
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank') || (location.href = url);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return { count, result: 'opened' };
  }
  const result = await shareFile(blob, 'project5k-recordatorios.ics', 'PROJECT 5K — Recordatorios');
  return { count, result };
}

// ---------------------------------------------------------------------------
// Avisos dentro de la app (mientras está abierta)
// ---------------------------------------------------------------------------
let timer = null;
const FIRED = 'p5k:fired';

export function notifPermission() { return 'Notification' in window ? Notification.permission : 'unsupported'; }
export async function requestNotif() {
  if (!('Notification' in window)) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

async function show(r) {
  const title = r.title, body = r.body || 'PROJECT 5K';
  if (notifPermission() === 'granted' && navigator.serviceWorker?.controller) {
    try { const reg = await navigator.serviceWorker.ready; await reg.showNotification(title, { body, tag: r.id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }); return; } catch {}
  }
  toast(`${r.time} · ${title}`);
}

export function startInAppReminders() {
  stopInAppReminders();
  const tick = async () => {
    if (!settings().reminders.inApp) return;
    const d = today(), now = nowMin();
    let fired = {};
    try { fired = JSON.parse(localStorage.getItem(FIRED) || '{}'); } catch {}
    if (fired.date !== d) fired = { date: d, ids: [] };
    for (const r of await remindersForWeekday(weekday(d))) {
      const at = toMin(r.time) - (r.lead || 0);
      if (now >= at && now - at <= 2 && !fired.ids.includes(r.id)) { fired.ids.push(r.id); show(r); }
    }
    localStorage.setItem(FIRED, JSON.stringify(fired));
  };
  tick();
  timer = setInterval(tick, 30000);
}
export function stopInAppReminders() { if (timer) clearInterval(timer); timer = null; }
