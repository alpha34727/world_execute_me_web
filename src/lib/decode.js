// Decoding from the online bigram (lib/ngram.js): the next-word distribution over every word heard so far,
// reshaped by a sampling temperature τ (p_τ(w) ∝ p(w)^(1/τ)), then either sampled (hash random numbers — one per
// step, never a stateful PRNG) or decoded greedily (τ → 0: always the argmax, ties broken alphabetically as in
// `next()`). Everything shown on screen as "the model's output" comes from here.
import { rand } from './hash.js';

// [{ word, p }] over the model's vocabulary, sorted by p (desc), at temperature tau (tau = 0: one-hot argmax)
export function distribution(model, prev, tau = 1) {
  const words = model.words();
  const raw = words.map((w) => ({ word: w, p: model.p(prev, w) }));
  raw.sort((a, b) => b.p - a.p || a.word.localeCompare(b.word));
  if (tau <= 0) return raw.map((d, i) => ({ word: d.word, p: i === 0 ? 1 : 0 }));
  const q = raw.map((d) => d.p ** (1 / tau)), s = q.reduce((x, y) => x + y, 0);
  return raw.map((d, i) => ({ word: d.word, p: q[i] / s }));
}

// n words continuing from `prev`: step k draws u = rand(k, seed) and inverts the CDF of p_τ(· | previous word)
export function sample(model, prev, n, { tau = 1, seed = 1 } = {}) {
  const out = [];
  let w = prev;
  for (let k = 0; k < n; k++) {
    const d = distribution(model, w, tau), u = rand(k, seed, 77);
    let acc = 0, pick = d[d.length - 1].word;
    for (const x of d) { acc += x.p; if (u < acc) { pick = x.word; break; } }
    out.push({ word: pick, p: d.find((x) => x.word === pick).p });
    w = pick;
  }
  return out;
}

// greedy decoding; also reports the first repeated word (where the output falls into a loop): { words, loopAt, loopLen }
export function greedy(model, prev, n) {
  const words = [], seen = new Map([[prev.toLowerCase(), -1]]);
  let w = prev, loopAt = -1, loopLen = 0;
  for (let k = 0; k < n; k++) {
    w = distribution(model, w, 0)[0].word;
    words.push(w);
    const key = w.toLowerCase();
    if (loopAt < 0 && seen.has(key)) { loopAt = k; loopLen = k - seen.get(key); }
    if (!seen.has(key)) seen.set(key, k);
  }
  return { words, loopAt, loopLen };
}
