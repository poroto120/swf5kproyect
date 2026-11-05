// HÁBITOS — configurables por categoría, con rachas y semana visual.
import { getConfig, setConfig, habitContext, habitDueOn, habitDoneOn, habitLinkedOn, habitStreak, weekDoneCount, toggleHabit, habitCompliance } from '../store.js';
import { today, addDays, esc, uid, DAYS_L, WEEK_ORDER, weekDates } from '../util.js';
import { icon, bind, sheet, toast, topbarSm, confirmDialog } from '../ui.js';
import { bus } from '../bus.js';
import { CATEGORIES, KINDS } from '../seed.js';

const LINKS = ['', 'school', 'study', 'review', 'exams', 'bjj', 'run', 'calisthenics', 'mobility', 'venture', 'prep', 'read', 'sleep'];
const freqText = (h) => h.freq === 'daily' ? 'Todos los días' : h.freq === 'times' ? `${h.times} ${h.times === 1 ? 'vez' : 'veces'} por semana` : WEEK_ORDER.filter((d) => h.days.includes(d)).map((d) => DAYS_L[d]).join(' · ');

export async function render(el) {
  const date = today();
  const habits = await getConfig('habits');
  const ctx = await habitContext(addDays(date, -150), date);
  const week = weekDates(date);
  const comp = habitCompliance(habits, ctx, week.filter((d) => d <= date));
  const cats = Object.keys(CATEGORIES).filter((c) => habits.some((h) => h.cat === c));

  const row = (h) => {
    const due = habitDueOn(h, date);
    const on = habitDoneOn(h, ctx[date]);
    const st = habitStreak(h, ctx, date);
    const dots = week.map((d) => {
      if (d > date) return '<i class="na"></i>';
      if (!habitDueOn(h, d) && h.freq !== 'times') return '<i class="na"></i>';
      return `<i class="${habitDoneOn(h, ctx[d]) ? 'on' : ''}"></i>`;
    }).join('');
    return `<div class="habit" style="${h.active ? '' : 'opacity:.5'}">
      <button class="check ${on ? 'done' : ''}" data-act="toggle" data-id="${h.id}" ${!h.active ? 'disabled' : ''} aria-label="Marcar ${esc(h.name)}" style="width:30px;height:30px">${icon('check')}</button>
      <button class="grow" data-act="edit" data-id="${h.id}" style="text-align:left;min-width:0">
        <div style="font-weight:580;font-size:15px">${esc(h.name)}${!due && h.active && h.freq === 'days' ? ' <span class="faint xs">hoy no</span>' : ''}</div>
        <div class="xs muted" style="margin-top:2px">${freqText(h)}${h.link ? ` · auto con ${esc(KINDS[h.link] || h.link)}` : ''}${h.freq === 'times' ? ` · ${weekDoneCount(h, date, ctx)}/${h.times} esta semana` : ''}</div>
      </button>
      <div class="week-dots">${dots}</div>
      <span class="streak" title="Racha">${st.n ? `${st.n}${st.unit === 'sem' ? 's' : 'd'}` : '–'}</span>
    </div>`;
  };

  el.innerHTML = `${topbarSm('Hábitos', '#/mas', `<button class="icon-btn" data-act="new" aria-label="Nuevo hábito">${icon('plus')}</button>`)}
    <div class="grid2">
      <div class="stat"><div class="label">Esta semana</div><div class="value">${comp.pct ?? '—'}<small>%</small></div><div class="bar"><i style="width:${comp.pct || 0}%"></i></div></div>
      <div class="stat"><div class="label">Hechos / previstos</div><div class="value">${comp.done}<small>/ ${comp.due}</small></div><div class="meta">Se cuentan solo los días que tocan</div></div>
    </div>
    ${cats.map((c) => `<section class="section"><div class="section-head"><h2 class="eyebrow cat-${c}"><span class="dot" style="display:inline-block;margin-right:6px"></span>${CATEGORIES[c]}</h2></div>
      <div class="list">${habits.filter((h) => h.cat === c).map(row).join('')}</div></section>`).join('')}
    <p class="xs faint" style="margin:16px 4px">Las rachas cuentan días cumplidos seguidos (o semanas para hábitos flexibles). Un hábito “auto” se marca solo cuando completás esa actividad en el plan o registrás el entrenamiento.</p>
    <button class="btn block" data-act="new" style="margin-top:6px">${icon('plus')} Nuevo hábito</button>`;

  bind(el, {
    toggle: async (b) => {
      const h = habits.find((x) => x.id === b.dataset.id);
      if (habitLinkedOn(h, ctx[date])) { toast('Se marcó solo al completar la actividad.'); return; }
      await toggleHabit(date, h); bus.refresh();
    },
    edit: (b) => editHabit(habits, habits.find((x) => x.id === b.dataset.id)),
    new: () => editHabit(habits, null),
  });
}

