// PROGRESO — Cuerpo (peso y medidas), Recuperación (sueño y energía) y Semana.
import * as db from '../db.js';
import { settings, weeklyWeights, weightReading, sleepGoalMin, getConfig } from '../store.js';
import { weekMetrics } from '../insights.js';
import { lineChart, barChart, comboChart, compareRows } from '../charts.js';
import { today, addDays, esc, fmtShort, fmtKg, fmtHM, fmtNum1, mondayOf, avg, toMin, fromMin, isoWeek, DAYS_L, weekday, round1, parseYmd } from '../util.js';
import { icon, bind, srcBadge } from '../ui.js';
import { bus } from '../bus.js';
import { openWeightForm, openSleepForm, openWellnessForm } from '../quicklog.js';

const TABS = [['cuerpo', 'Cuerpo'], ['recuperacion', 'Recuperación'], ['semana', 'Semana']];
let bodyRange = 'q';
let recRange = 'w';

export async function render(el, params) {
  const tab = TABS.some(([k]) => k === params[0]) ? params[0] : 'cuerpo';
  el.innerHTML = `<header class="topbar"><div><div class="eyebrow">Evolución</div><h1>Progreso</h1></div></header>
    <div class="seg" style="margin-bottom:16px">${TABS.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div data-body></div>`;
  el.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => bus.go(`#/progreso/${b.dataset.tab}`));
  const body = el.querySelector('[data-body]');
  if (tab === 'cuerpo') await renderBody(body);
  if (tab === 'recuperacion') await renderRecovery(body);
  if (tab === 'semana') await renderWeek(body);
}

