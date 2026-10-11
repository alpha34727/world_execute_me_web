// Frame-stepped render: headless Chromium renders film frame f at exactly t = f/60 - 5, reads back RGBA and
// POSTs it to a local HTTP endpoint that streams it into ffmpeg (no realtime dependency, no dropped frames).
//
//   npm run render                                   full film -> out/master.mp4 (2160p, crf 14) + out/delivery.mp4
//   npm run render -- --chapter v1 [--handles 2]     one chapter (+ handles in seconds)
//   npm run render -- --from <frame> --to <frame>    explicit film-frame range [from, to)
//   options: --res 2160|1080|WxH  --crf N  --preset slow  --out path  --set film|test  --no-delivery
import { WebSocketServer } from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, fail } from './lib/cli.mjs';
import { openRenderPage, parseRes } from './lib/browser.mjs';

export const MP3 = 'Mili - world.execute(me);.mp3';

export async function render(o) {
  const set = o.set ?? (o.chapter === 'test' ? 'test' : 'film');
  const [W, H] = parseRes(o.res ?? 2160);
  const { page, info, close } = await openRenderPage({ set });
  const fps = info.fps, pre = info.preroll;
  let from, to;
  if (o.chapter) {
    const ch = info.chapters.find((c) => c.id === o.chapter);
    if (!ch) { await close(); fail(`chapter "${o.chapter}" not in the ${set} timeline`); }
    const hf = Math.round((o.handles ?? 0) * fps);
    from = Math.max(0, ch.firstFrame - hf);
    to = Math.min(info.frames.end + (set === 'test' ? hf : 0), ch.endFrame + hf);
  } else {
    from = o.from ?? info.frames.first;
    to = o.to ?? info.frames.end;
  }
  const n = to - from;
  const out = o.out;
  mkdirSync(dirname(out), { recursive: true });
  if (!existsSync(MP3)) console.warn(`WARNING: ${MP3} not found — rendering without audio`);

  // audio: song time of the first frame; negative = inside the warning card (prepend silence)
  const t0 = from / fps - pre, dur = n / fps;
  const audioArgs = [];
  if (existsSync(MP3) && !o.noAudio) {
    if (t0 >= 0) audioArgs.push('-ss', t0.toFixed(6), '-t', dur.toFixed(6), '-i', MP3);
    else audioArgs.push('-t', (dur + t0).toFixed(6), '-i', MP3);
  }
  const hasAudio = audioArgs.length > 0;
  const af = hasAudio && t0 < 0 ? ['-af', `adelay=${Math.round(-t0 * 1000)}:all=1,apad`, '-t', dur.toFixed(6)] : hasAudio ? ['-af', 'apad', '-t', dur.toFixed(6)] : [];
  const ff = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${W}x${H}`, '-r', String(fps),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-i', 'pipe:0',
    ...audioArgs,
    '-c:v', 'libx264', '-preset', o.preset ?? 'slow', '-crf', String(o.crf ?? 14), '-tune', 'film',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    ...(hasAudio ? ['-map', '0:v', '-map', '1:a', ...af, '-c:a', o.audioCodec ?? 'aac', ...(o.audioCodec === 'alac' ? [] : ['-b:a', '320k'])] : []),
    '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));

  // frame sink: the page streams yuv420p frames (already BT.709 limited range, converted on the GPU)
  const frameBytes = W * H * 1.5;
  const wss = new WebSocketServer({ host: '127.0.0.1', port: 0, maxPayload: frameBytes + 1024 });
  await new Promise((res) => wss.on('listening', res));
  let received = 0, last = Date.now();
  const start = Date.now();
  wss.on('connection', (sock) => {
    sock.on('message', (data) => {
      if (data.length !== frameBytes) { console.error(`bad frame size ${data.length}`); process.exit(1); }
      const f = from + received++;
      const ack = () => sock.send(String(f));
      if (ff.stdin.write(data)) ack(); else ff.stdin.once('drain', ack);
      const now = Date.now();
      if (now - last > 5000 || received === n) {
        const el = (now - start) / 1000;
        process.stdout.write(`  ${received}/${n}  ${(received / el).toFixed(2)} fps  eta ${((n - received) / (received / el) / 60).toFixed(1)} min
`);
        last = now;
      }
    });
  });
  console.log(`render ${set} frames ${from}..${to - 1} (${n} fr, ${(n / fps).toFixed(2)} s) at ${W}x${H} -> ${out}  [${info.renderer}]`);
  await page.evaluate((w, h) => window.__wem.setSize(w, h), W, H);
  try {
    await page.evaluate((a, b, url) => window.__wem.stream(a, b, url), from, to, `ws://127.0.0.1:${wss.address().port}`);
  } finally {
    ff.stdin.end();
    wss.close();
    await close();
  }
  if (received !== n) throw new Error(`received ${received} of ${n} frames`);
  await ffDone;
  const el = (Date.now() - start) / 1000;
  console.log(`done ${out}  ${(statSync(out).size / 1e6).toFixed(1)} MB  ${el.toFixed(1)} s  (${(n / el).toFixed(2)} fps)`);
  return { out, from, to, W, H, fps, preroll: pre };
}

export function delivery(master, out) {
  return new Promise((res, rej) => {
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', master,
      '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'film',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', out], { stdio: 'inherit' });
    ff.on('close', (c) => (c === 0 ? res(out) : rej(new Error(`ffmpeg exited ${c}`))));
  });
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:')}`) {
  const { opt } = parseArgs(process.argv.slice(2));
  const full = !opt.chapter && opt.from === undefined && opt.set !== 'test'; // the film deliverables only
  const r = await render({
    set: opt.set, chapter: opt.chapter, handles: opt.handles !== undefined ? +opt.handles : undefined,
    from: opt.from !== undefined ? +opt.from : undefined, to: opt.to !== undefined ? +opt.to : undefined,
    res: opt.res, crf: opt.crf, preset: opt.preset,
    out: opt.out ?? (full ? 'out/master.mp4' : opt.set === 'test' && !opt.chapter && opt.from === undefined ? `renders/test_${opt.res ?? 2160}.mp4` : `renders/render_${opt.chapter ?? `${opt.from}-${opt.to}`}.mp4`),
    audioCodec: full ? 'alac' : undefined,
  });
  if (full && !opt['no-delivery']) {
    console.log('delivery 1080p ...');
    await delivery(r.out, 'out/delivery.mp4');
    console.log('done out/delivery.mp4');
  }
}