function editHabit(habits, h) {
  const x = h ? structuredClone(h) : { id: 'h' + uid(), name: '', cat: 'personal', freq: 'daily', days: [1, 2, 3, 4, 5], times: 3, link: null, active: true };
  sheet({
    title: h ? 'Editar hábito' : 'Nuevo hábito',
    body: `<form>
      <label class="field"><span>Nombre</span><input name="name" required value="${esc(x.name)}" placeholder="Ej.: Leer 20 minutos"></label>
      <label class="field"><span>Categoría</span><select name="cat">${Object.entries(CATEGORIES).filter(([k]) => !['comida', 'libre'].includes(k)).map(([k, v]) => `<option value="${k}" ${x.cat === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <div class="field"><span>Frecuencia</span><div class="seg" data-freq>${[['daily', 'Diario'], ['days', 'Días'], ['times', 'Veces/sem']].map(([k, l]) => `<button type="button" data-f="${k}" class="${x.freq === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="field ${x.freq === 'days' ? '' : 'hidden'}" data-daysbox><span>Días</span><div class="chips">${WEEK_ORDER.map((d) => `<button type="button" class="chip ${x.days.includes(d) ? 'on' : ''}" data-day="${d}" style="min-width:42px;justify-content:center">${DAYS_L[d]}</button>`).join('')}</div></div>
      <div class="field ${x.freq === 'times' ? '' : 'hidden'}" data-timesbox><span>Veces por semana</span><div class="stepper"><button type="button" data-t="-1">−</button><span class="val" style="font-size:40px" data-tval>${x.times}</span><button type="button" data-t="1">+</button></div></div>
      <label class="field"><span>Se marca solo con</span><select name="link">${LINKS.map((k) => `<option value="${k}" ${(x.link || '') === k ? 'selected' : ''}>${k ? (k === 'sleep' ? 'Dormir el objetivo' : KINDS[k]) : 'Nada (manual)'}</option>`).join('')}</select></label>
      <label class="row card" style="margin-bottom:14px;padding:12px 14px"><span class="grow">Activo</span><input type="checkbox" class="switch" name="active" ${x.active ? 'checked' : ''}></label>
      <button class="btn primary block lg">Guardar</button>
      ${h ? '<button type="button" class="btn danger block" data-del style="margin-top:10px">Eliminar hábito</button>' : ''}
    </form>`,
    onMount: (b, close) => {
      const f = b.querySelector('form');
      b.querySelectorAll('[data-f]').forEach((btn) => btn.onclick = () => {
        x.freq = btn.dataset.f;
        b.querySelectorAll('[data-f]').forEach((y) => y.classList.toggle('on', y === btn));
        b.querySelector('[data-daysbox]').classList.toggle('hidden', x.freq !== 'days');
        b.querySelector('[data-timesbox]').classList.toggle('hidden', x.freq !== 'times');
      });
      b.querySelectorAll('[data-day]').forEach((c) => c.onclick = () => {
        const d = Number(c.dataset.day);
        x.days = x.days.includes(d) ? x.days.filter((y) => y !== d) : [...x.days, d];
        c.classList.toggle('on');
      });
      b.querySelectorAll('[data-t]').forEach((t) => t.onclick = () => { x.times = Math.min(7, Math.max(1, x.times + Number(t.dataset.t))); b.querySelector('[data-tval]').textContent = x.times; });
      f.onsubmit = async (e) => {
        e.preventDefault();
        x.name = f.name.value.trim(); if (!x.name) return;
        if (x.freq === 'days' && !x.days.length) { toast('Elegí al menos un día.'); return; }
        x.cat = f.cat.value; x.link = f.link.value || null; x.active = f.active.checked;
        const list = h ? habits.map((y) => (y.id === x.id ? x : y)) : [...habits, x];
        await setConfig('habits', list);
        close(); toast('Hábito guardado'); bus.refresh();
      };
      b.querySelector('[data-del]')?.addEventListener('click', async () => {
        if (!(await confirmDialog('Eliminar hábito', `¿Eliminar “${h.name}”? El historial de días queda guardado.`, { ok: 'Eliminar', danger: true }))) return;
        await setConfig('habits', habits.filter((y) => y.id !== h.id));
        close(); toast('Hábito eliminado'); bus.refresh();
      });
    },
  });
}
