// Formularios de registro rápido (hojas inferiores). Todo se guarda en IndexedDB.
import * as db from './db.js';
import { sheet, toast, icon, scaleHTML, bindScales, handleError, confirmDialog } from './ui.js';
import { bus } from './bus.js';
import { today, addDays, uid, esc, parseDec, parseClock, fmtClock, fmtPace, fmtDur, toMin, nowMin, fromMin, fmtLong } from './util.js';
import { settings, updateDay, getDay, saveRecovery, recoveryOn, autoCompleteKind, runPlanStatus, getConfig } from './store.js';
import { MEAL_SLOTS, MEAL_IDEAS } from './seed.js';

const done = (msg) => { toast(msg); bus.refresh(); };

// ---------------------------------------------------------------------------
// Menú de registro rápido (+)
// ---------------------------------------------------------------------------
export function openQuickLog() {
  const items = [
    ['water', 'drop', 'Agua', '--c-personal'], ['meal', 'food', 'Comida', '--c-food'], ['sleep', 'moon', 'Sueño', '--c-personal'], ['weight', 'scale', 'Peso', '--c-free'],
    ['run', 'run', 'Running', '--c-sport'], ['bjj', 'bjj', 'BJJ', '--c-sport'], ['wellness', 'bolt', 'Energía', '--c-venture'], ['task', 'task', 'Tarea', '--c-acad'],
  ];
  sheet({
    title: 'Registrar',
    body: `<div class="qgrid">${items.map(([k, ic, l, c]) => `<button class="qbtn" data-q="${k}" style="--cat:var(${c})"><span class="qi">${icon(ic)}</span>${l}</button>`).join('')}</div>
      <div class="list" style="margin-top:14px">
        <button class="li" data-q="mobility"><span class="ico">${icon('habit')}</span><span class="grow title">Movilidad / estiramiento</span>${icon('chev', 'chev')}</button>
        <button class="li" data-q="note"><span class="ico">${icon('note')}</span><span class="grow title">Nota del día</span>${icon('chev', 'chev')}</button>
      </div>`,
    onMount: (b, close) => b.addEventListener('click', async (e) => {
      const q = e.target.closest('[data-q]')?.dataset.q; if (!q) return;
      if (q === 'water') { await addWater(1); close(); return; }
      close();
      setTimeout(() => ({ meal: () => openMealForm(today()), sleep: () => openSleepForm(), weight: () => openWeightForm(), run: () => openRunForm(), bjj: () => openBjjForm(), wellness: () => openWellnessForm(), task: () => openTaskForm(), mobility: () => openMobilityForm(), note: () => openNoteForm() }[q])(), 260);
    }),
  });
}

export async function addWater(n, date = today()) {
  const d = await updateDay(date, (x) => { x.water = Math.max(0, (x.water || 0) + n); });
  toast(n > 0 ? `Agua: ${d.water} de ${settings().goals.water} vasos` : `Agua: ${d.water} vasos`, n > 0 ? { action: 'Deshacer', onAction: () => addWater(-1, date) } : {});
  bus.refresh();
}

