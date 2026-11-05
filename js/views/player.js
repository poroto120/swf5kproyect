// Reproductores de entrenamiento: calistenia (series, descansos, temporizador) y running guiado por intervalos.
import * as db from '../db.js';
import { getConfig, settings, isDeload, autoCompleteKind, runPlanStatus } from '../store.js';
import { EXERCISES, runIntervals } from '../seed.js';
import { figure } from '../figures.js';
import { today, esc, fmtClock, uid } from '../util.js';
import { icon, sheet, toast, ring, scaleHTML, bindScales, confirmDialog } from '../ui.js';
import { bus } from '../bus.js';
import { repsText, calisHistory } from './train.js';
import { openRunForm } from '../quicklog.js';

// ---------- Audio, voz y pantalla encendida ----------
let actx = null;
function unlockAudio() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch {}
}
export function beep(times = 1, freq = 880) {
  if (!settings().sound || !actx) return;
  for (let i = 0; i < times; i++) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    const t = actx.currentTime + i * 0.22;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.2);
  }
}
function say(text) {
  if (!settings().voice || !('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'es-ES'; u.rate = 1.02; speechSynthesis.speak(u); } catch {}
}
let wakeLock = null;
async function keepAwake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen'); } catch {} }
function releaseAwake() { try { wakeLock?.release(); } catch {} wakeLock = null; }

// ---------------------------------------------------------------------------
// Calistenia
// ---------------------------------------------------------------------------
const AKEY = 'p5k:active';
const saveState = (s) => localStorage.setItem(AKEY, JSON.stringify(s));
const clearState = () => localStorage.removeItem(AKEY);

export async function renderCalis(el, params) {
  const rid = params[0] || 'A';
  const routines = await getConfig('routines');
  const r = routines[rid];
  if (!r) { el.innerHTML = '<div class="empty">Rutina no encontrada.</div>'; return; }
  const deload = isDeload();
  const items = r.items.map((it) => ({ ...it, sets: deload ? Math.max(1, it.sets - 1) : it.sets, rest: it.rest ?? EXERCISES[it.ex].rest }));
  const hist = await calisHistory();
  const lastSets = (exId) => hist.find((w) => (w.sets || []).some((s) => s.ex === exId))?.sets.filter((s) => s.ex === exId) || [];

  let st = null;
  try { st = JSON.parse(localStorage.getItem(AKEY) || 'null'); } catch {}
  if (!st || st.routine !== rid) st = { routine: rid, startedAt: null, ex: 0, set: 0, phase: 'intro', log: [], side: 1, until: null, deload };

  document.body.classList.add('no-nav');
  document.getElementById('view').classList.add('full');
  let tick = null;

  const totalSets = items.reduce((a, it) => a + it.sets, 0);
  const doneSets = () => st.log.length;
  const cur = () => items[st.ex];
  const curEx = () => EXERCISES[cur().ex];

  const defaultReps = () => {
    const it = cur();
    const prevThis = st.log.filter((l) => l.ex === it.ex).pop();
    if (prevThis?.reps) return prevThis.reps;
    const last = lastSets(it.ex)[st.set];
    if (last?.reps) return Math.min(last.reps, it.max + 3);
    return it.min === it.max ? it.max : Math.round((it.min + it.max) / 2);
  };
  let reps = null;

  function advance() {
    const it = cur();
    if (st.set + 1 < it.sets) { st.set++; }
    else if (st.ex + 1 < items.length) { st.ex++; st.set = 0; }
    else { st.phase = 'finish'; st.endedAt = Date.now(); saveState(st); draw(); return; }
    st.phase = curEx().type === 'time' ? 'ready' : 'work';
    st.side = 1; reps = null;
    saveState(st); draw();
  }
  function logSet(entry) {
    st.log.push({ ex: cur().ex, set: st.set + 1, ...entry });
    const lastOfAll = st.ex === items.length - 1 && st.set === cur().sets - 1;
    if (lastOfAll) { st.phase = 'finish'; st.endedAt = Date.now(); beep(3, 990); say('Rutina completa'); }
    else { st.phase = 'rest'; st.until = Date.now() + cur().rest * 1000; st.restTotal = cur().rest; }
    saveState(st); draw();
  }

  function stopTick() { if (tick) { clearInterval(tick); tick = null; } }
  function startTick(fn) { stopTick(); tick = setInterval(fn, 200); fn(); }

  function nextLabel() {
    const it = cur();
    if (st.set + 1 < it.sets) return `${curEx().name} · serie ${st.set + 2}`;
    const n = items[st.ex + 1];
    return n ? `${EXERCISES[n.ex].name} · ${n.sets} × ${repsText(n)}` : 'Fin';
  }

  function draw() {
    stopTick();
    const it = cur(), ex = curEx();
    const progress = (doneSets() / totalSets) * 100;
    const top = `<div class="player-top">
      <button class="icon-btn" data-a="exit" aria-label="Salir">${icon('x')}</button>
      <div class="player-progress"><i style="width:${progress}%"></i></div>
      <span class="small muted num">${doneSets()}/${totalSets}</span>
    </div>`;

    if (st.phase === 'intro') {
      el.innerHTML = `<div class="player">${top}<div class="player-main">
        <div class="eyebrow center">${esc(r.note)}${deload ? ' · semana liviana' : ''}</div>
        <h2>${esc(r.name)}</h2>
        <div class="list" style="--fig-bg:var(--surface-2)">${items.map((x) => `<div class="ex-row"><div class="ex-thumb">${figure(EXERCISES[x.ex].pose, { animate: false, thick: true })}</div><div class="grow"><div style="font-weight:600">${esc(EXERCISES[x.ex].name)}</div><div class="xs muted">${x.sets} × ${repsText(x)}${EXERCISES[x.ex].perSide ? ' por lado' : ''}</div></div></div>`).join('')}</div>
        <p class="xs faint center">Entrá en calor 3–5 minutos (movilidad de hombros, cadera y tobillos). La app pasa sola al siguiente ejercicio.</p>
      </div><div class="player-actions"><button class="btn primary lg block" data-a="start">${icon('play')} Empezar</button></div></div>`;
    } else if (st.phase === 'work') {
      if (reps == null) reps = defaultReps();
      el.innerHTML = `<div class="player">${top}<div class="player-main">
        <div class="fig-stage">${figure(ex.pose, { hl: ex.hl })}</div>
        <div><h2>${esc(ex.name)}</h2><div class="setinfo">Serie ${st.set + 1} de ${it.sets} · objetivo ${repsText(it)}${ex.perSide ? ' por lado' : ''}</div></div>
        <div class="stepper"><button data-a="minus" aria-label="Menos">−</button><span class="val" data-reps>${reps}</span><button data-a="plus" aria-label="Más">+</button></div>
        <div class="center xs faint">Repeticiones hechas</div>
      </div><div class="player-actions">
        <button class="btn primary lg block" data-a="doneSet">${icon('check')} Serie completada</button>
        <div class="row"><button class="btn" data-a="tech">Técnica</button><button class="btn" data-a="skip">Saltar ejercicio</button></div>
      </div></div>`;
    } else if (st.phase === 'ready' || st.phase === 'timer' || st.phase === 'switch') {
      const target = it.secs;
      el.innerHTML = `<div class="player">${top}<div class="player-main">
        <div class="fig-stage">${figure(ex.pose, { hl: ex.hl })}</div>
        <div><h2>${esc(ex.name)}</h2><div class="setinfo">Serie ${st.set + 1} de ${it.sets}${ex.perSide ? ` · lado ${st.side === 1 ? 'derecho' : 'izquierdo'}` : ''}</div></div>
        <div class="phase ${st.phase === 'switch' ? 'walk' : ''}">${st.phase === 'switch' ? 'Cambiá de lado' : st.phase === 'timer' ? 'Mantené' : 'Listo'}</div>
        <div class="big-timer" data-t>${fmtClock(st.phase === 'ready' ? target : 0)}</div>
      </div><div class="player-actions">
        ${st.phase === 'ready' ? `<button class="btn primary lg block" data-a="go">${icon('play')} Iniciar ${target} s</button><div class="row"><button class="btn" data-a="tech">Técnica</button><button class="btn" data-a="skip">Saltar ejercicio</button></div>`
          : `<button class="btn lg block" data-a="stopEarly">Terminar serie ahora</button>`}
      </div></div>`;
      if (st.phase !== 'ready') {
        startTick(() => {
          const left = Math.max(0, (st.until - Date.now()) / 1000);
          const t = el.querySelector('[data-t]'); if (t) t.textContent = fmtClock(Math.ceil(left));
          if (left <= 3.05 && left > 2.85 && st.phase === 'timer') beep(1, 660);
          if (left <= 0) {
            stopTick();
            if (st.phase === 'switch') { st.phase = 'timer'; st.side = 2; st.until = Date.now() + it.secs * 1000; beep(1); say('Otro lado'); saveState(st); draw(); return; }
            beep(2, 990);
            if (ex.perSide && st.side === 1) { st.firstSide = it.secs; st.phase = 'switch'; st.until = Date.now() + 5000; saveState(st); draw(); return; }
            logSet({ secs: Math.min(it.secs, st.firstSide || it.secs) }); st.firstSide = null;
          }
        });
      }
    } else if (st.phase === 'rest') {
      const total = it.rest;
      el.innerHTML = `<div class="player">${top}<div class="player-main">
        <div class="phase walk">Descanso</div>
        <div class="rest-ring" data-ring>${ring(100, { size: 220, stroke: 12, label: `<b class="num" style="font-size:56px" data-t>${fmtClock(total)}</b>`, color: 'var(--info)' })}</div>
        <div class="card center"><div class="eyebrow">Siguiente</div><div style="font-weight:650;margin-top:4px">${esc(nextLabel())}</div></div>
      </div><div class="player-actions"><div class="row"><button class="btn" data-a="add15">+15 s</button><button class="btn primary" data-a="skipRest">${icon('skip')} Saltar</button></div></div></div>`;
      startTick(() => {
        const left = Math.max(0, (st.until - Date.now()) / 1000);
        const t = el.querySelector('[data-t]'); if (t) t.textContent = fmtClock(Math.ceil(left));
        const prog = el.querySelector('.ring .prog');
        if (prog) { const c = Number(prog.getAttribute('stroke-dasharray')); prog.style.strokeDashoffset = c * (1 - left / (st.restTotal || total)); }
        if (left <= 3.05 && left > 2.85) beep(1, 660);
        if (left <= 0) { stopTick(); beep(2, 990); say(nextLabel().split(' · ')[0]); advance(); }
      });
    } else if (st.phase === 'finish') {
      const min = Math.max(1, Math.round(((st.endedAt || Date.now()) - st.startedAt) / 60000));
      const totalReps = st.log.reduce((a, l) => a + (l.reps || 0), 0);
      el.innerHTML = `<div class="player">${top}<div class="player-main">
        <div class="center">${ring(100, { size: 110, stroke: 10, label: icon('check').replace('<svg', '<svg style="width:44px;height:44px;color:var(--accent-text)"') })}</div>
        <h2>Rutina completa</h2>
        <div class="grid3"><div class="stat"><div class="label">Tiempo</div><div class="value">${min}<small>min</small></div></div><div class="stat"><div class="label">Series</div><div class="value">${st.log.length}</div></div><div class="stat"><div class="label">Reps</div><div class="value">${totalReps}</div></div></div>
        <div class="field"><span>Esfuerzo percibido</span>${scaleHTML('rpe', null, { max: 10, low: 'Muy fácil', high: 'Máximo' })}</div>
        <label class="field"><span>Notas</span><textarea name="note" placeholder="Cómo te sentiste, molestias, qué mejorar…"></textarea></label>
      </div><div class="player-actions"><button class="btn primary lg block" data-a="save">Guardar entrenamiento</button><button class="btn ghost block" data-a="discard">Descartar</button></div></div>`;
      readScales = bindScales(el);
    }
  }
  let readScales = () => ({});

  async function save(partial = false) {
    const note = el.querySelector('textarea[name=note]')?.value.trim() || '';
    const min = Math.max(1, Math.round(((st.endedAt || Date.now()) - (st.startedAt || Date.now())) / 60000));
    const rec = { id: uid(), date: today(), type: 'calisthenics', routine: rid, sets: st.log, durationMin: min, rpe: readScales().rpe ?? null, note, partial, deload: !!st.deload, source: 'manual', at: Date.now() };
    await db.put('workouts', rec);
    await autoCompleteKind(rec.date, 'calisthenics', rid);
    clearState(); releaseAwake();
    toast(partial ? 'Entrenamiento parcial guardado' : 'Entrenamiento guardado');
    bus.go('#/entrenar');
  }

  el.onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    unlockAudio();
    const it = cur();
    if (a === 'start') { st.startedAt = Date.now(); st.phase = curEx().type === 'time' ? 'ready' : 'work'; keepAwake(); say(`Empezamos con ${curEx().name}`); saveState(st); draw(); }
    if (a === 'minus') { reps = Math.max(0, reps - 1); el.querySelector('[data-reps]').textContent = reps; }
    if (a === 'plus') { reps = Math.min(200, reps + 1); el.querySelector('[data-reps]').textContent = reps; }
    if (a === 'doneSet') logSet({ reps });
    if (a === 'go') { st.phase = 'timer'; st.until = Date.now() + it.secs * 1000; beep(1); saveState(st); draw(); }
    if (a === 'stopEarly') {
      const elapsed = Math.round(it.secs - Math.max(0, (st.until - Date.now()) / 1000));
      if (st.phase === 'switch') { st.phase = 'timer'; st.side = 2; st.until = Date.now() + it.secs * 1000; beep(1); saveState(st); draw(); return; }
      if (curEx().perSide && st.side === 1) { st.firstSide = Math.max(1, elapsed); st.phase = 'switch'; st.until = Date.now() + 5000; saveState(st); draw(); return; }
      logSet({ secs: Math.max(1, Math.min(elapsed, st.firstSide || elapsed)) }); st.firstSide = null;
    }
    if (a === 'add15') { st.until += 15000; st.restTotal = (st.restTotal || it.rest) + 15; saveState(st); }
    if (a === 'skipRest') { stopTick(); advance(); }
    if (a === 'skip') { st.set = it.sets - 1; advance(); }
    if (a === 'tech') {
      const ex = curEx();
      sheet({ title: ex.name, body: `<div class="fig-stage">${figure(ex.pose, { hl: ex.hl })}</div><ol class="tech" style="margin-top:12px">${ex.tech.map((t) => `<li>${esc(t)}</li>`).join('')}</ol><div class="banner info" style="margin-top:12px"><span class="bi">${icon('info')}</span><div class="grow"><b>Más fácil</b><p>${esc(ex.easier)}</p></div></div>` });
    }
    if (a === 'save') await save(false);
    if (a === 'discard') { if (await confirmDialog('Descartar', '¿Descartar este entrenamiento sin guardarlo?', { ok: 'Descartar', danger: true })) { clearState(); releaseAwake(); bus.go('#/entrenar'); } }
    if (a === 'exit') {
      if (st.phase === 'intro') { clearState(); bus.go('#/entrenar'); return; }
      if (st.phase === 'finish') { bus.go('#/entrenar'); return; }
      sheet({
        title: 'Salir del entrenamiento',
        body: `<p class="muted" style="margin-bottom:14px">Llevás ${st.log.length} de ${totalSets} series.</p>
          <div class="stack"><button class="btn primary block" data-x="save">Guardar lo hecho y salir</button><button class="btn block" data-x="later">Pausar (seguir después)</button><button class="btn danger block" data-x="discard">Descartar</button></div>`,
        onMount: (b, close) => b.addEventListener('click', async (ev) => {
          const x = ev.target.closest('[data-x]')?.dataset.x; if (!x) return;
          close();
          if (x === 'save') { if (!st.log.length) { clearState(); bus.go('#/entrenar'); return; } st.endedAt = Date.now(); await save(true); }
          if (x === 'later') { stopTick(); releaseAwake(); bus.go('#/entrenar'); }
          if (x === 'discard') { clearState(); releaseAwake(); bus.go('#/entrenar'); }
        }),
      });
    }
  };

  const onVis = () => { if (document.visibilityState === 'visible' && st.phase !== 'intro' && st.phase !== 'finish') keepAwake(); };
  document.addEventListener('visibilitychange', onVis);
  draw();
  return () => { stopTick(); releaseAwake(); document.removeEventListener('visibilitychange', onVis); document.body.classList.remove('no-nav'); document.getElementById('view').classList.remove('full'); el.onclick = null; };
}

// ---------------------------------------------------------------------------
// Running guiado
// ---------------------------------------------------------------------------
const RKEY = 'p5k:activeRun';

export async function renderRun(el) {
  const status = await runPlanStatus();
  const intervals = runIntervals(status.week);
  const total = intervals.reduce((a, i) => a + i.s, 0);
  let st = null;
  try { st = JSON.parse(localStorage.getItem(RKEY) || 'null'); } catch {}
  if (!st || st.week !== status.week) st = { week: status.week, startedAt: null, pausedAt: null, paused: 0, offset: 0, lastIdx: -1, done: false };
  const save = () => localStorage.setItem(RKEY, JSON.stringify(st));
  document.body.classList.add('no-nav');
  document.getElementById('view').classList.add('full');
  let tick = null;

  const elapsed = () => {
    if (!st.startedAt) return 0;
    const now = st.pausedAt || Date.now();
    return Math.min(total, (now - st.startedAt - st.paused) / 1000 + st.offset);
  };
  const locate = (t) => { let acc = 0; for (let i = 0; i < intervals.length; i++) { if (t < acc + intervals[i].s) return { i, left: acc + intervals[i].s - t, start: acc }; acc += intervals[i].s; } return { i: intervals.length - 1, left: 0, start: total }; };

  function draw() {
    if (tick) clearInterval(tick);
    const running = st.startedAt && !st.pausedAt && !st.done;
    el.innerHTML = `<div class="player">
      <div class="player-top"><button class="icon-btn" data-a="exit" aria-label="Salir">${icon('x')}</button><div class="player-progress"><i data-prog></i></div><span class="small muted num" data-tot></span></div>
      <div class="player-main">
        <div class="eyebrow center">Plan 5K · semana ${status.week}</div>
        ${st.done ? `<h2>¡Sesión completa!</h2><p class="center muted">Registrá la distancia (de Mi Fitness o estimada) y cómo te sentiste.</p>` : `
        <div class="phase" data-phase></div>
        <div class="big-timer" data-left>0:00</div>
        <div class="center muted" data-label></div>
        <div class="interval-list" data-ivs>${intervals.map((i) => `<i class="${i.t}" style="flex:${i.s}"></i>`).join('')}</div>
        <div class="card center"><div class="eyebrow">Después</div><div style="font-weight:650;margin-top:4px" data-next></div></div>
        <p class="xs faint center">Mantené la app abierta: si la pantalla se bloquea, el tiempo sigue pero los avisos de voz se pausan.</p>`}
      </div>
      <div class="player-actions">
        ${st.done ? `<button class="btn primary lg block" data-a="log">Registrar salida</button><button class="btn ghost block" data-a="close">Cerrar sin registrar</button>` :
        !st.startedAt ? `<button class="btn primary lg block" data-a="start">${icon('play')} Empezar (${Math.round(total / 60)} min)</button>` :
        `<div class="row"><button class="btn lg" data-a="${running ? 'pause' : 'resume'}">${icon(running ? 'pause' : 'play')} ${running ? 'Pausa' : 'Seguir'}</button><button class="btn lg" data-a="skip">${icon('skip')} Siguiente</button></div><button class="btn ghost block" data-a="finish">Terminar sesión</button>`}
      </div></div>`;
    const upd = () => {
      const t = elapsed();
      const loc = locate(t);
      const iv = intervals[loc.i];
      if (st.startedAt && !st.done && loc.i !== st.lastIdx) {
        if (st.lastIdx !== -1) { beep(2, iv.t === 'run' ? 990 : 660); say(iv.t === 'run' ? 'Trotá suave' : (loc.i === intervals.length - 1 ? 'Caminá. Vuelta a la calma' : 'Caminá')); }
        st.lastIdx = loc.i; save();
      }
      const q = (s) => el.querySelector(s);
      if (q('[data-prog]')) q('[data-prog]').style.width = `${(t / total) * 100}%`;
      if (q('[data-tot]')) q('[data-tot]').textContent = fmtClock(t);
      if (st.done) return;
      q('[data-phase]').textContent = iv.t === 'run' ? 'Trote suave' : 'Caminata';
      q('[data-phase]').classList.toggle('walk', iv.t !== 'run');
      q('[data-left]').textContent = fmtClock(Math.ceil(loc.left));
      q('[data-label]').textContent = iv.label;
      q('[data-next]').textContent = intervals[loc.i + 1] ? `${intervals[loc.i + 1].t === 'run' ? 'Trote' : 'Caminata'} · ${fmtClock(intervals[loc.i + 1].s)}` : 'Fin de la sesión';
      q('[data-ivs]').querySelectorAll('i').forEach((x, k) => { x.classList.toggle('cur', k === loc.i); x.classList.toggle('past', k < loc.i); });
      if (st.startedAt && t >= total) { st.done = true; st.endedAt = Date.now(); save(); beep(3, 990); say('Sesión completa. Muy bien.'); releaseAwake(); draw(); }
    };
    upd();
    if (running) tick = setInterval(upd, 250);
  }

  el.onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    unlockAudio();
    if (a === 'start') { st.startedAt = Date.now(); st.lastIdx = -1; save(); keepAwake(); say('Empezamos caminando cinco minutos'); draw(); }
    if (a === 'pause') { st.pausedAt = Date.now(); save(); draw(); }
    if (a === 'resume') { st.paused += Date.now() - st.pausedAt; st.pausedAt = null; save(); keepAwake(); draw(); }
    if (a === 'skip') { const loc = locate(elapsed()); st.offset += loc.left + 0.05; save(); draw(); }
    if (a === 'finish') { if (await confirmDialog('Terminar sesión', '¿Terminar ahora? Podés registrar lo que hiciste.', { ok: 'Terminar' })) { st.done = true; st.endedAt = Date.now(); st.finalElapsed = elapsed(); save(); releaseAwake(); draw(); } }
    if (a === 'log') {
      const secs = Math.round(st.finalElapsed || elapsed());
      localStorage.removeItem(RKEY);
      bus.go('#/entrenar');
      setTimeout(() => openRunForm({ timeSec: secs, planSession: true }), 350);
    }
    if (a === 'close') { localStorage.removeItem(RKEY); bus.go('#/entrenar'); }
    if (a === 'exit') {
      if (!st.startedAt || st.done) { if (!st.startedAt) localStorage.removeItem(RKEY); bus.go('#/entrenar'); return; }
      if (await confirmDialog('Salir', 'La sesión queda guardada en pausa para retomarla.', { ok: 'Salir' })) { if (!st.pausedAt) st.pausedAt = Date.now(); save(); releaseAwake(); bus.go('#/entrenar'); }
    }
  };
  draw();
  return () => { if (tick) clearInterval(tick); releaseAwake(); document.body.classList.remove('no-nav'); document.getElementById('view').classList.remove('full'); el.onclick = null; };
}
