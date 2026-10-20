// Interactive player: WebAudio clock (sample-accurate, output-latency compensated), scrub bar with section
// markers, ?t= seek, 中文字幕 toggle, render resolution and fps cap (?res=720&fps=30, remembered). Keys: space play/pause · ←/→ ±1 beat · ,/. ±1 frame · c 中文 · h info
// the song is not in the repo (copyright Mili): the dev server serves it from the project root; anywhere else the
// viewer picks (or drops) their own copy of the mp3
const AUDIO_NAME = 'Mili - world.execute(me);.mp3';
const AUDIO_URL = (import.meta.env?.BASE_URL ?? '/') + encodeURIComponent(AUDIO_NAME);

export function installUi({ T, timeline, engine, frames, FPS, PREROLL, set }, params) {
  const canvas = engine.renderer.domElement;
  const status = document.getElementById('status');
  const bar = document.createElement('div');
  bar.id = 'bar';
  bar.innerHTML = `
    <button id="play" title="space">▶</button>
    <div id="track"><div id="marks"></div><input id="scrub" type="range" min="${frames.first}" max="${frames.end - 1}" step="1"></div>
    <span id="clock"></span>
    <label title="render resolution">res <select id="res">
      <option value="auto">auto</option><option value="540">540p</option><option value="720">720p</option>
      <option value="1080">1080p</option><option value="1440">1440p</option><option value="2160">2160p</option></select></label>
    <label title="frame-rate cap while playing">fps <select id="fps">
      <option value="60">60</option><option value="30">30</option><option value="24">24</option><option value="15">15</option></select></label>
    <label><input id="zh" type="checkbox" checked> 中文字幕</label>`;
  document.body.appendChild(bar);
  // Mili's copyright guidelines: AI-made fan works must say so, and must not look official (shown while paused)
  const notice = document.createElement('div');
  notice.id = 'notice';
  notice.textContent = 'Unofficial fan work · visuals AI-generated (Claude Opus 5.5) · music & lyrics © Mili · 非官方二創 · 畫面由 AI 生成';
  document.body.appendChild(notice);
  const style = document.createElement('style');
  style.textContent = `
    #bar { position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 14px; align-items: center; padding: 10px 16px;
           background: linear-gradient(transparent, rgba(0,0,0,.85)); font: 13px "JetBrains Mono", monospace; color: #cfd8e3; opacity: .15; transition: opacity .2s; }
    #bar:hover, body.paused #bar { opacity: 1; }
    #bar button { background: none; border: 1px solid #3b4450; color: #6bebff; width: 34px; height: 28px; cursor: pointer; }
    #track { position: relative; flex: 1; height: 28px; }
    #scrub { position: absolute; inset: 0; width: 100%; margin: 0; background: transparent; accent-color: #6bebff; }
    #marks { position: absolute; left: 0; right: 0; top: 0; height: 6px; }
    #marks span { position: absolute; top: 0; height: 6px; border-left: 1px solid #4a5563; font-size: 9px; color: #6b7684; padding-left: 2px; }
    #status { position: fixed; left: 16px; top: 12px; font: 12px "JetBrains Mono", monospace; color: #8a96a3; }
    #status.hidden { display: none; }
    #bar select { background: #0b0d10; color: #cfd8e3; border: 1px solid #3b4450; font: inherit; }
    #audio { position: fixed; left: 16px; top: 32px; font: 12px "JetBrains Mono", monospace; color: #8a96a3; }
    #audio button { font: inherit; }
    #notice { position: fixed; right: 16px; top: 12px; font: 12px "JetBrains Mono", "Noto Sans TC", monospace; color: #8a96a3; opacity: 0; transition: opacity .2s; pointer-events: none; }
    body.paused #notice { opacity: 1; }`;
  document.head.appendChild(style);

  const scrub = bar.querySelector('#scrub');
  const clock = bar.querySelector('#clock');
  const playBtn = bar.querySelector('#play');
  const zhBox = bar.querySelector('#zh');
  const resSel = bar.querySelector('#res');
  const fpsSel = bar.querySelector('#fps');
  const audioMsg = document.createElement('div');
  audioMsg.id = 'audio';
  document.body.appendChild(audioMsg);
  // viewer settings: ?res=720&fps=30 in the URL, else the last choice (per browser), else auto / 60
  const saved = (k) => { try { return localStorage.getItem(`wem.${k}`); } catch { return null; } };
  const save = (k, v) => { try { localStorage.setItem(`wem.${k}`, v); } catch { /* private mode: not kept */ } };
  const pickOpt = (sel, v) => { if (v && [...sel.options].some((o) => o.value === v)) sel.value = v; };
  pickOpt(resSel, params.get('res') ?? saved('res'));
  pickOpt(fpsSel, params.get('fps') ?? saved('fps'));
  const marks = bar.querySelector('#marks');
  const span = frames.end - frames.first;
  for (const s of T.sections) {
    const f = T.frameOf(s.start);
    if (f < frames.first || f >= frames.end) continue;
    const el = document.createElement('span');
    el.style.left = `${((f - frames.first) / span) * 100}%`;
    el.textContent = s.id;
    marks.appendChild(el);
  }

  // --- sizing ---
  // render resolution: auto = the canvas's size on screen (× devicePixelRatio, up to 2, at most 4K), or a fixed
  // height (the canvas is scaled to the window either way); the frames are the same picture at any size
  function resize() {
    let w;
    if (resSel.value === 'auto') w = Math.min(Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)), 3840);
    else w = Math.round((+resSel.value * 16) / 9);
    w -= w % 4; // the yuv path and some drivers want widths divisible by 4
    engine.setSize(w, Math.round((w * 9) / 16));
    dirty = true;
  }
  window.addEventListener('resize', resize);
  resSel.onchange = () => { save('res', resSel.value); resize(); };
  fpsSel.onchange = () => { save('fps', fpsSel.value); dirty = true; };

  // --- audio clock ---
  let actx = null, buffer = null, source = null;
  let playing = false, ctxStart = 0, filmStart = 0;
  let filmTime = frames.first / FPS;
  const startT = params.get('t');
  if (startT !== null) filmTime = Math.min(Math.max(parseFloat(startT) + PREROLL, frames.first / FPS), (frames.end - 1) / FPS);
  let dirty = true, lastFrame = -1;

  async function decode(data) {
    actx ??= new AudioContext({ latencyHint: 'interactive' });
    audioMsg.textContent = 'decoding audio…';
    buffer = await actx.decodeAudioData(data);
    audioMsg.textContent = '';
  }
  async function ensureAudio() {
    if (buffer) return;
    actx ??= new AudioContext({ latencyHint: 'interactive' });
    try {
      const r = await fetch(AUDIO_URL);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await decode(await r.arrayBuffer());
    } catch (e) {
      buffer = null;
      askForAudio(e.message);
    }
  }
  // no mp3 next to the page: let the viewer choose their own copy (button or drag and drop); it never leaves the browser
  function askForAudio(why) {
    audioMsg.textContent = `audio unavailable (${why}) — `;
    const pick = document.createElement('button');
    pick.textContent = `choose “${AUDIO_NAME}”…`;
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'audio/*,.mp3' });
    pick.onclick = () => input.click();
    input.onchange = () => input.files[0] && useFile(input.files[0]);
    audioMsg.append(pick, ' or drop it on the page');
  }
  async function useFile(file) {
    const was = playing;
    pause();
    try { await decode(await file.arrayBuffer()); audioMsg.textContent = ''; } catch (e) { audioMsg.textContent = `could not decode ${file.name}: ${e.message}`; return; }
    if (was) play();
  }
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) useFile(f); });
  const latency = () => (actx ? (actx.outputLatency || 0) + (actx.baseLatency || 0) : 0);
  function now() { return playing ? filmStart + (actx.currentTime - ctxStart) - latency() : filmTime; }

  async function play() {
    await ensureAudio();
    if (!actx) return;
    await actx.resume();
    filmStart = filmTime + latency();
    ctxStart = actx.currentTime;
    if (buffer) {
      source = actx.createBufferSource();
      source.buffer = buffer;
      source.connect(actx.destination);
      const songT = filmStart - PREROLL;
      if (songT >= 0) source.start(ctxStart, songT);
      else source.start(ctxStart - songT, 0);
    }
    playing = true;
    document.body.classList.remove('paused');
    playBtn.textContent = '❚❚';
  }
  function pause() {
    if (!playing) return;
    filmTime = now();
    playing = false;
    try { source?.stop(); } catch { /* already stopped */ }
    source = null;
    document.body.classList.add('paused');
    playBtn.textContent = '▶';
  }
  function seek(ft) {
    const was = playing;
    pause();
    filmTime = Math.min(Math.max(ft, frames.first / FPS), (frames.end - 1) / FPS);
    dirty = true;
    if (was) play();
  }

  playBtn.onclick = () => (playing ? pause() : play());
  scrub.oninput = () => seek(scrub.value / FPS + 1e-6);
  zhBox.onchange = () => { engine.showZh = zhBox.checked; dirty = true; };
  window.addEventListener('keydown', (e) => {
    if ((e.target.tagName === 'INPUT' && e.target.type !== 'range') || e.target.tagName === 'SELECT') return;
    const ft = now();
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === 'ArrowRight') seek(T.nextBeat(ft - PREROLL + 1e-3) + PREROLL);
    else if (e.key === 'ArrowLeft') seek(T.prevBeat(ft - PREROLL - 1e-3) + PREROLL);
    else if (e.key === '.') seek((Math.round(ft * FPS) + 1) / FPS + 1e-6);
    else if (e.key === ',') seek((Math.round(ft * FPS) - 1) / FPS + 1e-6);
    else if (e.key === 'c') { zhBox.checked = !zhBox.checked; zhBox.onchange(); }
    else if (e.key === 'h') status.classList.toggle('hidden');
  });

  function tick() {
    let ft = now();
    if (playing && ft >= frames.end / FPS) { pause(); filmTime = (frames.end - 1) / FPS; ft = filmTime; }
    const cap = +fpsSel.value;
    const raw = playing && cap < FPS ? Math.floor(Math.floor(ft * cap + 1e-6) * (FPS / cap) + 1e-6) : Math.floor(ft * FPS + 1e-6);
    const f = Math.max(frames.first, Math.min(frames.end - 1, raw));
    if (f !== lastFrame || dirty) {
      const info = engine.renderFrame(f);
      lastFrame = f; dirty = info.pendingFonts > 0;
      if (dirty) Promise.all([...engine.atlas.pending]).then(() => { dirty = true; });
      scrub.value = f;
      const t = f / FPS - PREROLL;
      clock.textContent = `${t < 0 ? '-' : ' '}${Math.abs(t).toFixed(3)}s  f${String(f).padStart(5, '0')}`;
      status.textContent = `${set} · ${info.section ?? 'warning'} · ${info.shot}${info.transition ? ` (${info.transition} ${info.p.toFixed(2)})` : ''}`;
    }
    requestAnimationFrame(tick);
  }
  document.body.classList.add('paused');
  resize();
  requestAnimationFrame(tick);
}
