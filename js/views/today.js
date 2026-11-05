// HOY — panel principal: progreso, plan del día, hábitos, tareas, comidas y agua.
import * as db from '../db.js';
import {
  settings, updateSettings, dayProgress, getConfig, habitContext, habitDueOn, habitDoneOn, habitLinkedOn, weekDoneCount,
  toggleHabit, setBlockStatus, recoveryState, saveRecovery, isExamMode, isDeload, dayBlocks,
} from '../store.js';
import { today, fmtLong, greeting, nowMin, toMin, fmtHM, esc, addDays, weekday, DAYS_S, uid, isoWeek, mondayOf, daysBetween, isStandalone, isIOS } from '../util.js';
import { icon, ring, bind, sheet, toast, statusLabel, LOGO } from '../ui.js';
import { bus } from '../bus.js';
import { openSleepForm, openWellnessForm, openBjjForm, openRunForm, openTaskForm, addWater, toggleMealSlot, openMealForm } from '../quicklog.js';
import { upcomingToday } from '../reminders.js';
import { MEAL_SLOTS, KINDS } from '../seed.js';

const TRAIN_KINDS = ['calisthenics', 'bjj', 'run'];

async function nextTraining(date) {
  const now = nowMin();
  for (let i = 0; i < 7; i++) {
    const d = addDays(date, i);
    const { blocks } = await dayBlocks(d);
    const b = blocks.find((x) => TRAIN_KINDS.includes(x.kind) && !x.optional && (i > 0 || toMin(x.end || x.start) > now));
    if (b) return { date: d, block: b, label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DAYS_S[weekday(d)] };
  }
  return null;
}

