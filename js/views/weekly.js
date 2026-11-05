// CONTROL SEMANAL (domingo) + INFORME con propuestas que requieren aprobación.
import * as db from '../db.js';
import { settings } from '../store.js';
import { buildReport, applyProposal, CONTEXT_TAGS, weekMetrics } from '../insights.js';
import { compareRows, barChart } from '../charts.js';
import { today, isoWeek, mondayOf, addDays, esc, fmtShort, fmtKg, fmtHM, fmtNum1, parseDec, DAYS_L, weekday } from '../util.js';
import { icon, toast, topbarSm, confirmDialog } from '../ui.js';
import { bus } from '../bus.js';

const STEPS = [
  { k: 'weight', q: '¿Cuánto pesás hoy?', type: 'weight', hint: 'Opcional. Mejor a la mañana, antes de desayunar.' },
  { k: 'energy', q: '¿Cómo estuvo tu energía general?', low: 'Muy baja', high: 'Excelente' },
  { k: 'sport', q: '¿Cómo fue tu rendimiento deportivo?', low: 'Muy flojo', high: 'Excelente' },
  { k: 'sleepQ', q: '¿Cómo dormiste esta semana?', low: 'Muy mal', high: 'Muy bien' },
  { k: 'tiredness', q: '¿Cuánto cansancio acumulaste?', low: 'Nada', high: 'Muchísimo' },
  { k: 'training', q: '¿Cumpliste tus entrenamientos?', low: 'Casi nada', high: 'Todo', type: 'training' },
  { k: 'food', q: '¿Cómo te alimentaste?', low: 'Muy mal', high: 'Muy bien', hint: 'Pensá en si comiste suficiente y a horario, no en “comer poco”.' },
  { k: 'mood', q: '¿Cómo estuvo tu ánimo?', low: 'Muy bajo', high: 'Muy bueno' },
  { k: 'context', q: '¿Qué pasó esta semana?', type: 'context' },
];

export async function renderControl(el) {
  const date = today();
  const week = isoWeek(date), monday = mondayOf(date);
  const existing = await db.get('checkins', week);
  const lastW = (await db.all('weights')).sort((a, b) => b.date.localeCompare(a.date))[0];
  const m = await weekMetrics(monday);
  const ans = existing ? { ...existing } : { context: [] };
  let i = 0;
  document.body.classList.add('no-nav');
  document.getElementById('view').classList.add('full');

  const draw = () => {
    const st = STEPS[i];
    const v = ans[st.k];
    let input = '';
    if (st.type === 'weight') input = `<input class="input num" data-w inputmode="decimal" placeholder="${lastW ? fmtKg(lastW.kg) : '0,0'}" value="${v ? String(v).replace('.', ',') : ''}" style="font-size:40px;text-align:center;font-weight:750;min-height:84px"><p class="xs faint center" style="margin-top:8px">kg${lastW ? ` · último: ${fmtKg(lastW.kg)} (${fmtShort(lastW.date)})` : ''}</p>`;
    else if (st.type === 'context') input = `<div class="chips" style="justify-content:center">${Object.entries(CONTEXT_TAGS).map(([k, l]) => `<button class="chip ${ans.context.includes(k) ? 'on' : ''}" data-tag="${k}">${l[0].toUpperCase() + l.slice(1)}</button>`).join('')}</div>
      <label class="row card" style="margin-top:16px;padding:12px 14px"><span class="grow small">Tengo exámenes la próxima semana</span><input type="checkbox" class="switch" data-exams ${ans.examsNext ? 'checked' : ''}></label>
      <label class="field" style="margin-top:14px"><span>Nota (opcional)</span><textarea data-note placeholder="Algo que quieras recordar de esta semana">${esc(ans.note || '')}</textarea></label>`;
    else input = `${st.type === 'training' ? `<div class="card center" style="margin-bottom:14px"><div class="eyebrow">Registrado esta semana</div><div style="margin-top:4px;font-weight:650">${m.calis || 0} calistenia · ${m.runs || 0} running · ${m.bjj || 0} BJJ</div></div>` : ''}
      <div class="scale" style="gap:8px">${[1, 2, 3, 4, 5].map((n) => `<button data-v="${n}" class="${v === n ? 'on' : ''}" style="min-height:64px;font-size:22px">${n}</button>`).join('')}</div>
      <div class="scale-legend"><span>${esc(st.low)}</span><span>${esc(st.high)}</span></div>`;
    el.innerHTML = `<div class="player">
      <div class="player-top"><button class="icon-btn" data-a="close" aria-label="Cerrar">${icon('x')}</button><div class="player-progress"><i style="width:${((i + 1) / STEPS.length) * 100}%"></i></div><span class="small muted num">${i + 1}/${STEPS.length}</span></div>
      <div class="player-main">
        <div class="eyebrow center">Control semanal · ${esc(fmtShort(monday))} – ${esc(fmtShort(addDays(monday, 6)))}</div>
        <h2 style="font-size:25px">${esc(st.q)}</h2>
        ${st.hint ? `<p class="small muted center">${esc(st.hint)}</p>` : ''}
        <div>${input}</div>
      </div>
      <div class="player-actions"><div class="row">${i > 0 ? `<button class="btn lg" data-a="back">${icon('back')}</button>` : ''}<button class="btn primary lg grow" data-a="next">${i === STEPS.length - 1 ? 'Generar informe' : st.type === 'weight' || st.type === 'context' ? 'Siguiente' : (v ? 'Siguiente' : 'Saltar')}</button></div></div>
    </div>`;
    if (st.type === 'weight') setTimeout(() => el.querySelector('[data-w]')?.focus(), 200);
  };

  el.onclick = async (e) => {
    const sv = e.target.closest('[data-v]');
    if (sv) { ans[STEPS[i].k] = Number(sv.dataset.v); draw(); setTimeout(() => { if (i < STEPS.length - 1) { i++; draw(); } }, 180); return; }
    const tg = e.target.closest('[data-tag]');
    if (tg) { const k = tg.dataset.tag; ans.context = ans.context.includes(k) ? ans.context.filter((x) => x !== k) : [...ans.context, k]; tg.classList.toggle('on'); return; }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    const st = STEPS[i];
    if (st.type === 'weight') { const w = parseDec(el.querySelector('[data-w]').value); if (w && (w < 25 || w > 250)) { toast('Revisá el peso.'); return; } ans.weight = w || null; }
    if (st.type === 'context') { ans.note = el.querySelector('[data-note]').value.trim(); ans.examsNext = el.querySelector('[data-exams]').checked; }
    if (a === 'close') { document.body.classList.remove('no-nav'); bus.go('#/progreso/semana'); return; }
    if (a === 'back') { i = Math.max(0, i - 1); draw(); return; }
    if (a === 'next') {
      if (i < STEPS.length - 1) { i++; draw(); return; }
      el.querySelector('[data-a=next]').textContent = 'Analizando…';
      if (ans.weight) await db.put('weights', { id: `w-${date}`, date, kg: ans.weight, feel: ans.energy ?? null, note: 'Control semanal', measures: {}, source: 'manual', at: Date.now() });
      if (ans.examsNext && ans.context && !ans.context.includes('examenes')) ans.context.push('examenes');
      const report = await buildReport(monday, ans);
      const rec = { ...ans, week, monday, date, report, at: Date.now() };
      delete rec.demo;
      await db.put('checkins', rec);
      document.body.classList.remove('no-nav');
      bus.go(`#/informe/${week}`);
    }
  };
  draw();
  return () => { document.body.classList.remove('no-nav'); el.onclick = null; };
}

