// Gráficas SVG livianas (sin dependencias, funcionan offline y siguen el tema).
import { esc } from './util.js';

const W = 340, PAD_L = 30, PAD_R = 8, PAD_T = 12, PAD_B = 22;

function niceRange(min, max, pad = 0.12) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  return [min - span * pad, max + span * pad];
}
const fmtTick = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace('.', ',');

/** Línea con área, puntos, banda objetivo y serie secundaria opcional. */
export function lineChart({ points, height = 150, band, avgLine, yFmt = fmtTick, min, max, empty = 'Todavía no hay datos.' }) {
  const vals = points.filter((p) => p.y != null);
  if (!vals.length) return `<div class="chart-empty">${esc(empty)}</div>`;
  const H = height;
  let ys = vals.map((p) => p.y);
  if (avgLine) ys = ys.concat(avgLine.filter((p) => p.y != null).map((p) => p.y));
  if (band) ys = ys.concat(band);
  let [lo, hi] = niceRange(Math.min(...ys), Math.max(...ys));
  if (min != null) lo = min; if (max != null) hi = max;
  const n = points.length;
  const x = (i) => PAD_L + (n === 1 ? (W - PAD_L - PAD_R) / 2 : (i * (W - PAD_L - PAD_R)) / (n - 1));
  const y = (v) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B);
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
  const seg = (arr) => {
    let d = '', pen = false;
    arr.forEach((p, i) => { if (p.y == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)} `; pen = true; });
    return d;
  };
  const idx = points.map((p, i) => (p.y != null ? i : -1)).filter((i) => i >= 0);
  const area = idx.length > 1 ? `M${x(idx[0])},${H - PAD_B} ` + idx.map((i) => `L${x(i).toFixed(1)},${y(points[i].y).toFixed(1)}`).join(' ') + ` L${x(idx[idx.length - 1])},${H - PAD_B} Z` : '';
  const labelEvery = Math.ceil(n / 7);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
    <defs><linearGradient id="gradA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${band ? `<rect class="band" x="${PAD_L}" width="${W - PAD_L - PAD_R}" y="${y(band[1])}" height="${Math.max(0, y(band[0]) - y(band[1]))}" rx="4"/>` : ''}
    ${ticks.map((t) => `<line class="grid" x1="${PAD_L}" x2="${W - PAD_R}" y1="${y(t)}" y2="${y(t)}"/><text x="${PAD_L - 6}" y="${y(t) + 3}" text-anchor="end">${esc(yFmt(t))}</text>`).join('')}
    ${area ? `<path class="area" d="${area}"/>` : ''}
    ${avgLine ? `<path class="line soft" d="${seg(avgLine)}"/>` : ''}
    <path class="line" d="${seg(points)}"/>
    ${n <= 31 ? idx.map((i) => `<circle class="pt" cx="${x(i)}" cy="${y(points[i].y)}" r="${n > 14 ? 2.4 : 3.4}"><title>${esc(points[i].x)}: ${esc(yFmt(points[i].y))}</title></circle>`).join('') : ''}
    ${points.map((p, i) => (i % labelEvery === 0 || i === n - 1) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(p.x)}</text>` : '').join('')}
  </svg>`;
}

/** Barras con línea objetivo y banda opcional. */
export function barChart({ bars, height = 150, goal, band, yFmt = fmtTick, max, showValues = false, empty = 'Todavía no hay datos.' }) {
  if (!bars.length || bars.every((b) => !b.v)) return `<div class="chart-empty">${esc(empty)}</div>`;
  const H = height;
  const top = Math.max(max || 0, ...bars.map((b) => b.v || 0), goal || 0, band ? band[1] : 0) * 1.12 || 1;
  const n = bars.length, inner = W - PAD_L - PAD_R, slot = inner / n, bw = Math.min(26, slot * 0.62);
  const y = (v) => PAD_T + (1 - v / top) * (H - PAD_T - PAD_B);
  const ticks = [top * 0.25, top * 0.5, top * 0.75];
  const labelEvery = Math.ceil(n / 8);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
    ${band ? `<rect class="band" x="${PAD_L}" width="${inner}" y="${y(band[1])}" height="${Math.max(0, y(band[0]) - y(band[1]))}" rx="4"/>` : ''}
    ${ticks.map((t) => `<line class="grid" x1="${PAD_L}" x2="${W - PAD_R}" y1="${y(t)}" y2="${y(t)}"/><text x="${PAD_L - 6}" y="${y(t) + 3}" text-anchor="end">${esc(yFmt(t))}</text>`).join('')}
    ${bars.map((b, i) => {
      const cx = PAD_L + slot * i + slot / 2, v = b.v || 0, h = Math.max(v ? 3 : 0, (H - PAD_T - PAD_B) - (y(v) - PAD_T));
      return `<rect class="barr ${b.cls || ''}" x="${cx - bw / 2}" y="${H - PAD_B - h}" width="${bw}" height="${h}" rx="${Math.min(6, bw / 2)}"><title>${esc(b.label)}: ${esc(yFmt(v))}</title></rect>
        ${showValues && v ? `<text class="val" x="${cx}" y="${H - PAD_B - h - 4}" text-anchor="middle">${esc(yFmt(v))}</text>` : ''}
        ${(i % labelEvery === 0 || i === n - 1) ? `<text x="${cx}" y="${H - 6}" text-anchor="middle">${esc(b.label)}</text>` : ''}`;
    }).join('')}
    ${goal ? `<line class="goal" x1="${PAD_L}" x2="${W - PAD_R}" y1="${y(goal)}" y2="${y(goal)}"/>` : ''}
  </svg>`;
}

