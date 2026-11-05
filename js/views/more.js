// MÁS — menú, recordatorios, Apple Health/Xiaomi, copias de seguridad, ajustes e instalación.
import * as db from '../db.js';
import { settings, updateSettings, saveRecovery, getConfig } from '../store.js';
import { exportICS, notifPermission, requestNotif, remindersForWeekday, startInAppReminders } from '../reminders.js';
import { parseHealthText, FIELDS, SHORTCUT_TEMPLATE, SAMPLE } from '../health.js';
import { exportBackup, importBackup, validateBackup, summarize, wipeAll, storageInfo, requestPersist, loadDemo, removeDemo } from '../backup.js';
import { MEAL_SLOTS } from '../seed.js';
import { today, esc, fmtShort, fmtLong, isStandalone, isIOS, WEEK_ORDER, DAYS_S, parseDec, addDays } from '../util.js';
import { icon, bind, sheet, toast, topbarSm, confirmDialog, LOGO } from '../ui.js';
import { bus } from '../bus.js';

export const VERSION = '1.0.0';

// ---------------------------------------------------------------------------
export async function renderMenu(el) {
  const s = settings();
  const item = (href, ic, title, sub = '') => `<a class="li" href="${href}"><span class="ico">${icon(ic)}</span><div class="grow"><div class="title">${title}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${icon('chev', 'chev')}</a>`;
  el.innerHTML = `<header class="topbar"><div><div class="eyebrow">PROJECT 5K</div><h1>Más</h1></div></header>
    <div class="list">
      ${item('#/comida', 'food', 'Alimentación', 'Comidas, fotos e hidratación')}
      ${item('#/habitos', 'habit', 'Hábitos', 'Academia, deportes, emprendimiento y personal')}
      ${item('#/plan', 'cal', 'Plan semanal', 'Editá tus horarios y actividades')}
    </div>
    <div class="list" style="margin-top:12px">
      ${item('#/recordatorios', 'bell', 'Recordatorios', 'Calendario de iOS y avisos en la app')}
      ${item('#/salud', 'heart', 'Apple Health y Xiaomi', 'Importar datos con Atajos')}
      ${item('#/datos', 'db', 'Datos y copias de seguridad', s.lastBackup ? `Última copia: ${fmtShort(s.lastBackup.slice(0, 10))}` : 'Todavía sin copias')}
      ${item('#/ajustes', 'gear', 'Ajustes', 'Perfil, objetivos, tema y modos')}
      ${item('#/instalar', 'phone', 'Instalar en el iPhone', isStandalone() ? 'Instalada ✓' : 'Añadir a pantalla de inicio')}
    </div>
    <div class="center" style="margin-top:30px">${LOGO(44)}<div class="wordmark" style="margin-top:8px;font-size:17px">PROJECT <em>5K</em></div><div class="xs faint" style="margin-top:4px;letter-spacing:.14em">BUILD YOURSELF, EVERY DAY.</div><div class="xs faint" style="margin-top:6px">v${VERSION} · datos guardados solo en este dispositivo</div></div>`;
}

