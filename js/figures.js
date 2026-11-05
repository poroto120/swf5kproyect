// Ilustraciones de ejercicios: figuras lineales animadas (SVG + SMIL).
// Cada pose define articulaciones en un lienzo de 160×100 con el piso en y=88.
// H cabeza · S hombro · E codo · W mano · P cadera · K rodilla · A tobillo · T punta del pie
// E2/W2/K2/A2 = extremidades del lado lejano (se dibujan atenuadas).

const P = (o) => o;
export const POSES = {
  pushup: {
    a: P({ H: [110, 62], S: [100, 67], E: [100, 77], W: [100, 87], P: [68, 76], K: [49, 81], A: [30, 86] }),
    b: P({ H: [112, 76], S: [102, 79], E: [92, 73], W: [100, 87], P: [68, 81], K: [49, 83.5], A: [30, 86] }),
  },
  closepush: {
    a: P({ H: [110, 62], S: [100, 67], E: [99, 77], W: [99, 87], P: [68, 76], K: [49, 81], A: [30, 86] }),
    b: P({ H: [112, 76], S: [102, 79], E: [89, 76], W: [99, 87], P: [68, 81], K: [49, 83.5], A: [30, 86] }),
  },
  squat: {
    a: P({ H: [80, 15], S: [80, 25], E: [93, 25], W: [106, 25], P: [80, 51], K: [80, 69], A: [80, 87], T: [90, 87] }),
    b: P({ H: [95.7, 41.6], S: [89.3, 49.3], E: [102.3, 49.3], W: [115.3, 49.3], P: [72.6, 69.2], K: [90.3, 72.3], A: [80, 87], T: [90, 87] }),
  },
  lunge: {
    a: P({ H: [80, 15], S: [80, 25], E: [80, 39], W: [81, 51], P: [80, 51], K: [80, 69], A: [80, 87], T: [89, 87], K2: [80, 69], A2: [80, 87] }),
    b: P({ H: [70, 33], S: [70, 43], E: [70, 57], W: [71, 69], P: [70, 69], K: [88, 69], A: [88, 87], T: [97, 87], K2: [64, 86], A2: [47, 86] }),
  },
  pike: {
    a: P({ H: [106, 66], S: [98, 61], E: [101, 74], W: [104, 87], P: [70, 52], K: [60, 69.5], A: [50, 87] }),
    b: P({ H: [107.6, 73], S: [100, 68], E: [90, 76], W: [104, 87], P: [72, 50], K: [61, 68.5], A: [50, 87] }),
  },
  bridge: {
    a: P({ H: [122, 81], S: [112, 84], E: [100, 86], W: [89, 87], P: [86, 84], K: [72, 70], A: [70, 87], T: [61, 87] }),
    b: P({ H: [122, 81], S: [112, 84], E: [100, 86], W: [89, 87], P: [86, 72], K: [68, 69], A: [70, 87], T: [61, 87] }),
  },
  deadbug: {
    a: P({ H: [121, 76], S: [112, 82], E: [112, 69], W: [112, 56], P: [84, 82], K: [84, 64], A: [66, 64], E2: [112, 69], W2: [112, 56], K2: [84, 64], A2: [66, 64] }),
    b: P({ H: [121, 76], S: [112, 82], E: [124, 84], W: [137, 84], P: [84, 82], K: [84, 64], A: [66, 64], E2: [112, 69], W2: [112, 56], K2: [66, 79], A2: [48, 77] }),
  },
  plank: {
    a: P({ H: [112, 64], S: [102, 67], E: [102, 86], W: [116, 86], P: [70, 75], K: [50, 80.5], A: [30, 86] }),
    b: P({ H: [112, 63], S: [102, 66.5], E: [102, 86], W: [116, 86], P: [70, 74], K: [50, 80], A: [30, 86] }),
    static: true,
  },
  incline: {
    a: P({ H: [106, 36], S: [98, 42], E: [101, 54], W: [104, 66], P: [76, 60.5], K: [61, 73], A: [46, 86] }),
    b: P({ H: [111, 55], S: [102, 58], E: [94, 52], W: [104, 66], P: [78.5, 69.8], K: [62.2, 77.9], A: [46, 86] }),
    prop: 'bench',
  },
  superman: {
    a: P({ H: [123, 77], S: [114, 84], E: [127, 85], W: [140, 85], P: [86, 84], K: [68, 85], A: [50, 86] }),
    b: P({ H: [123, 71], S: [114, 79], E: [127, 74], W: [140, 69], P: [86, 84], K: [68, 80], A: [51, 74] }),
  },
  snowangel: {
    a: P({ H: [123, 75], S: [114, 80], E: [101, 79], W: [89, 78], P: [86, 84], K: [68, 85], A: [50, 86] }),
    m: P({ H: [123, 75], S: [114, 80], E: [115, 75], W: [116, 70], P: [86, 84], K: [68, 85], A: [50, 86] }),
    b: P({ H: [123, 75], S: [114, 80], E: [127, 77], W: [140, 75], P: [86, 84], K: [68, 85], A: [50, 86] }),
  },
  birddog: {
    a: P({ H: [111, 58], S: [102, 64], E: [102, 76], W: [102, 87], P: [76, 67], K: [76, 85], A: [58, 87], E2: [102, 76], W2: [102, 87], K2: [76, 85], A2: [58, 87] }),
    b: P({ H: [111, 58], S: [102, 64], E: [115, 62], W: [128, 60], P: [76, 67], K: [76, 85], A: [58, 87], E2: [102, 76], W2: [102, 87], K2: [58, 66], A2: [40, 65] }),
  },
  calf: {
    a: P({ H: [80, 15], S: [80, 25], E: [80, 39], W: [80, 51], P: [80, 51], K: [80, 69], A: [80, 86], T: [90, 87] }),
    b: P({ H: [81, 9], S: [81, 19], E: [81, 33], W: [81, 45], P: [81, 45], K: [81, 63], A: [83, 80], T: [91, 87] }),
  },
  sideplank: {
    a: P({ H: [109.7, 69.7], S: [100, 72], E: [100, 86], W: [105, 87], P: [74.8, 77.9], K: [57.4, 81.9], A: [40, 86], E2: [101, 58], W2: [102, 45] }),
    b: P({ H: [109.7, 68.7], S: [100, 71], E: [100, 86], W: [105, 87], P: [74.8, 76.9], K: [57.4, 81.4], A: [40, 86], E2: [101, 57], W2: [102, 44] }),
    static: true,
  },
};

