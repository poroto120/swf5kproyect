// TRAINING CENTER — calistenia, running (plan 5K) y BJJ.
import * as db from '../db.js';
import { getConfig, setConfig, runPlanStatus, advanceRunWeek, settings, isDeload } from '../store.js';
import { EXERCISES, RUN_PLAN, runIntervals } from '../seed.js';
import { figure } from '../figures.js';
import { barChart, lineChart } from '../charts.js';
import { today, esc, fmtShort, fmtClock, fmtPace, weekDates, mondayOf, addDays, fmtNum1, DAYS_S, weekday, round1 } from '../util.js';
import { icon, bind, sheet, toast, topbarSm } from '../ui.js';
import { bus } from '../bus.js';
import { openRunForm, openBjjForm, openMobilityForm } from '../quicklog.js';

export const repsText = (it) => it.secs ? `${it.secs} s` : it.min === it.max ? `${it.max}` : `${it.min}–${it.max}`;
const perSideTxt = (ex) => ex.perSide ? ' por lado' : '';
export function routineMinutes(r) {
  let s = 0;
  for (const it of r.items) { const ex = EXERCISES[it.ex]; const work = it.secs ? it.secs * (ex.perSide ? 2 : 1) : (it.max || 10) * 3.2 * (ex.perSide ? 2 : 1); s += it.sets * work + (it.sets - 1) * (it.rest ?? ex.rest) + 30; }
  return Math.round(s / 60);
}

export async function calisHistory() {
  return (await db.all('workouts')).filter((w) => w.type === 'calisthenics').sort((a, b) => (b.date + (b.at || 0)).localeCompare(a.date + (a.at || 0)));
}
export function exerciseStats(hist, exId) {
  let pr = 0, last = null;
  for (const w of hist) {
    const sets = (w.sets || []).filter((s) => s.ex === exId);
    if (!sets.length) continue;
    if (!last) last = { date: w.date, sets };
    for (const s of sets) pr = Math.max(pr, s.reps || s.secs || 0);
  }
  return { pr, last };
}
const setsTxt = (sets) => sets.map((s) => (s.secs ? `${s.secs}s` : s.reps)).join(' · ');

export function activeWorkout() { try { return JSON.parse(localStorage.getItem('p5k:active') || 'null'); } catch { return null; } }

// ---------------------------------------------------------------------------
export async function render(el, params) {
  const sub = params[0];
  if (sub === 'rutina') return renderRoutine(el, params[1] || 'A');
  if (sub === 'correr') return renderRun(el);
  if (sub === 'bjj') return renderBjj(el);
  if (sub === 'historial') return renderHistory(el);
  return renderHub(el);
}

