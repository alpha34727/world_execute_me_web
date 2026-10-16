import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline } from '../src/engine/timeline.js';
import { SECTIONS } from '../src/sections.js';
import { loadT, loadChapterSet, spanOf } from './helpers.js';

const T = loadT();
const noop = () => {};
const sh = (id, at, extra = {}) => ({ id, at, draw: noop, ...extra });

test('T helpers resolve music-locked times', () => {
  assert.ok(Math.abs(T.barTime(16) - T.section('v1').start) < 1e-6);
  assert.ok(Math.abs(T.beatTime(T.beatAt(42.5)) - 42.5) < 1e-9);
  assert.equal(T.findWord('DIMENSION').text, 'DIMENSION');
  assert.ok(T.findWord('DIMENSION').verified);
  assert.equal(T.findLine("If I'm a circle").section, 'v1');
  assert.equal(T.findWord('EXECUTION', 13).text, 'EXECUTION');
  assert.throws(() => T.findWord('NOPE'));
  assert.throws(() => T.section('nope'));
  const d = T.onsetNear('drums', T.beatTime(128), 0.05);
  assert.ok(d !== null && Math.abs(d - T.beatTime(128)) < 0.05);
  assert.equal(T.frameOf(0), 300);
  assert.equal(T.timeOfFrame(300), 0);
  // a cut one frame early lands on the frame before the hit
  const w = T.findWord('PROTECTION');
  assert.equal(T.frameOf(T.cut(w.start)), T.frameOf(w.start) - 1);
});

test('valid synthetic timeline: coverage, at(t), transitions', () => {
  const tl = buildTimeline(T, [
    { id: 'intro', shots: [sh('a', (T) => 0), sh('b', (T) => T.barTime(4), { transitionIn: { type: 'whip' } })] },
    { id: 'inst1', shots: [sh('c', (T) => T.section('inst1').start, { transitionIn: { type: 'xfade', beats: 1 } })] },
  ], { start: 0, end: T.section('inst1').end });
  assert.equal(tl.shots.length, 3);
  assert.equal(tl.shots[0].start, 0);
  assert.equal(tl.at(1).a.id, 'a');
  assert.equal(tl.at(1).b, null);
  const whip = tl.shots[1];
  const mid = tl.at(whip.start);
  assert.equal(mid.a.id, 'a');
  assert.equal(mid.b.id, 'b');
  assert.ok(Math.abs(mid.p - 0.5) < 1e-6);
  assert.equal(tl.at(whip.winEnd + 0.001).b, null);
  assert.equal(tl.at(whip.winEnd + 0.001).a.id, 'b');
  assert.equal(tl.at(T.section('inst1').start + T.beats(0.25)).b.id, 'c');
});

test('invalid timelines are rejected with specific errors', () => {
  const bad = (chs, re, span = { start: 0, end: T.section('intro').end }) =>
    assert.throws(() => buildTimeline(T, chs, span), (e) => re.test(e.message));
  bad([{ id: 'intro', shots: [sh('a', (T) => T.beatTime(1))] }], /first shot starts/);
  bad([{ id: 'intro', shots: [sh('a', (T) => 0), sh('b', (T) => 0)] }], /overlap/);
  bad([{ id: 'intro', shots: [sh('a', (T) => 0), sh('b', (T) => T.barTime(9))] }], /outside chapter/);
  bad([{ id: 'intro', shots: [sh('a', (T) => 0), sh('a', (T) => T.barTime(2))] }], /duplicate shot id/);
  bad([{ id: 'intro', shots: [sh('a', (T) => 0)] }], /timeline ends/, { start: 0, end: T.songEnd });
  bad([{ id: 'intro', from: 3.2, shots: [sh('a', (T) => 0)] }], /no bare seconds/);
  bad([{ id: 'intro', shots: [sh('a', (T) => 0), sh('b', (T) => T.beatTime(0.1), { transitionIn: { type: 'xfade', beats: 4 } })] }], /window/);
  bad([{ id: 'intro', shots: [sh('a', (T) => 0), sh('b', (T) => T.barTime(1), { transitionIn: { type: 'spin' } })] }], /unknown transition/);
  bad([{ id: 'intro', shots: [sh('a', (T) => 0)] }, { id: 'v1', shots: [sh('b', (T) => T.section('v1').start)] }],
    /not contiguous/, { start: 0, end: T.section('v1').end });
});

for (const set of ['film', 'test']) {
  test(`chapter set "${set}": no overlap, in bounds, starts at its span start`, async (t) => {
    const defs = await loadChapterSet(set);
    if (!defs.length) return t.skip(`no ${set} chapters yet`);
    const span = spanOf(set, T, defs);
    const tl = buildTimeline(T, defs, span);
    assert.equal(tl.shots[0].start, span.start);
    if (set === 'film') assert.equal(tl.shots[0].start, 0);
    for (const s of tl.shots) assert.ok(s.end > s.start, s.key);
  });
}

test('film covers the whole song (all 16 chapters, in order)', async (t) => {
  const defs = await loadChapterSet('film');
  if (defs.length < SECTIONS.length) return t.todo(`${defs.length}/${SECTIONS.length} chapters built`);
  assert.deepEqual(defs.map((d) => d.id), SECTIONS);
  assert.equal(spanOf('film', T, defs).end, T.songEnd);
});