// ---------------------------------------------------------------------------
export async function renderReminders(el) {
  const s = settings();
  const r = s.reminders;
  const perm = notifPermission();
  const wd = new Date().getDay();
  const preview = await remindersForWeekday(wd);
  const sw = (path, on, label, sub = '') => `<label class="li"><div class="grow"><div class="title">${label}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div><input type="checkbox" class="switch" data-path="${path}" ${on ? 'checked' : ''}></label>`;
  el.innerHTML = `${topbarSm('Recordatorios', '#/mas')}
    <div class="banner info"><span class="bi">${icon('info')}</span><div class="grow"><b>Cómo funcionan en iPhone</b><p>Una web no puede programar notificaciones con la app cerrada sin un servidor. Por eso PROJECT 5K genera un calendario con alarmas: lo importás una vez y iOS te avisa siempre, gratis.</p></div></div>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Qué recordar</h2></div>
      <div class="list">${Object.entries(r.groups).map(([k, g]) => sw(`groups.${k}.on`, g.on, g.label)).join('')}</div>
      <div class="list" style="margin-top:10px">
        ${sw('meals.on', r.meals.on, 'Comidas', MEAL_SLOTS.map((m) => `${m.name.split(' ')[0]} ${m.time}`).join(' · '))}
        ${sw('water.on', r.water.on, 'Hidratación', r.water.times.join(' · '))}
        ${sw('checkin.on', r.checkin.on, 'Control semanal', `Domingo ${r.checkin.time}`)}
        ${sw('dailySummary.on', r.dailySummary.on, 'Resumen del día', `Todos los días ${r.dailySummary.time}`)}
        ${sw('weeklySummary.on', r.weeklySummary.on, 'Resumen semanal', `Domingo ${r.weeklySummary.time}`)}
        ${sw('tasks.on', r.tasks.on, 'Tareas pendientes', `Todos los días ${r.tasks.time}`)}
      </div>
      <div class="card" style="margin-top:10px">
        <div class="fields2">
          <label class="field"><span>Anticipación</span><select data-lead>${[0, 5, 10, 15].map((m) => `<option value="${m}" ${r.lead === m ? 'selected' : ''}>${m ? m + ' min antes' : 'A la hora'}</option>`).join('')}</select></label>
          <label class="field"><span>Control semanal</span><input type="time" data-time="checkin" value="${r.checkin.time}"></label>
          <label class="field"><span>Resumen diario</span><input type="time" data-time="dailySummary" value="${r.dailySummary.time}"></label>
          <label class="field"><span>Tareas</span><input type="time" data-time="tasks" value="${r.tasks.time}"></label>
        </div>
        <label class="field" style="margin-bottom:0"><span>Horarios de hidratación (separados por coma)</span><input data-water value="${esc(r.water.times.join(', '))}"></label>
      </div>
      <p class="xs faint" style="margin:8px 4px">Los horarios de actividades salen de tu plan semanal. Hoy: ${preview.length} avisos.</p>
    </section>

    <section class="section"><div class="section-head"><h2 class="eyebrow">1 · Calendario del iPhone (recomendado)</h2></div>
      <div class="card">
        <ol class="steps-guide">
          <li>En la app <b>Calendario</b>, creá un calendario llamado <b>PROJECT 5K</b> (así podés borrarlo entero si cambiás el plan).</li>
          <li>Tocá <b>Agregar al calendario</b>. Si se abre el archivo, elegí <b>Añadir todo</b> y el calendario PROJECT 5K.</li>
          <li>Si en cambio aparece el menú de compartir, elegí <b>Guardar en Archivos</b>, abrí el archivo desde la app Archivos y tocá <b>Añadir todo</b>.</li>
          <li>Cuando cambies tu plan, borrá el calendario PROJECT 5K y repetí este paso.</li>
        </ol>
        <div class="grid2"><button class="btn primary" data-act="icsOpen">${icon('cal')} Agregar al calendario</button><button class="btn" data-act="icsShare">${icon('share')} Compartir .ics</button></div>
      </div>
    </section>

    <section class="section"><div class="section-head"><h2 class="eyebrow">2 · Avisos con la app abierta</h2></div>
      <div class="list">
        ${sw('inApp', r.inApp, 'Avisos dentro de la app', 'Solo funcionan mientras PROJECT 5K está abierta')}
        <div class="li"><div class="grow"><div class="title">Permiso de notificaciones</div><div class="sub">${perm === 'granted' ? 'Concedido: se muestran como notificación del sistema' : perm === 'denied' ? 'Denegado: cambialo en Ajustes de iOS → Notificaciones' : perm === 'unsupported' ? (isIOS() && !isStandalone() ? 'Instalá la app en inicio para poder activarlo' : 'No disponible en este navegador') : 'Sin pedir todavía'}</div></div>
          ${perm === 'default' ? `<button class="btn sm primary" data-act="perm">Permitir</button>` : perm === 'granted' ? `<button class="btn sm" data-act="test">Probar</button>` : ''}</div>
      </div>
    </section>
    <details class="acc section"><summary>Alternativa: Atajos de iOS</summary><div class="small muted">
      En Atajos → Automatización → Nueva automatización → Hora del día, podés crear avisos con la acción “Mostrar notificación” o que abran PROJECT 5K a una hora fija. Es gratis y funciona con la app cerrada, pero se configura a mano en el iPhone.</div></details>`;

  const save = (fn) => { updateSettings(fn); startInAppReminders(); };
  el.querySelectorAll('[data-path]').forEach((inp) => inp.onchange = () => save((x) => {
    const parts = inp.dataset.path.split('.'); let o = x.reminders;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = inp.checked;
  }));
  el.querySelector('[data-lead]').onchange = (e) => save((x) => { x.reminders.lead = Number(e.target.value); });
  el.querySelectorAll('[data-time]').forEach((inp) => inp.onchange = () => save((x) => { if (inp.value) x.reminders[inp.dataset.time].time = inp.value; }));
  el.querySelector('[data-water]').onchange = (e) => {
    const times = e.target.value.split(/[,\s]+/).map((t) => t.trim()).filter((t) => /^\d{1,2}:\d{2}$/.test(t)).map((t) => t.padStart(5, '0')).sort();
    if (!times.length) { toast('Usá el formato 10:30, 14:00'); return; }
    save((x) => { x.reminders.water.times = times; }); toast('Horarios guardados');
  };
  bind(el, {
    icsOpen: async () => { const { count } = await exportICS('open'); toast(`${count} recordatorios generados`); },
    icsShare: async () => { const { count, result } = await exportICS('share'); if (result !== 'aborted') toast(`${count} recordatorios generados`); },
    perm: async () => { const p = await requestNotif(); toast(p === 'granted' ? 'Notificaciones activadas' : 'Permiso no concedido'); bus.refresh(); },
    test: async () => { const reg = await navigator.serviceWorker?.ready; await reg?.showNotification('PROJECT 5K', { body: 'Así se ven tus recordatorios.', icon: 'icons/icon-192.png' }); },
  });
}

