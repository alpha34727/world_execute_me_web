// Prints which GPU headless Chromium uses for WebGL2 under different launch modes/flags.
import puppeteer from 'puppeteer';

const GPU_FLAGS = ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'];
for (const [headless, args] of [['shell', []], ['shell', GPU_FLAGS], [true, GPU_FLAGS]]) {
  try {
    const b = await puppeteer.launch({ headless, args: ['--no-sandbox', ...args] });
    const p = await b.newPage();
    const r = await p.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return 'no webgl2';
      const e = gl.getExtension('WEBGL_debug_renderer_info');
      return `${gl.getParameter(e.UNMASKED_RENDERER_WEBGL)} | maxTex ${gl.getParameter(gl.MAX_TEXTURE_SIZE)} | floatRT ${!!gl.getExtension('EXT_color_buffer_float')}`;
    });
    console.log(headless, JSON.stringify(args), '->', r);
    await b.close();
  } catch (e) {
    console.log(headless, JSON.stringify(args), 'FAILED', e.message.split('\n')[0]);
  }
}
