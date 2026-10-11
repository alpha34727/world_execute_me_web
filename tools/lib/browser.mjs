// Starts the Vite dev server in-process and a GPU-backed headless Chromium page with the render API.
// Chromium needs --no-sandbox here (the sandbox fails inside restricted Windows sessions) and ANGLE/D3D11
// flags, otherwise WebGL silently falls back to SwiftShader (CPU). We only ever load our own localhost page.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

export const GPU_ARGS = ['--no-sandbox', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'];

export async function openRenderPage({ set = null, quiet = true } = {}) {
  const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: quiet ? 'error' : 'info', clearScreen: false });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  const browser = await puppeteer.launch({ headless: true, args: GPU_ARGS, protocolTimeout: 0 });
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error(`[page ${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => console.error(`[page error] ${e.message}`));
  const q = new URLSearchParams({ render: '1' });
  if (set) q.set('ch', set);
  await page.goto(`${url}?${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__wem && (window.__wem.info || window.__wem.error), { timeout: 180000, polling: 200 });
  const err = await page.evaluate(() => window.__wem.error ?? null);
  if (err) { await close(); throw new Error(`render page failed: ${err}`); }
  const info = await page.evaluate(() => window.__wem.info);
  if (/SwiftShader/i.test(info.renderer)) console.warn(`WARNING: WebGL is running on ${info.renderer} (CPU) — renders will be slow`);
  async function close() { await browser.close().catch(() => {}); await server.close().catch(() => {}); }
  return { page, info, url, close };
}

export function parseRes(res) {
  if (!res) return [1920, 1080];
  if (/^\d+$/.test(String(res))) { const h = +res; return [Math.round((h * 16) / 9), h]; }
  const m = /^(\d+)x(\d+)$/.exec(res);
  if (!m) throw new Error(`bad --res ${res}`);
  return [+m[1], +m[2]];
}
