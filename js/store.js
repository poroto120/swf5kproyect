// Lógica de dominio: configuración, plan del día, progreso, hábitos y recuperación.
import * as db from './db.js';
import { buildPlan, SEED_ROUTINES, SEED_HABITS, DEFAULT_REMINDERS, MEAL_SLOTS, RUN_PLAN, RUN_SESSIONS_PER_WEEK } from './seed.js';
import { today, weekday, addDays, mondayOf, weekDates, uid, avg, dateRange } from './util.js';

// ---------------------------------------------------------------------------
// Settings (localStorage: configuraciones simples)
// ---------------------------------------------------------------------------
const SKEY = 'p5k:settings';
const DEFAULT_SETTINGS = {
  onboarded: false,
  profile: { name: '', age: null, heightCm: null, startWeight: null, startDate: null },
  goals: { sleepMinH: 8, sleepMaxH: 10, water: 8 },
  theme: 'auto',
  examUntil: null,
  deloadUntil: null,
  run: { week: 1, attempt: 1 },
  reminders: DEFAULT_REMINDERS,
  lastBackup: null,
  demo: false,
  voice: true,
  sound: true,
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, over) {
  const out = structuredClone(base);
  if (!isObj(over)) return out;
  for (const [k, v] of Object.entries(over)) out[k] = isObj(v) && isObj(out[k]) ? merge(out[k], v) : v;
  return out;
}

let _settings = null;
export function settings() {
  if (_settings) return _settings;
  try { _settings = merge(DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(SKEY) || '{}')); }
  catch { _settings = structuredClone(DEFAULT_SETTINGS); }
  return _settings;
}
export function saveSettings(s) { _settings = s; localStorage.setItem(SKEY, JSON.stringify(s)); }
export function updateSettings(fn) { const s = structuredClone(settings()); fn(s); saveSettings(s); return s; }
export function replaceSettings(obj) { saveSettings(merge(DEFAULT_SETTINGS, obj)); }
export const sleepGoalMin = () => settings().goals.sleepMinH * 60;

// ---------------------------------------------------------------------------
// Config (IndexedDB): plan, rutinas, hábitos, log de cambios
// ---------------------------------------------------------------------------
const CONFIG_DEFAULTS = {
  plan: buildPlan,
  routines: () => structuredClone(SEED_ROUTINES),
  habits: () => structuredClone(SEED_HABITS),
  changes: () => [],
};
const cache = {};
export async function getConfig(key) {
  if (cache[key]) return cache[key];
  const rec = await db.get('config', key);
  let v = rec ? rec.value : CONFIG_DEFAULTS[key]();
  if (!rec) await db.put('config', { key, value: v });
  cache[key] = v;
  return v;
}
export async function setConfig(key, value) { cache[key] = value; await db.put('config', { key, value }); }
export async function resetConfig(key) { const v = CONFIG_DEFAULTS[key](); await setConfig(key, v); return v; }
export function clearCache() { for (const k of Object.keys(cache)) delete cache[k]; }

export async function logChange(title, detail = '') {
  const changes = await getConfig('changes');
  changes.unshift({ id: uid(), date: today(), at: Date.now(), title, detail });
  await setConfig('changes', changes.slice(0, 100));
}

// ---------------------------------------------------------------------------
// Día
// ---------------------------------------------------------------------------
export const emptyDay = (date) => ({ date, statuses: {}, water: 0, habits: {}, note: '' });
export async function getDay(date) { return (await db.get('days', date)) || emptyDay(date); }
export async function saveDay(day) { day.updatedAt = Date.now(); delete day.demo; return db.put('days', day); }
export async function updateDay(date, fn) { const d = await getDay(date); fn(d); await saveDay(d); return d; }

export const isExamMode = (date = today()) => { const u = settings().examUntil; return !!u && date <= u; };
export const isDeload = (date = today()) => { const u = settings().deloadUntil; return !!u && date <= u; };