export async function render(el) {
  const date = today();
  const s = settings();
  const p = await dayProgress(date);
  const [habits, ctx, tasksAll, next, reminders, checkin] = await Promise.all([
    getConfig('habits'), habitContext(addDays(date, -6), date), db.all('tasks'), nextTraining(date), upcomingToday(3), db.get('checkins', isoWeek(date)),
  ]);
  const rec = p.rec;
  const rs = recoveryState(rec);
  const now = nowMin();
  const tracked = p.tracked;
  const doneCount = tracked.filter((b) => ['done', 'modified'].includes(p.day.statuses[b.id]?.s)).length;
  const required = tracked.filter((b) => !b.optional).length;
  const current = p.blocks.find((b) => toMin(b.start) <= now && now < toMin(b.end || b.start) + (b.end ? 0 : 30));
  const upcoming = p.blocks.find((b) => toMin(b.start) > now && b.kind !== 'free');
  const dueHabits = habits.filter((h) => h.freq !== 'times' && habitDueOn(h, date));
  const flexHabits = habits.filter((h) => h.active && h.freq === 'times' && (weekDoneCount(h, date, ctx) < h.times || habitDoneOn(h, ctx[date])));
  const habitsDone = dueHabits.filter((h) => habitDoneOn(h, ctx[date])).length;
  const showFlex = sessionStorage.getItem('p5k:showFlex') === '1';
  const tasks = tasksAll.filter((t) => (!t.done && t.date <= date) || (t.done && t.doneDate === date)).sort((a, b) => a.done - b.done || a.date.localeCompare(b.date));
  const showAll = sessionStorage.getItem('p5k:showAllBlocks') === '1';
  const water = p.day.water || 0;
  const name = s.profile.name ? `, ${esc(s.profile.name)}` : '';

  // Banners
  const banners = [];
  if (isIOS() && !isStandalone() && !s.dismissInstall) banners.push(`<div class="banner info"><span class="bi">${icon('phone')}</span><div class="grow"><b>Instalá PROJECT 5K</b><p>En Safari: Compartir → “Añadir a pantalla de inicio”. Tus datos de la app instalada son independientes de Safari.</p><div class="row" style="margin-top:8px"><a class="link-btn" href="#/instalar">Ver guía</a><button class="link-btn faint" data-act="dismissInstall">Ocultar</button></div></div></div>`);
  if (s.demo) banners.push(`<div class="banner demo warn"><span class="bi">${icon('info')}</span><div class="grow"><b>Datos de demostración activos</b><p>Las gráficas incluyen datos de ejemplo marcados como demo.</p><a class="link-btn" href="#/datos">Eliminar datos demo</a></div></div>`);
  if (isExamMode(date)) banners.push(`<div class="banner"><span class="bi">${icon('book')}</span><div class="grow"><b>Modo exámenes hasta el ${esc(s.examUntil.split('-').reverse().slice(0, 2).join('/'))}</b><p>Running y emprendimiento son opcionales. El estudio va primero.</p></div></div>`);
  if (isDeload(date)) banners.push(`<div class="banner info"><span class="bi">${icon('moon')}</span><div class="grow"><b>Semana liviana</b><p>Menos carga para recuperar. Vuelve sola a la normalidad el ${esc(s.deloadUntil.split('-').reverse().slice(0, 2).join('/'))}.</p></div></div>`);
  if (weekday(date) === 0 && !checkin) banners.push(`<a class="banner" href="#/control"><span class="bi">${icon('sparkle')}</span><div class="grow"><b>Control semanal</b><p>Cinco minutos para revisar la semana y planificar la próxima.</p></div>${icon('chev', 'chev')}</a>`);
  const hasData = (await db.count('days')) + (await db.count('workouts')) > 3;
  if (hasData && (!s.lastBackup || daysBetween(s.lastBackup.slice(0, 10), date) >= 7)) banners.push(`<a class="banner warn" href="#/datos"><span class="bi">${icon('db')}</span><div class="grow"><b>Hacé una copia de seguridad</b><p>${s.lastBackup ? 'La última fue hace más de una semana.' : 'Todavía no hiciste ninguna.'} Tus datos viven solo en este iPhone.</p></div>${icon('chev', 'chev')}</a>`);

  const habitChip = (h) => { const on = habitDoneOn(h, ctx[date]); const auto = habitLinkedOn(h, ctx[date]); return `<button class="chip ${on ? 'on' : ''}" data-act="habit" data-id="${h.id}">${icon('check', 'tick')}${esc(h.name)}${auto ? ' <span class="faint xs">auto</span>' : ''}${h.freq === 'times' ? ` <span class="faint xs">${weekDoneCount(h, date, ctx)}/${h.times}</span>` : ''}</button>`; };

  const blockRow = (b) => {
    const st = p.day.statuses[b.id];
    const isNow = current?.id === b.id;
    if (!b.track) {
      if (!showAll) return '';
      return `<div class="block passive cat-${b.cat}"><span class="time">${esc(b.start)}</span><div class="body"><div class="t">${esc(b.title)}</div></div></div>`;
    }
    const sub = st ? `${statusLabel[st.s]}${st.note ? ' · ' + esc(st.note) : ''}` :
      b.modeNote ? esc(b.modeNote) : b.optional ? 'Opcional' : b.end ? `${esc(b.start)}–${esc(b.end)}` : '';
    const action = b.kind === 'calisthenics' ? `<a class="link-btn" href="#/play/${b.routine || 'A'}" style="font-size:13px">Empezar rutina →</a>` :
      b.kind === 'run' ? `<a class="link-btn" href="#/entrenar/correr" style="font-size:13px">Plan 5K →</a>` : '';
    return `<div class="block cat-${b.cat} ${isNow ? 'now' : ''}" data-id="${b.id}">
      <span class="time">${esc(b.start)}</span>
      <div class="body"><div class="t"><span class="dot"></span>${esc(b.title)}${b.priority ? ' <span class="pill ok">Prioridad</span>' : ''}</div>
        <div class="s">${sub}</div>${action && !st ? action : ''}</div>
      <button class="more-btn" data-act="status" data-id="${b.id}" aria-label="Más opciones">${icon('dots')}</button>
      <button class="check ${st ? st.s : ''}" data-act="check" data-id="${b.id}" aria-label="Marcar ${esc(b.title)}">${icon(st?.s === 'skipped' ? 'x' : st?.s === 'postponed' ? 'clock' : st?.s === 'modified' ? 'edit' : 'check')}</button>
    </div>`;
  };

  el.innerHTML = `
    <header class="topbar">
      <div><div class="eyebrow">${esc(fmtLong(date))}</div><h1>${greeting()}${name}</h1></div>
      <a href="#/ajustes" aria-label="Ajustes" style="flex:none">${LOGO(40)}</a>
    </header>
    ${banners.join('')}
    <section class="card tint">
      <div class="hero">
        ${ring(p.pct, { size: 118, stroke: 11, label: `<b>${p.pct}<small style="font-size:16px">%</small></b>`, sub: 'del día' })}
        <div class="grow">
          <div class="eyebrow">PROJECT 5K · Progreso</div>
          <div style="font-size:15px;margin-top:6px"><b>${doneCount}</b> <span class="muted">de ${required} actividades</span></div>
          <div style="font-size:15px"><b>${p.mealsDone}</b><span class="muted">/5 comidas · </span><b>${p.sleepMin != null ? fmtHM(p.sleepMin) : '—'}</b><span class="muted"> sueño</span></div>
          ${upcoming ? `<div class="pill" style="margin-top:10px">${icon('clock')} ${esc(upcoming.start)} · ${esc(upcoming.title)}</div>` : `<div class="pill ok" style="margin-top:10px">Día cerrado</div>`}
        </div>
      </div>
    </section>

    <div class="grid3 section" style="margin-top:10px">
      <button class="stat" data-act="sleep"><div class="label">${icon('moon')} Sueño</div><div class="value">${p.sleepMin != null ? fmtHM(p.sleepMin).replace(' ', '<small>') + '</small>' : '<small>Registrar</small>'}</div><div class="meta">Obj. ${s.goals.sleepMinH}–${s.goals.sleepMaxH} h</div></button>
      <button class="stat" data-act="wellness"><div class="label">${icon('heart')} Recuperación</div><div class="value" style="font-size:19px;color:${rs.level === 'ok' ? 'var(--accent-text)' : rs.level === 'warn' ? 'var(--warn)' : rs.level === 'bad' ? 'var(--bad)' : 'var(--fg-3)'}">${esc(rs.label)}</div><div class="meta">Orientativo</div></button>
      <a class="stat" href="${next ? (next.block.kind === 'calisthenics' ? `#/play/${next.block.routine || 'A'}` : next.block.kind === 'run' ? '#/entrenar/correr' : '#/entrenar') : '#/entrenar'}"><div class="label">${icon('dumbbell')} Próximo</div><div class="value" style="font-size:17px">${next ? esc(KINDS[next.block.kind] === 'Calistenia' ? next.block.title : KINDS[next.block.kind]) : '—'}</div><div class="meta">${next ? `${esc(next.label)} ${esc(next.block.start)}` : 'Sin entrenos'}</div></a>
    </div>
    ${rs.level !== 'na' ? `<p class="xs faint" style="margin:8px 4px 0">${esc(rs.text)}</p>` : ''}
    ${!rec?.energy && !rec?.fatigue ? `<div class="card section" style="margin-top:10px">
        <div class="row between"><b style="font-size:15px">¿Cómo te sentís hoy?</b><button class="link-btn" data-act="wellness">Detalle</button></div>
        <div class="row" style="margin-top:10px;gap:10px"><span class="small muted" style="width:62px">Energía</span><div class="scale grow" data-quick="energy">${[1, 2, 3, 4, 5].map((v) => `<button data-v="${v}">${v}</button>`).join('')}</div></div>
        <div class="row" style="margin-top:8px;gap:10px"><span class="small muted" style="width:62px">Fatiga</span><div class="scale grow" data-quick="fatigue">${[1, 2, 3, 4, 5].map((v) => `<button data-v="${v}">${v}</button>`).join('')}</div></div>
      </div>` : ''}

    <section class="section">
      <div class="section-head"><h2 class="eyebrow">Plan de hoy · ${esc(p.blocks.length ? (await getConfig('plan'))[weekday(date)]?.theme || '' : '')}</h2>
        <button class="link-btn" data-act="toggleAll">${showAll ? 'Solo actividades' : 'Día completo'}</button></div>
      ${p.blocks.length ? `<div class="blocks">${p.blocks.map(blockRow).join('')}</div>` : `<div class="empty card">No hay bloques para hoy. <a class="link-btn" href="#/plan">Editar plan</a></div>`}
    </section>

    <section class="section">
      <div class="section-head"><h2 class="eyebrow">Alimentación e hidratación</h2><a class="link" href="#/comida">Detalle</a></div>
      <div class="card">
        <div class="meal-strip">${MEAL_SLOTS.map((m) => { const on = p.meals.some((x) => x.slot === m.id && x.done); return `<button class="meal-pip ${on ? 'on' : ''}" data-act="meal" data-slot="${m.id}"><span class="mp">${icon('check')}</span>${m.name.replace('Media mañana', 'Media m.')}</button>`; }).join('')}</div>
        <div class="divider"></div>
        <div class="water">
          <span class="ico" style="color:var(--info)">${icon('drop')}</span>
          <div class="grow"><div class="small"><b class="num">${water}</b><span class="muted"> de ${s.goals.water} vasos</span></div><div class="glasses" style="margin-top:6px">${Array.from({ length: Math.max(s.goals.water, water) }, (_, i) => `<i class="${i < water ? 'on' : ''}"></i>`).join('')}</div></div>
          <button class="icon-btn" data-act="water-" aria-label="Quitar vaso">${icon('minus')}</button>
          <button class="icon-btn" data-act="water+" aria-label="Sumar vaso" style="background:color-mix(in srgb,var(--info) 18%,transparent);color:var(--info)">${icon('plus')}</button>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="eyebrow">Hábitos · ${habitsDone}/${dueHabits.length}</h2><a class="link" href="#/habitos">Todos</a></div>
      <div class="chips">${dueHabits.map(habitChip).join('') || '<span class="faint small">Sin hábitos fijos para hoy.</span>'}
        ${flexHabits.length ? `<button class="chip" data-act="toggleFlex" style="background:transparent;border-color:var(--line-2)">${showFlex ? 'Ocultar flexibles' : `+ ${flexHabits.length} flexibles de la semana`}</button>` : ''}</div>
      ${showFlex && flexHabits.length ? `<div class="chips" style="margin-top:8px">${flexHabits.map(habitChip).join('')}</div>` : ''}
    </section>

    <section class="section">
      <div class="section-head"><h2 class="eyebrow">Tareas pendientes</h2></div>
      <div class="list">
        ${tasks.map((t) => `<div class="task ${t.done ? 'done' : ''}"><button class="check ${t.done ? 'done' : ''}" data-act="task" data-id="${t.id}" aria-label="Completar">${icon('check')}</button><button class="tt" data-act="editTask" data-id="${t.id}" style="text-align:left">${esc(t.text)}${t.date < date && !t.done ? ' <span class="pill warn">Atrasada</span>' : ''}</button></div>`).join('')}
        <form class="addrow" data-form="task"><input name="text" placeholder="Agregar tarea para hoy…" enterkeyhint="done" autocomplete="off"><button class="btn sm primary">Agregar</button></form>
      </div>
    </section>

    ${reminders.length ? `<section class="section">
      <div class="section-head"><h2 class="eyebrow">Próximos recordatorios</h2><a class="link" href="#/recordatorios">Configurar</a></div>
      <div class="list">${reminders.map((r) => `<div class="li"><span class="ico">${icon('bell')}</span><div class="grow"><div class="title">${esc(r.title)}</div><div class="sub">${esc(r.body)}</div></div><span class="num muted">${esc(r.time)}</span></div>`).join('')}</div>
    </section>` : ''}

    <section class="section">
      <button class="card" data-act="note" style="width:100%;text-align:left;display:block">
        <div class="eyebrow">Nota del día</div>
        <p class="${p.day.note ? '' : 'faint'}" style="margin-top:6px;font-size:15px">${p.day.note ? esc(p.day.note) : 'Escribí cómo fue tu día…'}</p>
      </button>
    </section>
    <p class="center xs faint" style="margin-top:22px;letter-spacing:.14em">BUILD YOURSELF, EVERY DAY.</p>
  `;

  const blockById = (id) => p.blocks.find((b) => b.id === id);

  el.querySelectorAll('[data-quick]').forEach((sc) => sc.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-v]'); if (!b) return;
    sc.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    await saveRecovery(date, { [sc.dataset.quick]: Number(b.dataset.v) });
    const other = sc.dataset.quick === 'energy' ? 'fatigue' : 'energy';
    if (el.querySelector(`[data-quick=${other}] .on`)) bus.refresh();
  }));

  el.querySelector('[data-form=task]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = e.target.text.value.trim(); if (!text) return;
    await db.put('tasks', { id: uid(), text, date, done: false, at: Date.now() });
    bus.refresh();
  });

  bind(el, {
    check: async (btn) => {
      const b = blockById(btn.dataset.id);
      const st = p.day.statuses[b.id];
      if (st) { await setBlockStatus(date, b, null); bus.refresh(); return; }
      await setBlockStatus(date, b, 'done');
      bus.refresh();
      if (b.kind === 'bjj') toast('BJJ completado', { action: 'Agregar detalles', onAction: () => openBjjForm() });
      else if (b.kind === 'run' || b.kind === 'walk') toast(`${b.title} completado`, { action: 'Registrar datos', onAction: () => openRunForm({ planSession: b.kind === 'run' }) });
      else if (b.kind === 'calisthenics') toast('Marcada sin registrar series', { action: 'Abrir rutina', onAction: () => bus.go(`#/play/${b.routine || 'A'}`) });
    },
    status: (btn) => openStatusSheet(date, blockById(btn.dataset.id), p.day.statuses[btn.dataset.id]),
    toggleFlex: () => { sessionStorage.setItem('p5k:showFlex', showFlex ? '0' : '1'); bus.refresh(); },
    toggleAll: () => { sessionStorage.setItem('p5k:showAllBlocks', showAll ? '0' : '1'); bus.refresh(); },
    habit: async (btn) => {
      const h = habits.find((x) => x.id === btn.dataset.id);
      if (habitLinkedOn(h, ctx[date])) { toast('Se marcó solo al completar la actividad del plan.'); return; }
      await toggleHabit(date, h); bus.refresh();
    },
    task: async (btn) => {
      const t = tasksAll.find((x) => x.id === btn.dataset.id);
      t.done = !t.done; t.doneDate = t.done ? date : null;
      await db.put('tasks', t); bus.refresh();
    },
    editTask: (btn) => openTaskForm(tasksAll.find((x) => x.id === btn.dataset.id)),
    meal: async (btn) => {
      const on = await toggleMealSlot(date, btn.dataset.slot);
      const name = MEAL_SLOTS.find((m) => m.id === btn.dataset.slot).name;
      toast(on ? `${name} registrada` : `${name} desmarcada`, on ? { action: 'Detalles', onAction: () => openMealForm(date, btn.dataset.slot) } : {});
    },
    'water+': () => addWater(1),
    'water-': () => addWater(-1),
    sleep: () => openSleepForm(),
    wellness: () => openWellnessForm(),
    note: () => import('../quicklog.js').then((m) => m.openNoteForm()),
    dismissInstall: () => { updateSettings((x) => { x.dismissInstall = true; }); bus.refresh(); },
  });
}

