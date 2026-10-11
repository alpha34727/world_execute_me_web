// Proves frame-exact sync of a rendered engine-test video (src/ch/99_test.js draws the markers):
//   1. BEAT square lit on exactly frameOf(beat) for every beat, WORD square on exactly frameOf(word.start)
//      for every hand-verified keyword — read back from the encoded video pixels.
//   2. The video's audio track is aligned with the original mp3 (cross-correlation lag, ms).
// usage: node tools/synccheck.mjs renders/test_2160.mp4
import { spawnSync } from 'node:child_process';
import { loadT, loadChapterSet, spanOf } from '../test/helpers.js';
import { SYNC } from '../src/ch/test/sync.js';
import { MP3 } from './render.mjs';

const video = process.argv[2] ?? 'renders/test_2160.mp4';
const T = loadT();
const defs = await loadChapterSet('test');
const span = spanOf('test', T, defs);
const from = T.frameOf(span.start);

const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_frames', '-of', 'json', video]).stdout).streams[0];
const W = probe.width, H = probe.height, s = W / 1920;
const n = +probe.nb_frames;

function patch([x, y, w, h]) {
  // inner 50% of the square, mean luma per frame
  const cx = Math.round((x + w * 0.25) * s), cy = Math.round((y + h * 0.25) * s), cw = Math.round(w * 0.5 * s), ch = Math.round(h * 0.5 * s);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', video, '-vf', `crop=${cw}:${ch}:${cx}:${cy},scale=1:1:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 28 });
  return [...r.stdout];
}

const beatLum = patch(SYNC.beat), wordLum = patch(SYNC.word);
const lit = (arr) => arr.map((v, i) => (v > 128 ? from + i : -1)).filter((f) => f >= 0);
const gotBeats = lit(beatLum), gotWords = lit(wordLum);
const lastFrame = from + n - 1;

const expBeats = [];
for (let k = Math.ceil(T.beatAt(span.start)); T.beatTime(k) < span.end; k++) {
  const f = T.frameOf(T.beatTime(k));
  if (f >= from && f <= lastFrame) expBeats.push(f);
}
const expWords = [];
for (const l of T.lines) for (const w of l.words) {
  const f = T.frameOf(w.start);
  if (w.verified && w.start >= span.start && f <= lastFrame) expWords.push({ f, text: w.text, t: w.start });
}

const cmp = (got, exp) => ({ ok: JSON.stringify(got) === JSON.stringify(exp), missing: exp.filter((f) => !got.includes(f)), extra: got.filter((f) => !exp.includes(f)) });
const rb = cmp(gotBeats, expBeats), rw = cmp(gotWords, expWords.map((w) => w.f));
console.log(`video ${video}: ${W}x${H}, ${n} frames, film frames ${from}..${lastFrame}`);
console.log(`BEAT  expected ${expBeats.length}, lit ${gotBeats.length}  -> ${rb.ok ? 'EXACT' : `MISMATCH missing ${rb.missing} extra ${rb.extra}`}`);
console.log(`WORD  expected ${expWords.map((w) => `${w.text}@f${w.f}`).join(', ')}  -> ${rw.ok ? 'EXACT' : `MISMATCH missing ${rw.missing} extra ${rw.extra}`}`);

// audio alignment: correlate the rendered track with the original mp3 at the same song time
const t0 = from / 60 - 5, dur = n / 60;
const pcm = (args) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', ...args, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
};
const a = pcm(['-i', video]);
const b = pcm(['-ss', String(Math.max(0, t0 - 0.25)), '-t', String(dur + 0.5), '-i', MP3]);
const off = Math.round(Math.min(0.25, t0) * 8000);
let best = -Infinity, lag = 0;
for (let L = -400; L <= 400; L++) {
  let acc = 0;
  for (let i = 4000; i < Math.min(a.length, 60000); i++) { const j = i + off + L; if (j >= 0 && j < b.length) acc += a[i] * b[j]; }
  if (acc > best) { best = acc; lag = L; }
}
const lagMs = (lag / 8000) * 1000;
console.log(`AUDIO lag vs original mp3: ${lagMs.toFixed(3)} ms (8 kHz resolution = 0.125 ms) -> ${Math.abs(lagMs) <= 1 ? 'ALIGNED' : 'OFFSET'}`);
process.exit(rb.ok && rw.ok && Math.abs(lagMs) <= 1 ? 0 : 1);
