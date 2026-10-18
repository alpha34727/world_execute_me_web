// The context window as memory: every BPE token sung before /compact is a block in a heap, laid out in order like
// text (a row wraps at W). /compact frees every non-keyword block in place (lib/context.js, oldest first): what is
// left is a fragmented heap — the freed space is split into runs between the kept keyword blocks. Those runs are the
// FRAGMENTS (counted for real).
import { compaction } from '../../lib/context.js';

export const W = 8.4, ROW = 0.32, BH = 0.17;
const width = (piece) => 0.055 * piece.length + 0.05;

const cache = new WeakMap();
// { blocks: [{ x, y, w, piece, keyword, drop }], rows, free runs (fragments), freed tokens }
export function heap(T) {
  if (cache.has(T)) return cache.get(T);
  const c = compaction(T);
  const blocks = [];
  let x = 0, row = 0;
  for (const k of c.tokens) {
    const w = width(k.piece);
    if (x + w > W) { x = 0; row++; }
    blocks.push({ x: x - W / 2, row, w, piece: k.piece, keyword: k.keyword, drop: k.drop, word: k.word });
    x += w + 0.06;
  }
  const rows = row + 1;
  blocks.forEach((b) => { b.y = ((rows - 1) / 2 - b.row) * ROW; });
  // fragments: maximal runs of freed blocks between kept ones
  const runList = [];
  blocks.forEach((b, i) => {
    if (b.keyword) return;
    if (i === 0 || blocks[i - 1].keyword) runList.push({ a: i, b: i }); else runList.at(-1).b = i;
  });
  const h = { blocks, rows, runs: runList.length, runList, freed: c.dropped, kept: c.kept };
  cache.set(T, h);
  return h;
}
