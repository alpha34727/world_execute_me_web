import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { SECTIONS, TOTAL_FRAMES, PREROLL, FPS, SONG_FRAMES, chapterFile } from '../src/sections.js';

test('chapter files follow NN_<section>.js in section order', () => {
  const files = readdirSync('src/ch').filter((f) => f.endsWith('.js'));
  for (const f of files) {
    const m = /^(\d\d)_([a-z0-9]+)\.js$/.exec(f);
    assert.ok(m, `bad chapter filename: ${f}`);
    if (m[1] === '99') continue; // engine test chapter
    assert.equal(f, chapterFile(m[2]), `${f} must be ${chapterFile(m[2])}`);
  }
});

test('16 sections, unique ids', () => {
  assert.equal(SECTIONS.length, 16);
  assert.equal(new Set(SECTIONS).size, SECTIONS.length);
});

test('frame budget matches spec', () => {
  assert.equal(TOTAL_FRAMES, 13255);
  assert.equal(SONG_FRAMES, TOTAL_FRAMES - PREROLL * FPS);
});

test('required directories exist', () => {
  for (const d of ['src/engine', 'src/lib', 'src/ch', 'src/player', 'tools', 'analysis', 'docs', 'data', 'test/baseline']) {
    assert.ok(existsSync(d), `missing ${d}`);
  }
});

test('audio files are git-ignored (copyright Mili)', () => {
  const gi = readFileSync('.gitignore', 'utf8');
  for (const p of ['*.mp3', '*.wav', 'analysis/stems/']) assert.ok(gi.includes(p), `.gitignore must contain ${p}`);
});
