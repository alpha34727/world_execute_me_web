// window.__wem — driven by Puppeteer (tools/*.mjs, test/regression.test.js). Frames are rendered at exact
// film-frame times; render completes only when every glyph used is loaded.

function toImageData(engine) {
  const { width: w, height: h } = engine;
  const px = engine.readPixels();
  const img = new ImageData(w, h);
  for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); // flip
  return img;
}

export function installRenderApi({ set, T, timeline, engine, span, frames, FPS, PREROLL }) {
  const shots = timeline.shots.map((s) => ({
    key: s.key, id: s.id, chapter: s.chapter, start: s.start, end: s.end,
    transition: s.transition.type, winStart: s.winStart, winEnd: s.winEnd,
    firstFrame: T.frameOf(s.start), lastFrame: T.frameOf(s.end) - 1,
  }));
  const api = {
    info: {
      set, span, fps: FPS, preroll: PREROLL, frames,
      chapters: timeline.chapters.map((c) => ({ id: c.id, from: c.from, to: c.to, firstFrame: T.frameOf(c.from), endFrame: T.frameOf(c.to) })),
      shots,
      renderer: (() => {
        const gl = engine.renderer.getContext();
        const e = gl.getExtension('WEBGL_debug_renderer_info');
        return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown';
      })(),
    },
    setSize(w, h) { engine.setSize(w, h); },
    async frame(f) { return engine.renderFrameComplete(f, { toScreen: false }); },
    // render frame f and POST its raw RGBA (bottom-up rows) to url
    async capture(f, url) {
      const info = await engine.renderFrameComplete(f, { toScreen: false });
      const px = engine.readPixels();
      const r = await fetch(url, { method: 'POST', body: px, headers: { 'content-type': 'application/octet-stream', 'x-frame': String(f) } });
      if (!r.ok) throw new Error(`capture POST failed ${r.status}`);
      return info;
    },
    // render frames [from, to) and stream each as a yuv420p message over a WebSocket. One frame stays in flight
    // while the next renders; the receiver acks each frame (with its index) once ffmpeg has accepted it.
    async stream(from, to, wsUrl) {
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws connect failed')); });
      let acked = from - 1;
      let wake = null;
      ws.onmessage = (e) => { acked = +e.data; if (wake) { wake(); wake = null; } };
      const until = async (cond) => { while (!cond()) await new Promise((r) => { wake = r; }); };
      for (let f = from; f < to; f++) {
        await engine.renderFrameComplete(f, { toScreen: false });
        const buf = engine.readYuv();
        await until(() => acked >= f - 1);
        ws.send(buf);
      }
      await until(() => acked >= to - 1);
      ws.close();
    },
    async png(f) {
      await engine.renderFrameComplete(f, { toScreen: false });
      const c = document.createElement('canvas');
      c.width = engine.width; c.height = engine.height;
      c.getContext('2d').putImageData(toImageData(engine), 0, 0);
      return c.toDataURL('image/png');
    },
    // contact sheet: rows of cells [{ f, label, sub }], each rendered at (w,h); labels in a left column
    async sheet(rows, { w = 640, h = 360, title = '', labelW = 300 } = {}) {
      const cols = Math.max(...rows.map((r) => r.cells.length));
      const pad = 10, head = 56;
      const c = document.createElement('canvas');
      c.width = labelW + cols * (w + pad) + pad;
      c.height = head + rows.length * (h + pad + 22) + pad;
      const g = c.getContext('2d');
      g.fillStyle = '#0b0d10'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#e8eef4'; g.font = '600 22px "JetBrains Mono"'; g.fillText(title, pad, 36);
      engine.setSize(w, h);
      for (let r = 0; r < rows.length; r++) {
        const y = head + r * (h + pad + 22);
        const row = rows[r];
        g.fillStyle = '#e8eef4'; g.font = '700 18px "JetBrains Mono"'; g.fillText(row.label, pad, y + 24);
        g.fillStyle = '#8a96a3'; g.font = '400 14px "JetBrains Mono"';
        (row.sub ?? []).forEach((s, i) => g.fillText(s, pad, y + 50 + i * 20));
        for (let k = 0; k < row.cells.length; k++) {
          const cell = row.cells[k];
          const x = labelW + k * (w + pad);
          await engine.renderFrameComplete(cell.f, { toScreen: false });
          g.putImageData(toImageData(engine), x, y);
          g.fillStyle = '#8a96a3'; g.font = '400 13px "JetBrains Mono"';
          g.fillText(cell.label, x, y + h + 17);
        }
      }
      return c.toDataURL('image/png');
    },
  };
  Object.defineProperty(api, '_engine', { value: engine }); // debugging handle
  window.__wem = api;
  document.getElementById('status').textContent = `render api ready · ${api.info.renderer}`;
}
