// docs/storyboard.md: every shot start (T notation) must resolve against the analysis, stay inside its section and
// be strictly later than the previous shot. Keeps the storyboard honest when the analysis is re-run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { loadT } from './helpers.js';

test('storyboard shot starts resolve, in order, inside their sections', { skip: !existsSync('docs/storyboard.md') && 'no storyboard yet' }, () => {
  const T = loadT();
  /* eslint-disable no-unused-vars */
  const L = (s, n = 0, sec = null) => T.findLine(s, n, sec).words[0].start;
  const Ln = (i) => T.line(i).words[0].start, Lw = (i, j) => T.line(i).words[j].start;
  const W = (s, n = 0, sec = null) => T.findWord(s, n, sec).start;
  const sec = (id) => T.section(id).start, cut = (x) => T.cut(x);
  const bar = (k) => T.barTime(k), beat = (k) => T.beatTime(k), b = (n) => T.beats(n);
  const shots = [];
  for (const line of readFileSync('docs/storyboard.md', 'utf8').split('\n')) {
    const m = /^\| ([a-z0-9]+\.[^|]+?) \| `([^`]+)`(?:，k = (\d+)…(\d+))? \|/.exec(line);
    if (!m) continue;
    const [, id, expr, k0, k1] = m;
    const ks = k0 === undefined ? [null] : Array.from({ length: +k1 - +k0 + 1 }, (_, i) => +k0 + i);
    for (const k of ks) shots.push({ id: k === null ? id : `${id.split(' ')[0]}[k=${k}]`, t: eval(k === null ? expr : expr.replace(/\bk\b/g, k)) });
  }
  assert.ok(shots.length > 100, `parsed ${shots.length} shots`);
  assert.equal(shots[0].t, 0, 'first shot starts at 0');
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i], S = T.section(s.id.split('.')[0]);
    assert.ok(Number.isFinite(s.t), s.id);
    assert.ok(s.t >= S.start - T.beats(0.25) && s.t < S.end, `${s.id} @ ${s.t.toFixed(3)} outside its section`);
    if (i) assert.ok(s.t > shots[i - 1].t, `${s.id} not after ${shots[i - 1].id}`);
  }
});
