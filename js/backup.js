// Copias de seguridad (JSON), datos de demostración y borrado.
import * as db from './db.js';
import { settings, updateSettings, replaceSettings, clearCache, getConfig, dayBlocks } from './store.js';
import { MEAL_SLOTS } from './seed.js';
import { today, addDays, uid, weekday, mondayOf, isoWeek } from './util.js';
import { shareFile } from './reminders.js';

const blobToDataURL = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
const dataURLToBlob = async (u) => (await fetch(u)).blob();

export async function exportBackup({ photos = false } = {}) {
  const stores = {};
  for (const name of db.STORE_NAMES) {
    if (name === 'photos') continue;
    stores[name] = await db.all(name);
  }
  if (photos) {
    stores.photos = [];
    for (const p of await db.all('photos')) stores.photos.push({ id: p.id, data: await blobToDataURL(p.blob) });
  }
  const payload = { app: 'PROJECT 5K', format: 1, exportedAt: new Date().toISOString(), settings: settings(), stores };
  const text = JSON.stringify(payload);
  const name = `project5k-copia-${today()}.json`;
  const result = await shareFile(new Blob([text], { type: 'application/json' }), name, 'Copia de seguridad PROJECT 5K');
  if (result !== 'aborted') updateSettings((s) => { s.lastBackup = new Date().toISOString(); });
  return { result, size: text.length };
}

export function validateBackup(obj) {
  if (!obj || obj.app !== 'PROJECT 5K' || !obj.stores || typeof obj.stores !== 'object') return 'El archivo no es una copia de PROJECT 5K.';
  for (const [k, v] of Object.entries(obj.stores)) {
    if (!db.STORE_NAMES.includes(k)) return `Contiene una sección desconocida: ${k}.`;
    if (!Array.isArray(v)) return `La sección ${k} está dañada.`;
  }
  return null;
}

export function summarize(obj) {
  const c = (k) => obj.stores[k]?.length || 0;
  return { days: c('days'), weights: c('weights'), workouts: c('workouts'), meals: c('meals'), recovery: c('recovery'), checkins: c('checkins'), photos: c('photos'), exportedAt: obj.exportedAt };
}

export async function importBackup(obj, mode = 'replace') {
  const err = validateBackup(obj);
  if (err) throw new Error(err);
  if (mode === 'replace') for (const n of db.STORE_NAMES) await db.clear(n);
  for (const [name, rows] of Object.entries(obj.stores)) {
    if (name === 'photos') {
      const out = [];
      for (const p of rows) { try { out.push({ id: p.id, blob: await dataURLToBlob(p.data) }); } catch {} }
      await db.bulkPut('photos', out);
    } else await db.bulkPut(name, rows);
  }
  if (mode === 'replace' && obj.settings) replaceSettings({ ...obj.settings, onboarded: true, lastBackup: obj.exportedAt || obj.settings.lastBackup || null });
  clearCache();
}

export async function wipeAll() {
  for (const n of db.STORE_NAMES) await db.clear(n);
  localStorage.clear();
  sessionStorage.clear();
  clearCache();
}

export async function storageInfo() {
  const out = { persisted: null, usage: null, quota: null };
  try { out.persisted = await navigator.storage?.persisted?.(); } catch {}
  try { const e = await navigator.storage?.estimate?.(); if (e) { out.usage = e.usage; out.quota = e.quota; } } catch {}
  return out;
}
export async function requestPersist() { try { return await navigator.storage?.persist?.(); } catch { return false; } }

