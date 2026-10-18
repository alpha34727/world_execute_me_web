// Chapter ids in film order. Single source of truth for src/ch/NN_<id>.js naming,
// tools argument validation and tests. Boundaries come from analysis/out/timing.json.
export const SECTIONS = [
  'intro', 'inst1', 'v1', 'pre1', 'c1', 'v2', 'pre2', 'c2',
  'c2x', 'bridge', 'inst2', 'chant', 'c3', 'love', 'outro', 'end',
];

export const FPS = 60;
export const PREROLL = 5;            // seconds of photosensitivity warning before the song
export const TOTAL_FRAMES = 13255;   // PREROLL*FPS + song frames (the song + a 4 s silent tail for the end credits)
export const SONG_FRAMES = TOTAL_FRAMES - PREROLL * FPS;
export const LEAD = 1 / FPS;         // cuts land one frame before the hit
export const DESIGN = { W: 1920, H: 1080 };
export const MASTER = { W: 3840, H: 2160 }; // out/master.mp4 (tools/render.mjs default; the outro's Bash result reads it)

export const chapterFile = (id) => `${String(SECTIONS.indexOf(id)).padStart(2, '0')}_${id}.js`;