async function renderHub(el) {
  const date = today();
  const routines = await getConfig('routines');
  const works = await db.all('workouts');
  const week = weekDates(date);
  const inWeek = works.filter((w) => w.date >= week[0] && w.date <= week[6]);
  const calis = inWeek.filter((w) => w.type === 'calisthenics').length;
  const runs = inWeek.filter((w) => w.type === 'run').length;
  const bjj = inWeek.filter((w) => w.type === 'bjj' && w.attended !== false).length;
  const run = await runPlanStatus();
  const active = activeWorkout();
  const recent = works.sort((a, b) => (b.date + (b.at || 0)).localeCompare(a.date + (a.at || 0))).slice(0, 6);
  const hist = works.filter((w) => w.type === 'calisthenics');
  const lastBjj = works.filter((w) => w.type === 'bjj').sort((a, b) => b.date.localeCompare(a.date))[0];
  const deload = isDeload();
  const runPrs = works.filter((w) => w.type === 'run');
  const maxKm = Math.max(0, ...runPrs.map((w) => w.distanceKm || 0));

  const rcard = (r) => {
    const figs = r.items.slice(0, 4).map((it) => figure(EXERCISES[it.ex].pose, { animate: false, thick: true })).join('');
    const isToday = weekday(date) === r.day;
    return `<div class="routine-card">
      <div class="row between"><div><div class="eyebrow">${esc(r.note)}${isToday ? ' · hoy' : ''}</div><div style="font-size:20px;font-weight:750;letter-spacing:-.02em;margin-top:2px">${esc(r.name)}</div></div>
        <span class="pill">${r.items.length} ejercicios · ~${routineMinutes(r)} min</span></div>
      <div class="figs" style="--fig-bg:var(--surface)">${figs}</div>
      <div class="row"><a class="btn primary grow" href="#/play/${r.id}">${icon('play')} Empezar</a><a class="btn" href="#/entrenar/rutina/${r.id}">Ver rutina</a></div>
    </div>`;
  };

  el.innerHTML = `<header class="topbar"><div><div class="eyebrow">Training center</div><h1>Entrenar</h1></div></header>
    ${active ? `<a class="banner" href="#/play/${esc(active.routine)}"><span class="bi">${icon('play')}</span><div class="grow"><b>Entrenamiento en curso</b><p>${esc(routines[active.routine]?.name || '')} · tocá para continuar</p></div>${icon('chev', 'chev')}</a>` : ''}
    ${deload ? `<div class="banner info"><span class="bi">${icon('moon')}</span><div class="grow"><b>Semana liviana activa</b><p>Las rutinas tienen una serie menos por ejercicio.</p></div></div>` : ''}
    <div class="grid3">
      <div class="stat"><div class="label">Calistenia</div><div class="value">${calis}<small>/2</small></div><div class="bar"><i style="width:${Math.min(calis / 2, 1) * 100}%"></i></div></div>
      <div class="stat"><div class="label">Running</div><div class="value">${runs}<small>/3</small></div><div class="bar"><i style="width:${Math.min(runs / 3, 1) * 100}%"></i></div></div>
      <div class="stat"><div class="label">BJJ</div><div class="value">${bjj}<small>/3</small></div><div class="bar"><i style="width:${Math.min(bjj / 3, 1) * 100}%"></i></div></div>
    </div>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Calistenia en casa</h2></div>
      <div class="stack">${rcard(routines.A)}${rcard(routines.B)}</div>
    </section>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Running · Plan 5K</h2><a class="link" href="#/entrenar/correr">Plan completo</a></div>
      <div class="card">
        <div class="row between"><div><div class="eyebrow">Semana ${run.week} de ${RUN_PLAN.length}${run.attempt > 1 ? ` · repetición ${run.attempt - 1}` : ''}</div><div style="font-weight:700;font-size:17px;margin-top:3px">${esc(run.plan.label)}</div></div>
          <div class="num" style="font-size:22px;font-weight:750">${run.done}<small class="muted" style="font-size:14px">/${run.total}</small></div></div>
        <div class="interval-list" style="margin:12px 0">${runIntervals(run.week).map((i) => `<i class="${i.t}" style="flex:${i.s}"></i>`).join('')}</div>
        ${run.finished ? `<p class="small muted" style="margin-bottom:10px">Completaste la semana. ¿Seguimos?</p>
          <div class="grid2"><button class="btn primary" data-act="runNext">${run.last ? 'Plan terminado' : `Pasar a semana ${run.week + 1}`}</button><button class="btn" data-act="runRepeat">Repetir semana</button></div>` :
          `<div class="row"><a class="btn primary grow" href="#/play-run">${icon('play')} Sesión guiada</a><button class="btn" data-act="logRun">Registrar</button></div>`}
        <p class="xs faint" style="margin-top:10px">Ritmo conversacional: si no podés hablar, bajá la velocidad o caminá. Nunca dos sesiones intensas seguidas.</p>
      </div>
    </section>

    <section class="section"><div class="section-head"><h2 class="eyebrow">BJJ</h2><a class="link" href="#/entrenar/bjj">Historial</a></div>
      <div class="card">
        <div class="row between"><div><div style="font-weight:650">${bjj} de 3 sesiones esta semana</div>
          <div class="small muted" style="margin-top:2px">${lastBjj ? `Última: ${esc(fmtShort(lastBjj.date))}${lastBjj.rpe ? ` · intensidad ${lastBjj.rpe}/10` : ''}${lastBjj.attended === false ? ' · no asistió' : ''}` : 'Sin sesiones registradas'}</div></div>
          <button class="btn primary sm" data-act="logBjj">${icon('plus')} Sesión</button></div>
      </div>
    </section>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Récords personales</h2></div>
      <div class="list">${[...Object.values(routines).flatMap((r) => r.items)].filter((it, i, a) => a.findIndex((x) => x.ex === it.ex) === i).map((it) => ({ it, st: exerciseStats(hist, it.ex) })).filter((x) => x.st.pr).slice(0, 6)
        .map(({ it, st }) => `<div class="li"><div class="ex-thumb" style="--fig-bg:var(--surface-2)">${figure(EXERCISES[it.ex].pose, { animate: false, thick: true })}</div><div class="grow"><div class="title">${esc(EXERCISES[it.ex].name)}</div><div class="sub">Mejor serie</div></div><b class="num" style="font-size:18px">${st.pr}${EXERCISES[it.ex].type === 'time' ? ' s' : ''}</b></div>`).join('')
        || `<div class="empty">Completá una rutina para ver tus récords.</div>`}
        ${maxKm ? `<div class="li"><span class="ico">${icon('run')}</span><div class="grow"><div class="title">Running más largo</div></div><b class="num" style="font-size:18px">${fmtNum1(maxKm)} km</b></div>` : ''}
      </div>
    </section>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Últimos entrenamientos</h2><a class="link" href="#/entrenar/historial">Todo</a></div>
      ${historyList(recent, routines)}
      <button class="btn block" data-act="mobility" style="margin-top:10px">${icon('habit')} Registrar movilidad</button>
    </section>`;

  bind(el, {
    logRun: () => openRunForm(),
    logBjj: () => openBjjForm(),
    mobility: () => openMobilityForm(),
    runNext: () => { if (run.last) { toast('¡Plan completo! Repetí la semana 12 o seguí registrando tus salidas.'); return; } advanceRunWeek(false); toast(`Semana ${run.week + 1} activada`); bus.refresh(); },
    runRepeat: () => { advanceRunWeek(true); toast(`Repetís la semana ${run.week}`); bus.refresh(); },
    w: (b) => openWorkout(b.dataset.id),
  });
}

