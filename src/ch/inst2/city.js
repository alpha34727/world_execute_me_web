// inst2.02 — the weight city: the real embedding matrix (lib/embed.js, every word of the song × 16 dimensions) as a
// city of glass pillars. Rows are the words, in the order the song first sings them (row 0 at z = 0, then further
// down −z); columns are the 16 dimensions. A pillar's height is the weight itself: positive ones rise in me's orange,
// negative ones hang below the floor in grey. Nothing is rescaled per pillar: one height scale for the whole matrix.
import { COLOR } from '../../theme.js';
import { clamp, smoothstep, mix3 } from '../../lib/ease.js';
import { embeddings } from '../../lib/embed.js';
import { sequence } from '../../lib/corpus.js';

export const CELL = 0.5, HSCALE = 1.6, PW = 0.28; // street spacing, height per unit of weight, pillar width (world)
export const colX = (d) => (d - 7.5) * CELL;
export const rowZ = (r) => -r * CELL;

const cache = new WeakMap();
// { rows: [{ word, v: [16] }], dim }
export function matrix(T) {
  if (cache.has(T)) return cache.get(T);
  const E = embeddings(T), seen = new Set(), rows = [];
  for (const w of sequence(T)) if (!seen.has(w.norm)) { seen.add(w.norm); rows.push({ word: w.norm, v: E.vector(w.norm) }); }
  const m = { rows, dim: E.dim };
  cache.set(T, m);
  return m;
}

// draws the rows between z = zFar and z = zNear (the camera flies down −z) · k: world → design px at distance ref
// glow: 0..1 brightness of the rooftops (the beat) · near: the camera position (pillars close to the lens fade out)
export function city(ctx, { ref, k, fog, zNear, zFar, glow = 1, near }) {
  const { T } = ctx;
  const M = matrix(T), h2 = PW / 2;
  const r0 = Math.max(0, Math.floor(-zNear / CELL)), r1 = Math.min(M.rows.length - 1, Math.ceil(-zFar / CELL));
  // the floor: streets between the columns, a cross street every 4 rows
  const zA = rowZ(r0) + CELL, zB = rowZ(r1) - CELL;
  for (let d = 0; d <= M.dim; d++) ctx.line([[colX(d) - CELL / 2, 0, zA], [colX(d) - CELL / 2, 0, zB]], { color: COLOR.faint, width: 1.1, alpha: 0.5, persp: ref, fog });
  for (let r = r0 - (r0 % 4); r <= r1; r += 4) ctx.line([[colX(0) - CELL / 2, 0, rowZ(r) + CELL / 2], [colX(M.dim - 1) + CELL / 2, 0, rowZ(r) + CELL / 2]], { color: COLOR.faint, width: 1.1, alpha: 0.4, persp: ref, fog });
  for (let r = r0; r <= r1; r++) {
    const row = M.rows[r], z = rowZ(r);
    for (let d = 0; d < M.dim; d++) {
      const v = row.v[d], h = v * HSCALE, x = colX(d), pos = v > 0;
      const dist = Math.hypot(x - near[0], (h / 2) - near[1], z - near[2]);
      const fade = smoothstep(1.2, 2.6, dist);
      if (fade <= 0) continue;
      const col = pos ? mix3(COLOR.me, COLOR.warm, clamp(0.4 - v * 0.4)) : COLOR.dim;
      // the glass body (shortened by its round caps), then the rooftop outline and the front edge
      if (Math.abs(h) > PW) ctx.line([[x, Math.sign(h) * h2, z], [x, h - Math.sign(h) * h2, z]], { color: col, width: PW * k, alpha: (pos ? 0.28 : 0.12) * fade, persp: ref, fog });
      const roof = [[x - h2, h, z - h2], [x + h2, h, z - h2], [x + h2, h, z + h2], [x - h2, h, z + h2], [x - h2, h, z - h2]];
      // rooftops right under the lens are toned down: the pillars, not the outlines, carry the picture
      const fore = 0.5 + 0.5 * smoothstep(3, 6, dist);
      ctx.line(roof, { color: col, width: 2, alpha: (pos ? 0.55 + 0.45 * glow : 0.4) * fade * fore, glow: pos ? 3 : 0, glowStrength: 0.3, persp: ref, fog, intensity: 0.9 });
      ctx.line([[x - h2, 0, z + h2], [x - h2, h, z + h2]], { color: col, width: 1.4, alpha: (pos ? 0.45 : 0.3) * fade, persp: ref, fog });
    }
  }
}

// the word of each row, small and faint at the street's left end (only near the camera)
export function streetNames(ctx, { ref, fog, zNear, zFar }) {
  const M = matrix(ctx.T);
  const r0 = Math.max(0, Math.floor(-zNear / CELL)), r1 = Math.min(M.rows.length - 1, Math.ceil(-zFar / CELL));
  for (let r = r0; r <= r1; r++) ctx.text3D(M.rows[r].word, [colX(0) - CELL, 0.02, rowZ(r)], { font: 'mono', size: 14, ref, color: COLOR.dim, alpha: 0.85, align: 'right', baseline: 'middle', fog, minSize: 10, maxSize: 14 });
}