// ---------------------------------------------------------------------------
export async function renderReport(el, params) {
  const week = params[0];
  const c = await db.get('checkins', week);
  if (!c?.report) { el.innerHTML = `${topbarSm('Informe', '#/progreso/semana')}<div class="empty card">No hay informe para esta semana. <a class="link-btn" href="#/control">Hacer control</a></div>`; return; }
  const r = c.report, m = r.metrics, p = r.prev;
  const pctFmt = (v) => (v == null ? '—' : `${Math.round(v)}%`);
  const isCurrent = week === isoWeek(today());
  const sec = (n, title, list) => `<div class="rep-sec"><h3><span class="n">${n}</span>${esc(title)}</h3><ul class="rep-list">${list.map((t) => `<li class="${/^(Nada|Sin |Todavía|Esta semana no)/.test(t) ? 'none' : ''}">${esc(t)}</li>`).join('')}</ul></div>`;
  const days = Array.from({ length: 7 }, (_, i) => addDays(r.monday, i));
  const byDay = Object.fromEntries((m.progressByDay || []).map((x) => [x.date, x.pct]));

  el.innerHTML = `${topbarSm('Informe semanal', '#/progreso/semana', isCurrent ? `<button class="icon-btn" data-a="regen" aria-label="Actualizar">${icon('sparkle')}</button>` : '')}
    <div class="card tint">
      <div class="eyebrow">Semana del ${esc(fmtShort(r.monday))} al ${esc(fmtShort(addDays(r.monday, 6)))}</div>
      <div class="grid3" style="margin-top:12px">
        <div><div class="num" style="font-size:26px;font-weight:750">${pctFmt(m.progressAvg)}</div><div class="xs muted">cumplimiento</div></div>
        <div><div class="num" style="font-size:26px;font-weight:750">${m.sleepAvg ? fmtHM(m.sleepAvg) : '—'}</div><div class="xs muted">sueño prom.</div></div>
        <div><div class="num" style="font-size:26px;font-weight:750">${m.trainings ?? 0}</div><div class="xs muted">entrenos</div></div>
      </div>
      ${c.weight ? `<p class="small muted" style="margin-top:10px">Peso del control: <b>${fmtKg(c.weight)} kg</b>${m.weightAvg && p?.weightAvg ? ` · promedio semanal ${fmtKg(m.weightAvg)} (antes ${fmtKg(p.weightAvg)})` : ''}</p>` : ''}
    </div>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Comparativa</h2></div>
      <div class="card">${compareRows([
        { label: 'Cumplimiento diario', cur: m.progressAvg, prev: p?.progressAvg, max: 100, fmt: pctFmt },
        { label: 'Hábitos', cur: m.habits?.pct, prev: p?.habits?.pct, max: 100, fmt: pctFmt },
        { label: 'Sueño promedio', cur: m.sleepAvg, prev: p?.sleepAvg, fmt: (v) => (v == null ? '—' : fmtHM(v)) },
        { label: 'Entrenamientos', cur: m.trainings, prev: p?.trainings, fmt: (v) => (v == null ? '—' : `${v}`) },
        { label: 'Energía', cur: m.energyAvg, prev: p?.energyAvg, max: 5, fmt: (v) => (v == null ? '—' : `${fmtNum1(v)}/5`) },
        { label: 'Fatiga', cur: m.fatigueAvg, prev: p?.fatigueAvg, max: 5, fmt: (v) => (v == null ? '—' : `${fmtNum1(v)}/5`) },
        { label: 'Comidas por día', cur: m.mealsAvg, prev: p?.mealsAvg, max: 5, fmt: (v) => (v == null ? '—' : fmtNum1(v)) },
      ])}</div>
    </section>
    <section class="section"><div class="card">${barChart({ bars: days.map((d) => ({ label: DAYS_L[weekday(d)], v: byDay[d] ?? 0 })), max: 100, goal: 70, showValues: true, yFmt: (v) => `${Math.round(v)}` })}<div class="legend"><span><i></i>Cumplimiento diario (%)</span></div></div></section>
    ${sec(1, 'Qué hiciste bien', r.sections.good)}
    ${sec(2, 'Qué descuidaste', r.sections.neglected)}
    ${sec(3, 'Qué mejoró', r.sections.improved)}
    ${sec(4, 'Qué empeoró', r.sections.worsened)}
    ${sec(5, 'Qué conviene cambiar', r.sections.change)}
    ${sec(6, 'Objetivos prioritarios', r.sections.priorities)}
    <div class="rep-sec"><h3><span class="n">7</span>Modificaciones para la próxima semana</h3>
      ${r.proposals.length ? r.proposals.map((x) => `<div class="proposal ${x.status || ''}" data-id="${x.id}">
        <div class="pt">${esc(x.title)}</div><div class="pd">${esc(x.detail)}</div>
        ${x.status === 'applied' ? '<span class="pill ok">Aplicado</span>' : x.status === 'dismissed' ? '<span class="pill">Descartado</span>' :
        `<div class="row"><button class="btn primary sm" data-a="apply" data-id="${x.id}">Aplicar</button><button class="btn sm" data-a="dismiss" data-id="${x.id}">Descartar</button></div>`}
      </div>`).join('') : '<ul class="rep-list"><li class="none">No hay cambios necesarios: mantené el plan actual.</li></ul>'}
      <p class="xs faint" style="margin-top:10px">Nada cambia sin tu aprobación. La carga de entrenamiento nunca se ajusta según el peso.</p>
    </div>
    ${c.note ? `<div class="card section"><div class="eyebrow">Tu nota</div><p style="margin-top:6px">${esc(c.note)}</p></div>` : ''}
    <p class="xs faint center" style="margin-top:20px">Informe orientativo generado en tu dispositivo con tus registros.</p>`;

  el.onclick = async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'regen') {
      const fresh = await buildReport(r.monday, c);
      // Conservar decisiones ya tomadas
      const decided = Object.fromEntries(r.proposals.filter((x) => x.status).map((x) => [x.type + (x.ex || x.habit || ''), x.status]));
      fresh.proposals.forEach((x) => { const k = x.type + (x.ex || x.habit || ''); if (decided[k]) x.status = decided[k]; });
      c.report = fresh; await db.put('checkins', c); toast('Informe actualizado'); bus.refresh();
      return;
    }
    const prop = r.proposals.find((x) => x.id === b.dataset.id); if (!prop) return;
    if (a === 'apply') {
      if (!(await confirmDialog('Aplicar cambio', `${prop.title}. ${prop.detail}`, { ok: 'Aplicar' }))) return;
      await applyProposal(prop); prop.status = 'applied';
      await db.put('checkins', c); toast('Cambio aplicado'); bus.refresh();
    }
    if (a === 'dismiss') { prop.status = 'dismissed'; await db.put('checkins', c); bus.refresh(); }
  };
  return () => { el.onclick = null; };
}