export function historyList(list, routines) {
  if (!list.length) return '<div class="list"><div class="empty">Todavía no registraste entrenamientos.</div></div>';
  const ico = { calisthenics: 'dumbbell', run: 'run', walk: 'run', bjj: 'bjj', mobility: 'habit' };
  const title = (w) => w.type === 'calisthenics' ? (routines[w.routine]?.name || 'Calistenia') : w.type === 'run' ? 'Running' : w.type === 'walk' ? 'Caminata' : w.type === 'bjj' ? (w.attended === false ? 'BJJ (no asistió)' : 'BJJ') : 'Movilidad';
  const sub = (w) => w.type === 'calisthenics' ? `${(w.sets || []).length} series · ${w.durationMin || '—'} min${w.rpe ? ` · esfuerzo ${w.rpe}/10` : ''}` :
    (w.type === 'run' || w.type === 'walk') ? [w.distanceKm ? `${fmtNum1(w.distanceKm)} km` : '', w.timeSec ? fmtClock(w.timeSec) : '', w.paceSec ? fmtPace(w.paceSec) : '', w.planWeek ? `plan S${w.planWeek}` : ''].filter(Boolean).join(' · ') :
    w.type === 'bjj' ? [w.durationMin ? `${w.durationMin} min` : '', w.rpe ? `intensidad ${w.rpe}/10` : '', w.fatigue ? `fatiga ${w.fatigue}/5` : ''].filter(Boolean).join(' · ') : `${w.durationMin || '—'} min`;
  return `<div class="list">${list.map((w) => `<button class="li" data-act="w" data-id="${w.id}"><span class="ico">${icon(ico[w.type] || 'dumbbell')}</span><div class="grow"><div class="title">${esc(title(w))}${w.demo ? ' <span class="src demo">Demo</span>' : ''}</div><div class="sub">${esc(fmtShort(w.date))} · ${esc(sub(w))}</div></div>${icon('chev', 'chev')}</button>`).join('')}</div>`;
}