// ---------------------------------------------------------------------------
export async function renderHealth(el) {
  const recent = (await db.all('recovery')).filter((r) => Object.values(r.sources || {}).includes('apple-health')).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  el.innerHTML = `${topbarSm('Apple Health y Xiaomi', '#/mas')}
    <div class="card tint">
      <div class="eyebrow">Cómo llegan tus datos</div>
      <div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap;font-size:13.5px;font-weight:600">
        <span class="pill">Smart Band</span>→<span class="pill">Mi Fitness</span>→<span class="pill">Apple Health</span>→<span class="pill">Atajo</span>→<span class="pill ok">PROJECT 5K</span>
      </div>
      <p class="small muted" style="margin-top:10px">Xiaomi no ofrece una API pública y una web no puede conectarse por Bluetooth a la pulsera. El camino real y gratuito es Apple Health + Atajos. Lo que no llegue, lo cargás a mano y queda marcado como “Manual”.</p>
    </div>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Importar el día</h2></div>
      <div class="card">
        <button class="btn primary block lg" data-act="paste">${icon('clip')} Pegar datos del Atajo</button>
        <details class="acc" style="margin-top:10px;background:var(--surface-2)"><summary>Pegar a mano / probar</summary><div>
          <textarea class="input" data-text style="min-height:150px;font-family:ui-monospace,monospace;font-size:13px" placeholder="P5K&#10;fecha: 2026-11-04&#10;pasos: 8432&#10;sueno_min: 495"></textarea>
          <div class="row" style="margin-top:8px"><button class="btn sm" data-act="sample">Cargar ejemplo</button><button class="btn sm primary grow" data-act="parse">Leer texto</button></div>
        </div></details>
        <div data-preview></div>
      </div>
    </section>
    ${recent.length ? `<section class="section"><div class="section-head"><h2 class="eyebrow">Últimas importaciones</h2></div><div class="list">${recent.map((r) => `<div class="li"><div class="grow"><div class="title">${esc(fmtShort(r.date))}</div><div class="sub">${Object.entries(r.sources).filter(([, v]) => v === 'apple-health').map(([k]) => FIELDS[k]?.label || k).join(', ')}</div></div><span class="src ah">Apple Health</span></div>`).join('')}</div></section>` : ''}

    <section class="section"><div class="section-head"><h2 class="eyebrow">Configuración (una sola vez)</h2></div>
      <details class="acc" open><summary>1 · Mi Fitness → Apple Health</summary><div>
        <ol class="steps-guide">
          <li>En <b>Mi Fitness</b>: Perfil → <b>Datos de terceros</b> (o Permisos de apps) → <b>Salud</b>, y activá sueño, pasos, frecuencia cardíaca, entrenamientos y peso.</li>
          <li>En la app <b>Salud</b> del iPhone: Explorar → tu foto → Privacidad → Apps → <b>Mi Fitness</b>, y verificá que esos datos estén permitidos.</li>
          <li>Sincronizá la pulsera en Mi Fitness y esperá unos minutos a que aparezcan en Salud.</li>
        </ol>
        <p class="xs faint">Según el modelo, Mi Fitness puede enviar la frecuencia cardíaca agrupada por hora y no siempre envía FC en reposo. Si un dato no aparece en Salud, la app no puede leerlo.</p>
      </div></details>
      <details class="acc"><summary>2 · Crear el Atajo “P5K Salud”</summary><div>
        <ol class="steps-guide">
          <li>Abrí <b>Atajos</b> → <b>+</b> → nombre: <b>P5K Salud</b>.</li>
          <li>Agregá <b>Buscar muestras de salud</b> (Find Health Samples): Tipo <b>Pasos</b>, Fecha de inicio <b>es hoy</b>. Luego <b>Calcular estadísticas → Suma</b>.</li>
          <li>Repetí para <b>Análisis del sueño</b> (en las últimas 24 h, valor distinto de “En cama”) → <b>Obtener detalles: Duración</b> → <b>Calcular estadísticas → Suma</b>.</li>
          <li>Opcional, igual que arriba: <b>FC en reposo</b> (más reciente, límite 1), <b>Frecuencia cardíaca</b> (hoy → Promedio), <b>Distancia caminando + corriendo</b> (hoy → Suma), <b>Energía activa</b> (hoy → Suma), <b>Peso</b> (más reciente).</li>
          <li>Agregá <b>Formatear fecha</b> (Fecha actual, formato personalizado <code>yyyy-MM-dd</code>).</li>
          <li>Agregá una acción <b>Texto</b> con este contenido, insertando cada variable donde corresponde:</li>
        </ol>
        <pre class="code">${esc(SHORTCUT_TEMPLATE)}</pre>
        <ol class="steps-guide" start="7"><li>Terminá con <b>Copiar al portapapeles</b>.</li><li>Cada mañana: ejecutá el Atajo, abrí PROJECT 5K y tocá <b>Pegar datos del Atajo</b>.</li></ol>
        <p class="xs faint">Si una métrica no existe en tu Salud, borrá esa línea. La app acepta coma o punto decimal, “7 h 30 min”, “7:30” o minutos/segundos para el sueño.</p>
      </div></details>
      <details class="acc"><summary>Futuro: app nativa</summary><div class="small muted">Una app nativa para iOS podría leer HealthKit en segundo plano sin Atajos, pero requiere una cuenta de Apple Developer (paga) y publicarla. La arquitectura de PROJECT 5K guarda el origen de cada dato, así que esa integración se puede sumar después sin perder historial.</div></details>
    </section>`;

  const preview = el.querySelector('[data-preview]');
  const show = (res) => {
    if (res.error) { preview.innerHTML = `<div class="banner warn" style="margin-top:12px"><span class="bi">${icon('info')}</span><div class="grow"><b>No se pudo importar</b><p>${esc(res.error)}</p></div></div>`; return; }
    preview.innerHTML = `<div style="margin-top:14px">
      <label class="field"><span>Fecha de los datos</span><input type="date" data-date value="${res.date}" max="${today()}"></label>
      <div class="list">${Object.entries(res.values).map(([k, v]) => `<div class="li"><div class="grow"><div class="title">${FIELDS[k].label}</div></div><b class="num">${k === 'sleepMin' ? `${Math.floor(v / 60)} h ${v % 60} min` : String(v).replace('.', ',')} ${k === 'sleepMin' ? '' : FIELDS[k].unit}</b></div>`).join('')}</div>
      ${res.unknown?.length ? `<p class="xs faint" style="margin-top:6px">Ignorado: ${esc(res.unknown.join(', '))}</p>` : ''}
      <p class="xs faint" style="margin:8px 2px">El sueño se guarda en el día en que te despertaste. Los datos quedan marcados como “Apple Health”.</p>
      <button class="btn primary block" data-act="save">Guardar ${Object.keys(res.values).length} datos</button></div>`;
    preview.querySelector('[data-act=save]').onclick = async () => {
      const d = preview.querySelector('[data-date]').value || res.date;
      const { weightKg, ...rest } = res.values;
      if (Object.keys(rest).length) await saveRecovery(d, rest, 'apple-health');
      if (weightKg) await db.put('weights', { id: `w-${d}`, date: d, kg: weightKg, note: 'Apple Health', measures: {}, source: 'apple-health', at: Date.now() });
      toast('Datos de Apple Health guardados'); bus.refresh();
    };
  };
  bind(el, {
    paste: async () => {
      try {
        if (!navigator.clipboard?.readText) throw new Error('no-clip');
        const text = await navigator.clipboard.readText();
        el.querySelector('[data-text]').value = text;
        show(parseHealthText(text));
      } catch { toast('No pude leer el portapapeles. Pegá el texto en “Pegar a mano”.'); el.querySelector('details.acc').open = true; }
    },
    sample: () => { el.querySelector('[data-text]').value = SAMPLE; },
    parse: () => show(parseHealthText(el.querySelector('[data-text]').value)),
  });
}

