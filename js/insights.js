// Weekly Intelligence: métricas semanales, informe y propuestas de ajuste.
// Reglas: orientativo (no diagnóstico), nunca aumenta la carga por el peso,
// nunca aplica cambios sin aprobación y analiza el contexto antes de juzgar.
import * as db from './db.js';
import {
  dayProgress, habitContext, habitCompliance, habitDoneOn, getConfig, setConfig, settings, updateSettings,
  sleepGoalMin, runPlanStatus, advanceRunWeek, logChange, weeklyWeights, isDeload, isExamMode,
} from './store.js';
import { EXERCISES, CATEGORIES, RUN_PLAN } from './seed.js';
import { addDays, today, avg, sum, fmtHM, round1, uid, isoWeek, fmtNum1 } from './util.js';

const DONE = (s) => s === 'done' || s === 'modified';
const GROUPS = { study: ['study', 'review', 'exams'], venture: ['venture'], school: ['school'] };

export async function weekMetrics(monday) {
  const end = addDays(monday, 6);
  const lastDay = end < today() ? end : today();
  const dates = []; for (let d = monday; d <= lastDay; d = addDays(d, 1)) dates.push(d);
  const empty = { dates, days: 0 };
  if (!dates.length) return empty;

  const [recs, works, weights, meals, habits, ctx] = await Promise.all([
    db.range('recovery', monday, end), db.range('workouts', monday, end, 'date'), db.range('weights', monday, end, 'date'),
    db.range('meals', monday, end, 'date'), getConfig('habits'), habitContext(monday, end),
  ]);
  const recBy = Object.fromEntries(recs.map((r) => [r.date, r]));
  const prog = [];
  const groups = { study: { planned: 0, done: 0 }, venture: { planned: 0, done: 0 }, school: { planned: 0, done: 0 } };
  let water = [];
  for (const d of dates) {
    const p = await dayProgress(d, { rec: recBy[d] || null, meals: meals.filter((m) => m.date === d) });
    prog.push({ date: d, pct: p.pct });
    water.push(p.day.water || 0);
    for (const b of p.tracked) {
      for (const [g, kinds] of Object.entries(GROUPS)) if (kinds.includes(b.kind)) {
        const did = DONE(p.day.statuses[b.id]?.s);
        if (!b.optional) groups[g].planned++;
        if (did) { groups[g].done++; if (b.optional) groups[g].planned++; }
      }
    }
  }
  const hc = habitCompliance(habits, ctx, dates);
  const sleeps = dates.map((d) => recBy[d]?.sleepMin).filter((v) => v != null);
  const calis = works.filter((w) => w.type === 'calisthenics');
  const runs = works.filter((w) => w.type === 'run');
  const bjj = works.filter((w) => w.type === 'bjj' && w.attended !== false);
  const bjjBlocks = dates.reduce((n, d) => n + [...(ctx[d]?.kinds || [])].filter((k) => k === 'bjj').length, 0);
  return {
    dates, days: dates.length,
    progressAvg: avg(prog.map((p) => p.pct)), progressByDay: prog,
    sleepAvg: avg(sleeps), sleepNights: sleeps.length, sleepGoalNights: sleeps.filter((v) => v >= sleepGoalMin()).length,
    energyAvg: avg(recs.map((r) => r.energy)), fatigueAvg: avg(recs.map((r) => r.fatigue)), sorenessAvg: avg(recs.map((r) => r.soreness)),
    hrRestAvg: avg(recs.map((r) => r.hrRest)), stepsAvg: avg(recs.map((r) => r.steps)),
    mealsAvg: avg(dates.map((d) => meals.filter((m) => m.date === d && m.done).length)), waterAvg: avg(water),
    calis: calis.length, runs: runs.length, runKm: sum(runs.map((r) => r.distanceKm)), runFeelAvg: avg(runs.map((r) => r.feel)),
    bjj: Math.max(bjj.length, bjjBlocks), bjjRpeAvg: avg(bjj.map((b) => b.rpe)), bjjFatigueAvg: avg(bjj.map((b) => b.fatigue)),
    trainings: calis.length + runs.length + Math.max(bjj.length, bjjBlocks),
    calisRpeAvg: avg(calis.map((c) => c.rpe)),
    groups, habits: hc,
    weightAvg: avg(weights.map((w) => w.kg)), weightN: weights.length,
  };
}

