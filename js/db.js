// Capa mínima sobre IndexedDB. Todo el historial vive en el dispositivo.

const DB_NAME = 'project5k';
const VERSION = 1;

export const STORES = {
  config:   { keyPath: 'key' },   // plan semanal, rutinas, hábitos, registro de cambios
  days:     { keyPath: 'date' },  // estados de bloques, agua, hábitos manuales, nota del día
  recovery: { keyPath: 'date' },  // sueño, FC, pasos, energía, fatiga (con origen por campo)
  weights:  { keyPath: 'id', idx: ['date'] },
  workouts: { keyPath: 'id', idx: ['date'] },
  meals:    { keyPath: 'id', idx: ['date'] },
  tasks:    { keyPath: 'id', idx: ['date'] },
  checkins: { keyPath: 'week' },  // control semanal + informe
  photos:   { keyPath: 'id' },    // fotos de comidas (Blob)
};
export const STORE_NAMES = Object.keys(STORES);

let dbp = null;
export function openDB() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('Este navegador no soporta IndexedDB')); return; }
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const [name, o] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          const s = db.createObjectStore(name, { keyPath: o.keyPath });
          (o.idx || []).forEach((i) => s.createIndex(i, i));
        }
      }
    };
    r.onsuccess = () => {
      const db = r.result;
      db.onversionchange = () => { db.close(); location.reload(); };
      resolve(db);
    };
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('La base de datos está bloqueada por otra pestaña.'));
  });
  return dbp;
}

const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = (t) => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('Transacción cancelada')); });

export async function get(store, key) {
  const db = await openDB();
  return req(db.transaction(store).objectStore(store).get(key));
}
export async function put(store, value) {
  const db = await openDB();
  const t = db.transaction(store, 'readwrite');
  t.objectStore(store).put(value);
  await done(t);
  notify(store);
  return value;
}
export async function bulkPut(store, values) {
  if (!values.length) return;
  const db = await openDB();
  const t = db.transaction(store, 'readwrite');
  const s = t.objectStore(store);
  values.forEach((v) => s.put(v));
  await done(t);
  notify(store);
}
export async function del(store, key) {
  const db = await openDB();
  const t = db.transaction(store, 'readwrite');
  t.objectStore(store).delete(key);
  await done(t);
  notify(store);
}
export async function all(store) {
  const db = await openDB();
  return req(db.transaction(store).objectStore(store).getAll());
}
/** Rango inclusivo por clave primaria o por índice. */
export async function range(store, lo, hi, index) {
  const db = await openDB();
  const s = db.transaction(store).objectStore(store);
  const src = index ? s.index(index) : s;
  return req(src.getAll(IDBKeyRange.bound(lo, hi)));
}
export async function clear(store) {
  const db = await openDB();
  const t = db.transaction(store, 'readwrite');
  t.objectStore(store).clear();
  await done(t);
  notify(store);
}
export async function count(store) {
  const db = await openDB();
  return req(db.transaction(store).objectStore(store).count());
}

// Suscripción simple a cambios (para refrescar vistas).
const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function notify(store) { listeners.forEach((fn) => { try { fn(store); } catch (e) { console.error(e); } }); }
