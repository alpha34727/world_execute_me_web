// Chapter ids in film order. Single source of truth for src/ch/NN_<id>.js naming,
// tools argument validation and tests. Boundaries come from analysis/out/timing.json.
export const SECTIONS = [
  'intro', 'inst1', 'v1', 'pre1', 'c1', 'v2', 'pre2', 'c2',
  'c2x', 'bridge', 'inst2', 'chant', 'c3', 'love', 'outro', 'end',
];

export const FPS = 60;
export const PREROLL = 5;            // seconds of photosensitivity warning before the song
export const TOTAL_FRAMES = 13015;   // PREROLL*FPS + song frames
export const SONG_FRAMES = TOTAL_FRAMES - PREROLL * FPS;
export const LEAD = 1 / FPS;         // cuts land one frame before the hit
export const DESIGN = { W: 1920, H: 1080 };

export const chapterFile = (id) => `${String(SECTIONS.indexOf(id)).padStart(2, '0')}_${id}.js`;
