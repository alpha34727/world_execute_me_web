// A real bigram language model trained ONLINE on this song's lyrics: at time t it has seen only the words already
// sung (Claude's context, literally). Witten–Bell smoothing: P(b|a) = (c(a,b) + T(a)·P₁(b)) / (c(a) + T(a)), where
// T(a) = number of distinct words seen after a, and the unigram P₁ is add-one over the vocabulary + one <unk> slot.
// Used for next-token prediction panels and the loss curve — every probability shown is computed here.
import { norm, sequence, wordsAt } from './corpus.js';

export { wordsAt as tokensAt };

class Bigram {
  constructor() { this.counts = new Map(); this.totals = new Map(); this.uni = new Map(); this.display = new Map(); this.N = 0; this.last = null; }
  get vocab() { return this.uni.size; }
  // unigram, add-one over the seen vocabulary plus one slot for "never seen"
  p1(b) { return ((this.uni.get(b) ?? 0) + 1) / (this.N + this.uni.size + 1); }
  p(prev, next) {
    const a = norm(prev), b = norm(next);
    const m = this.counts.get(a);
    if (!m) return this.p1(b);
    const c = this.totals.get(a), types = m.size;
    return ((m.get(b) ?? 0) + types * this.p1(b)) / (c + types);
  }
  add(text) {
    const b = norm(text);
    if (this.last !== null) {
      if (!this.counts.has(this.last)) this.counts.set(this.last, new Map());
      const m = this.counts.get(this.last);
      m.set(b, (m.get(b) ?? 0) + 1);
      this.totals.set(this.last, (this.totals.get(this.last) ?? 0) + 1);
    }
    this.uni.set(b, (this.uni.get(b) ?? 0) + 1);
    this.display.set(b, text);
    this.N++;
    this.last = b;
  }
}

// model trained on the words sung strictly before time `until`
export function bigramUntil(T, until) {
  const m = new Bigram();
  for (const w of sequence(T)) { if (w.start >= until) break; m.add(w.text); }
  return {
    tokens: m.N,
    vocab: m.vocab,
    p: (prev, next) => m.p(prev, next),
    seen: (w) => m.uni.has(norm(w)),
    // every word heard so far (display spelling), in order of first appearance — the support for sampling
    words: () => [...m.uni.keys()].map((w) => m.display.get(w)),
    // top-k continuations of prev that were actually observed: [{ word, p, count }]
    next(prev, k = 4) {
      const c = m.counts.get(norm(prev));
      if (!c) return [];
      return [...c.entries()].map(([w, n]) => ({ word: m.display.get(w), count: n, p: m.p(prev, w) }))
        .sort((x, y) => y.p - x.p || x.word.localeCompare(y.word)).slice(0, k);
    },
  };
}

// Prequential (online) log-loss: every sung word is scored by the model trained on the words before it, then learned.
// [{ start, bits, avg }] where avg is the mean surprisal over the last `win` words — the song's training curve.
const lossCache = new WeakMap();
export function lossCurve(T, { win = 24 } = {}) {
  if (lossCache.has(T)) return lossCache.get(T);
  const m = new Bigram();
  const out = [];
  for (const w of sequence(T)) {
    const bits = -Math.log2(m.last === null ? m.p1(w.norm) : m.p(m.last, w.text));
    m.add(w.text);
    const i = out.length, lo = Math.max(0, i - win + 1);
    let s = bits;
    for (let j = lo; j < i; j++) s += out[j].bits;
    out.push({ start: w.start, bits, avg: s / (i - lo + 1) });
  }
  lossCache.set(T, out);
  return out;
}
