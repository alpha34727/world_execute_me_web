// Contract checks for analysis/out — the timing foundation every shot depends on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { SECTIONS, SONG_FRAMES, FPS, PREROLL, TOTAL_FRAMES } from '../src/sections.js';

const OUT = 'analysis/out/';
const json = (f) => JSON.parse(readFileSync(OUT + f, 'utf8'));
const T = json('timing.json');
const SONG_END = SONG_FRAMES / FPS;

test('film constants agree with src/sections.js', () => {
  assert.equal(T.film.fps, FPS);
  assert.equal(T.film.preroll, PREROLL);
  assert.equal(T.film.total_frames, TOTAL_FRAMES);
  assert.equal(T.film.song_frames, SONG_FRAMES);
  assert.ok(T.audio.music_end < SONG_END, 'film must not cut into the music');
});

test('beat grid is a fixed ~130 BPM grid with bars every 4 beats', () => {
  const { period, t0, bpm } = T.grid;
  assert.ok(bpm > 129.9 && bpm < 130.1, `bpm ${bpm}`);
  T.beats.forEach((b, k) => assert.ok(Math.abs(b - (t0 + k * period)) < 1e-4, `beat ${k}`));
  assert.deepEqual(T.bars, T.beats.filter((_, k) => k % 4 === 0));
  assert.ok(T.beats.at(-1) <= SONG_END);
});

test('sections: all 16 in order, contiguous from 0 to the song end, on bar lines', () => {
  assert.deepEqual(T.sections.map((s) => s.id), SECTIONS);
  assert.equal(T.sections[0].start, 0);
  for (let i = 1; i < T.sections.length; i++) {
    const s = T.sections[i];
    assert.ok(Math.abs(s.start - T.sections[i - 1].end) < 1e-6, `${s.id} not contiguous`);
    assert.ok(Math.abs(s.start - T.bars[s.bar_start]) < 1e-4, `${s.id} not on bar ${s.bar_start}`);
    assert.ok(s.note && s.note.length > 10, `${s.id} needs a note`);
  }
  assert.ok(Math.abs(T.sections.at(-1).end - SONG_END) < 1e-4);
});

test('lyrics: word-level, ordered, inside the song, keywords hand-verified', () => {
  assert.equal(T.lines.length, 129);
  let prev = -1;
  for (const l of T.lines) {
    assert.ok(SECTIONS.includes(l.section), `line ${l.i} section`);
    assert.ok(l.words.length > 0);
    for (const w of l.words) {
      assert.ok(w.start > prev, `line ${l.i} "${w.text}" not after previous word`);
      assert.ok(w.end > w.start, `line ${l.i} "${w.text}" end <= start`);
      assert.ok(w.start >= 0 && w.end <= SONG_END, `line ${l.i} "${w.text}" outside song`);
      if (w.attack !== undefined) assert.ok(w.attack < w.start && w.start - w.attack <= 0.2);
      if (l.keyword) assert.equal(w.verified, true, `keyword ${w.text} (line ${l.i}) not verified`);
      prev = w.start;
    }
  }
  const kw = T.lines.filter((l) => l.keyword).flatMap((l) => l.words);
  assert.equal(kw.length, 51);
});

test('onsets.json: sorted drum and vocal onsets with strength 0..1', () => {
  const O = json('onsets.json');
  for (const stem of ['drums', 'vocals']) {
    assert.ok(O[stem].length > 100, stem);
    O[stem].forEach((o, i) => {
      assert.ok(o.s >= 0 && o.s <= 1);
      if (i) assert.ok(o.t > O[stem][i - 1].t, `${stem} onset ${i} not sorted`);
    });
  }
});

test('features.f32 matches features.json and is normalised to 0..1', () => {
  const F = json('features.json');
  assert.equal(F.fps, 60);
  assert.equal(F.channels.length, 25);
  assert.deepEqual(F.channels.slice(0, 9),
    ['rms', 'rms_drums', 'rms_bass', 'rms_vocals', 'rms_other', 'onset', 'onset_drums', 'centroid', 'flux']);
  assert.ok(F.rows >= SONG_FRAMES);
  assert.equal(statSync(OUT + F.file).size, F.rows * F.channels.length * 4);
  const buf = readFileSync(OUT + F.file);
  const data = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  let min = Infinity, max = -Infinity;
  for (const v of data) { if (v < min) min = v; if (v > max) max = v; }
  assert.ok(min >= 0 && max <= 1, `range ${min}..${max}`);
});