async function openWorkout(id) {
  const w = await db.get('workouts', id);
  if (!w) return;
  if (w.type === 'run' || w.type === 'walk') return openRunForm({ existing: w });
  if (w.type === 'bjj') return openBjjForm({ existing: w });
  const routines = await getConfig('routines');
  const byEx = {};
  for (const s of w.sets || []) (byEx[s.ex] = byEx[s.ex] || []).push(s);
  sheet({
    title: w.type === 'calisthenics' ? (routines[w.routine]?.name || 'Calistenia') : 'Movilidad',
    body: `<p class="small muted" style="margin:-4px 2px 12px">${esc(fmtShort(w.date))} · ${w.durationMin || '—'} min${w.rpe ? ` · esfuerzo ${w.rpe}/10` : ''}</p>
      ${Object.keys(byEx).length ? `<div class="list">${Object.entries(byEx).map(([ex, sets]) => `<div class="li"><div class="grow"><div class="title">${esc(EXERCISES[ex]?.name || ex)}</div></div><span class="num muted">${esc(setsTxt(sets))}</span></div>`).join('')}</div>` : ''}
      ${w.note ? `<div class="card" style="margin-top:12px"><div class="eyebrow">Notas</div><p style="margin-top:4px">${esc(w.note)}</p></div>` : ''}
      <button class="btn danger block" data-del style="margin-top:14px">Eliminar registro</button>`,
    onMount: (b, close) => b.querySelector('[data-del]').onclick = async () => { await db.del('workouts', w.id); close(); toast('Eliminado'); bus.refresh(); },
  });
}

// ---------------------------------------------------------------------------
async function renderRoutine(el, id) {
  const routines = await getConfig('routines');
  const r = routines[id];
  if (!r) { el.innerHTML = '<div class="empty">Rutina no encontrada.</div>'; return; }
  const hist = await calisHistory();
  el.innerHTML = `${topbarSm(r.name, '#/entrenar')}
    <p class="muted small" style="margin:-4px 2px 14px">${esc(r.note)} · ${r.items.length} ejercicios · ~${routineMinutes(r)} min · en casa, sin equipamiento${id === 'B' ? ' (una silla firme)' : ''}</p>
    <div class="list" style="--fig-bg:var(--surface-2)">
      ${r.items.map((it, i) => { const ex = EXERCISES[it.ex]; const st = exerciseStats(hist, it.ex); return `<button class="ex-row" data-act="ex" data-i="${i}">
        <div class="ex-thumb">${figure(ex.pose, { animate: false, hl: ex.hl, thick: true })}</div>
        <div class="grow"><div style="font-weight:600">${esc(ex.name)}</div><div class="xs muted">${it.sets} × ${repsText(it)}${perSideTxt(ex)} · descanso ${it.rest ?? ex.rest}s</div>
        ${st.last ? `<div class="xs faint">Última: ${esc(setsTxt(st.last.sets))}${st.pr ? ` · récord ${st.pr}${ex.type === 'time' ? 's' : ''}` : ''}</div>` : ''}</div>${icon('chev', 'chev')}</button>`; }).join('')}
    </div>
    <a class="btn primary block lg" href="#/play/${id}" style="margin-top:16px">${icon('play')} Empezar ${esc(r.name)}</a>
    <p class="xs faint" style="margin:12px 4px">Tocá un ejercicio para ver la técnica o ajustar series y repeticiones. Si sentís dolor (no esfuerzo), pará y usá la variante más fácil.</p>`;
  bind(el, { ex: (b) => exerciseSheet(routines, id, Number(b.dataset.i), hist) });
}

