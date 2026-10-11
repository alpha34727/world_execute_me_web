// Every frame must be a pure function of t: forbid non-deterministic APIs on the render path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/engine', 'src/lib', 'src/ch', 'src/theme.js', 'src/sections.js'];
const FORBIDDEN = [/\bMath\.random\s*\(/, /\bDate\.now\s*\(/, /\bperformance\.now\s*\(/, /\bnew\s+Date\s*\(/];

function* files(p) {
  if (!existsSync(p)) return;
  if (statSync(p).isFile()) { if (/\.(m?js|glsl)$/.test(p)) yield p; return; }
  for (const f of readdirSync(p)) yield* files(join(p, f));
}

test('render path uses no non-deterministic APIs', () => {
  const hits = [];
  for (const root of ROOTS) {
    for (const f of files(root)) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        for (const re of FORBIDDEN) if (re.test(line)) hits.push(`${f}:${i + 1}: ${line.trim()}`);
      });
    }
  }
  assert.deepEqual(hits, [], `non-deterministic API on render path:\n${hits.join('\n')}`);
});

test('shots take their times from T (no bare seconds in at/from/to)', () => {
  const bad = [];
  const re = /\b(at|from|to)\s*:\s*(\(?\s*T?\s*\)?\s*=>\s*)?-?\d+(\.\d+)?\s*[,}\n]/;
  for (const f of files('src/ch')) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => { if (re.test(line)) bad.push(`${f}:${i + 1}: ${line.trim()}`); });
  }
  assert.deepEqual(bad, [], `hard-coded times:\n${bad.join('\n')}`);
});