function openStatusSheet(date, b, st) {
  const opts = [['done', 'Completada', 'check'], ['skipped', 'No realizada', 'x'], ['postponed', 'Pospuesta', 'clock'], ['modified', 'Modificada', 'edit']];
  sheet({
    title: b.title,
    body: `<p class="small muted" style="margin:-4px 2px 14px">${esc(b.start)}${b.end ? '–' + esc(b.end) : ''} · ${esc(KINDS[b.kind] || '')}</p>
      <div class="grid2">${opts.map(([k, l, ic]) => `<button class="btn ${st?.s === k ? 'primary' : ''}" data-s="${k}">${icon(ic)} ${l}</button>`).join('')}</div>
      <div data-extra style="margin-top:14px"></div>
      ${st ? `<button class="btn ghost block" data-clear style="margin-top:10px">Quitar estado</button>` : ''}`,
    onMount: (body, close) => {
      const extra = body.querySelector('[data-extra]');
      body.querySelectorAll('[data-s]').forEach((btn) => btn.onclick = async () => {
        const s = btn.dataset.s;
        if (s === 'done') { await setBlockStatus(date, b, 'done'); close(); bus.refresh(); return; }
        if (s === 'skipped') {
          extra.innerHTML = `<label class="field"><span>¿Por qué? (opcional, ayuda al informe semanal)</span>
            <div class="chips" data-reasons>${['Cansancio', 'Poco tiempo', 'Exámenes', 'Enfermedad', 'Clima', 'Olvido'].map((r) => `<button type="button" class="chip" data-r="${r}">${r}</button>`).join('')}</div></label>
            <button class="btn primary block" data-ok>Guardar</button>`;
          let reason = '';
          extra.querySelectorAll('[data-r]').forEach((c) => c.onclick = () => { reason = c.dataset.r; extra.querySelectorAll('[data-r]').forEach((x) => x.classList.toggle('on', x === c)); });
          extra.querySelector('[data-ok]').onclick = async () => { await setBlockStatus(date, b, 'skipped', reason); close(); bus.refresh(); };
        }
        if (s === 'postponed') {
          extra.innerHTML = `<p class="small muted" style="margin-bottom:10px">Se crea una tarea para no olvidarla.</p>
            <div class="grid2"><button class="btn" data-when="${date}">Más tarde hoy</button><button class="btn" data-when="${addDays(date, 1)}">Mañana</button></div>`;
          extra.querySelectorAll('[data-when]').forEach((w) => w.onclick = async () => {
            await setBlockStatus(date, b, 'postponed', w.dataset.when === date ? 'Para más tarde' : 'Para mañana');
            await db.put('tasks', { id: uid(), text: `${b.title} (pospuesto)`, date: w.dataset.when, done: false, at: Date.now() });
            close(); bus.refresh(); toast('Pospuesta: quedó como tarea');
          });
        }
        if (s === 'modified') {
          extra.innerHTML = `<label class="field"><span>¿Qué hiciste en su lugar?</span><input name="note" value="${esc(st?.s === 'modified' ? st.note : '')}" placeholder="Ej.: 20 min de caminata en vez de running"></label>
            <button class="btn primary block" data-ok>Guardar</button>`;
          extra.querySelector('[data-ok]').onclick = async () => { await setBlockStatus(date, b, 'modified', extra.querySelector('input').value.trim()); close(); bus.refresh(); };
          extra.querySelector('input').focus();
        }
      });
      body.querySelector('[data-clear]')?.addEventListener('click', async () => { await setBlockStatus(date, b, null); close(); bus.refresh(); });
    },
  });
}
