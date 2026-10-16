// The plan for verse 2 (Claude Code's todo list). v2 opens it; pre2 shows it again with every item done (on v2's
// last keyword the hero is the one thing to read, so the completed list waits for the next chapter's downbeat).
export const PLAN = ['NUTRIENTS', 'ANTIOXIDANTS', 'ENJOYMENT', 'EXISTENCE'];
// the completed plan, as a transcript entry: appears at `at`, EXISTENCE is ticked half a beat later
export function donePlan(T, at, until) {
  const kw = (k) => T.findWord(k, 0, 'v2').start;
  return { kind: 'todo', at, until, items: PLAN.map((k) => ({ text: k, done: k === 'EXISTENCE' ? at + T.beats(0.5) : kw(k), at })) };
}