/** Bloques del día con los modos (exámenes / semana liviana) aplicados. */
export async function dayBlocks(date) {
  const plan = await getConfig('plan');
  const day = plan[weekday(date)] || { blocks: [] };
  const exam = isExamMode(date), deload = isDeload(date);
  const blocks = day.blocks.map((b) => {
    const x = { ...b };
    if (exam) {
      if (['run', 'walk', 'venture'].includes(x.kind) && x.track) { x.optional = true; x.modeNote = 'Opcional: modo exámenes'; }
      if (['study', 'review', 'exams'].includes(x.kind)) { x.priority = true; }
    }
    if (deload) {
      if (['run', 'walk'].includes(x.kind) && x.optional) { x.hiddenByMode = true; }
      if (x.kind === 'calisthenics') x.modeNote = 'Semana liviana: una serie menos';
      if (x.kind === 'bjj') x.modeNote = 'Semana liviana: intensidad moderada';
    }
    return x;
  }).filter((b) => !b.hiddenByMode);
  blocks.sort((a, b) => a.start.localeCompare(b.start));
  return { theme: day.theme, blocks };
}

export async function mealsOn(date) { return db.range('meals', date, date, 'date'); }
export async function workoutsOn(date) { return db.range('workouts', date, date, 'date'); }
export async function recoveryOn(date) { return db.get('recovery', date); }

const DONE = (s) => s === 'done' || s === 'modified';

/** Progreso del día (0–100) a partir de bloques, comidas y sueño. */
export async function dayProgress(date, pre = {}) {
  const { blocks } = pre.blocks ? { blocks: pre.blocks } : await dayBlocks(date);
  const day = pre.day || await getDay(date);
  const meals = pre.meals || await mealsOn(date);
  const rec = pre.rec !== undefined ? pre.rec : await recoveryOn(date);
  let num = 0, den = 0;
  const tracked = blocks.filter((b) => b.track);
  for (const b of tracked) {
    const v = DONE(day.statuses[b.id]?.s) ? 1 : 0;
    if (b.optional) { if (v) { num += 1; den += 1; } }
    else { den += 1; num += v; }
  }
  const mealsDone = meals.filter((m) => m.done).length;
  den += 1; num += Math.min(mealsDone / MEAL_SLOTS.length, 1);
  const sleepMin = rec?.sleepMin ?? null;
  den += 1; if (sleepMin != null) num += Math.min(sleepMin / sleepGoalMin(), 1);
  const pct = den ? Math.round((num / den) * 100) : 0;
  return { pct, blocks, tracked, day, meals, mealsDone, rec, sleepMin };
}

export async function setBlockStatus(date, block, s, note = '') {
  return updateDay(date, (d) => {
    if (!s) delete d.statuses[block.id];
    else d.statuses[block.id] = { s, note, kind: block.kind, title: block.title, at: Date.now() };
  });
}

/** Marca como hecho el primer bloque del día que coincida con el tipo (al guardar un entrenamiento). */
export async function autoCompleteKind(date, kind, routine) {
  const { blocks } = await dayBlocks(date);
  const b = blocks.find((x) => x.kind === kind && x.track && (!routine || !x.routine || x.routine === routine));
  if (!b) return null;
  const day = await getDay(date);
  if (DONE(day.statuses[b.id]?.s)) return null;
  await setBlockStatus(date, b, 'done');
  return b;
}

// ---------------------------------------------------------------------------
// Hábitos
// ---------------------------------------------------------------------------
/** Contexto por fecha para evaluar hábitos enlazados. */
export async function habitContext(from, to) {
  const [days, recs, works] = await Promise.all([
    db.range('days', from, to), db.range('recovery', from, to), db.range('workouts', from, to, 'date'),
  ]);
  const ctx = {};
  for (const d of dateRange(from, to)) ctx[d] = { day: emptyDay(d), kinds: new Set(), sleepMin: null };
  for (const d of days) if (ctx[d.date]) {
    ctx[d.date].day = d;
    for (const st of Object.values(d.statuses || {})) if (DONE(st.s) && st.kind) ctx[d.date].kinds.add(st.kind);
  }
  for (const r of recs) if (ctx[r.date]) ctx[r.date].sleepMin = r.sleepMin ?? null;
  for (const w of works) if (ctx[w.date]) {
    const k = { calisthenics: 'calisthenics', run: 'run', bjj: 'bjj', walk: 'walk', mobility: 'mobility' }[w.type];
    if (k && w.attended !== false) ctx[w.date].kinds.add(k);
  }
  return ctx;
}