// ---------------------------------------------------------------------------
export async function renderData(el) {
  const s = settings();
  const info = await storageInfo();
  const counts = {};
  for (const n of ['days', 'weights', 'workouts', 'meals', 'recovery', 'checkins', 'photos']) counts[n] = await db.count(n);
  const mb = (b) => (b / 1048576).toFixed(1).replace('.', ',');
  el.innerHTML = `${topbarSm('Datos y copias', '#/mas')}
    <div class="grid3">
      <div class="stat"><div class="label">Días</div><div class="value">${counts.days}</div></div>
      <div class="stat"><div class="label">Entrenos</div><div class="value">${counts.workouts}</div></div>
      <div class="stat"><div class="label">Fotos</div><div class="value">${counts.photos}</div></div>
    </div>
    <div class="card section" style="margin-top:10px">
      <div class="kv"><span>Última copia</span><b>${s.lastBackup ? esc(fmtLong(s.lastBackup.slice(0, 10))) : 'Nunca'}</b></div>
      <div class="kv"><span>Almacenamiento persistente</span><b>${info.persisted == null ? '—' : info.persisted ? 'Activado' : 'No garantizado'}</b></div>
      <div class="kv"><span>Espacio usado</span><b>${info.usage != null ? `${mb(info.usage)} MB` : '—'}</b></div>
      ${info.persisted === false ? `<button class="btn sm" data-act="persist" style="margin-top:10px">Pedir almacenamiento persistente</button>` : ''}
    </div>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Copia de seguridad</h2></div>
      <div class="card">
        <p class="small muted" style="margin-bottom:12px">Tus datos viven solo en este iPhone. Guardá la copia en <b>Archivos → iCloud Drive</b> (gratis) o enviátela por mail. Hacela una vez por semana.</p>
        <label class="row" style="margin-bottom:12px"><span class="grow small">Incluir fotos de comidas</span><input type="checkbox" class="switch" data-photos checked></label>
        <button class="btn primary block" data-act="export">${icon('download')} Exportar copia (.json)</button>
        <label class="btn block" style="margin-top:10px">${icon('upload')} Importar copia<input type="file" accept="application/json,.json" class="sr" data-import></label>
      </div>
    </section>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Datos de demostración</h2></div>
      <div class="card">
        <p class="small muted" style="margin-bottom:12px">Carga 3 semanas de ejemplo para ver las gráficas y el informe. Quedan marcados como “Demo” y no pisan tus registros reales.</p>
        ${s.demo ? `<button class="btn danger block" data-act="rmDemo">Eliminar datos demo</button>` : `<button class="btn block" data-act="demo">Cargar datos de demostración</button>`}
      </div>
    </section>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Zona de cuidado</h2></div>
      <button class="btn danger block" data-act="wipe">${icon('trash')} Borrar todos los datos</button>
    </section>`;

  el.querySelector('[data-import]').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    let obj;
    try { obj = JSON.parse(await file.text()); } catch { toast('El archivo no es un JSON válido.'); return; }
    const err = validateBackup(obj);
    if (err) { toast(err); return; }
    const sm = summarize(obj);
    sheet({
      title: 'Importar copia',
      body: `<p class="small muted">Copia del ${esc(sm.exportedAt ? fmtLong(sm.exportedAt.slice(0, 10)) : '—')}</p>
        <div class="card" style="margin:12px 0">${[['Días', sm.days], ['Pesos', sm.weights], ['Entrenamientos', sm.workouts], ['Comidas', sm.meals], ['Recuperación', sm.recovery], ['Controles', sm.checkins], ['Fotos', sm.photos]].map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
        <button class="btn primary block" data-m="replace">Reemplazar todo con esta copia</button>
        <button class="btn block" data-m="merge" style="margin-top:10px">Combinar con lo actual</button>
        <p class="xs faint" style="margin-top:10px">Combinar suma los registros; si una fecha existe en ambos, gana la copia.</p>`,
      onMount: (b, close) => b.querySelectorAll('[data-m]').forEach((x) => x.onclick = async () => {
        try { await importBackup(obj, x.dataset.m); close(); toast('Copia importada'); setTimeout(() => location.reload(), 600); }
        catch (er) { toast(er.message || 'No se pudo importar.'); }
      }),
    });
  };
  bind(el, {
    export: async () => { const { result, size } = await exportBackup({ photos: el.querySelector('[data-photos]').checked }); if (result !== 'aborted') { toast(`Copia lista (${(size / 1024).toFixed(0)} KB)`); bus.refresh(); } },
    persist: async () => { const ok = await requestPersist(); toast(ok ? 'Almacenamiento persistente activado' : 'iOS no lo concedió; mantené la app instalada y hacé copias.'); bus.refresh(); },
    demo: async () => { const n = await loadDemo(); toast(`${n} registros demo cargados`); bus.refresh(); },
    rmDemo: async () => { const n = await removeDemo(); toast(`${n} registros demo eliminados`); bus.refresh(); },
    wipe: async () => {
      if (!(await confirmDialog('Borrar todo', 'Se eliminan todos tus registros, fotos y ajustes de este dispositivo. No se puede deshacer.', { ok: 'Continuar', danger: true }))) return;
      if (!(await confirmDialog('¿Seguro?', '¿Hiciste una copia de seguridad? Esta es la última confirmación.', { ok: 'Borrar todo', danger: true }))) return;
      await wipeAll(); location.hash = ''; location.reload();
    },
  });
}

