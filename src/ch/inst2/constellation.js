// inst2.03–04 — the attention constellation: every word sung before inst2, at its real embedding coordinates
// (lib/embed.js point3, the same projection as everywhere in the film; one scale, translated so me's own word "me"
// sits at the origin, where the spark is). Each sung word is linked to the earlier word it attends to most — real
// causal attention, the film's single untrained head (W_Q = W_K = gain·I), other than its own earlier occurrences
// (a word always attends to itself most: q = k). Line width and brightness are the real weight.
import { COLOR } from '../../theme.js';
import { clamp, smoothstep, decay, mix3 } from '../../lib/ease.js';
import { embeddings, attention } from '../../lib/embed.js';
import { sequence } from '../../lib/corpus.js';

export const SCALE = 2;
const isYou = (w) => w === 'you' || w === 'your';

const cache = new WeakMap();
// { nodes: Map word → { word, p, count, first (token index) }, edges: [{ i, a, b, w }], words: N, top (strongest edge) }
export function graph(T) {
  if (cache.has(T)) return cache.get(T);
  const s0 = T.section('inst2').start, seq = sequence(T), E = embeddings(T);
  const heard = seq.filter((w) => w.start < s0), words = seq.map((w) => w.norm);
  const pm = E.point3('me', SCALE);
  const nodes = new Map();
  heard.forEach((w) => {
    if (!nodes.has(w.norm)) nodes.set(w.norm, { word: w.norm, p: E.point3(w.norm, SCALE).map((x, d) => x - pm[d]), count: 0, first: w.n, tokens: [], you: isYou(w.norm) });
    nodes.get(w.norm).count++;
    nodes.get(w.norm).tokens.push(w.n);
  });
  const edges = [];
  for (const w of heard) {
    if (!w.n) continue;
    const a = attention(E, words, w.n);
    let bj = -1, bv = -1;
    for (let j = 0; j < w.n; j++) if (words[j] !== words[w.n] && a[j] > bv) { bv = a[j]; bj = j; }
    if (bj >= 0) edges.push({ i: w.n, a: words[w.n], b: words[bj], w: bv });
  }
  const top = edges.reduce((m, e) => (e.w > m.w ? e : m), edges[0]);
  // the framing centre: the per-axis median (a few far words would drag the mean off-centre)
  const c = [0, 1, 2].map((d) => { const v = [...nodes.values()].map((n) => n.p[d]).sort((x, y) => x - y); return v[v.length >> 1]; });
  const g = { nodes, edges, words: heard.length, top, centroid: c };
  cache.set(T, g);
  return g;
}

// arrive(i): when token i lights up (its line drawn, its word's node flashes) · pull(node): 0..1 how far the node has
// been drawn into the spark at the origin (inst2.04) · ref/fog: depth · alpha: overall
// returns the projected you/your slots (dashed rings are drawn by the caller in 2D)
export function constellation(ctx, G, { arrive, pull = () => 0, ref, fog, alpha = 1 }) {
  const { t } = ctx;
  const P = (n) => { const k = pull(n); return n.p.map((x) => x * (1 - k)); };
  for (const e of G.edges) {
    const ta = arrive(e.i);
    if (t < ta) continue;
    const A = G.nodes.get(e.a), B = G.nodes.get(e.b), pa = P(A), pb = P(B);
    const fin = smoothstep(ta, ta + 0.12, t), toYou = B.you || A.you;
    const flash = decay(Math.max(0, t - ta) / 0.35, 3);
    // you is gone: lines to where it sat are grey
    const col = toYou ? COLOR.faint : mix3(COLOR.me, COLOR.warm, 0.25 * flash);
    ctx.line([pa, pb], { color: col, width: 0.7 + 9 * e.w, alpha: alpha * fin * clamp(0.1 + 1.4 * Math.sqrt(e.w) + 0.4 * flash), glow: 2 + 6 * e.w, glowStrength: 0.25, persp: ref, fog, intensity: 0.85 });
    // the value travels from the word attended to the word attending (0.35 s)
    const u = (t - ta) / 0.35;
    if (u < 1) ctx.point3D(pb.map((x, d) => x + (pa[d] - x) * u), 2.4, { fill: COLOR.warm, glow: 6, alpha: alpha * 0.8 * Math.sin(Math.PI * u), ref, fog });
  }
  const slots = [];
  for (const n of G.nodes.values()) {
    const ta = arrive(n.first);
    if (t < ta) continue;
    const p = P(n), a = alpha * smoothstep(ta, ta + 0.1, t);
    if (n.you) { slots.push({ word: n.word, s: ctx.project(p), a }); continue; }
    // the node flashes each time its word is sung again in the replay (the latest of its tokens to have arrived)
    let last = ta;
    for (const i of n.tokens) { const ti = arrive(i); if (ti <= t) last = ti; else break; }
    // drawn into the spark (inst2.04) the nodes warm up and lose their glow: they never pile up into a white blob
    const fl = decay((t - last) / 0.3, 3), pk = pull(n);
    ctx.point3D(p, (1.6 + 0.9 * Math.sqrt(n.count)) * (1 + 0.5 * fl), { fill: mix3(mix3(COLOR.ink2, COLOR.dim, 0.5), COLOR.warm, Math.max(fl, pk)), glow: (2 + 5 * fl) * (1 - pk), alpha: a * 0.8 * (1 - 0.5 * pk), ref, fog });
  }
  return slots;
}

// dashed rings where you and your sat (as in c2x)
export function youSlots(ctx, slots, { r = 12 } = {}) {
  for (const { s: [x, y, w], a } of slots) {
    if (w <= 0.2) continue;
    ctx.line(Array.from({ length: 33 }, (_, j) => [x + r * Math.cos((j / 32) * Math.PI * 2), y + r * Math.sin((j / 32) * Math.PI * 2)]), { color: COLOR.faint, width: 1.4, alpha: 0.9 * a, dash: 4, gap: 4 });
  }
}
