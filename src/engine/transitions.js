// Transition specs (pure data). The GPU side lives in gl/composite.js.
// A shot's transitionIn = { type, beats? | frames?, align?, ...params }. The window is centred on (or starts at)
// the cut: [cut - align*dur, cut + (1-align)*dur]. Durations are musical (beats) or visual (frames), never seconds.
import { FPS } from '../sections.js';

export const TRANSITIONS = {
  cut: { frames: 0, align: 0 },
  whip: { frames: 10, align: 0.5, dir: 1 }, // fast lateral whip with motion blur; dir 1 = content moves left
  glide: { beats: 0.5, align: 0.5, dir: 1, axis: 'x' }, // eased slide, light blur
  xfade: { beats: 1, align: 0.5 },
  points: { beats: 2, align: 0 }, // A disintegrates into particles that reassemble as B
};

export function resolveTransition(spec, T) {
  if (!spec) return { type: 'cut', dur: 0, align: 0 };
  const type = typeof spec === 'string' ? spec : spec.type;
  const base = TRANSITIONS[type];
  if (!base) throw new Error(`unknown transition "${type}" (known: ${Object.keys(TRANSITIONS).join(', ')})`);
  const s = { ...base, ...(typeof spec === 'object' ? spec : {}), type };
  let dur;
  if (spec.beats !== undefined) dur = T.beats(spec.beats);
  else if (spec.frames !== undefined) dur = spec.frames / FPS;
  else if (base.beats !== undefined) dur = T.beats(base.beats);
  else dur = base.frames / FPS;
  return { ...s, dur, align: s.align ?? 0.5 };
}
