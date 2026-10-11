// npm run preview -- <chapter> [--handles 2] [--res 1080]
// 1080p60 preview of one chapter with 2 s of handles on each side (and the audio) -> renders/preview/<chapter>.mp4
import { parseArgs, requireChapter } from './lib/cli.mjs';
import { render } from './render.mjs';

const { pos, opt } = parseArgs(process.argv.slice(2));
const id = requireChapter('preview', pos[0]);
await render({
  chapter: id,
  handles: opt.handles !== undefined ? +opt.handles : 2,
  res: opt.res ?? 1080,
  crf: opt.crf ?? 18,
  preset: opt.preset ?? 'medium',
  out: `renders/preview/${id}.mp4`,
});