// ---------------------------------------------------------------------------
// Datos de demostración (claramente marcados con demo:true y eliminables)
// ---------------------------------------------------------------------------
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export async function loadDemo() {
  const end = addDays(today(), -1);
  const start = addDays(end, -20);
  const exists = async (store, key) => !!(await db.get(store, key));
  const start0 = settings().profile.startWeight || 80;
  const routines = await getConfig('routines');
  const days = [], recs = [], works = [], meals = [], weights = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const wd = weekday(d);
    if (!(await exists('days', d))) {
      const { blocks } = await dayBlocks(d);
      const statuses = {};
      for (const b of blocks.filter((x) => x.track)) {
        const r = Math.random();
        if (b.optional && r < 0.6) continue;
        statuses[b.id] = { s: r < 0.74 ? 'done' : r < 0.84 ? 'skipped' : r < 0.92 ? 'postponed' : 'modified', kind: b.kind, title: b.title, at: Date.now() };
      }
      days.push({ date: d, statuses, water: Math.round(rnd(4, 9)), habits: {}, note: '', demo: true });
    }
    if (!(await exists('recovery', d))) {
      const sleep = Math.round(rnd(6.8, 9.6) * 60);
      recs.push({ date: d, bed: pick(['21:00', '21:15', '21:40', '22:10', '22:30']), wake: wd === 0 || wd === 6 ? '07:30' : '06:00', sleepMin: sleep, sleepQuality: Math.round(rnd(2.5, 5)), energy: Math.round(rnd(2.5, 5)), fatigue: Math.round(rnd(1.5, 4)), soreness: Math.round(rnd(1, 3.5)), hrRest: Math.round(rnd(56, 66)), steps: Math.round(rnd(5000, 12000)), sources: {}, demo: true });
    }
    for (const s of MEAL_SLOTS) if (Math.random() < 0.8) meals.push({ id: 'demo-' + uid(), date: d, slot: s.id, foods: '', qty: '', time: s.time, done: true, demo: true, at: Date.now() });
    if (wd === 2 || wd === 4) {
      const r = routines[wd === 2 ? 'A' : 'B'];
      const sets = r.items.flatMap((it) => Array.from({ length: it.sets }, (_, k) => ({ ex: it.ex, set: k + 1, ...(it.secs ? { secs: it.secs } : { reps: Math.round(rnd(it.min, it.max)) }) })));
      works.push({ id: 'demo-' + uid(), date: d, type: 'calisthenics', routine: r.id, sets, durationMin: Math.round(rnd(32, 45)), rpe: Math.round(rnd(5, 8)), demo: true, at: Date.now() });
    }
    if ([1, 3, 5].includes(wd) && Math.random() < 0.9) works.push({ id: 'demo-' + uid(), date: d, type: 'bjj', attended: true, durationMin: 60, rpe: Math.round(rnd(5, 9)), performance: Math.round(rnd(2, 5)), fatigue: Math.round(rnd(2, 4)), demo: true, at: Date.now() });
    if ([2, 6].includes(wd) || (wd === 4 && Math.random() < 0.5)) {
      const km = Math.round(rnd(1.8, 3.6) * 10) / 10, t = Math.round(km * rnd(400, 480));
      works.push({ id: 'demo-' + uid(), date: d, type: 'run', distanceKm: km, timeSec: t, paceSec: t / km, feel: Math.round(rnd(2, 5)), demo: true, at: Date.now() });
    }
    if (wd === 0) weights.push({ id: `demo-w-${d}`, date: d, kg: Math.round((start0 + rnd(-0.6, 0.6)) * 10) / 10, feel: Math.round(rnd(3, 5)), note: '', measures: {}, source: 'manual', demo: true, at: Date.now() });
  }
  await db.bulkPut('days', days); await db.bulkPut('recovery', recs); await db.bulkPut('workouts', works); await db.bulkPut('meals', meals); await db.bulkPut('weights', weights);
  updateSettings((s) => { s.demo = true; });
  return days.length + recs.length + works.length + meals.length + weights.length;
}

export async function removeDemo() {
  let n = 0;
  for (const name of ['days', 'recovery', 'workouts', 'meals', 'weights', 'checkins']) {
    const store = db.STORES[name];
    for (const r of await db.all(name)) if (r.demo) { await db.del(name, r[store.keyPath]); n++; }
  }
  updateSettings((s) => { s.demo = false; });
  return n;
}