// ---------------------------------------------------------------------------
export async function renderSettings(el) {
  const s = settings();
  const p = s.profile;
  el.innerHTML = `${topbarSm('Ajustes', '#/mas')}
    <form data-profile>
      <section><div class="section-head"><h2 class="eyebrow">Perfil</h2></div>
        <div class="card">
          <label class="field"><span>Nombre</span><input name="name" value="${esc(p.name)}" placeholder="Cómo querés que te salude"></label>
          <div class="fields3">
            <label class="field"><span>Edad</span><input name="age" inputmode="numeric" value="${p.age ?? ''}"></label>
            <label class="field"><span>Altura (cm)</span><input name="height" inputmode="numeric" value="${p.heightCm ?? ''}"></label>
            <label class="field"><span>Peso inicial</span><input name="sw" inputmode="decimal" value="${p.startWeight != null ? String(p.startWeight).replace('.', ',') : ''}"></label>
          </div>
          <label class="field" style="margin-bottom:0"><span>Inicio del proyecto</span><input name="start" type="date" value="${p.startDate || today()}"></label>
        </div>
      </section>
      <section class="section"><div class="section-head"><h2 class="eyebrow">Objetivos</h2></div>
        <div class="card"><div class="fields3">
          <label class="field"><span>Sueño mín. (h)</span><input name="smin" inputmode="decimal" value="${s.goals.sleepMinH}"></label>
          <label class="field"><span>Sueño máx. (h)</span><input name="smax" inputmode="decimal" value="${s.goals.sleepMaxH}"></label>
          <label class="field"><span>Vasos de agua</span><input name="water" inputmode="numeric" value="${s.goals.water}"></label>
        </div><p class="xs faint">Valores orientativos. Sin objetivos de peso ni de calorías: el foco es rendimiento, recuperación y hábitos.</p></div>
      </section>
      <button class="btn primary block" style="margin-top:12px">Guardar perfil y objetivos</button>
    </form>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Modos temporales</h2></div>
      <div class="list">
        <div class="li"><div class="grow"><div class="title">Modo exámenes</div><div class="sub">${s.examUntil && s.examUntil >= today() ? `Activo hasta el ${fmtShort(s.examUntil)}` : 'Running y emprendimiento pasan a opcionales'}</div></div>
          ${s.examUntil && s.examUntil >= today() ? `<button class="btn sm" data-act="examOff">Desactivar</button>` : `<button class="btn sm primary" data-act="examOn">7 días</button>`}</div>
        <div class="li"><div class="grow"><div class="title">Semana liviana</div><div class="sub">${s.deloadUntil && s.deloadUntil >= today() ? `Activa hasta el ${fmtShort(s.deloadUntil)}` : 'Menos carga para recuperar'}</div></div>
          ${s.deloadUntil && s.deloadUntil >= today() ? `<button class="btn sm" data-act="deloadOff">Desactivar</button>` : `<button class="btn sm" data-act="deloadOn">7 días</button>`}</div>
      </div>
    </section>

    <section class="section"><div class="section-head"><h2 class="eyebrow">Apariencia y sonido</h2></div>
      <div class="card"><div class="seg">${[['auto', 'Automático'], ['dark', 'Oscuro'], ['light', 'Claro']].map(([k, l]) => `<button data-act="theme" data-t="${k}" class="${s.theme === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="list" style="margin-top:10px">
        <label class="li"><div class="grow"><div class="title">Sonidos en entrenamientos</div></div><input type="checkbox" class="switch" data-set="sound" ${s.sound ? 'checked' : ''}></label>
        <label class="li"><div class="grow"><div class="title">Voz guía en running y rutinas</div></div><input type="checkbox" class="switch" data-set="voice" ${s.voice ? 'checked' : ''}></label>
      </div>
    </section>
    <section class="section"><div class="section-head"><h2 class="eyebrow">Running</h2></div>
      <div class="card row between"><div><div style="font-weight:600">Semana del plan 5K</div><div class="xs muted">Cambiala si ya venías corriendo</div></div>
        <select class="input" data-runweek style="width:110px">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${s.run.week === i + 1 ? 'selected' : ''}>Semana ${i + 1}</option>`).join('')}</select></div>
    </section>
    <p class="xs faint" style="margin:18px 4px">Privacidad: no hay cuentas, servidores ni seguimiento. Todo queda en este dispositivo; solo sale si exportás una copia.</p>`;

  el.querySelector('[data-profile]').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    const num = (v) => { const n = parseDec(v); return n == null ? null : n; };
    const smin = num(f.smin.value), smax = num(f.smax.value), water = parseInt(f.water.value, 10);
    if (!smin || !smax || smin > smax || smin < 5 || smax > 12) { toast('Revisá el rango de sueño.'); return; }
    updateSettings((x) => {
      x.profile.name = f.name.value.trim(); x.profile.age = parseInt(f.age.value, 10) || null; x.profile.heightCm = parseInt(f.height.value, 10) || null;
      x.profile.startWeight = num(f.sw.value); x.profile.startDate = f.start.value || x.profile.startDate;
      x.goals.sleepMinH = smin; x.goals.sleepMaxH = smax; x.goals.water = water > 0 && water < 30 ? water : x.goals.water;
    });
    toast('Ajustes guardados');
  };
  el.querySelectorAll('[data-set]').forEach((i) => i.onchange = () => updateSettings((x) => { x[i.dataset.set] = i.checked; }));
  el.querySelector('[data-runweek]').onchange = (e) => { updateSettings((x) => { x.run.week = Number(e.target.value); x.run.attempt = 1; }); toast(`Plan 5K en semana ${e.target.value}`); };
  bind(el, {
    examOn: () => { updateSettings((x) => { x.examUntil = addDays(today(), 6); }); toast('Modo exámenes activado'); bus.refresh(); },
    examOff: () => { updateSettings((x) => { x.examUntil = null; }); bus.refresh(); },
    deloadOn: () => { updateSettings((x) => { x.deloadUntil = addDays(today(), 6); }); toast('Semana liviana activada'); bus.refresh(); },
    deloadOff: () => { updateSettings((x) => { x.deloadUntil = null; }); bus.refresh(); },
    theme: (b) => { updateSettings((x) => { x.theme = b.dataset.t; }); applyTheme(); bus.refresh(); },
  });
}