/** Barras (eje izquierdo) + línea (eje derecho): p. ej. entrenamientos vs. peso. */
export function comboChart({ labels, bars, line, height = 160, barFmt = fmtTick, lineFmt = fmtTick, empty = 'Todavía no hay datos.' }) {
  if (!labels.length || (bars.every((v) => !v) && line.every((v) => v == null))) return `<div class="chart-empty">${esc(empty)}</div>`;
  const H = height, R = 34;
  const inner = W - PAD_L - R, n = labels.length, slot = inner / n, bw = Math.min(22, slot * 0.55);
  const bTop = Math.max(...bars, 1) * 1.2;
  const lv = line.filter((v) => v != null);
  const [lo, hi] = lv.length ? niceRange(Math.min(...lv), Math.max(...lv), 0.3) : [0, 1];
  const yb = (v) => PAD_T + (1 - v / bTop) * (H - PAD_T - PAD_B);
  const yl = (v) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B);
  const cx = (i) => PAD_L + slot * i + slot / 2;
  let d = '', pen = false;
  line.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${cx(i).toFixed(1)},${yl(v).toFixed(1)} `; pen = true; });
  const labelEvery = Math.ceil(n / 8);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
    ${[0.33, 0.66].map((f) => `<line class="grid" x1="${PAD_L}" x2="${W - R}" y1="${PAD_T + f * (H - PAD_T - PAD_B)}" y2="${PAD_T + f * (H - PAD_T - PAD_B)}"/>`).join('')}
    ${[bTop * 0.67, bTop * 0.34].map((t) => `<text x="${PAD_L - 6}" y="${yb(t) + 3}" text-anchor="end">${esc(barFmt(t))}</text>`).join('')}
    ${lv.length ? [hi - (hi - lo) * 0.33, lo + (hi - lo) * 0.34].map((t) => `<text x="${W - R + 5}" y="${yl(t) + 3}">${esc(lineFmt(t))}</text>`).join('') : ''}
    ${bars.map((v, i) => { const h = v ? (H - PAD_B) - yb(v) : 0; return `<rect class="barr mute" x="${cx(i) - bw / 2}" y="${H - PAD_B - h}" width="${bw}" height="${h}" rx="5"><title>${esc(labels[i])}: ${esc(barFmt(v))}</title></rect>`; }).join('')}
    <path class="line alt" d="${d}"/>
    ${line.map((v, i) => v == null ? '' : `<circle class="pt" style="stroke:var(--info)" cx="${cx(i)}" cy="${yl(v)}" r="3"><title>${esc(labels[i])}: ${esc(lineFmt(v))}</title></circle>`).join('')}
    ${labels.map((l, i) => (i % labelEvery === 0 || i === n - 1) ? `<text x="${cx(i)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>` : '').join('')}
  </svg>`;
}

/** Comparativa semana anterior vs. actual en filas. */
export function compareRows(rows) {
  return `<div class="cmp">${rows.map((r) => {
    const top = Math.max(r.prev || 0, r.cur || 0, r.max || 0) || 1;
    return `<div class="cmp-row">
      <div class="cl"><span>${esc(r.label)}</span><span><span class="faint">${esc(r.fmt(r.prev))}</span> → <b>${esc(r.fmt(r.cur))}</b></span></div>
      <div class="cmp-bars"><i style="width:${((r.prev || 0) / top) * 100}%"></i><i class="cur" style="width:${((r.cur || 0) / top) * 100}%"></i></div>
    </div>`;
  }).join('')}</div>
  <div class="legend"><span><i class="mute"></i>Semana anterior</span><span><i></i>Esta semana</span></div>`;
}
