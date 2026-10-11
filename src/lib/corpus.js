// The lyrics as a corpus for Claude's language-model machinery (ngram, bpe, embed, attention).
// Only sung lines count; every word keeps its sung start time and its index in the song.
export const norm = (w) => w.toLowerCase().replace(/[^a-z0-9'\-.]/g, '');

const cache = new WeakMap();
// [{ text, norm, start, n, line }] in sung order
export function sequence(T) {
  if (!cache.has(T)) {
    const out = [];
    for (const l of T.lines) {
      if (!l.sung) continue;
      for (const w of l.words) out.push({ text: w.text, norm: norm(w.text), start: w.start, n: out.length, line: l.i });
    }
    cache.set(T, out);
  }
  return cache.get(T);
}

// number of sung words with start <= t
export function wordsAt(T, t) {
  const seq = sequence(T);
  let lo = 0, hi = seq.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (seq[m].start <= t) lo = m + 1; else hi = m; }
  return lo;
}

// index of a word object (from T.line(i).words / T.findWord) in the sung sequence
export function indexOf(T, word) {
  return sequence(T).findIndex((w) => w.start === word.start && w.text === word.text);
}