const SEGS = [
  // [desde, hasta, grupo, capa]
  ['S', 'E2', 'arms', 'far'], ['E2', 'W2', 'arms', 'far'], ['P', 'K2', 'legs', 'far'], ['K2', 'A2', 'legs', 'far'],
  ['S', 'P', 'torso', 'body'], ['P', 'K', 'legs', 'body'], ['K', 'A', 'legs', 'body'], ['A', 'T', 'legs', 'body'],
  ['S', 'E', 'arms', 'arm'], ['E', 'W', 'arms', 'arm'],
];
const HEAD_R = 6.2;

function neckEnd(pose) {
  const [sx, sy] = pose.S, [hx, hy] = pose.H;
  const dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1;
  const k = Math.max(0, (L - HEAD_R + 0.5) / L);
  return [sx + dx * k, sy + dy * k];
}

const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function bbox(def) {
  const pts = [def.a, def.b, def.m].filter(Boolean).flatMap((p) => Object.values(p));
  let x0 = Math.min(...pts.map((p) => p[0])) - 10, x1 = Math.max(...pts.map((p) => p[0])) + 10;
  let y0 = Math.min(...pts.map((p) => p[1])) - 10, y1 = 92;
  if (def.prop === 'bench') x1 = Math.max(x1, 142);
  // Ajustar a proporción 1.6:1
  const w = x1 - x0, h = y1 - y0, target = 1.6;
  if (w / h < target) { const nw = h * target; x0 -= (nw - w) / 2; x1 = x0 + nw; }
  else { const nh = w / target; y0 -= nh - h; }
  return [x0, y0, x1 - x0, y1 - y0];
}

/**
 * @param {string} key  clave de pose
 * @param {{animate?:boolean, hl?:string[], dur?:number}} opts
 */
