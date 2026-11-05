// PLAN SEMANAL — editable: bloques, horarios, categorías y qué cuenta para el progreso.
import { getConfig, setConfig, resetConfig, logChange, settings } from '../store.js';
import { buildPlan, classify, CATEGORIES, KINDS } from '../seed.js';
import { esc, uid, DAYS, DAYS_L, WEEK_ORDER, today, weekday, fmtShort } from '../util.js';
import { icon, bind, sheet, toast, topbarSm, confirmDialog } from '../ui.js';
import { bus } from '../bus.js';

let currentWd = null;

export async function render(el) {
  if (currentWd == null) currentWd = weekday(today());
  const plan = await getConfig('plan');
  const changes = (await getConfig('changes')).slice(0, 8);
  const day = plan[currentWd] || { theme: '', blocks: [] };
  const s = settings();

  el.innerHTML = `${topbarSm('Plan semanal', '#/mas', `<button class="icon-btn" data-act="add" aria-label="Agregar bloque">${icon('plus')}</button>`)}
    <div class="seg" style="margin-bottom:14px">${WEEK_ORDER.map((d) => `<button data-act="day" data-wd="${d}" class="${d === currentWd ? 'on' : ''}">${DAYS_L[d]}</button>`).join('')}</div>
    <button class="card" data-act="theme" style="width:100%;text-align:left;display:block;margin-bottom:12px">
      <div class="eyebrow">${DAYS[currentWd]}</div>
      <div style="font-weight:700;font-size:17px;margin-top:3px">${esc(day.theme || 'Sin título')}</div>
      <div class="xs faint" style="margin-top:3px">${day.blocks.filter((b) => b.track).length} actividades que cuentan · tocá para renombrar</div>
    </button>
    <div class="blocks">
      ${day.blocks.map((b) => `<button class="block cat-${b.cat} ${b.track ? '' : 'passive'}" data-act="edit" data-id="${b.id}" style="width:100%;text-align:left">
        <span class="time">${esc(b.start)}</span>
        <div class="body"><div class="t"><span class="dot"></span>${esc(b.title)}</div>
          <div class="s">${b.end ? `${esc(b.start)}–${esc(b.end)} · ` : ''}${esc(KINDS[b.kind] || '')}${b.track ? (b.optional ? ' · opcional' : ' · cuenta') : ''}</div></div>
        ${icon('chev', 'chev')}
      </button>`).join('') || '<div class="empty">Día vacío.</div>'}
    </div>
    <div class="grid2" style="margin-top:12px">
      <button class="btn" data-act="add">${icon('plus')} Bloque</button>
      <button class="btn" data-act="copyDay">Copiar día…</button>
    </div>
    <section class="section">
      <div class="section-head"><h2 class="eyebrow">Ajustes temporales</h2></div>
      <div class="list">
        <a class="li" href="#/ajustes"><span class="ico">${icon('book')}</span><div class="grow"><div class="title">Modo exámenes</div><div class="sub">${s.examUntil && s.examUntil >= today() ? `Activo hasta el ${fmtShort(s.examUntil)}` : 'Reduce actividades secundarias unos días'}</div></div>${icon('chev', 'chev')}</a>
      </div>
    </section>
    ${changes.length ? `<section class="section"><div class="section-head"><h2 class="eyebrow">Cambios aprobados</h2></div>
      <div class="list">${changes.map((c) => `<div class="li"><div class="grow"><div class="title" style="font-size:14.5px">${esc(c.title)}</div><div class="sub">${esc(fmtShort(c.date))}${c.detail ? ' · ' + esc(c.detail) : ''}</div></div></div>`).join('')}</div></section>` : ''}
    <button class="btn ghost block" data-act="reset" style="margin-top:20px">Restaurar planificación original</button>
    <p class="xs faint" style="margin:12px 4px">Las actividades que “cuentan” suman al progreso del día. Las opcionales suman solo si las hacés: no restan.</p>`;

  bind(el, {
    day: (b) => { currentWd = Number(b.dataset.wd); bus.refresh(); },
    edit: (b) => editBlock(plan, currentWd, day.blocks.find((x) => x.id === b.dataset.id)),
    add: () => editBlock(plan, currentWd, null),
    theme: () => sheet({
      title: 'Nombre del día',
      body: `<label class="field"><span>${DAYS[currentWd]}</span><input name="t" value="${esc(day.theme || '')}" placeholder="Ej.: BJJ + Estudio"></label><button class="btn primary block lg" data-ok>Guardar</button>`,
      onMount: (body, close) => body.querySelector('[data-ok]').onclick = async () => { plan[currentWd].theme = body.querySelector('input').value.trim(); await setConfig('plan', plan); close(); bus.refresh(); },
    }),
    copyDay: () => sheet({
      title: `Copiar ${DAYS[currentWd].toLowerCase()} a…`,
      body: `<p class="small muted" style="margin-bottom:12px">Reemplaza los bloques de los días elegidos.</p>
        <div class="chips" data-days>${WEEK_ORDER.filter((d) => d !== currentWd).map((d) => `<button class="chip" data-d="${d}">${DAYS[d]}</button>`).join('')}</div>
        <button class="btn primary block lg" data-ok style="margin-top:16px">Copiar</button>`,
      onMount: (body, close) => {
        const sel = new Set();
        body.querySelectorAll('[data-d]').forEach((c) => c.onclick = () => { const d = Number(c.dataset.d); sel.has(d) ? sel.delete(d) : sel.add(d); c.classList.toggle('on'); });
        body.querySelector('[data-ok]').onclick = async () => {
          if (!sel.size) { toast('Elegí al menos un día.'); return; }
          for (const d of sel) plan[d] = { theme: plan[currentWd].theme, blocks: plan[currentWd].blocks.map((b) => ({ ...b, id: 'n' + uid() })) };
          await setConfig('plan', plan); close(); toast('Día copiado'); bus.refresh();
        };
      },
    }),
    reset: async () => {
      if (!(await confirmDialog('Restaurar plan', 'Vuelve a la planificación inicial en todos los días. Tu historial no se borra.', { ok: 'Restaurar', danger: true }))) return;
      await resetConfig('plan'); await logChange('Plan restaurado a la versión original'); toast('Plan restaurado'); bus.refresh();
    },
  });
}

