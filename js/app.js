// PROJECT 5K — arranque, enrutador por hash, onboarding y service worker.
import * as db from './db.js';
import { settings, updateSettings, getConfig } from './store.js';
import { bus } from './bus.js';
import { $, $$, today, esc, parseDec } from './util.js';
import { toast, closeAllSheets, LOGO, icon, handleError } from './ui.js';
import { openQuickLog } from './quicklog.js';
import { startInAppReminders } from './reminders.js';
import { applyTheme } from './views/more.js';

const routes = {
  hoy: { tab: 'hoy', load: () => import('./views/today.js').then((m) => m.render) },
  entrenar: { tab: 'entrenar', load: () => import('./views/train.js').then((m) => m.render) },
  play: { tab: 'entrenar', load: () => import('./views/player.js').then((m) => m.renderCalis) },
  'play-run': { tab: 'entrenar', load: () => import('./views/player.js').then((m) => m.renderRun) },
  progreso: { tab: 'progreso', load: () => import('./views/progress.js').then((m) => m.render) },
  control: { tab: 'progreso', load: () => import('./views/weekly.js').then((m) => m.renderControl) },
  informe: { tab: 'progreso', load: () => import('./views/weekly.js').then((m) => m.renderReport) },
  mas: { tab: 'mas', load: () => import('./views/more.js').then((m) => m.renderMenu) },
  comida: { tab: 'mas', load: () => import('./views/nutrition.js').then((m) => m.render) },
  habitos: { tab: 'mas', load: () => import('./views/habits.js').then((m) => m.render) },
  plan: { tab: 'mas', load: () => import('./views/plan.js').then((m) => m.render) },
  recordatorios: { tab: 'mas', load: () => import('./views/more.js').then((m) => m.renderReminders) },
  salud: { tab: 'mas', load: () => import('./views/more.js').then((m) => m.renderHealth) },
  datos: { tab: 'mas', load: () => import('./views/more.js').then((m) => m.renderData) },
  ajustes: { tab: 'mas', load: () => import('./views/more.js').then((m) => m.renderSettings) },
  instalar: { tab: 'mas', load: () => import('./views/more.js').then((m) => m.renderInstall) },
};

const view = $('#view');
let cleanup = null;
let rendering = false, pending = false;

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, ...params] = h.split('/').filter(Boolean);
  return { name: routes[name] ? name : 'hoy', params };
}

async function render({ animate = true } = {}) {
  if (rendering) { pending = true; return; }
  rendering = true;
  try {
    const { name, params } = parseHash();
    const route = routes[name];
    const scroll = animate ? 0 : window.scrollY;
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    document.body.classList.remove('no-nav');
    view.classList.remove('full');
    const page = document.createElement('div');
    page.className = 'page' + (animate ? ' enter' : '');
    const fn = await route.load();
    const result = await fn(page, params);
    view.replaceChildren(page);
    cleanup = typeof result === 'function' ? result : null;
    $$('.nav-item').forEach((a) => a.classList.toggle('on', a.dataset.tab === route.tab));
    window.scrollTo(0, scroll);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty card" style="margin-top:40px">Algo salió mal al cargar esta pantalla.<br><span class="xs faint">${esc(e.message || e)}</span><br><br><a class="btn" href="#/hoy">Volver a Hoy</a></div>`;
  } finally {
    rendering = false;
    if (pending) { pending = false; render({ animate: false }); }
  }
}

bus.refresh = () => render({ animate: false });
bus.go = (hash) => { if (location.hash === hash) render({ animate: false }); else location.hash = hash; };

// ---------------------------------------------------------------------------
// Onboarding (primer uso): los datos personales se cargan en el dispositivo, no en el código.
// ---------------------------------------------------------------------------
function onboarding() {
  document.body.classList.add('no-nav');
  view.innerHTML = `<div class="onb">
    <div class="brand">${LOGO(52)}<div><div class="wordmark">PROJECT <em>5K</em></div><div class="tag">BUILD YOURSELF, EVERY DAY.</div></div></div>
    <h1>Tu centro de control personal.</h1>
    <p class="muted">Entrenamiento, recuperación, estudio y hábitos en un solo lugar. Sin cuentas: todo se guarda en este iPhone.</p>
    <form style="margin-top:26px">
      <label class="field"><span>¿Cómo te llamás?</span><input name="name" autocomplete="given-name" placeholder="Opcional"></label>
      <div class="fields3">
        <label class="field"><span>Edad</span><input name="age" inputmode="numeric" placeholder="años"></label>
        <label class="field"><span>Altura (cm)</span><input name="height" inputmode="numeric" placeholder="cm"></label>
        <label class="field"><span>Peso (kg)</span><input name="weight" inputmode="decimal" placeholder="kg"></label>
      </div>
      <p class="xs faint" style="margin:-4px 2px 18px">Se usan solo para seguir tu evolución. No hay objetivos de bajar de peso ni conteo de calorías: el foco es rendimiento, recuperación y hábitos.</p>
      <button class="btn primary block lg">Empezar</button>
    </form>
    <div class="grow"></div>
    <p class="xs faint center" style="margin-top:24px">Tu planificación semanal, rutinas y hábitos ya vienen cargados y se pueden editar.</p>
  </div>`;
  $('form', view).onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const kg = parseDec(f.weight.value);
    if (f.weight.value && (!kg || kg < 25 || kg > 250)) { toast('Revisá el peso.'); return; }
    const d = today();
    updateSettings((s) => {
      s.onboarded = true;
      s.profile = { name: f.name.value.trim(), age: parseInt(f.age.value, 10) || null, heightCm: parseInt(f.height.value, 10) || null, startWeight: kg || null, startDate: d };
    });
    try {
      if (kg) await db.put('weights', { id: `w-${d}`, date: d, kg, note: 'Peso inicial', measures: {}, source: 'manual', at: Date.now() });
      await Promise.all(['plan', 'routines', 'habits'].map(getConfig));
      navigator.storage?.persist?.().catch(() => {});
    } catch (err) { handleError(err); }
    document.body.classList.remove('no-nav');
    location.hash = '#/hoy';
    render();
  };
}

// ---------------------------------------------------------------------------
// Service worker y actualizaciones
// ---------------------------------------------------------------------------
function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const ask = (w) => toast('Hay una versión nueva de PROJECT 5K', { action: 'Actualizar', onAction: () => w.postMessage('skipWaiting'), ms: 10000 });
    if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch((e) => console.warn('SW', e));
  // Recargar solo cuando el usuario aceptó una actualización (no en la primera instalación).
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
}

// ---------------------------------------------------------------------------
async function boot() {
  applyTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
  try { await db.openDB(); }
  catch (e) {
    view.innerHTML = `<div class="empty card" style="margin-top:40px"><b>No se pudo abrir el almacenamiento.</b><br><span class="small">${esc(e.message)}</span><br><br><span class="xs faint">Si estás en navegación privada, abrí PROJECT 5K en una pestaña normal o desde el ícono instalado.</span></div>`;
    return;
  }
  $('#fab').addEventListener('click', openQuickLog);
  window.addEventListener('hashchange', () => { closeAllSheets(); render(); });
  // Refrescar Hoy al volver a la app (por si cambió el día)
  let lastDay = today();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && today() !== lastDay) { lastDay = today(); render({ animate: false }); }
  });
  registerSW();
  if (!settings().onboarded) { onboarding(); return; }
  render();
  startInAppReminders();
}

window.addEventListener('unhandledrejection', (e) => { console.error(e.reason); });
boot();