const pct = (g) => (g.planned ? g.done / g.planned : null);
const fmtPct = (v) => (v == null ? '—' : `${Math.round(v)}%`);

/** Detecta ejercicios dominados (todas las series al tope en las 2 últimas sesiones). */
async function masteredExercises() {
  const routines = await getConfig('routines');
  const all = (await db.all('workouts')).filter((w) => w.type === 'calisthenics').sort((a, b) => (b.date + b.at).localeCompare(a.date + a.at));
  const out = [];
  for (const r of Object.values(routines)) {
    const sessions = all.filter((w) => w.routine === r.id).slice(0, 2);
    if (sessions.length < 2) continue;
    for (const it of r.items) {
      const ok = sessions.every((s) => {
        const sets = (s.sets || []).filter((x) => x.ex === it.ex);
        if (sets.length < it.sets) return false;
        return it.secs ? sets.every((x) => (x.secs || 0) >= it.secs) : sets.every((x) => (x.reps || 0) >= it.max);
      });
      if (ok) out.push({ routine: r.id, item: it });
    }
  }
  return out;
}

export async function buildReport(monday, checkin = null) {
  const cur = await weekMetrics(monday);
  const prev = await weekMetrics(addDays(monday, -7));
  const s = settings();
  const goal = sleepGoalMin();
  const ctxTags = checkin?.context || [];
  const hardContext = ctxTags.filter((t) => ['enfermedad', 'lesion', 'examenes', 'viaje', 'familia'].includes(t));
  const good = [], neglected = [], improved = [], worsened = [], change = [], priorities = [], proposals = [];
  const few = (cur.days || 0) < 3;

  // --- Qué hice bien / qué descuidé
  if (cur.progressAvg >= 70) good.push(`Cumplimiento diario sólido: ${fmtPct(cur.progressAvg)} de promedio.`);
  if (cur.sleepNights >= 3 && cur.sleepAvg >= goal) good.push(`Dormiste en tu objetivo: ${fmtHM(cur.sleepAvg)} de promedio.`);
  if (cur.bjj >= 3) good.push(`Fuiste a ${cur.bjj} sesiones de BJJ.`);
  if (cur.calis >= 2) good.push('Completaste las dos rutinas de fuerza.');
  if (cur.runs >= 2) good.push(`${cur.runs} salidas de running${cur.runKm ? ` (${fmtNum1(cur.runKm)} km)` : ''} sin pasarte de carga.`);
  const st = pct(cur.groups.study), ve = pct(cur.groups.venture);
  if (st != null && st >= 0.8) good.push(`Estudio al día: ${cur.groups.study.done} de ${cur.groups.study.planned} bloques.`);
  if (ve != null && ve >= 0.8) good.push(`Avanzaste con el emprendimiento: ${cur.groups.venture.done} de ${cur.groups.venture.planned} bloques.`);
  if (cur.mealsAvg >= 4) good.push('Registraste casi todas tus comidas: buena base para rendir.');
  if (cur.habits.pct >= 75) good.push(`Hábitos: ${cur.habits.pct}% de cumplimiento.`);

  if (st != null && st < 0.5) neglected.push(`Estudio: ${cur.groups.study.done} de ${cur.groups.study.planned} bloques.`);
  if (ve != null && ve < 0.5) neglected.push(`Emprendimiento: ${cur.groups.venture.done} de ${cur.groups.venture.planned} bloques.`);
  if (cur.sleepNights && cur.sleepNights - cur.sleepGoalNights >= 3) neglected.push(`${cur.sleepNights - cur.sleepGoalNights} noches por debajo de ${s.goals.sleepMinH} h.`);
  if (!cur.sleepNights) neglected.push('No registraste el sueño: sin ese dato es difícil leer tu recuperación.');
  if (cur.mealsAvg != null && cur.mealsAvg < 3) neglected.push(`Comidas registradas: ${fmtNum1(cur.mealsAvg)} por día. Comer suficiente es parte del entrenamiento.`);
  if (cur.waterAvg != null && cur.waterAvg < s.goals.water * 0.6) neglected.push(`Hidratación baja: ${fmtNum1(cur.waterAvg)} vasos por día de promedio.`);
  if (cur.habits.pct != null && cur.habits.pct < 50) {
    const worst = Object.entries(cur.habits.byCat).filter(([, v]) => v.due).sort((a, b) => a[1].done / a[1].due - b[1].done / b[1].due)[0];
    if (worst) neglected.push(`Hábitos de ${CATEGORIES[worst[0]]?.toLowerCase() || worst[0]}: ${worst[1].done} de ${worst[1].due}.`);
  }
  if (!cur.weightN && !checkin?.weight) neglected.push('Sin control de peso esta semana (no es obligatorio, pero ayuda a ver la tendencia).');

  // --- Mejoró / empeoró (vs. semana anterior)
  const cmp = (label, a, b, th, fmt, higherIsBetter = true) => {
    if (a == null || b == null) return;
    const d = a - b; if (Math.abs(d) < th) return;
    const better = higherIsBetter ? d > 0 : d < 0;
    (better ? improved : worsened).push(`${label}: ${fmt(b)} → ${fmt(a)}.`);
  };
  if (prev.days) {
    cmp('Sueño promedio', cur.sleepAvg, prev.sleepAvg, 20, fmtHM);
    cmp('Cumplimiento diario', cur.progressAvg, prev.progressAvg, 7, fmtPct);
    cmp('Hábitos', cur.habits.pct, prev.habits.pct, 7, fmtPct);
    cmp('Entrenamientos', cur.trainings, prev.trainings, 1, (v) => `${v}`);
    cmp('Energía', cur.energyAvg, prev.energyAvg, 0.5, (v) => `${fmtNum1(v)}/5`);
    cmp('Fatiga', cur.fatigueAvg, prev.fatigueAvg, 0.5, (v) => `${fmtNum1(v)}/5`, false);
    cmp('FC en reposo', cur.hrRestAvg, prev.hrRestAvg, 3, (v) => `${Math.round(v)} lpm`, false);
    cmp('Comidas registradas por día', cur.mealsAvg, prev.mealsAvg, 0.7, fmtNum1);
  }

  // --- Contexto
  const tiredness = checkin?.tiredness;
  const highFatigue = (cur.fatigueAvg != null && cur.fatigueAvg >= 3.6) || tiredness >= 4 || (cur.sleepAvg != null && cur.sleepAvg < goal - 60 && (cur.fatigueAvg ?? 0) >= 3);
  const lowCompliance = cur.progressAvg != null && cur.progressAvg < 55;
  if (lowCompliance && hardContext.length) change.push(`Fue una semana con contexto exigente (${hardContext.map(tagLabel).join(', ')}). Un cumplimiento más bajo es esperable: no es falta de disciplina.`);
  else if (lowCompliance) {
    const reasons = ctxTags.filter((t) => ['cansancio', 'poco_tiempo', 'olvido', 'motivacion'].includes(t));
    change.push(reasons.length
      ? `Cumplimiento bajo, con ${reasons.map(tagLabel).join(' y ')} como causa. Ajustemos el plan a tu semana real antes de exigir más.`
      : 'Cumplimiento bajo. Antes de exigir más, revisá qué bloques se cayeron y si el horario era realista.');
  }
  if (highFatigue) change.push('Mucha fatiga acumulada: bajar la carga unos días suele rendir más que forzar.');
  if (cur.sleepAvg != null && cur.sleepAvg < goal) change.push(`Adelantá la rutina de la noche: dormir ${s.goals.sleepMinH} h o más mejora energía, estudio y recuperación.`);
  if (cur.runs > 4) change.push('Muchas salidas de running: mantené la mayoría suaves y dejá días sin correr.');

  // --- Prioridades
  if (highFatigue || (cur.sleepAvg != null && cur.sleepAvg < goal)) priorities.push('Recuperación y sueño');
  if (ctxTags.includes('examenes') || isExamMode()) priorities.push('Exámenes y estudio');
  else if (st != null && st < 0.7) priorities.push('Bloques de estudio');
  if (cur.mealsAvg != null && cur.mealsAvg < 3.5) priorities.push('Comer suficiente y a horario');
  if (!highFatigue && cur.trainings < 4) priorities.push('Constancia en el entrenamiento (sin subir intensidad)');
  if (ve != null && ve < 0.6) priorities.push('Bloques de emprendimiento');
  if (!priorities.length) priorities.push('Mantener lo que funcionó esta semana');

  // --- Propuestas (requieren aprobación)
  if (highFatigue && !isDeload(addDays(today(), 1))) {
    proposals.push({ id: uid(), type: 'deload', title: 'Semana liviana de 7 días', detail: 'Oculta el running opcional, una serie menos en calistenia y BJJ a intensidad moderada. Vuelve sola a la normalidad.' });
  }
  if ((ctxTags.includes('examenes') || checkin?.examsNext) && !isExamMode(addDays(today(), 6))) {
    proposals.push({ id: uid(), type: 'exam', title: 'Modo exámenes por 7 días', detail: 'Running y emprendimiento pasan a opcionales y el estudio queda marcado como prioridad.' });
  }
  if (!highFatigue) {
    const routines = await getConfig('routines');
    for (const m of (await masteredExercises()).slice(0, 3)) {
      const ex = EXERCISES[m.item.ex];
      const next = m.item.secs ? { secs: m.item.secs + 5 } : { min: m.item.min + (m.item.min === m.item.max ? 2 : 1), max: m.item.max + 2 };
      const fromTxt = m.item.secs ? `${m.item.secs} s` : (m.item.min === m.item.max ? `${m.item.max}` : `${m.item.min}–${m.item.max}`);
      const toTxt = next.secs ? `${next.secs} s` : (next.min === next.max ? `${next.max}` : `${next.min}–${next.max}`);
      if (routines[m.routine]) proposals.push({ id: uid(), type: 'progress', routine: m.routine, ex: m.item.ex, next, title: `Progresión: ${ex.name} (${routines[m.routine].name})`, detail: `Completaste todas las series al tope dos sesiones seguidas. Pasar de ${fromTxt} a ${toTxt} por serie.` });
    }
    const run = await runPlanStatus();
    if (run.finished && !run.last) {
      const feel = avg(run.sessions.map((w) => w.feel));
      if (feel == null || feel >= 3) proposals.push({ id: uid(), type: 'run-advance', title: `Running: pasar a la semana ${run.week + 1}`, detail: `Completaste las ${run.total} sesiones de la semana ${run.week}. Siguiente: ${RUN_PLAN[run.week].label}.` });
      else proposals.push({ id: uid(), type: 'run-repeat', title: `Running: repetir la semana ${run.week}`, detail: 'Las sesiones se sintieron duras. Repetir la semana consolida la base sin riesgo.' });
    }
  } else {
    const run = await runPlanStatus();
    if (run.finished && !run.last) proposals.push({ id: uid(), type: 'run-repeat', title: `Running: repetir la semana ${run.week}`, detail: 'Con fatiga alta, mejor consolidar antes de subir.' });
  }
  if (cur.habits.pct != null && cur.habits.pct < 60) {
    const habits = await getConfig('habits');
    const ctx = await habitContext(cur.dates[0], cur.dates[cur.dates.length - 1]);
    const flex = habits.filter((h) => h.active && h.freq === 'times' && h.times > 1)
      .map((h) => ({ h, n: cur.dates.filter((d) => habitDoneOn(h, ctx[d])).length }))
      .filter((x) => x.n < x.h.times / 2).slice(0, 2);
    for (const { h } of flex) proposals.push({ id: uid(), type: 'habit-times', habit: h.id, times: h.times - 1, title: `Hábito realista: ${h.name}`, detail: `Bajar de ${h.times} a ${h.times - 1} veces por semana. Mejor sostener algo más chico que abandonar.` });
  }
  if (cur.sleepAvg != null && cur.sleepAvg < goal) {
    const plan = await getConfig('plan');
    const days = [0, 2, 4].filter((wd) => !plan[wd]?.blocks.some((b) => b.kind === 'disconnect'));
    if (days.length) proposals.push({ id: uid(), type: 'add-disconnect', days, title: 'Agregar "Desconexión 20:30"', detail: `Suma un bloque sin pantallas a las 20:30 los ${days.map((d) => ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'][d]).join(', ')}, como ya tenés otros días.` });
  }

  const fill = (arr, none) => (arr.length ? arr : [none]);
  return {
    week: isoWeek(monday), monday, generatedAt: Date.now(), few,
    metrics: cur, prev,
    sections: {
      good: fill(good, few ? 'Todavía hay pocos días registrados esta semana.' : 'Esta semana no hubo puntos destacados: es información, no un juicio.'),
      neglected: fill(neglected, 'Nada importante quedó de lado.'),
      improved: fill(improved, prev.days ? 'Sin cambios marcados respecto de la semana anterior.' : 'Sin semana anterior para comparar.'),
      worsened: fill(worsened, prev.days ? 'Nada empeoró de forma marcada.' : 'Sin semana anterior para comparar.'),
      change: fill(change, 'Seguí con el plan actual: está funcionando.'),
      priorities: priorities.slice(0, 3),
    },
    proposals,
  };
}