function editBlock(plan, wd, b) {
  const x = b ? { ...b } : { id: 'n' + uid(), start: '18:00', end: '19:00', title: '', ...classify('') };
  sheet({
    title: b ? 'Editar bloque' : 'Nuevo bloque',
    body: `<form>
      <label class="field"><span>Actividad</span><input name="title" required value="${esc(x.title)}" placeholder="Ej.: Estudio de matemática"></label>
      <div class="fields2">
        <label class="field"><span>Inicio</span><input name="start" type="time" required value="${x.start}"></label>
        <label class="field"><span>Fin (opcional)</span><input name="end" type="time" value="${x.end || ''}"></label>
      </div>
      <div class="fields2">
        <label class="field"><span>Categoría</span><select name="cat">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${x.cat === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="field"><span>Tipo</span><select name="kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${x.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      </div>
      <label class="field ${x.kind === 'calisthenics' ? '' : 'hidden'}" data-rt><span>Rutina</span><select name="routine"><option value="A" ${x.routine !== 'B' ? 'selected' : ''}>Fuerza A</option><option value="B" ${x.routine === 'B' ? 'selected' : ''}>Fuerza B</option></select></label>
      <div class="list" style="margin-bottom:14px">
        <label class="li"><span class="grow"><span class="title">Cuenta para el progreso</span><div class="sub">Aparece con casilla en Hoy</div></span><input type="checkbox" class="switch" name="track" ${x.track ? 'checked' : ''}></label>
        <label class="li"><span class="grow"><span class="title">Opcional</span><div class="sub">Suma si la hacés, no resta si no</div></span><input type="checkbox" class="switch" name="optional" ${x.optional ? 'checked' : ''}></label>
      </div>
      <button class="btn primary block lg">Guardar</button>
      ${b ? '<button type="button" class="btn danger block" data-del style="margin-top:10px">Eliminar bloque</button>' : ''}
    </form>`,
    onMount: (body, close) => {
      const f = body.querySelector('form');
      f.title.addEventListener('change', () => {
        if (b) return; // solo autoclasificar bloques nuevos
        const c = classify(f.title.value);
        f.cat.value = c.cat; f.kind.value = c.kind; f.track.checked = c.track; f.optional.checked = c.optional;
        if (c.routine) f.routine.value = c.routine;
        body.querySelector('[data-rt]').classList.toggle('hidden', c.kind !== 'calisthenics');
      });
      f.kind.onchange = () => body.querySelector('[data-rt]').classList.toggle('hidden', f.kind.value !== 'calisthenics');
      f.onsubmit = async (e) => {
        e.preventDefault();
        if (f.end.value && f.end.value <= f.start.value) { toast('El fin tiene que ser después del inicio.'); return; }
        Object.assign(x, { title: f.title.value.trim(), start: f.start.value, end: f.end.value, cat: f.cat.value, kind: f.kind.value, track: f.track.checked, optional: f.optional.checked });
        if (x.kind === 'calisthenics') x.routine = f.routine.value; else delete x.routine;
        const blocks = plan[wd].blocks;
        const i = blocks.findIndex((y) => y.id === x.id);
        if (i >= 0) blocks[i] = x; else blocks.push(x);
        blocks.sort((p, q) => p.start.localeCompare(q.start));
        await setConfig('plan', plan);
        close(); toast('Plan actualizado'); bus.refresh();
      };
      body.querySelector('[data-del]')?.addEventListener('click', async () => {
        plan[wd].blocks = plan[wd].blocks.filter((y) => y.id !== x.id);
        await setConfig('plan', plan); close(); toast('Bloque eliminado'); bus.refresh();
      });
    },
  });
}
