import { SECTIONS } from '../../src/sections.js';

export function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      opt[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
    } else pos.push(a);
  }
  return { pos, opt };
}

export function requireChapter(tool, id) {
  if (!id) fail(`usage: npm run ${tool} -- <chapter>\nchapters: ${SECTIONS.join(', ')}`);
  if (!SECTIONS.includes(id) && id !== 'test' && id !== 'warning') fail(`unknown chapter "${id}"\nchapters: ${SECTIONS.join(', ')}`);
  return id;
}

export function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

export function notYet(tool) {
  fail(`${tool}: not implemented yet — built in phase 2 (see docs/progress.md)`, 2);
}