export function applyTheme() {
  const t = settings().theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#090C11' : '#F2F3F6');
}

// ---------------------------------------------------------------------------
export async function renderInstall(el) {
  el.innerHTML = `${topbarSm('Instalar en el iPhone', '#/mas')}
    ${isStandalone() ? `<div class="banner"><span class="bi">${icon('check')}</span><div class="grow"><b>Ya está instalada</b><p>Estás usando PROJECT 5K como app independiente.</p></div></div>` : ''}
    <div class="card">
      <ol class="steps-guide">
        <li>Abrí la dirección de PROJECT 5K en <b>Safari</b> (no en otra app ni en un navegador interno).</li>
        <li>Tocá el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li>
        <li>Deslizá y elegí <b>Añadir a pantalla de inicio</b>. Dejá el nombre “5K” y tocá <b>Añadir</b>.</li>
        <li>Abrí PROJECT 5K <b>siempre desde el ícono</b>. Se abre a pantalla completa y funciona sin conexión.</li>
      </ol>
    </div>
    <div class="banner warn section" style="margin-top:12px"><span class="bi">${icon('info')}</span><div class="grow"><b>Importante</b><p>Safari y la app instalada guardan datos por separado. Si probaste en Safari antes de instalar, exportá una copia desde Safari e importala en la app.</p></div></div>
    <details class="acc section"><summary>¿Por qué hacer copias si está instalada?</summary><div class="small muted">Las apps web instaladas conservan sus datos, pero si borrás la app, restaurás el iPhone o iOS libera espacio de forma extrema, se pueden perder. Una copia semanal en iCloud Drive es gratis y te protege.</div></details>
    <details class="acc"><summary>¿Necesito internet?</summary><div class="small muted">Solo la primera vez para descargarla. Después podés registrar y consultar todo sin conexión. Cuando hay una versión nueva, la app te avisa para actualizar.</div></details>`;
}
