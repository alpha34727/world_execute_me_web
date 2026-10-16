// Colour semantics — Claude's palette (Anthropic brand colours). Colour tells the me/you story; never use
// ad-hoc colours in shots.
//   me  = the program being executed = Claude          -> Claude orange  #d97757
//   you = the person on the other side of the screen   -> blue           #6a9bcc
// Display-referred RGB in 0..1. Values > 1 (via `intensity`) are allowed for bloom.
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

export const HEX = {
  me: '#d97757',        // Claude orange
  you: '#6a9bcc',       // blue
  growth: '#788c5d',    // green (nutrients, life)
  love: '#e3889a',      // rose — warm tint of the orange family
  warm: '#d4a27f',      // kraft / gold
  error: '#c9503f',     // corruption (brand error red, brightened for glow)
  ink: '#faf9f5',       // primary text / light
  ink2: '#e8e6dc',      // secondary text
  dim: '#b0aea5',       // HUD labels
  faint: '#5e5d59',     // rules, grids, inactive HUD
  bg: '#141413',        // Claude dark
  bg2: '#1f1e1d',       // raised surfaces
  paper: '#faf9f5',     // engineering-drawing interlude
  paperInk: '#141413',
};

// as 0..1 RGB for drawing
export const COLOR = Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, hex(v)]));

// Font faces (SIL OFL, loaded from @fontsource). base = SDF raster size in px (bigger for display type).
export const FONT = {
  mono: { family: 'JetBrains Mono', weight: 400, base: 64 },
  monoBold: { family: 'JetBrains Mono', weight: 700, base: 64 },
  display: { family: 'Space Grotesk', weight: 700, base: 128 },
  displayMed: { family: 'Space Grotesk', weight: 500, base: 128 },
  zh: { family: 'Noto Sans TC', weight: 400, base: 64 },
  zhBold: { family: 'Noto Sans TC', weight: 700, base: 96 },
};
