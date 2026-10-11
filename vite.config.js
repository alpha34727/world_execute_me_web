import { defineConfig } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';

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

export default defineConfig({
  server: { fs: { allow: ['.'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  plugins: [shipData()],
});