function exerciseSheet(routines, rid, i, hist) {
  const it = routines[rid].items[i];
  const ex = EXERCISES[it.ex];
  const st = exerciseStats(hist, it.ex);
  const sessions = hist.filter((w) => (w.sets || []).some((s) => s.ex === it.ex)).slice(0, 8).reverse();
  const series = sessions.map((w) => ({ x: fmtShort(w.date), y: Math.max(...w.sets.filter((s) => s.ex === it.ex).map((s) => s.reps || s.secs || 0)) }));
  sheet({
    title: ex.name,
    body: `<div class="fig-stage">${figure(ex.pose, { hl: ex.hl })}</div>
      <p style="margin:12px 2px">${esc(ex.desc)}</p>
      <div class="eyebrow" style="margin:14px 2px 6px">Técnica correcta</div><ol class="tech">${ex.tech.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
      <div class="eyebrow" style="margin:14px 2px 6px">Errores comunes</div><ul class="tech">${ex.errors.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="banner info" style="margin-top:14px"><span class="bi">${icon('info')}</span><div class="grow"><b>Variante más fácil</b><p>${esc(ex.easier)}</p></div></div>
      ${series.length > 1 ? `<div class="eyebrow" style="margin:14px 2px 6px">Mejor serie por sesión</div><div class="card">${lineChart({ points: series, height: 120 })}</div>` : ''}
      <div class="eyebrow" style="margin:16px 2px 8px">Ajustar en la rutina</div>
      <form>
        <div class="fields3">
          <label class="field"><span>Series</span><input name="sets" inputmode="numeric" value="${it.sets}"></label>
          ${it.secs ? `<label class="field"><span>Segundos</span><input name="secs" inputmode="numeric" value="${it.secs}"></label><span></span>` :
          `<label class="field"><span>Reps mín.</span><input name="min" inputmode="numeric" value="${it.min}"></label><label class="field"><span>Reps máx.</span><input name="max" inputmode="numeric" value="${it.max}"></label>`}
        </div>
        <label class="field"><span>Descanso (segundos)</span><input name="rest" inputmode="numeric" value="${it.rest ?? ex.rest}"></label>
        <button class="btn primary block">Guardar cambios</button>
      </form>
      ${st.pr ? `<p class="xs faint center" style="margin-top:12px">Récord: ${st.pr}${ex.type === 'time' ? ' s' : ' repeticiones'} en una serie</p>` : ''}`,
    onMount: (b, close) => {
      b.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        const n = (v, lo, hi) => { const x = parseInt(v, 10); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : null; };
        it.sets = n(f.sets.value, 1, 8) ?? it.sets;
        if (it.secs) it.secs = n(f.secs.value, 5, 300) ?? it.secs;
        else { it.min = n(f.min.value, 1, 100) ?? it.min; it.max = Math.max(it.min, n(f.max.value, 1, 100) ?? it.max); }
        it.rest = n(f.rest.value, 10, 300) ?? it.rest;
        await setConfig('routines', routines);
        close(); toast('Rutina actualizada'); bus.refresh();
      };
    },
  });
}

