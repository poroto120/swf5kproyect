// Componentes de interfaz: hojas inferiores, toasts, confirmaciones, iconos y anillos.
import { esc } from './util.js';

export const ICONS = {
  check: '<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  dots: '<circle cx="5.5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor"/>',
  back: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  chev: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  minus: '<path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  skip: '<path d="M6 5.5v13l9-6.5zM18 5v14" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  drop: '<path d="M12 3.5c3.5 4.4 6 7.6 6 10.5a6 6 0 0 1-12 0c0-2.9 2.5-6.1 6-10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  scale: '<rect x="3.5" y="4" width="17" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 9.5a5 5 0 0 1 7 0l-2.5 2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  food: '<path d="M7 3v8m-2.5-8v5a2.5 2.5 0 0 0 5 0V3M7 11v10M16.5 21V3c-2 1.5-3 4-3 7v4h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  run: '<circle cx="14.5" cy="4.5" r="2" fill="currentColor"/><path d="M8 21l3-6 3 2v5M6 11l3.5-3.5 4 1 2.5 3.5 3 1M11 15l2-5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  bjj: '<path d="M4 9l8-4 8 4-8 4-8-4zM8 11v5c2.5 2 5.5 2 8 0v-5M20 9v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  note: '<path d="M6 3.5h9l4 4V20.5H6z M14.5 3.5v4h4M9 12h7M9 16h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
  task: '<rect x="4" y="4" width="16" height="16" rx="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  dumbbell: '<path d="M3 9.5v5M6 7v10M18 7v10M21 9.5v5M6 12h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  db: '<ellipse cx="12" cy="6" rx="7.5" ry="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" fill="none" stroke="currentColor" stroke-width="2"/>',
  gear: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  habit: '<path d="M4 17.5l4.5-4.5 3.5 3.5L20 8.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 8.5h5v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 18.5h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  camera: '<path d="M4 8.5h3l1.8-2.5h6.4L17 8.5h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.3" fill="none" stroke="currentColor" stroke-width="2"/>',
  trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  info: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5.5M12 7.6v.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  share: '<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  download: '<path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  upload: '<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  clip: '<rect x="6" y="4.5" width="12" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 4.5V3h5v1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.7-6.5-6.2 0-3.6 3-5.6 3.8-9.3 1.6 1.3 2.6 2.8 2.9 4.6 1-1 1.6-2.2 1.7-3.6 2.6 2.2 4.6 5 4.6 8.3 0 3.5-2.6 6.2-6.5 6.2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
};
export const icon = (name, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${ICONS[name] || ''}</svg>`;

export const LOGO = (size = 52) => `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <rect width="64" height="64" rx="16" fill="#0E131A"/>
  <circle cx="32" cy="32" r="21" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="5"/>
  <circle cx="32" cy="32" r="21" fill="none" stroke="#C8F25F" stroke-width="5" stroke-linecap="round" stroke-dasharray="112 132" transform="rotate(-62 32 32)"/>
  <text x="32" y="38.5" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="17" font-weight="800" letter-spacing="-1" fill="#EEF1F6">5K</text>
</svg>`;

// ---------- Anillo de progreso ----------
export function ring(pct, { size = 120, stroke = 11, label = '', sub = '', color = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct || 0));
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
      <circle class="prog" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p / 100)}" ${color ? `style="stroke:${color}"` : ''}/>
    </svg>
    <div class="lbl"><div>${label}${sub ? `<span>${sub}</span>` : ''}</div></div>
  </div>`;
}

// ---------- Hoja inferior ----------
const layer = () => document.getElementById('layer');
let openSheets = [];