export function habitDoneOn(h, c) {
  if (!c) return false;
  if (c.day.habits?.[h.id]) return true;
  if (!h.link) return false;
  if (h.link === 'sleep') return c.sleepMin != null && c.sleepMin >= sleepGoalMin();
  if (h.link === 'run') return c.kinds.has('run');
  return c.kinds.has(h.link);
}
export const habitLinkedOn = (h, c) => !!h.link && !c?.day.habits?.[h.id] && habitDoneOn(h, c);

export function habitDueOn(h, date) {
  if (!h.active) return false;
  if (h.freq === 'daily') return true;
  if (h.freq === 'days') return h.days.includes(weekday(date));
  return true; // 'times': flexible en la semana
}

export function weekDoneCount(h, date, ctx) {
  return weekDates(date).filter((d) => d <= date && habitDoneOn(h, ctx[d])).length;
}

/** Racha: días debidos consecutivos cumplidos (o semanas cumplidas en hábitos 'times'). */
export function habitStreak(h, ctx, upTo = today()) {
  if (h.freq === 'times') {
    let n = 0, wk = mondayOf(upTo);
    const thisWeek = weekDates(upTo).filter((d) => d <= upTo && habitDoneOn(h, ctx[d])).length;
    if (thisWeek >= h.times) n++;
    wk = addDays(wk, -7);
    for (let i = 0; i < 20; i++) {
      const dates = weekDates(wk);
      if (!ctx[dates[0]]) break;
      if (dates.filter((d) => habitDoneOn(h, ctx[d])).length >= h.times) n++; else break;
      wk = addDays(wk, -7);
    }
    return { n, unit: n === 1 ? 'sem' : 'sem' };
  }
  let n = 0, d = upTo;
  if (habitDueOn(h, d) && !habitDoneOn(h, ctx[d])) d = addDays(d, -1);
  for (let i = 0; i < 365 && ctx[d]; i++) {
    if (habitDueOn(h, d)) { if (habitDoneOn(h, ctx[d])) n++; else break; }
    d = addDays(d, -1);
  }
  return { n, unit: 'd' };
}

export async function toggleHabit(date, h) {
  return updateDay(date, (d) => { d.habits = d.habits || {}; if (d.habits[h.id]) delete d.habits[h.id]; else d.habits[h.id] = true; });
}

/** % de cumplimiento de hábitos en un rango. */
export function habitCompliance(habits, ctx, dates) {
  let due = 0, done = 0;
  const byCat = {};
  for (const h of habits.filter((x) => x.active)) {
    let hd = 0, hn = 0;
    if (h.freq === 'times') {
      hd = h.times;
      hn = Math.min(dates.filter((d) => habitDoneOn(h, ctx[d])).length, h.times);
    } else {
      for (const d of dates) if (habitDueOn(h, d)) { hd++; if (habitDoneOn(h, ctx[d])) hn++; }
    }
    due += hd; done += hn;
    byCat[h.cat] = byCat[h.cat] || { due: 0, done: 0 };
    byCat[h.cat].due += hd; byCat[h.cat].done += hn;
  }
  return { pct: due ? Math.round((done / due) * 100) : null, due, done, byCat };
}

// ---------------------------------------------------------------------------
// Recuperación
// ---------------------------------------------------------------------------
export async function saveRecovery(date, patch, source = 'manual') {
  const cur = (await db.get('recovery', date)) || { date, sources: {} };
  cur.sources = cur.sources || {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '') continue;
    cur[k] = v; cur.sources[k] = source;
  }
  cur.updatedAt = Date.now();
  delete cur.demo;
  return db.put('recovery', cur);
}

