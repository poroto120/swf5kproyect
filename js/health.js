// Importación de datos de Apple Health mediante un Atajo de iOS.
// El Atajo copia un texto con formato "clave: valor" al portapapeles y la app lo lee.
// No existe API de Xiaomi ni conexión Bluetooth: el camino es Mi Fitness → Apple Health → Atajo → PROJECT 5K.
import { parseDec, today, ymd } from './util.js';

export const FIELDS = {
  steps:      { label: 'Pasos', unit: '', keys: ['pasos', 'steps'], int: true, min: 0, max: 100000 },
  sleepMin:   { label: 'Sueño', unit: 'min', keys: ['sueno_min', 'sueño_min', 'sueno', 'sueño', 'sleep', 'sueno_h', 'sueño_h'], sleep: true },
  hrRest:     { label: 'FC en reposo', unit: 'lpm', keys: ['fc_reposo', 'fcreposo', 'resting_hr', 'frecuencia_reposo'], int: true, min: 25, max: 150 },
  hrAvg:      { label: 'FC media', unit: 'lpm', keys: ['fc_media', 'fc', 'heart_rate', 'frecuencia_cardiaca'], int: true, min: 30, max: 220 },
  distanceKm: { label: 'Distancia', unit: 'km', keys: ['distancia_km', 'distancia', 'distance'], min: 0, max: 100 },
  activeKcal: { label: 'Calorías activas', unit: 'kcal', keys: ['kcal_activas', 'calorias_activas', 'energia_activa', 'active_energy'], int: true, min: 0, max: 8000 },
  workoutMin: { label: 'Entrenamiento', unit: 'min', keys: ['entreno_min', 'entrenamiento_min', 'workout_min'], int: true, min: 0, max: 600 },
  weightKg:   { label: 'Peso', unit: 'kg', keys: ['peso_kg', 'peso', 'weight'], min: 25, max: 250 },
};

const norm = (k) => k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

/** Duración de sueño en minutos desde distintos formatos posibles del Atajo. */
export function parseSleep(raw, key = '') {
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  const hm = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const hh = s.match(/(\d+[.,]?\d*)\s*(h|hr|hrs|hora|horas)\b/);
  const mm = s.match(/(\d+)\s*(min|m)\b/);
  if (hh || mm) return Math.round((hh ? parseDec(hh[1]) * 60 : 0) + (mm ? Number(mm[1]) : 0));
  const n = parseDec(s);
  if (n == null) return null;
  if (/_h$/.test(key)) return Math.round(n * 60);
  if (n > 1440) return Math.round(n / 60); // segundos
  if (n <= 24) return Math.round(n * 60);  // horas
  return Math.round(n);                    // minutos
}

function parseValue(field, raw, key) {
  const f = FIELDS[field];
  if (raw == null || String(raw).trim() === '') return null;
  if (f.sleep) { const v = parseSleep(raw, key); return v && v > 30 && v < 16 * 60 ? v : null; }
  let v;
  if (f.int) {
    const s = String(raw).trim();
    // "8.432" o "8,432" como separador de miles → 8432; "72,5" → 72.5 → 73
    v = /^\d{1,3}([.,]\d{3})+$/.test(s) ? Number(s.replace(/[.,]/g, '')) : parseDec(s);
    v = v == null ? null : Math.round(v);
  } else v = parseDec(raw);
  if (v == null || !isFinite(v)) return null;
  if (field === 'distanceKm' && v > 100) v = v / 1000; // vino en metros
  if (v < f.min || v > f.max) return null;
  return v;
}

/** Devuelve { date, values: {campo: valor}, unknown: [...], error } */
export function parseHealthText(text) {
  if (!text || !String(text).trim()) return { error: 'El portapapeles está vacío.' };
  const raw = String(text).trim();
  let pairs = [];
  if (raw.startsWith('{')) {
    try { pairs = Object.entries(JSON.parse(raw)); } catch { return { error: 'El texto parece JSON pero no es válido.' }; }
  } else {
    for (const line of raw.split(/\r?\n|;/)) {
      const m = line.match(/^\s*([^:=]+?)\s*[:=]\s*(.*?)\s*$/);
      if (m) pairs.push([m[1], m[2]]);
    }
  }
  if (!pairs.length) return { error: 'No encontré datos con formato "clave: valor".' };
  const values = {}, unknown = [];
  let date = null;
  for (const [k0, v] of pairs) {
    const k = norm(k0);
    if (k === 'fecha' || k === 'date') {
      const d = String(v).trim();
      const iso = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const dmy = d.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
      if (iso) date = `${iso[1]}-${iso[2]}-${iso[3]}`;
      else if (dmy) date = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
      continue;
    }
    if (k === 'p5k') continue;
    const field = Object.keys(FIELDS).find((f) => FIELDS[f].keys.includes(k));
    if (!field) { if (k) unknown.push(k0); continue; }
    const val = parseValue(field, v, k);
    if (val != null) values[field] = val;
  }
  if (!Object.keys(values).length) return { error: 'No pude leer ningún valor válido. Revisá el formato del Atajo.', unknown };
  if (date && date > today()) date = today();
  return { date: date || today(), values, unknown };
}

export const SHORTCUT_TEMPLATE = `P5K
fecha: [Fecha formateada aaaa-MM-dd]
pasos: [Suma de pasos de hoy]
sueno_min: [Suma de duración del sueño]
fc_reposo: [FC en reposo más reciente]
fc_media: [Promedio de FC de hoy]
distancia_km: [Distancia caminando + corriendo]
kcal_activas: [Energía activa de hoy]
peso_kg: [Peso más reciente]`;

export const SAMPLE = `P5K
fecha: ${ymd()}
pasos: 8.432
sueno_min: 495
fc_reposo: 58
fc_media: 74
distancia_km: 6,1
kcal_activas: 420`;