export const CONTEXT_TAGS = {
  examenes: 'exámenes', enfermedad: 'enfermedad', lesion: 'lesión o molestia', viaje: 'viaje', familia: 'temas familiares',
  cansancio: 'cansancio', poco_tiempo: 'poco tiempo', olvido: 'olvidos', motivacion: 'baja motivación',
};
const tagLabel = (t) => CONTEXT_TAGS[t] || t;

export async function applyProposal(p) {
  const until = addDays(today(), 6);
  switch (p.type) {
    case 'deload': updateSettings((s) => { s.deloadUntil = until; }); break;
    case 'exam': updateSettings((s) => { s.examUntil = until; }); break;
    case 'progress': {
      const r = await getConfig('routines');
      const it = r[p.routine]?.items.find((x) => x.ex === p.ex);
      if (it) Object.assign(it, p.next);
      await setConfig('routines', r);
      break;
    }
    case 'run-advance': advanceRunWeek(false); break;
    case 'run-repeat': advanceRunWeek(true); break;
    case 'habit-times': {
      const hs = await getConfig('habits');
      const h = hs.find((x) => x.id === p.habit); if (h) h.times = Math.max(1, p.times);
      await setConfig('habits', hs);
      break;
    }
    case 'add-disconnect': {
      const plan = await getConfig('plan');
      for (const wd of p.days) {
        plan[wd].blocks.push({ id: 'n' + uid(), start: '20:30', end: '', title: 'Desconexión', cat: 'personal', kind: 'disconnect', track: false, optional: false });
        plan[wd].blocks.sort((a, b) => a.start.localeCompare(b.start));
      }
      await setConfig('plan', plan);
      break;
    }
    default: return;
  }
  await logChange(p.title, p.detail);
}

export { weeklyWeights, round1 };
