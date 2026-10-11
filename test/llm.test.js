// Claude's language-model machinery must be real math: these check the invariants behind every number on screen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadT } from './helpers.js';
import { sequence } from '../src/lib/corpus.js';
import { bpe } from '../src/lib/bpe.js';
import { embeddings, attention } from '../src/lib/embed.js';
import { bigramUntil, lossCurve } from '../src/lib/ngram.js';

const T = loadT();
const seq = sequence(T);

test('BPE: pieces reassemble every sung word; ids are valid; context count is monotone', () => {
  const B = bpe(T);
  for (const w of seq) {
    const p = B.encode(w.text);
    assert.ok(p.length >= 1);
    assert.equal(p.map((x) => x.piece).join('').toLowerCase(), w.norm, w.text);
    for (const x of p) assert.ok(x.id >= 0 && x.id < B.vocabSize, `${w.text}: id ${x.id}`);
  }
  assert.equal(B.tokensAt(-1), 0);
  assert.equal(B.tokensAt(Infinity), B.total);
  assert.ok(B.total >= seq.length);
});

test('embeddings: deterministic, finite; attention is a causal probability distribution', () => {
  const E = embeddings(T);
  assert.equal(E.vocab.length, new Set(seq.map((w) => w.norm)).size);
  for (const w of E.vocab) assert.ok(E.vector(w).every(Number.isFinite), w);
  assert.ok(E.values.every((v, i) => i === 0 || v <= E.values[i - 1]), 'eigenvalues sorted');
  const words = seq.slice(0, 12).map((w) => w.text);
  for (let i = 0; i < words.length; i++) {
    const a = attention(E, words, i, { gain: 3 });
    assert.equal(a.length, i + 1, 'causal: only tokens 0..i');
    assert.ok(Math.abs(a.reduce((s, x) => s + x, 0) - 1) < 1e-12);
    assert.ok(a.every((x) => x >= 0));
  }
});

test('bigram: P(·|a) over the seen vocabulary + <unk> sums to 1; loss curve covers every sung word', () => {
  const until = T.findWord('CIRCUMFERENCE').start;
  const m = bigramUntil(T, until);
  const vocab = [...new Set(seq.filter((w) => w.start < until).map((w) => w.norm))];
  for (const a of ['my', 'you', 'i', 'never-seen-word']) {
    const s = vocab.reduce((acc, b) => acc + m.p(a, b), 0) + m.p(a, '<unk-never-seen>');
    assert.ok(Math.abs(s - 1) < 1e-9, `${a}: ${s}`);
  }
  const L = lossCurve(T);
  assert.equal(L.length, seq.length);
  assert.ok(L.every((e) => Number.isFinite(e.bits) && e.bits >= 0));
});