/** Estado de recuperación orientativo (no es un diagnóstico). */
export function recoveryState(rec) {
  if (!rec || (rec.sleepMin == null && rec.fatigue == null && rec.energy == null)) {
    return { level: 'na', label: 'Sin datos', text: 'Registrá tu sueño y cómo te sentís para estimarla.' };
  }
  const goal = sleepGoalMin();
  let score = 0, n = 0;
  if (rec.sleepMin != null) { score += Math.min(rec.sleepMin / goal, 1.1) * 100; n++; }
  if (rec.fatigue != null) { score += (5 - rec.fatigue) / 4 * 100; n++; }
  if (rec.energy != null) { score += (rec.energy - 1) / 4 * 100; n++; }
  if (rec.soreness != null) { score += (5 - rec.soreness) / 4 * 100; n++; }
  const s = score / n;
  if (s >= 75) return { level: 'ok', label: 'Buena', text: 'Buen punto de partida para entrenar con normalidad.' };
  if (s >= 55) return { level: 'warn', label: 'Moderada', text: 'Entrená, pero escuchá al cuerpo y no fuerces de más.' };
  return { level: 'bad', label: 'Baja', text: 'Priorizá descanso, hidratación y una sesión suave.' };
}

// ---------------------------------------------------------------------------
// Running: progresión hacia 5 km
// ---------------------------------------------------------------------------
export async function runPlanStatus() {
  const s = settings();
  const week = Math.min(Math.max(s.run.week, 1), RUN_PLAN.length);
  const works = (await db.all('workouts')).filter((w) => w.type === 'run' && w.planWeek === week && (w.planAttempt || 1) === (s.run.attempt || 1));
  return { week, attempt: s.run.attempt || 1, plan: RUN_PLAN[week - 1], done: works.length, total: RUN_SESSIONS_PER_WEEK, sessions: works, finished: works.length >= RUN_SESSIONS_PER_WEEK, last: week === RUN_PLAN.length };
}
export function advanceRunWeek(repeat = false) {
  updateSettings((s) => {
    if (repeat) s.run.attempt = (s.run.attempt || 1) + 1;
    else { s.run.week = Math.min(s.run.week + 1, RUN_PLAN.length); s.run.attempt = 1; }
  });
}

// ---------------------------------------------------------------------------
// Peso: promedios semanales y lectura de tendencia (nunca juzga ni diagnostica)
// ---------------------------------------------------------------------------
export function weeklyWeights(entries) {
  const byWeek = {};
  for (const e of entries) { const m = mondayOf(e.date); (byWeek[m] = byWeek[m] || []).push(e.kg); }
  return Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).map(([week, arr]) => ({ week, avg: avg(arr), n: arr.length }));
}

export function weightReading(weeks) {
  if (weeks.length < 2) return { tone: 'na', text: 'Con dos semanas de registros vas a ver la comparación. Pesate en condiciones parecidas: a la mañana, antes de desayunar.' };
  const last = weeks[weeks.length - 1], prev = weeks[weeks.length - 2];
  const d = last.avg - prev.avg;
  const recent = weeks.slice(-4);
  const dirs = recent.slice(1).map((w, i) => Math.sign(Math.round((w.avg - recent[i].avg) * 10)));
  const consistent = recent.length >= 3 && dirs.every((x) => x !== 0 && x === dirs[0]);
  if (Math.abs(d) < 0.8 && !consistent) return { tone: 'ok', d, text: 'Variación dentro de lo normal. El peso cambia día a día por agua, comida, horario y entrenamiento.' };
  if (consistent) return { tone: 'info', d, text: `Tendencia ${dirs[0] > 0 ? 'en subida' : 'en bajada'} durante ${recent.length} semanas. Miralo junto con tu energía, sueño y rendimiento, no por separado.` };
  return { tone: 'info', d, text: 'Cambio más marcado que la semana anterior, pero una sola semana no es una tendencia. Mirá cómo sigue.' };
}

export const MEAL_SLOT_IDS = MEAL_SLOTS.map((m) => m.id);
