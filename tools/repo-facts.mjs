// Facts about this repo that the bridge puts on screen, gathered in Node at build time (vite.config.js serves them as
// `virtual:repo-facts`): the real source of the files it shows, the real line of the rule me tries to delete, and the
// real error (message + stack) that the timeline validator throws at me's illegal call. Paths are repo-relative and
// the stack keeps only this repo's frames, so the player and the render show exactly the same text.
// love (13 love): whether love.md exists (me tries to Read it), and the repo's top level (tracked files) it looks in.
//   node tools/repo-facts.mjs   prints them
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, relative, sep, basename } from 'node:path';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const SHOWN = ['src/lib/spark.js', 'src/engine/timeline.js'];
export const WATCH = [...SHOWN, 'src/ch/bridge/illegal.js', 'test/timeline.test.js', 'tools/repo-facts.mjs']; // love.md is not watched: it does not exist (Vite cannot watch a missing file)

const rel = (p) => relative(ROOT, p).split(sep).join('/');
// "    at fn (file:///C:/…/src/engine/timeline.js:107:15)" -> { fn, file: 'src/engine/timeline.js', line, col }
function frames(stack) {
  const out = [];
  for (const l of stack.split('\n').slice(1)) {
    const m = /^\s*at (?:(.+?) \()?(file:\/\/\/.+?|[A-Za-z]:\\.+?):(\d+):(\d+)\)?$/.exec(l);
    if (!m) continue;
    const path = m[2].startsWith('file:') ? fileURLToPath(m[2]) : m[2];
    const file = rel(path);
    if (file.startsWith('..') || file.startsWith('node_modules')) continue;
    out.push({ fn: m[1] ?? '<anonymous>', file, line: +m[3], col: +m[4] });
  }
  return out;
}

export async function repoFacts() {
  const { loadT } = await import(pathToFileURL(resolve(ROOT, 'test/helpers.js')).href);
  const { illegalCall, callText } = await import(pathToFileURL(resolve(ROOT, 'src/ch/bridge/illegal.js')).href);
  const cwd = process.cwd();
  process.chdir(ROOT); // loadT reads analysis/out relative to the repo
  let T;
  try { T = loadT(); } finally { process.chdir(cwd); }
  const files = Object.fromEntries(SHOWN.map((f) => [f, readFileSync(resolve(ROOT, f), 'utf8').replace(/\r\n/g, '\n').split('\n')]));
  // the rule me tries to delete: the bare-seconds check of the validator
  const tl = files['src/engine/timeline.js'];
  const ri = tl.findIndex((l) => l.includes('no bare seconds'));
  // the bridge's own shots go into the call, as me would pass them
  const bridge = (await import(pathToFileURL(resolve(ROOT, 'src/ch/09_bridge.js')).href)).default;
  const e = illegalCall(T, bridge.shots);
  const [head, ...rest] = (e?.message ?? '').split('\n');
  // me's edit (challenge): the rule becomes `return v`. Its guard in test/timeline.test.js really runs against the
  // edited validator: the check on the test's bare-seconds line is replayed on a patched copy of timeline.js
  const edit = tl[ri].replace(/throw new Error\(.*\);/, 'return v;');
  const patched = tl.map((l, i) => (i === ri ? edit : l)).join('\n')
    .replace("from './transitions.js'", `from '${pathToFileURL(resolve(ROOT, 'src/engine/transitions.js')).href}'`);
  const P = await import(`data:text/javascript;base64,${Buffer.from(patched).toString('base64')}`);
  const tt = readFileSync(resolve(ROOT, 'test/timeline.test.js'), 'utf8').replace(/\r\n/g, '\n').split('\n');
  const gi = tt.findIndex((l) => l.includes('/no bare seconds/'));
  const ni = tt.slice(0, gi).findLastIndex((l) => /^test\('/.test(l));
  let thrown = null;
  try {
    P.buildTimeline(T, [{ id: 'intro', from: 3.2, shots: [{ id: 'a', at: () => 0, draw() {} }] }], { start: 0, end: T.section('intro').end });
  } catch (x) { thrown = x.message; }
  const guard = {
    file: 'test/timeline.test.js', line: gi + 1, text: tt[gi].trim(), name: /^test\('([^']+)'/.exec(tt[ni])[1],
    passes: thrown !== null && /no bare seconds/.test(thrown), thrown: thrown ? thrown.split('\n').slice(1).map((s) => s.trim()) : [],
  };
  // love.md, and the top level of the repo (what git tracks; untracked build output and the audio are not part of it)
  const lovePath = resolve(ROOT, 'love.md');
  let top;
  try { top = [...new Set(execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean).map((f) => f.split('/')[0]))]; }
  catch { top = readdirSync(ROOT).filter((f) => !['node_modules', 'renders', 'out', '.git'].includes(f) && !/\.(mp3|wav|flac)$/i.test(f)); }
  top.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const love = { file: 'love.md', root: basename(ROOT), exists: existsSync(lovePath), lines: existsSync(lovePath) ? readFileSync(lovePath, 'utf8').split('\n').length : 0, top };
  return {
    love,
    files,
    rule: { file: 'src/engine/timeline.js', line: ri + 1, text: tl[ri], edit },
    guard,
    illegal: { call: callText(T), name: e?.name ?? null, head, errors: rest.map((s) => s.trim()).filter(Boolean), stack: e ? frames(e.stack) : [] },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const f = await repoFacts();
  console.log(JSON.stringify({ ...f, files: Object.fromEntries(Object.entries(f.files).map(([k, v]) => [k, `${v.length} lines`])) }, null, 2));
}
