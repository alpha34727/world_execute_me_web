// Interactive player: WebAudio clock (sample-accurate, output-latency compensated), scrub bar with section
// markers, ?t= seek, 中文字幕 toggle. Keys: space play/pause · ←/→ ±1 beat · ,/. ±1 frame · c 中文 · h info
const AUDIO_URL = '/' + encodeURIComponent('Mili - world.execute(me);.mp3');

export function installUi({ T, timeline, engine, frames, FPS, PREROLL, set }, params) {
  const canvas = engine.renderer.domElement;
  const status = document.getElementById('status');
  const bar = document.createElement('div');
  bar.id = 'bar';
  bar.innerHTML = `
    <button id="play" title="space">▶</button>
    <div id="track"><div id="marks"></div><input id="scrub" type="range" min="${frames.first}" max="${frames.end - 1}" step="1"></div>
    <span id="clock"></span>
    <label><input id="zh" type="checkbox" checked> 中文字幕</label>`;
  document.body.appendChild(bar);
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
    #status.hidden { display: none; }`;
  document.head.appendChild(style);

  const scrub = bar.querySelector('#scrub');
  const clock = bar.querySelector('#clock');
  const playBtn = bar.querySelector('#play');
  const zhBox = bar.querySelector('#zh');
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
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.min(Math.round(canvas.clientWidth * dpr), 3840);
    engine.setSize(w, Math.round((w * 9) / 16));
    dirty = true;
  }
  window.addEventListener('resize', resize);

  // --- audio clock ---
  let actx = null, buffer = null, source = null;
  let playing = false, ctxStart = 0, filmStart = 0;
  let filmTime = frames.first / FPS;
  const startT = params.get('t');
  if (startT !== null) filmTime = Math.min(Math.max(parseFloat(startT) + PREROLL, frames.first / FPS), (frames.end - 1) / FPS);
  let dirty = true, lastFrame = -1;

  async function ensureAudio() {
    if (buffer) return;
    actx = new AudioContext({ latencyHint: 'interactive' });
    status.textContent = 'decoding audio…';
    try {
      const data = await (await fetch(AUDIO_URL)).arrayBuffer();
      buffer = await actx.decodeAudioData(data);
      status.textContent = '';
    } catch (e) {
      status.textContent = `audio unavailable (${e.message}) — place the mp3 in the project root`;
      buffer = null;
    }
  }
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
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
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
    const f = Math.max(frames.first, Math.min(frames.end - 1, Math.floor(ft * FPS + 1e-6)));
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
