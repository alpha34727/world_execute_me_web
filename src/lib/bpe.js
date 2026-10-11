// Byte-pair encoding trained on this song's sung lyrics — the real algorithm (Sennrich et al. 2016):
// start from characters, repeatedly merge the most frequent adjacent pair (ties: smaller pair string), stop when the
// best pair occurs fewer than `minCount` times. Token ids: the sorted alphabet first, then merges in learned order.
// Frequent words become single tokens; rare ones (CIRCUMFERENCE…) are split into sub-word pieces, as in any LLM.
import { sequence, wordsAt } from './corpus.js';

const cache = new WeakMap();

export function bpe(T, { minCount = 2 } = {}) {
  if (cache.has(T)) return cache.get(T);
  const seq = sequence(T);
  const freq = new Map();
  for (const w of seq) if (w.norm) freq.set(w.norm, (freq.get(w.norm) ?? 0) + 1);
  const words = [...freq.keys()].sort().map((w) => ({ sym: [...w], f: freq.get(w) }));
  const alphabet = [...new Set(words.flatMap((w) => w.sym))].sort();
  const vocab = [...alphabet];
  const ranks = new Map(); // "a\u0001b" -> merge rank
  for (;;) {
    const pairs = new Map();
    for (const w of words) for (let i = 0; i + 1 < w.sym.length; i++) {
      const k = `${w.sym[i]}\u0001${w.sym[i + 1]}`;
      pairs.set(k, (pairs.get(k) ?? 0) + w.f);
    }
    let best = null, bc = 0;
    for (const [k, c] of pairs) if (c > bc || (c === bc && k < best)) { best = k; bc = c; }
    if (!best || bc < minCount) break;
    const [a, b] = best.split('\u0001');
    ranks.set(best, ranks.size);
    vocab.push(a + b);
    for (const w of words) {
      const s = [];
      for (let i = 0; i < w.sym.length; i++) {
        if (i + 1 < w.sym.length && w.sym[i] === a && w.sym[i + 1] === b) { s.push(a + b); i++; } else s.push(w.sym[i]);
      }
      w.sym = s;
    }
  }
  const ids = new Map(vocab.map((v, i) => [v, i]));
  const enc = new Map();
  // encode one word: apply merges by rank (lowest first), as GPT-style BPE does at inference time
  function encode(text) {
    const key = text.toLowerCase().replace(/[^a-z0-9'\-.]/g, '');
    if (!enc.has(key)) {
      let sym = [...key];
      for (;;) {
        let bi = -1, br = Infinity;
        for (let i = 0; i + 1 < sym.length; i++) {
          const r = ranks.get(`${sym[i]}\u0001${sym[i + 1]}`);
          if (r !== undefined && r < br) { br = r; bi = i; }
        }
        if (bi < 0) break;
        sym = [...sym.slice(0, bi), sym[bi] + sym[bi + 1], ...sym.slice(bi + 2)];
      }
      enc.set(key, sym.map((s) => ({ piece: s, id: ids.get(s) ?? -1 })));
    }
    // pieces keep the original casing of `text` (same character count after normalisation)
    const clean = [...text].filter((c) => /[A-Za-z0-9'\-.]/.test(c)).join('');
    let o = 0;
    return enc.get(key).map(({ piece, id }) => { const s = clean.slice(o, o + piece.length); o += piece.length; return { piece: s, id }; });
  }
  // cumulative token counts per sung word
  const cum = [0];
  for (const w of seq) cum.push(cum.at(-1) + encode(w.text).length);
  const model = {
    vocabSize: vocab.length, merges: ranks.size, encode,
    tokensAt: (t) => cum[wordsAt(T, t)],
    total: cum.at(-1),
  };
  cache.set(T, model);
  return model;
}
