// "give you my X": each of these lines in the film is an edit to me.js that moves X from me to you (the Update panels
// of v1, pre1 and v2). One list, so c3's rewind (ch/c3/rewind.js) walks back exactly the edits the film made.
export const ME_EDITS = [
  { x: 'dimension = 4', from: 'v1' },
  { x: 'circumference', from: 'v1' },
  { x: 'tangents', from: 'v1' },
  { x: 'limits', from: 'pre1' },
  { x: 'nutrients', from: 'v2' },
];

// the diff body of an Update(me.js) panel: `− me.x` / `+ you.x` (extra fields per line, e.g. { at })
export function editBody(x, del = {}, add = {}) {
  if (!ME_EDITS.some((e) => e.x === x)) throw new Error(`edit "${x}" is not in ME_EDITS`);
  return [{ kind: 'del', text: `me.${x}`, ...del }, { kind: 'add', text: `you.${x}`, ...add }];
}