const THUMB_A = ['pushup', 'closepush', 'incline', 'plank', 'sideplank', 'pike'];
export function figure(key, { animate = true, hl = [], dur = 2.8, thick = false } = {}) {
  const def = POSES[key];
  if (!def) return '';
  const anim = animate && !def.static && !reduceMotion();
  const base = anim ? def.a : def[THUMB_A.includes(key) ? 'a' : 'b'];
  const k = thick ? 1.5 : 0.82;
  const frames = def.m ? [def.a, def.m, def.b, def.m, def.a] : [def.a, def.b, def.a];
  const keyTimes = def.m ? '0;.25;.5;.75;1' : '0;.5;1';
  const splines = Array(frames.length - 1).fill('.45 0 .55 1').join(';');
  const A = (attr, vals) => anim ? `<animate attributeName="${attr}" values="${vals.join(';')}" keyTimes="${keyTimes}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines="${splines}"/>` : '';
  const get = (pose, j) => pose[j] || (j === 'E2' ? pose.E : j === 'W2' ? pose.W : j === 'K2' ? pose.K : j === 'A2' ? pose.A : null);

  const line = (from, to, cls, width, extra = '') => {
    if (!def.a[from] && !['E2', 'W2', 'K2', 'A2'].includes(from)) return '';
    if (!def.a[to] && !['E2', 'W2', 'K2', 'A2'].includes(to)) return '';
    const fa = get(base, from), ta = get(base, to);
    if (!fa || !ta) return '';
    const fr = frames.map((p) => get(p, from)), tr = frames.map((p) => get(p, to));
    return `<line class="${cls}" x1="${fa[0]}" y1="${fa[1]}" x2="${ta[0]}" y2="${ta[1]}" stroke-width="${width}" ${extra}>
      ${A('x1', fr.map((p) => p[0]))}${A('y1', fr.map((p) => p[1]))}${A('x2', tr.map((p) => p[0]))}${A('y2', tr.map((p) => p[1]))}</line>`;
  };

  const hasFar = (j) => !!def.a[j] || !!def.b[j];
  const far = SEGS.filter((s) => s[3] === 'far' && hasFar(s[1] === 'K2' || s[1] === 'E2' ? s[1] : s[0])).map(([f, t, g]) =>
    line(f, t, `far ${hl.includes(g) ? 'hl' : ''}`, 5.2 * k, 'stroke="currentColor"')).join('');

  const nearSegs = (layer) => SEGS.filter((s) => s[3] === layer);
  const withHalo = (layer) => nearSegs(layer).map(([f, t]) => line(f, t, 'halo', 9.5 * k, 'stroke="var(--fig-bg, var(--surface))"')).join('') +
    nearSegs(layer).map(([f, t, g]) => line(f, t, hl.includes(g) ? 'hl' : '', 5.4 * k, 'stroke="currentColor"')).join('');

  const ne = frames.map(neckEnd);
  const nb = neckEnd(base);
  const neck = `<line x1="${base.S[0]}" y1="${base.S[1]}" x2="${nb[0]}" y2="${nb[1]}" stroke="currentColor" stroke-width="${5 * k}" class="${hl.includes('torso') ? 'hl' : ''}">
    ${A('x1', frames.map((p) => p.S[0]))}${A('y1', frames.map((p) => p.S[1]))}${A('x2', ne.map((p) => p[0]))}${A('y2', ne.map((p) => p[1]))}</line>`;
  const head = `<circle cx="${base.H[0]}" cy="${base.H[1]}" r="${HEAD_R * (thick ? 1.05 : 0.92)}" fill="currentColor" stroke="var(--fig-bg, var(--surface))" stroke-width="${2.4 * k}">
    ${A('cx', frames.map((p) => p.H[0]))}${A('cy', frames.map((p) => p.H[1]))}</circle>`;

  const [vx, vy, vw, vh] = bbox(def);
  const prop = def.prop === 'bench' ? `<rect class="prop" x="96" y="66.5" width="46" height="21.5" rx="3" stroke-width="1"/>` : '';
  return `<svg class="fig" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <line class="ground" x1="${vx}" x2="${vx + vw}" y1="88.5" y2="88.5" stroke-width="1.2" stroke-linecap="round"/>
    ${prop}
    <g stroke-linecap="round" stroke-linejoin="round" fill="none">
      ${far}
      ${withHalo('body')}
      ${neck}
      ${head}
      ${withHalo('arm')}
    </g>
  </svg>`;
}