// ---------------------------------------------------------------------------
// Peso
// ---------------------------------------------------------------------------
export async function openWeightForm(date = today()) {
  const existing = await db.get('weights', `w-${date}`);
  const m = existing?.measures || {};
  sheet({
    title: 'Registrar peso',
    body: `<form>
      <div class="fields2">
        <label class="field"><span>Peso (kg)</span><input name="kg" inputmode="decimal" required placeholder="0,0" value="${existing ? String(existing.kg).replace('.', ',') : ''}"></label>
        <label class="field"><span>Fecha</span><input name="date" type="date" value="${date}" max="${today()}"></label>
      </div>
      <div class="field"><span>¿Cómo te sentís físicamente?</span>${scaleHTML('feel', existing?.feel, { low: 'Mal', high: 'Excelente' })}</div>
      <details class="acc" style="margin-bottom:14px"><summary>Medidas corporales (opcional)</summary><div>
        <div class="fields3">
          ${[['cintura', 'Cintura'], ['pecho', 'Pecho'], ['cadera', 'Cadera'], ['brazo', 'Brazo'], ['muslo', 'Muslo']].map(([k, l]) => `<label class="field"><span>${l} (cm)</span><input name="m_${k}" inputmode="decimal" value="${m[k] ?? ''}"></label>`).join('')}
        </div>
      </div></details>
      <label class="field"><span>Observaciones</span><textarea name="note" placeholder="Cómo dormiste, si comiste tarde, etc.">${esc(existing?.note || '')}</textarea></label>
      <p class="xs faint" style="margin:-4px 2px 14px">Para comparar bien: pesate a la mañana, después del baño y antes de desayunar.</p>
      <button class="btn primary block lg">Guardar</button>
    </form>`,
    onMount: (b, close) => {
      const read = bindScales(b);
      b.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const kg = parseDec(f.get('kg'));
        if (!kg || kg < 25 || kg > 250) { toast('Ingresá un peso válido.'); return; }
        const d = f.get('date') || date;
        const measures = {};
        for (const k of ['cintura', 'pecho', 'cadera', 'brazo', 'muslo']) { const v = parseDec(f.get('m_' + k)); if (v) measures[k] = v; }
        try {
          if (existing && d !== date) await db.del('weights', existing.id);
          await db.put('weights', { id: `w-${d}`, date: d, kg, feel: read().feel ?? null, note: f.get('note').trim(), measures, source: 'manual', at: Date.now() });
          close(); done('Peso guardado');
        } catch (err) { handleError(err); }
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Sueño
// ---------------------------------------------------------------------------
export async function openSleepForm(date = today()) {
  const rec = await recoveryOn(date);
  const plan = await getConfig('plan');
  const wd = new Date().getDay();
  const prevWd = (wd + 6) % 7;
  const planBed = plan[prevWd]?.blocks.find((x) => x.kind === 'sleep')?.start || '21:00';
  const planWake = plan[wd]?.blocks.find((x) => x.kind === 'wake')?.start || '06:00';
  sheet({
    title: 'Sueño',
    body: `<form>
      <p class="small muted" style="margin:-2px 2px 12px">Noche que terminó el ${esc(fmtLong(date).toLowerCase())}.</p>
      <div class="fields2">
        <label class="field"><span>Me acosté</span><input name="bed" type="time" value="${rec?.bed || planBed}"></label>
        <label class="field"><span>Me desperté</span><input name="wake" type="time" value="${rec?.wake || planWake}"></label>
      </div>
      <div class="card" style="margin-bottom:14px;text-align:center"><div class="eyebrow">Horas dormidas</div><div class="num" style="font-size:32px;font-weight:750" data-dur>—</div><div class="xs faint">Objetivo: ${settings().goals.sleepMinH}–${settings().goals.sleepMaxH} h</div></div>
      <div class="field"><span>Calidad del sueño</span>${scaleHTML('quality', rec?.sleepQuality, { low: 'Muy mala', high: 'Excelente' })}</div>
      <label class="field"><span>FC en reposo (opcional, lpm)</span><input name="hr" inputmode="numeric" value="${rec?.hrRest ?? ''}" placeholder="De Mi Fitness o Apple Health"></label>
      <button class="btn primary block lg">Guardar</button>
    </form>`,
    onMount: (b, close) => {
      const read = bindScales(b);
      const f = b.querySelector('form');
      const calc = () => { const bed = toMin(f.bed.value), wake = toMin(f.wake.value); if (bed == null || wake == null) return null; let m = wake - bed; if (m <= 0) m += 1440; return m; };
      const upd = () => { b.querySelector('[data-dur]').textContent = fmtDur(calc()); };
      f.bed.oninput = f.wake.oninput = upd; upd();
      f.onsubmit = async (e) => {
        e.preventDefault();
        const mins = calc();
        if (!mins || mins > 16 * 60) { toast('Revisá los horarios.'); return; }
        const hr = parseInt(f.hr.value, 10);
        try {
          await saveRecovery(date, { bed: f.bed.value, wake: f.wake.value, sleepMin: mins, sleepQuality: read().quality, hrRest: hr > 25 && hr < 150 ? hr : null });
          close(); done(`Sueño: ${fmtDur(mins)}`);
        } catch (err) { handleError(err); }
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Energía / fatiga / molestias
// ---------------------------------------------------------------------------
export async function openWellnessForm(date = today()) {
  const rec = await recoveryOn(date);
  sheet({
    title: '¿Cómo te sentís hoy?',
    body: `<div class="field"><span>Energía</span>${scaleHTML('energy', rec?.energy, { low: 'Sin energía', high: 'Mucha' })}</div>
      <div class="field"><span>Fatiga</span>${scaleHTML('fatigue', rec?.fatigue, { low: 'Nada', high: 'Mucha' })}</div>
      <div class="field"><span>Dolor muscular</span>${scaleHTML('soreness', rec?.soreness, { low: 'Nada', high: 'Mucho' })}</div>
      <div class="fields2">
        <label class="field"><span>Pasos (opcional)</span><input name="steps" inputmode="numeric" value="${rec?.steps ?? ''}"></label>
        <label class="field"><span>FC media (opcional)</span><input name="hr" inputmode="numeric" value="${rec?.hrAvg ?? ''}"></label>
      </div>
      <button class="btn primary block lg" data-save>Guardar</button>`,
    onMount: (b, close) => {
      const read = bindScales(b);
      b.querySelector('[data-save]').onclick = async () => {
        const v = read();
        const steps = parseInt(b.querySelector('[name=steps]').value.replace(/\D/g, ''), 10);
        const hr = parseInt(b.querySelector('[name=hr]').value, 10);
        try {
          await saveRecovery(date, { energy: v.energy, fatigue: v.fatigue, soreness: v.soreness, steps: steps >= 0 ? steps : null, hrAvg: hr > 30 && hr < 220 ? hr : null });
          close(); done('Registrado');
        } catch (err) { handleError(err); }
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Running / caminata
// ---------------------------------------------------------------------------
export async function openRunForm({ date = today(), timeSec = null, planSession = true, existing = null } = {}) {
  const st = await runPlanStatus();
  const w = existing || {};
  const canPlan = !st.finished || existing?.planWeek;
  sheet({
    title: existing ? 'Editar running' : 'Registrar running',
    body: `<form>
      <div class="seg" style="margin-bottom:14px"><button type="button" data-type="run" class="${w.type !== 'walk' ? 'on' : ''}">Running</button><button type="button" data-type="walk" class="${w.type === 'walk' ? 'on' : ''}">Caminata</button></div>
      <div class="fields2">
        <label class="field"><span>Distancia (km)</span><input name="km" inputmode="decimal" placeholder="0,0" value="${w.distanceKm ? String(w.distanceKm).replace('.', ',') : ''}"></label>
        <label class="field"><span>Tiempo (mm:ss)</span><input name="time" inputmode="numeric" placeholder="30:00" value="${w.timeSec || timeSec ? fmtClock(w.timeSec || timeSec) : ''}"></label>
      </div>
      <div class="row between card" style="margin-bottom:14px;padding:12px 14px"><span class="muted small">Ritmo</span><b class="num" data-pace>—</b></div>
      <div class="fields2">
        <label class="field"><span>FC media (opcional)</span><input name="hr" inputmode="numeric" value="${w.hrAvg ?? ''}" placeholder="lpm"></label>
        <label class="field"><span>Fecha</span><input name="date" type="date" value="${w.date || date}" max="${today()}"></label>
      </div>
      <div class="field"><span>Sensaciones</span>${scaleHTML('feel', w.feel, { low: 'Muy duro', high: 'Muy fácil' })}</div>
      <label class="field"><span>Observaciones</span><textarea name="note" placeholder="Molestias, clima, cómo respiraste…">${esc(w.note || '')}</textarea></label>
      ${canPlan ? `<label class="row card" style="margin-bottom:14px;padding:12px 14px"><span class="grow small">Cuenta como sesión del plan 5K <span class="faint">(semana ${st.week})</span></span><input type="checkbox" class="switch" name="plan" ${(existing ? existing.planWeek : planSession) ? 'checked' : ''}></label>` : ''}
      <button class="btn primary block lg">Guardar</button>
      ${existing ? `<button type="button" class="btn danger block" data-del style="margin-top:10px">Eliminar registro</button>` : ''}
    </form>`,
    onMount: (b, close) => {
      const read = bindScales(b);
      const f = b.querySelector('form');
      let type = w.type === 'walk' ? 'walk' : 'run';
      b.querySelectorAll('[data-type]').forEach((x) => x.onclick = () => { type = x.dataset.type; b.querySelectorAll('[data-type]').forEach((y) => y.classList.toggle('on', y === x)); });
      const upd = () => { const km = parseDec(f.km.value), s = parseClock(f.time.value); b.querySelector('[data-pace]').textContent = km && s ? fmtPace(s / km) : '—'; };
      f.km.oninput = f.time.oninput = upd; upd();
      f.onsubmit = async (e) => {
        e.preventDefault();
        const km = parseDec(f.km.value), sec = parseClock(f.time.value), hr = parseInt(f.hr.value, 10);
        if (!km && !sec) { toast('Ingresá al menos la distancia o el tiempo.'); return; }
        const d = f.date.value || date;
        const isPlan = type === 'run' && f.plan?.checked;
        const rec = {
          id: w.id || uid(), date: d, type, distanceKm: km || null, timeSec: sec || null, paceSec: km && sec ? sec / km : null,
          hrAvg: hr > 30 && hr < 230 ? hr : null, feel: read().feel ?? null, note: f.note.value.trim(), source: 'manual', at: w.at || Date.now(),
          planWeek: isPlan ? (existing?.planWeek || st.week) : null, planAttempt: isPlan ? (existing?.planAttempt || st.attempt) : null,
        };
        try {
          await db.put('workouts', rec);
          if (!existing) await autoCompleteKind(d, type === 'walk' ? 'walk' : 'run');
          close();
          const after = await runPlanStatus();
          if (isPlan && !existing && after.finished) toast(`Semana ${after.week} del plan completa. Revisala en Entrenar.`);
          else done('Running guardado');
          bus.refresh();
        } catch (err) { handleError(err); }
      };
      b.querySelector('[data-del]')?.addEventListener('click', async () => {
        if (await confirmDialog('Eliminar registro', '¿Eliminar este running del historial?', { ok: 'Eliminar', danger: true })) { await db.del('workouts', w.id); close(); done('Eliminado'); }
      });
    },
  });
}

// ---------------------------------------------------------------------------
// BJJ
// ---------------------------------------------------------------------------
export async function openBjjForm({ date = today(), existing = null } = {}) {
  const w = existing || { attended: true, durationMin: 60 };
  sheet({
    title: existing ? 'Editar sesión de BJJ' : 'Sesión de BJJ',
    body: `<form>
      <div class="seg" style="margin-bottom:14px"><button type="button" data-att="1" class="${w.attended !== false ? 'on' : ''}">Asistí</button><button type="button" data-att="0" class="${w.attended === false ? 'on' : ''}">No asistí</button></div>
      <div class="fields2">
        <label class="field"><span>Duración (min)</span><input name="dur" inputmode="numeric" value="${w.durationMin ?? 60}"></label>
        <label class="field"><span>Fecha</span><input name="date" type="date" value="${w.date || date}" max="${today()}"></label>
      </div>
      <div class="field"><span>Intensidad percibida</span>${scaleHTML('rpe', w.rpe, { max: 10, low: 'Muy suave', high: 'Máxima' })}</div>
      <div class="field"><span>Rendimiento</span>${scaleHTML('perf', w.performance, { low: 'Flojo', high: 'Excelente' })}</div>
      <div class="field"><span>Fatiga al terminar</span>${scaleHTML('fatigue', w.fatigue, { low: 'Nada', high: 'Mucha' })}</div>
      <label class="field"><span>Observaciones</span><textarea name="note" placeholder="Técnicas, rolas, molestias…">${esc(w.note || '')}</textarea></label>
      <button class="btn primary block lg">Guardar</button>
      ${existing ? `<button type="button" class="btn danger block" data-del style="margin-top:10px">Eliminar registro</button>` : ''}
    </form>`,
    onMount: (b, close) => {
      const read = bindScales(b);
      const f = b.querySelector('form');
      let att = w.attended !== false;
      b.querySelectorAll('[data-att]').forEach((x) => x.onclick = () => { att = x.dataset.att === '1'; b.querySelectorAll('[data-att]').forEach((y) => y.classList.toggle('on', y === x)); });
      f.onsubmit = async (e) => {
        e.preventDefault();
        const v = read();
        const d = f.date.value || date;
        try {
          await db.put('workouts', { id: w.id || uid(), date: d, type: 'bjj', attended: att, durationMin: parseInt(f.dur.value, 10) || null, rpe: v.rpe ?? null, performance: v.perf ?? null, fatigue: v.fatigue ?? null, note: f.note.value.trim(), source: 'manual', at: w.at || Date.now() });
          if (att && !existing) await autoCompleteKind(d, 'bjj');
          close(); done('Sesión de BJJ guardada');
        } catch (err) { handleError(err); }
      };
      b.querySelector('[data-del]')?.addEventListener('click', async () => {
        if (await confirmDialog('Eliminar registro', '¿Eliminar esta sesión de BJJ?', { ok: 'Eliminar', danger: true })) { await db.del('workouts', w.id); close(); done('Eliminado'); }
      });
    },
  });
}

export function openMobilityForm(date = today()) {
  sheet({
    title: 'Movilidad / estiramiento',
    body: `<form><label class="field"><span>Duración (min)</span><input name="dur" inputmode="numeric" value="15"></label>
      <label class="field"><span>Qué hiciste</span><input name="note" placeholder="Cadera, hombros, espalda…"></label>
      <button class="btn primary block lg">Guardar</button></form>`,
    onMount: (b, close) => {
      b.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        await db.put('workouts', { id: uid(), date, type: 'mobility', durationMin: parseInt(f.dur.value, 10) || null, note: f.note.value.trim(), source: 'manual', at: Date.now() });
        await autoCompleteKind(date, 'mobility');
        close(); done('Movilidad registrada');
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tareas
// ---------------------------------------------------------------------------
export function openTaskForm(task = null) {
  const t = task || { text: '', date: today() };
  const tm = addDays(today(), 1);
  sheet({
    title: task ? 'Editar tarea' : 'Nueva tarea',
    body: `<form>
      <label class="field"><span>Tarea</span><input name="text" required value="${esc(t.text)}" placeholder="Ej.: entregar trabajo de historia"></label>
      <div class="chips" style="margin-bottom:12px">
        <button type="button" class="chip" data-d="${today()}">Hoy</button><button type="button" class="chip" data-d="${tm}">Mañana</button>
      </div>
      <label class="field"><span>Fecha</span><input name="date" type="date" value="${t.date}"></label>
      <button class="btn primary block lg">Guardar</button>
      ${task ? `<button type="button" class="btn danger block" data-del style="margin-top:10px">Eliminar</button>` : ''}
    </form>`,
    onMount: (b, close) => {
      const f = b.querySelector('form');
      b.querySelectorAll('[data-d]').forEach((c) => c.onclick = () => { f.date.value = c.dataset.d; });
      setTimeout(() => { if (!task) f.text.focus(); }, 350);
      f.onsubmit = async (e) => {
        e.preventDefault();
        const text = f.text.value.trim(); if (!text) return;
        await db.put('tasks', { ...t, id: t.id || uid(), text, date: f.date.value || today(), done: t.done || false, at: t.at || Date.now() });
        close(); done('Tarea guardada');
      };
      b.querySelector('[data-del]')?.addEventListener('click', async () => { await db.del('tasks', t.id); close(); done('Tarea eliminada'); });
    },
  });
}

export async function openNoteForm(date = today()) {
  const d = await getDay(date);
  sheet({
    title: 'Nota del día',
    body: `<label class="field"><span>${esc(fmtLong(date))}</span><textarea name="note" style="min-height:160px" placeholder="Cómo fue el día, qué aprendiste, qué querés recordar…">${esc(d.note || '')}</textarea></label>
      <button class="btn primary block lg" data-save>Guardar</button>`,
    onMount: (b, close) => {
      b.querySelector('[data-save]').onclick = async () => { await updateDay(date, (x) => { x.note = b.querySelector('textarea').value.trim(); }); close(); done('Nota guardada'); };
    },
  });
}

// ---------------------------------------------------------------------------
// Comidas (con foto comprimida)
// ---------------------------------------------------------------------------
export function slotForNow() {
  const m = nowMin();
  if (m < 9 * 60) return 'desayuno';
  if (m < 11 * 60 + 30) return 'media';
  if (m < 14 * 60 + 30) return 'almuerzo';
  if (m < 17 * 60 + 30) return 'merienda';
  return 'cena';
}

export async function compressImage(file, max = 960, q = 0.76) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, 'image/jpeg', q));
  } finally { URL.revokeObjectURL(url); }
}

export async function openMealForm(date = today(), slotId = null, existing = null) {
  const meals = await db.range('meals', date, date, 'date');
  const slot = slotId || existing?.slot || slotForNow();
  const m = existing || meals.find((x) => x.slot === slot) || null;
  let photoBlob = null, removePhoto = false;
  let photoUrl = '';
  if (m?.photoId) { const p = await db.get('photos', m.photoId); if (p?.blob) photoUrl = URL.createObjectURL(p.blob); }
  const slotName = MEAL_SLOTS.find((s) => s.id === slot)?.name || 'Comida';
  sheet({
    title: slotName,
    body: `<form>
      <div class="chips" style="margin-bottom:14px">${MEAL_SLOTS.map((s) => `<button type="button" class="chip ${s.id === slot ? 'on' : ''}" data-slot="${s.id}">${s.name}</button>`).join('')}</div>
      <label class="field"><span>¿Qué comiste?</span><textarea name="foods" placeholder="Ej.: arroz, pollo y ensalada">${esc(m?.foods || '')}</textarea></label>
      <div class="fields2">
        <label class="field"><span>Cantidad aproximada</span><input name="qty" value="${esc(m?.qty || '')}" placeholder="Ej.: 1 plato, 2 unidades"></label>
        <label class="field"><span>Hora</span><input name="time" type="time" value="${m?.time || fromMin(nowMin())}"></label>
      </div>
      <div class="field"><span>Foto (opcional)</span>
        <div class="row">
          <img class="photo-thumb ${photoUrl ? '' : 'hidden'}" data-prev src="${photoUrl}" alt="">
          <label class="btn ghost sm">${icon('camera')} <span data-plabel>${photoUrl ? 'Cambiar' : 'Agregar foto'}</span><input type="file" accept="image/*" class="sr" data-file></label>
          <button type="button" class="btn sm ${photoUrl ? '' : 'hidden'}" data-rmphoto>Quitar</button>
        </div>
      </div>
      <details class="acc" style="margin-bottom:14px"><summary>Ideas prácticas</summary><div class="chips" data-ideas></div></details>
      <button class="btn primary block lg">Guardar como realizada</button>
      ${m ? `<button type="button" class="btn danger block" data-del style="margin-top:10px">Eliminar</button>` : ''}
    </form>`,
    onMount: (b, close) => {
      const f = b.querySelector('form');
      let cur = slot;
      const renderIdeas = () => { b.querySelector('[data-ideas]').innerHTML = (MEAL_IDEAS[cur] || []).map((i) => `<button type="button" class="chip" data-idea="${esc(i)}">${esc(i)}</button>`).join(''); };
      renderIdeas();
      b.addEventListener('click', (e) => {
        const s = e.target.closest('[data-slot]'); if (s) { cur = s.dataset.slot; b.querySelectorAll('[data-slot]').forEach((x) => x.classList.toggle('on', x === s)); renderIdeas(); }
        const i = e.target.closest('[data-idea]'); if (i) { f.foods.value = i.dataset.idea; }
      });
      b.querySelector('[data-file]').onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try {
          photoBlob = await compressImage(file); removePhoto = false;
          const prev = b.querySelector('[data-prev]'); prev.src = URL.createObjectURL(photoBlob); prev.classList.remove('hidden');
          b.querySelector('[data-plabel]').textContent = 'Cambiar'; b.querySelector('[data-rmphoto]').classList.remove('hidden');
        } catch { toast('No se pudo leer la imagen.'); }
      };
      b.querySelector('[data-rmphoto]').onclick = () => { photoBlob = null; removePhoto = true; b.querySelector('[data-prev]').classList.add('hidden'); b.querySelector('[data-rmphoto]').classList.add('hidden'); b.querySelector('[data-plabel]').textContent = 'Agregar foto'; };
      f.onsubmit = async (e) => {
        e.preventDefault();
        try {
          const other = meals.find((x) => x.slot === cur && x.id !== m?.id);
          const rec = { ...(other || m || {}), id: other?.id || m?.id || uid(), date, slot: cur, foods: f.foods.value.trim(), qty: f.qty.value.trim(), time: f.time.value, done: true, at: Date.now() };
          delete rec.demo;
          if (photoBlob) { const pid = rec.photoId || uid(); await db.put('photos', { id: pid, blob: photoBlob }); rec.photoId = pid; }
          else if (removePhoto && rec.photoId) { await db.del('photos', rec.photoId); delete rec.photoId; }
          if (m && other && m.id !== other.id) await db.del('meals', m.id);
          await db.put('meals', rec);
          close(); done(`${MEAL_SLOTS.find((s) => s.id === cur).name} registrada`);
        } catch (err) { handleError(err); }
      };
      b.querySelector('[data-del]')?.addEventListener('click', async () => {
        if (m.photoId) await db.del('photos', m.photoId);
        await db.del('meals', m.id); close(); done('Comida eliminada');
      });
    },
    onClose: () => { if (photoUrl) URL.revokeObjectURL(photoUrl); },
  });
}

/** Marca/desmarca una franja como realizada con un toque. */
export async function toggleMealSlot(date, slot) {
  const meals = await db.range('meals', date, date, 'date');
  const m = meals.find((x) => x.slot === slot);
  if (m) { m.done = !m.done; delete m.demo; await db.put('meals', m); }
  else await db.put('meals', { id: uid(), date, slot, foods: '', qty: '', time: fromMin(nowMin()), done: true, at: Date.now() });
  bus.refresh();
  return !m || m.done;
}
