import { defineConfig } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The player fetches analysis results and the translation at runtime; ship them with `vite build`.
const shipData = () => ({
  name: 'ship-analysis-data',
  closeBundle() {
    mkdirSync('dist/analysis/out', { recursive: true });
    for (const f of ['timing.json', 'onsets.json', 'features.json', 'features.f32']) cpSync(`analysis/out/${f}`, `dist/analysis/out/${f}`);
    mkdirSync('dist/data', { recursive: true });
    cpSync('data/zh.json', 'dist/data/zh.json');
  },
});

// The bridge shows this repo's real source and the real error the timeline validator throws at me's illegal call:
// gathered in Node (tools/repo-facts.mjs) and served as a module, so the player and the render show the same text.
const repoFacts = () => ({
  name: 'repo-facts',
  resolveId: (id) => (id === 'virtual:repo-facts' ? '\0virtual:repo-facts' : null),
  async load(id) {
    if (id !== '\0virtual:repo-facts') return null;
    const tool = await import(pathToFileURL(resolve('tools/repo-facts.mjs')).href);
    for (const f of tool.WATCH) this.addWatchFile(resolve(f));
    return `export default ${JSON.stringify(await tool.repoFacts())};`;
  },
});

// `vite build` uses relative URLs, so dist/ works from any path (GitHub Pages serves it under /<repo>/)
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  server: { fs: { allow: ['.'] } },
  build: {
    target: 'es2022', chunkSizeWarningLimit: 1500,
    // three in one chunk of its own: split between the entry and a chapter chunk, its modules ran out of order
    rollupOptions: { output: { manualChunks: (id) => (id.includes('/node_modules/three/') ? 'three' : undefined) } },
  },
  plugins: [shipData(), repoFacts()],
}));
