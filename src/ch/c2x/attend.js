// How much attention the word being sung pays to you: for every sung word from c2x on, the real causal attention
// (lib/embed.js, softmax(QKᵀ/√d), one untrained head) of that word over everything sung so far, summed over the
// "you" / "your" tokens of the context. Each "left" pays you less than the last; "me", "in" and ISOLATION pay none.
import { sequence } from '../../lib/corpus.js';
import { embeddings, attention } from '../../lib/embed.js';

const cache = new WeakMap();
const isYou = (w) => w === 'you' || w === 'your';

// [{ start, text, mass, youTokens }] for the words of c2x (and the first of the next section, as a sentinel)
export function attendYou(T) {
  if (cache.has(T)) return cache.get(T);
  const seq = sequence(T), E = embeddings(T), words = seq.map((w) => w.norm);
  const a = T.section('c2x').start - T.beats(0.5), b = T.section('c2x').end;
  const out = seq.filter((w) => w.start >= a && w.start < b).map((w) => {
    const att = attention(E, words, w.n);
    let mass = 0, n = 0;
    att.forEach((x, j) => { if (isYou(words[j])) { mass += x; n++; } });
    return { start: w.start, text: w.text, mass, youTokens: n };
  });
  cache.set(T, out);
  return out;
}

// the word sung last at t (null before the first)
export function wordNow(T, t) {
  let cur = null;
  for (const w of attendYou(T)) if (w.start <= t) cur = w;
  return cur;
}

// the mass shown at t: eased from the previous word's value to the new one over 0.15 beat
export function massAt(T, t) {
  const ws = attendYou(T);
  let i = -1;
  ws.forEach((w, j) => { if (w.start <= t) i = j; });
  if (i < 0) return 0;
  const prev = i > 0 ? ws[i - 1].mass : 0, k = Math.min(1, (t - ws[i].start) / T.beats(0.15));
  return prev + (ws[i].mass - prev) * (k * k * (3 - 2 * k));
}

export const massText = (m) => (m < 0.01 && m > 0 ? m.toFixed(3) : m.toFixed(2));
