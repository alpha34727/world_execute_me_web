// "You have made some ILLEGAL ARGUMENTS": me rewrites its own chapter to start where the breakdown is over — at a
// bare number of seconds (inst2's start, rounded as a person would type it), the one thing CLAUDE.md forbids. The
// real validator (engine/timeline.js buildTimeline) rejects the call; the bridge shows the error it really throws.
// Called in Node at build time by tools/repo-facts.mjs (so the stack trace is the same in the player and the render).
import { buildTimeline } from '../../engine/timeline.js';

// the number me types: where it wants to be
export const seconds = (T) => Number(T.section('inst2').start.toFixed(2));
export const callText = (T) => `chapter({ id: 'bridge', from: ${seconds(T)}, shots })`;

// the call itself, exactly as typed; returns the Error buildTimeline throws (null if it were accepted)
export function illegalCall(T, shots) {
  const def = { id: 'bridge', shots };
  def.from = seconds(T);
  try {
    buildTimeline(T, [def], { start: T.section('bridge').start, end: T.section('bridge').end });
  } catch (e) {
    return e;
  }
  return null;
}