export function sheet({ title = '', body = '', onMount, onClose, wide = false } = {}) {
  const bd = document.createElement('div'); bd.className = 'backdrop';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
  sh.innerHTML = `<div class="sheet-grab"></div>
    <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button></div>
    <div class="sheet-body">${body}</div>`;
  layer().append(bd, sh);
  requestAnimationFrame(() => { bd.classList.add('show'); sh.classList.add('show'); });
  let closed = false;
  const close = (result) => {
    if (closed) return; closed = true;
    bd.classList.remove('show'); sh.classList.remove('show');
    openSheets = openSheets.filter((x) => x !== close);
    setTimeout(() => { bd.remove(); sh.remove(); }, 320);
    onClose && onClose(result);
  };
  bd.addEventListener('click', () => close());
  sh.querySelector('[data-close]').addEventListener('click', () => close());
  // Arrastre hacia abajo para cerrar
  let y0 = null, dy = 0;
  const grab = sh.querySelector('.sheet-grab'), head = sh.querySelector('.sheet-head');
  [grab, head].forEach((el) => {
    el.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; dy = 0; sh.style.transition = 'none'; }, { passive: true });
    el.addEventListener('touchmove', (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
    el.addEventListener('touchend', () => { sh.style.transition = ''; sh.style.transform = ''; if (dy > 90) close(); y0 = null; });
  });
  openSheets.push(close);
  const body$ = sh.querySelector('.sheet-body');
  onMount && onMount(body$, close, sh);
  return close;
}
export const closeAllSheets = () => [...openSheets].forEach((c) => c());

// ---------- Toast ----------
let toastTimer;
export function toast(msg, { action, onAction, ms = 3200 } = {}) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  if (action) t.querySelector('button').addEventListener('click', () => { onAction && onAction(); hide(); });
  const hide = () => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); };
  clearTimeout(toastTimer); toastTimer = setTimeout(hide, action ? Math.max(ms, 5000) : ms);
}

export function confirmDialog(title, text, { ok = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    sheet({
      title,
      body: `<p class="muted" style="margin-bottom:16px">${esc(text)}</p>
        <div class="sheet-actions"><button class="btn" data-no>Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(ok)}</button></div>`,
      onMount: (b, close) => {
        b.querySelector('[data-no]').onclick = () => { answered = true; resolve(false); close(); };
        b.querySelector('[data-yes]').onclick = () => { answered = true; resolve(true); close(); };
      },
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

// ---------- Escalas 1–5 / 1–10 ----------
export function scaleHTML(name, value, { max = 5, low = '', high = '' } = {}) {
  const btns = Array.from({ length: max }, (_, i) => `<button type="button" data-v="${i + 1}" class="${value === i + 1 ? 'on' : ''}">${i + 1}</button>`).join('');
  return `<div class="scale ${max === 10 ? 's10' : ''}" data-scale="${name}">${btns}</div>${low || high ? `<div class="scale-legend"><span>${esc(low)}</span><span>${esc(high)}</span></div>` : ''}`;
}
/** Activa las escalas dentro de root y devuelve un lector de valores. */
export function bindScales(root) {
  const vals = {};
  root.querySelectorAll('[data-scale]').forEach((sc) => {
    const on = sc.querySelector('.on'); if (on) vals[sc.dataset.scale] = Number(on.dataset.v);
    sc.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]'); if (!b) return;
      const v = Number(b.dataset.v);
      if (vals[sc.dataset.scale] === v) { delete vals[sc.dataset.scale]; b.classList.remove('on'); return; }
      vals[sc.dataset.scale] = v;
      sc.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    });
  });
  return () => ({ ...vals });
}

/** Delegación de clicks por data-act. */
export function bind(root, handlers) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[el.dataset.act];
    if (fn) { e.preventDefault(); Promise.resolve(fn(el, e)).catch(handleError); }
  });
}

export function handleError(err) {
  console.error(err);
  const msg = err?.name === 'QuotaExceededError' ? 'Sin espacio para guardar. Liberá espacio o eliminá fotos.' : 'Algo falló al guardar. Probá de nuevo.';
  toast(msg);
}

export const topbarSm = (title, backHref = '#/mas', right = '') =>
  `<div class="topbar-sm"><a class="back" href="${backHref}" aria-label="Volver">${icon('back')}</a><h1>${esc(title)}</h1>${right}</div>`;

export const statusLabel = { done: 'Completada', skipped: 'No realizada', postponed: 'Pospuesta', modified: 'Modificada' };
export const srcBadge = (s) => s === 'apple-health' ? '<span class="src ah">Apple Health</span>' : s === 'demo' ? '<span class="src demo">Demo</span>' : '<span class="src">Manual</span>';