// ---------------------------------------------------------------------------
async function renderBody(el) {
  const s = settings();
  const entries = (await db.all('weights')).sort((a, b) => a.date.localeCompare(b.date));
  const last = entries[entries.length - 1];
  const start = s.profile.startWeight;
  const date = today();
  const from = bodyRange === 'm' ? addDays(date, -31) : bodyRange === 'q' ? addDays(date, -92) : '0000';
  const shown = entries.filter((e) => e.date >= from);
  const weeks = weeklyWeights(entries);
  const reading = weightReading(weeks);
  const wavgByWeek = Object.fromEntries(weeks.map((w) => [w.week, w.avg]));
  const points = shown.map((e) => ({ x: fmtShort(e.date), y: e.kg }));
  const avgLine = shown.map((e) => ({ x: '', y: wavgByWeek[mondayOf(e.date)] }));

  // Rendimiento vs peso: últimas 8 semanas
  const works = await db.all('workouts');
  const w8 = Array.from({ length: 8 }, (_, i) => mondayOf(addDays(date, -7 * (7 - i))));
  const trainBars = w8.map((m) => works.filter((w) => mondayOf(w.date) === m && w.type !== 'mobility' && w.attended !== false).length);
  const weightLine = w8.map((m) => wavgByWeek[m] ?? null);
  const withMeasures = entries.filter((e) => e.measures && Object.keys(e.measures).length).slice(-4).reverse();

  el.innerHTML = `
    <div class="grid2">
      <div class="stat"><div class="label">${icon('scale')} Peso actual</div><div class="value">${last ? fmtKg(last.kg) : '—'}<small>kg</small></div><div class="meta">${last ? `${esc(fmtShort(last.date))} ${last.source === 'apple-health' ? '· Apple Health' : ''}` : 'Sin registros'}</div></div>
      <div class="stat"><div class="label">Desde el inicio</div><div class="value">${last && start ? `${last.kg - start > 0 ? '+' : ''}${fmtKg(last.kg - start)}` : '—'}<small>kg</small></div><div class="meta">Inicio: ${start ? fmtKg(start) + ' kg' : '—'}${s.profile.heightCm ? ` · ${s.profile.heightCm} cm` : ''}</div></div>
    </div>
    <div class="banner ${reading.tone === 'info' ? 'info' : ''}" style="margin-top:10px"><span class="bi">${icon('info')}</span><div class="grow"><b>Lectura de la tendencia</b><p>${esc(reading.text)}</p></div></div>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Evolución</h2>
      <div class="seg" style="width:180px">${[['m', '1 m'], ['q', '3 m'], ['a', 'Todo']].map(([k, l]) => `<button data-act="range" data-r="${k}" class="${bodyRange === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="card">${lineChart({ points, avgLine, empty: 'Registrá tu peso para ver la evolución.' })}
        <div class="legend"><span><i></i>Registros</span><span><i class="soft"></i>Promedio semanal</span></div></div>
    </section>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Rendimiento y peso</h2></div>
      <div class="card">${comboChart({ labels: w8.map((m) => `${Number(m.slice(8))}/${Number(m.slice(5, 7))}`), bars: trainBars, line: weightLine, lineFmt: (v) => fmtKg(v), empty: 'Sin datos de las últimas semanas.' })}
        <div class="legend"><span><i class="mute"></i>Entrenamientos por semana</span><span><i class="alt"></i>Peso promedio</span></div>
        <p class="xs faint" style="margin-top:8px">Tu rendimiento no depende solo del peso: constancia, fuerza y resistencia también son progreso.</p></div>
    </section>

    ${weeks.length >= 2 ? `<section class="section"><div class="section-head"><h2 class="eyebrow">Comparación semanal</h2></div>
      <div class="list">${weeks.slice(-6).reverse().map((w, i, arr) => { const prev = arr[i + 1]; const d = prev ? w.avg - prev.avg : null; return `<div class="li"><div class="grow"><div class="title">Semana del ${esc(fmtShort(w.week))}</div><div class="sub">${w.n} ${w.n === 1 ? 'registro' : 'registros'}</div></div><div style="text-align:right"><b class="num">${fmtKg(w.avg)} kg</b>${d != null ? `<div class="xs ${Math.abs(d) < 0.8 ? 'faint' : 'muted'}">${d > 0 ? '+' : ''}${fmtKg(d)} · ${Math.abs(d) < 0.8 ? 'fluctuación normal' : 'cambio a observar'}</div>` : ''}</div></div>`; }).join('')}</div></section>` : ''}

    ${withMeasures.length ? `<section class="section"><div class="section-head"><h2 class="eyebrow">Medidas (cm)</h2></div>
      <div class="card" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr class="faint xs"><td>Fecha</td>${['cintura', 'pecho', 'cadera', 'brazo', 'muslo'].map((k) => `<td style="text-align:right">${k[0].toUpperCase() + k.slice(1)}</td>`).join('')}</tr>
        ${withMeasures.map((e) => `<tr><td style="padding:6px 0">${esc(fmtShort(e.date))}</td>${['cintura', 'pecho', 'cadera', 'brazo', 'muslo'].map((k) => `<td class="num" style="text-align:right">${e.measures[k] ? fmtNum1(e.measures[k]) : '—'}</td>`).join('')}</tr>`).join('')}
      </table></div></section>` : ''}

    <section class="section"><div class="section-head"><h2 class="eyebrow">Historial</h2></div>
      <div class="list">${entries.slice().reverse().slice(0, 20).map((e) => `<button class="li" data-act="edit" data-d="${e.date}"><div class="grow"><div class="title">${fmtKg(e.kg)} kg ${e.demo ? srcBadge('demo') : srcBadge(e.source)}</div><div class="sub">${esc(fmtShort(e.date))}${e.feel ? ` · se sentía ${e.feel}/5` : ''}${e.note ? ` · ${esc(e.note)}` : ''}</div></div>${icon('chev', 'chev')}</button>`).join('') || '<div class="empty">Sin registros todavía.</div>'}</div>
    </section>
    <button class="btn primary block lg" data-act="add" style="margin-top:14px">${icon('plus')} Registrar peso</button>`;

  bind(el, {
    range: (b) => { bodyRange = b.dataset.r; bus.refresh(); },
    add: () => openWeightForm(),
    edit: (b) => openWeightForm(b.dataset.d),
  });
}

// ---------------------------------------------------------------------------
export function recoveryInsights(cur, prev, goalMin) {
  const out = [];
  if (cur.sleepAvg != null && prev.sleepAvg != null) {
    const d = cur.sleepAvg - prev.sleepAvg;
    if (d <= -20) out.push(`Esta semana dormiste menos que la anterior (${fmtHM(cur.sleepAvg)} vs ${fmtHM(prev.sleepAvg)}).`);
    else if (d >= 20) out.push(`Dormiste más que la semana anterior (${fmtHM(cur.sleepAvg)} vs ${fmtHM(prev.sleepAvg)}). Bien.`);
  }
  if (cur.fatigueAvg != null && prev.fatigueAvg != null && cur.fatigueAvg - prev.fatigueAvg >= 0.5) out.push('También registraste más cansancio que la semana pasada.');
  if (cur.energyAvg != null && prev.energyAvg != null && cur.energyAvg - prev.energyAvg <= -0.5) out.push('Tu energía bajó respecto de la semana anterior.');
  if (cur.hrRestAvg != null && prev.hrRestAvg != null && cur.hrRestAvg - prev.hrRestAvg >= 4) out.push(`Tu FC en reposo subió ${Math.round(cur.hrRestAvg - prev.hrRestAvg)} lpm: puede reflejar cansancio, estrés o mal descanso.`);
  const worse = out.some((t) => /menos|más cansancio|bajó|subió/.test(t));
  if (worse) out.push('Te recomendamos priorizar la recuperación: acostarte más temprano, entrenar suave y comer suficiente.');
  else if (cur.sleepAvg != null && cur.sleepAvg < goalMin) out.push(`Tu promedio está por debajo de tu objetivo de ${goalMin / 60} h.`);
  if (!out.length) out.push(cur.sleepNights ? 'Sin cambios llamativos. Seguí registrando para detectar tendencias.' : 'Registrá tu sueño unos días para ver tendencias.');
  return out;
}

async function renderRecovery(el) {
  const date = today();
  const days = recRange === 'w' ? 7 : 30;
  const from = addDays(date, -(days - 1));
  const recs = await db.range('recovery', addDays(from, -days), date);
  const by = Object.fromEntries(recs.map((r) => [r.date, r]));
  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));
  const inRange = dates.map((d) => by[d]).filter(Boolean);
  const s = settings();
  const goal = sleepGoalMin();
  const sleeps = inRange.map((r) => r.sleepMin).filter((v) => v != null);
  const beds = inRange.map((r) => r.bed).filter(Boolean).map((b) => { let m = toMin(b); if (m < 12 * 60) m += 1440; return m; });
  const lbl = (d) => recRange === 'w' ? DAYS_L[weekday(d)] : `${Number(d.slice(8))}`;
  const cur = await weekMetrics(mondayOf(date));
  const prev = await weekMetrics(mondayOf(addDays(date, -7)));
  const insights = recoveryInsights(cur, prev, goal);
  const hr = dates.map((d) => ({ x: lbl(d), y: by[d]?.hrRest ?? null }));
  const energy = dates.map((d) => ({ x: lbl(d), y: by[d]?.energy ?? null }));
  const fatigue = dates.map((d) => ({ x: lbl(d), y: by[d]?.fatigue ?? null }));
  const steps = dates.map((d) => ({ label: lbl(d), v: by[d]?.steps || 0 }));

  el.innerHTML = `
    <div class="seg" style="margin-bottom:12px;width:200px">${[['w', '7 días'], ['m', '30 días']].map(([k, l]) => `<button data-act="range" data-r="${k}" class="${recRange === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="grid2">
      <div class="stat"><div class="label">${icon('moon')} Sueño promedio</div><div class="value">${sleeps.length ? fmtHM(avg(sleeps)).replace(' ', '<small>') + '</small>' : '—'}</div><div class="meta">Objetivo ${s.goals.sleepMinH}–${s.goals.sleepMaxH} h</div></div>
      <div class="stat"><div class="label">Noches en objetivo</div><div class="value">${sleeps.filter((v) => v >= goal).length}<small>/ ${sleeps.length}</small></div><div class="meta">Acostarse: ${beds.length ? fromMin(Math.round(avg(beds))) : '—'} prom.</div></div>
    </div>
    <div class="card section" style="margin-top:10px">
      <div class="eyebrow" style="margin-bottom:8px">Tendencias detectadas</div>
      ${insights.map((t) => `<p style="font-size:14.5px;margin-top:6px">${esc(t)}</p>`).join('')}
      <p class="xs faint" style="margin-top:10px">Recomendaciones orientativas, no son un diagnóstico médico.</p>
    </div>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Horas de sueño</h2></div>
      <div class="card">${barChart({ bars: dates.map((d) => ({ label: lbl(d), v: by[d]?.sleepMin ? round1(by[d].sleepMin / 60) : 0, cls: by[d]?.sleepMin && by[d].sleepMin < goal ? 'alt' : '' })), band: [s.goals.sleepMinH, s.goals.sleepMaxH], max: s.goals.sleepMaxH, empty: 'Registrá tu sueño para ver la gráfica.' })}
      <div class="legend"><span><i></i>En objetivo</span><span><i class="alt"></i>Por debajo</span><span><i style="background:var(--accent-soft)"></i>Rango ${s.goals.sleepMinH}–${s.goals.sleepMaxH} h</span></div></div>
    </section>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Energía y fatiga (1–5)</h2></div>
      <div class="card">${lineChart({ points: energy, avgLine: fatigue, min: 0.5, max: 5.5, empty: 'Contá cómo te sentís cada día para ver esta gráfica.' })}
      <div class="legend"><span><i></i>Energía</span><span><i class="soft"></i>Fatiga</span></div></div>
    </section>
    ${hr.some((p) => p.y != null) ? `<section class="section"><div class="section-head"><h2 class="eyebrow">FC en reposo (lpm)</h2></div><div class="card">${lineChart({ points: hr })}</div></section>` : ''}
    ${steps.some((b) => b.v) ? `<section class="section"><div class="section-head"><h2 class="eyebrow">Pasos</h2></div><div class="card">${barChart({ bars: steps, yFmt: (v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}` })}</div></section>` : ''}
    <section class="section"><div class="section-head"><h2 class="eyebrow">Registros</h2><a class="link" href="#/salud">Apple Health</a></div>
      <div class="list">${dates.slice().reverse().filter((d) => by[d]).slice(0, 10).map((d) => { const r = by[d]; const srcs = [...new Set(Object.values(r.sources || {}))]; return `<button class="li" data-act="sleep" data-d="${d}"><div class="grow"><div class="title">${esc(fmtShort(d))} · ${r.sleepMin ? fmtHM(r.sleepMin) : 'sin sueño'}</div><div class="sub">${[r.bed && r.wake ? `${r.bed}–${r.wake}` : '', r.sleepQuality ? `calidad ${r.sleepQuality}/5` : '', r.energy ? `energía ${r.energy}` : '', r.fatigue ? `fatiga ${r.fatigue}` : '', r.hrRest ? `${r.hrRest} lpm` : '', r.steps ? `${r.steps} pasos` : ''].filter(Boolean).join(' · ')}</div></div>${r.demo ? srcBadge('demo') : srcs.map(srcBadge).join(' ')}</button>`; }).join('') || '<div class="empty">Sin registros en este período.</div>'}</div>
    </section>
    <div class="grid2" style="margin-top:14px"><button class="btn primary" data-act="addSleep">${icon('moon')} Sueño</button><button class="btn" data-act="well">${icon('bolt')} Cómo me siento</button></div>`;

  bind(el, {
    range: (b) => { recRange = b.dataset.r; bus.refresh(); },
    addSleep: () => openSleepForm(),
    sleep: (b) => openSleepForm(b.dataset.d),
    well: () => openWellnessForm(),
  });
}

// ---------------------------------------------------------------------------
async function renderWeek(el) {
  const date = today();
  const monday = mondayOf(date);
  const cur = await weekMetrics(monday);
  const prev = await weekMetrics(addDays(monday, -7));
  const checkins = (await db.all('checkins')).sort((a, b) => b.week.localeCompare(a.week));
  const thisCheck = checkins.find((c) => c.week === isoWeek(date));
  const pctFmt = (v) => (v == null ? '—' : `${Math.round(v)}%`);
  const rows = [
    { label: 'Cumplimiento diario', cur: cur.progressAvg, prev: prev.progressAvg, max: 100, fmt: pctFmt },
    { label: 'Hábitos', cur: cur.habits?.pct, prev: prev.habits?.pct, max: 100, fmt: pctFmt },
    { label: 'Sueño promedio', cur: cur.sleepAvg, prev: prev.sleepAvg, fmt: (v) => (v == null ? '—' : fmtHM(v)) },
    { label: 'Entrenamientos', cur: cur.trainings, prev: prev.trainings, fmt: (v) => (v == null ? '—' : `${v}`) },
    { label: 'Energía', cur: cur.energyAvg, prev: prev.energyAvg, max: 5, fmt: (v) => (v == null ? '—' : `${fmtNum1(v)}/5`) },
  ];
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const byDay = Object.fromEntries((cur.progressByDay || []).map((p) => [p.date, p.pct]));

  el.innerHTML = `
    <a class="card tint" href="${thisCheck ? `#/informe/${thisCheck.week}` : '#/control'}" style="display:block">
      <div class="row"><span class="ico" style="width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:var(--accent);color:var(--accent-ink)">${icon('sparkle')}</span>
        <div class="grow"><div style="font-weight:700;font-size:17px">${thisCheck ? 'Informe de esta semana' : 'Control semanal'}</div><div class="small muted">${thisCheck ? 'Revisá las propuestas para la próxima semana' : weekday(date) === 0 ? 'Hoy es domingo: buen momento para hacerlo' : 'Recomendado los domingos · podés hacerlo cuando quieras'}</div></div>${icon('chev', 'chev')}</div>
    </a>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Cumplimiento por día</h2></div>
      <div class="card">${barChart({ bars: week.map((d) => ({ label: DAYS_L[weekday(d)], v: byDay[d] ?? 0 })), max: 100, goal: 70, showValues: true, yFmt: (v) => `${Math.round(v)}`, empty: 'La semana recién empieza.' })}</div>
    </section>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Esta semana vs. la anterior</h2></div>
      <div class="card">${compareRows(rows)}</div>
    </section>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Informes anteriores</h2></div>
      <div class="list">${checkins.map((c) => `<a class="li" href="#/informe/${c.week}"><span class="ico">${icon('cal')}</span><div class="grow"><div class="title">Semana del ${esc(fmtShort(c.monday || date))}</div><div class="sub">${c.report?.metrics?.progressAvg != null ? `Cumplimiento ${Math.round(c.report.metrics.progressAvg)}%` : ''}${c.weight ? ` · ${fmtKg(c.weight)} kg` : ''}${c.demo ? ' · demo' : ''}</div></div>${icon('chev', 'chev')}</a>`).join('') || '<div class="empty">Tu primer informe aparece después del primer control semanal.</div>'}</div>
    </section>`;
}