// ---------------------------------------------------------------------------
async function renderRun(el) {
  const run = await runPlanStatus();
  const works = (await db.all('workouts')).filter((w) => w.type === 'run' || w.type === 'walk').sort((a, b) => a.date.localeCompare(b.date));
  const date = today();
  // km por semana (últimas 8)
  const weeks = Array.from({ length: 8 }, (_, i) => mondayOf(addDays(date, -7 * (7 - i))));
  const kmBars = weeks.map((m) => ({ label: fmtShort(m).split(' ')[0] + '/' + (Number(m.slice(5, 7))), v: round1(works.filter((w) => w.type === 'run' && mondayOf(w.date) === m).reduce((a, w) => a + (w.distanceKm || 0), 0)) }));
  const paces = works.filter((w) => w.type === 'run' && w.paceSec).slice(-12).map((w) => ({ x: fmtShort(w.date), y: w.paceSec / 60 }));

  el.innerHTML = `${topbarSm('Plan 5K', '#/entrenar')}
    <div class="card tint">
      <div class="eyebrow">Semana ${run.week} de ${RUN_PLAN.length}</div>
      <div style="font-size:21px;font-weight:750;letter-spacing:-.02em;margin-top:4px">${esc(run.plan.label)}</div>
      <p class="small muted" style="margin-top:4px">5′ caminando de entrada en calor + bloque + 5′ de vuelta a la calma · ${run.done} de ${run.total} sesiones hechas</p>
      <div class="interval-list" style="margin:14px 0 6px">${runIntervals(run.week).map((i) => `<i class="${i.t}" style="flex:${i.s}"></i>`).join('')}</div>
      <div class="legend"><span><i style="background:color-mix(in srgb,var(--accent) 35%,var(--track))"></i>Trote</span><span><i class="mute"></i>Caminata</span></div>
      ${run.finished ? `<div class="grid2" style="margin-top:14px"><button class="btn primary" data-act="next">${run.last ? 'Plan terminado' : `Semana ${run.week + 1}`}</button><button class="btn" data-act="repeat">Repetir</button></div>`
        : `<div class="row" style="margin-top:14px"><a class="btn primary grow" href="#/play-run">${icon('play')} Sesión guiada</a><button class="btn" data-act="log">Registrar</button></div>`}
    </div>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Progresión completa</h2></div>
      <div class="list">${RUN_PLAN.map((w) => `<div class="li ${w.week < run.week ? 'dim' : ''}"><span class="ico num" style="font-weight:700;${w.week === run.week ? 'background:var(--accent);color:var(--accent-ink)' : ''}">${w.week}</span><div class="grow"><div class="title" style="font-size:14.5px">${esc(w.label)}</div></div>${w.week < run.week ? icon('check', 'chev') : ''}</div>`).join('')}</div>
      <p class="xs faint" style="margin:10px 4px">3 sesiones por semana, con al menos un día entre ellas. Repetí cualquier semana las veces que necesites: llegar sin lesiones vale más que llegar rápido.</p>
    </section>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Kilómetros por semana</h2></div><div class="card">${barChart({ bars: kmBars, showValues: true, empty: 'Registrá tus salidas para ver los km.' })}</div></section>
    ${paces.length > 1 ? `<section class="section"><div class="section-head"><h2 class="eyebrow">Ritmo (min/km)</h2></div><div class="card">${lineChart({ points: paces, yFmt: (v) => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}` })}<p class="xs faint" style="margin-top:6px">Más abajo = más rápido. El ritmo varía con el calor y el cansancio: mirá la tendencia.</p></div></section>` : ''}
    <section class="section"><div class="section-head"><h2 class="eyebrow">Salidas</h2></div>${historyList(works.slice().reverse().slice(0, 15), await getConfig('routines'))}</section>`;

  bind(el, {
    log: () => openRunForm(),
    next: () => { if (run.last) { toast('¡Completaste el plan!'); return; } advanceRunWeek(false); bus.refresh(); },
    repeat: () => { advanceRunWeek(true); bus.refresh(); },
    w: (b) => openWorkout(b.dataset.id),
  });
}

async function renderBjj(el) {
  const date = today();
  const list = (await db.all('workouts')).filter((w) => w.type === 'bjj').sort((a, b) => a.date.localeCompare(b.date));
  const weeks = Array.from({ length: 8 }, (_, i) => mondayOf(addDays(date, -7 * (7 - i))));
  const att = weeks.map((m) => ({ label: `${Number(m.slice(8))}/${Number(m.slice(5, 7))}`, v: list.filter((w) => w.attended !== false && mondayOf(w.date) === m).length }));
  const rpe = list.filter((w) => w.rpe).slice(-12).map((w) => ({ x: fmtShort(w.date), y: w.rpe }));
  el.innerHTML = `${topbarSm('BJJ', '#/entrenar', `<button class="icon-btn" data-act="log" aria-label="Nueva sesión">${icon('plus')}</button>`)}
    <section><div class="section-head"><h2 class="eyebrow">Asistencia por semana</h2></div><div class="card">${barChart({ bars: att, goal: 3, showValues: true, max: 3, empty: 'Registrá tus sesiones para ver la asistencia.' })}<div class="legend"><span><i></i>Sesiones</span><span><i class="soft"></i>Objetivo: 3</span></div></div></section>
    ${rpe.length > 1 ? `<section class="section"><div class="section-head"><h2 class="eyebrow">Intensidad percibida</h2></div><div class="card">${lineChart({ points: rpe, min: 0, max: 10 })}</div></section>` : ''}
    <section class="section"><div class="section-head"><h2 class="eyebrow">Sesiones</h2></div>${historyList(list.slice().reverse(), {})}</section>
    <button class="btn primary block lg" data-act="log" style="margin-top:14px">${icon('plus')} Registrar sesión</button>`;
  bind(el, { log: () => openBjjForm(), w: (b) => openWorkout(b.dataset.id) });
}

async function renderHistory(el) {
  const routines = await getConfig('routines');
  const list = (await db.all('workouts')).sort((a, b) => (b.date + (b.at || 0)).localeCompare(a.date + (a.at || 0)));
  const byWeek = {};
  for (const w of list) (byWeek[mondayOf(w.date)] = byWeek[mondayOf(w.date)] || []).push(w);
  el.innerHTML = `${topbarSm('Historial', '#/entrenar')}
    ${Object.entries(byWeek).map(([m, ws]) => `<section class="section" style="margin-top:14px"><div class="section-head"><h2 class="eyebrow">Semana del ${esc(fmtShort(m))}</h2><span class="xs faint">${ws.length} registros</span></div>${historyList(ws, routines)}</section>`).join('') || '<div class="empty card">Todavía no hay entrenamientos.</div>'}`;
  bind(el, { w: (b) => openWorkout(b.dataset.id) });
}
