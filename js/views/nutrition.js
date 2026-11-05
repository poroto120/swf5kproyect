// ALIMENTACIÓN — registro simple por franja, fotos, hidratación e ideas prácticas. Sin contar calorías.
import * as db from '../db.js';
import { settings, getDay } from '../store.js';
import { MEAL_SLOTS, MEAL_IDEAS, NUTRITION_TIPS } from '../seed.js';
import { barChart } from '../charts.js';
import { today, addDays, esc, fmtLong, DAYS_L, weekday } from '../util.js';
import { icon, bind, topbarSm } from '../ui.js';
import { bus } from '../bus.js';
import { openMealForm, toggleMealSlot, addWater } from '../quicklog.js';

let curDate = null;
const urls = [];

export async function render(el) {
  if (!curDate) curDate = today();
  const date = curDate;
  const s = settings();
  const meals = await db.range('meals', date, date, 'date');
  const day = await getDay(date);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const wMeals = await db.range('meals', week[0], week[6], 'date');
  const wDays = await db.range('days', week[0], week[6]);
  urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
  const photos = {};
  for (const m of meals) if (m.photoId) { const p = await db.get('photos', m.photoId); if (p?.blob) { const u = URL.createObjectURL(p.blob); urls.push(u); photos[m.id] = u; } }
  const done = meals.filter((m) => m.done).length;
  const water = day.water || 0;

  el.innerHTML = `${topbarSm('Alimentación', '#/mas')}
    <div class="date-nav card" style="padding:8px">
      <button class="icon-btn" data-act="prev" aria-label="Día anterior">${icon('back')}</button>
      <div class="lbl">${date === today() ? 'Hoy' : esc(fmtLong(date))}</div>
      <button class="icon-btn" data-act="next" aria-label="Día siguiente" ${date >= today() ? 'disabled style="opacity:.3"' : ''}>${icon('chev')}</button>
    </div>
    <div class="grid2" style="margin-top:10px">
      <div class="stat"><div class="label">${icon('food')} Comidas</div><div class="value">${done}<small>/ 5</small></div><div class="bar"><i style="width:${done * 20}%;background:var(--c-food)"></i></div></div>
      <div class="stat"><div class="label">${icon('drop')} Agua</div><div class="value">${water}<small>/ ${s.goals.water} vasos</small></div><div class="bar"><i style="width:${Math.min(water / s.goals.water, 1) * 100}%;background:var(--info)"></i></div></div>
    </div>
    <div class="row" style="margin-top:10px"><button class="btn grow" data-act="w-">${icon('minus')} Vaso</button><button class="btn grow" data-act="w+" style="color:var(--info)">${icon('plus')} Vaso de agua</button></div>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Comidas del día</h2></div>
      <div class="list">${MEAL_SLOTS.map((slot) => {
        const m = meals.find((x) => x.slot === slot.id);
        return `<div class="li">
          <button class="check ${m?.done ? 'done' : ''}" data-act="toggle" data-slot="${slot.id}" aria-label="Marcar ${slot.name}" style="${m?.done ? 'background:var(--c-food);border-color:var(--c-food);color:#2a1d00' : ''}">${icon('check')}</button>
          <button class="grow" data-act="open" data-slot="${slot.id}" style="text-align:left;min-width:0">
            <div class="title">${slot.name} ${m?.time ? `<span class="faint xs num">${esc(m.time)}</span>` : ''} ${m?.demo ? '<span class="src demo">Demo</span>' : ''}</div>
            <div class="sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m?.foods ? esc(m.foods) + (m.qty ? ` · ${esc(m.qty)}` : '') : m?.done ? 'Realizada · tocá para agregar detalle' : 'Tocá para registrar'}</div>
          </button>
          ${photos[m?.id] ? `<img class="photo-thumb" src="${photos[m.id]}" alt="" style="width:48px;height:48px">` : `<button class="icon-btn" data-act="open" data-slot="${slot.id}" aria-label="Agregar detalle">${icon('camera')}</button>`}
        </div>`;
      }).join('')}</div>
    </section>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Últimos 7 días</h2></div>
      <div class="card">${barChart({ bars: week.map((d) => ({ label: DAYS_L[weekday(d)], v: wMeals.filter((m) => m.date === d && m.done).length })), max: 5, goal: 5, showValues: true, yFmt: (v) => `${Math.round(v)}`, empty: 'Sin comidas registradas esta semana.' })}
        <div class="legend"><span><i></i>Comidas registradas</span></div>
        <div class="divider"></div>
        ${barChart({ bars: week.map((d) => ({ label: DAYS_L[weekday(d)], v: wDays.find((x) => x.date === d)?.water || 0, cls: 'alt' })), goal: s.goals.water, showValues: true, height: 120, yFmt: (v) => `${Math.round(v)}`, empty: 'Sin registros de agua.' })}
        <div class="legend"><span><i class="alt"></i>Vasos de agua</span></div>
      </div>
    </section>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Ideas equilibradas y prácticas</h2></div>
      ${MEAL_SLOTS.map((slot) => `<details class="acc"><summary>${slot.name}</summary><div><ul class="tech">${MEAL_IDEAS[slot.id].map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div></details>`).join('')}
    </section>
    <section class="section"><div class="card"><div class="eyebrow" style="margin-bottom:6px">Para rendir y crecer</div>${NUTRITION_TIPS.map((t) => `<p class="small" style="margin-top:7px;color:var(--fg-2)">${esc(t)}</p>`).join('')}</div></section>`;

  bind(el, {
    prev: () => { curDate = addDays(curDate, -1); bus.refresh(); },
    next: () => { if (curDate < today()) { curDate = addDays(curDate, 1); bus.refresh(); } },
    toggle: (b) => toggleMealSlot(date, b.dataset.slot),
    open: (b) => openMealForm(date, b.dataset.slot),
    'w+': () => addWater(1, date),
    'w-': () => addWater(-1, date),
  });
  return () => { urls.splice(0).forEach((u) => URL.revokeObjectURL(u)); };
}
export const resetDate = () => { curDate = null; };
