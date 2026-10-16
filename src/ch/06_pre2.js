// 06 pre2 — switch everything, told as the life of a cell. 46,XX; from F to M the second X becomes a Y and its SRY
// gene — the switch — lights. Me then expresses SRY through the central dogma (its real coding sequence replicated,
// transcribed, translated into the SRY protein). SRY switches the cell's role (Waddington's landscape tips toward
// testis); the cell cycle runs from S to M; the cell divides (mitosis, the membrane a Cassini oval pinching in two);
// and the divisions repeat — cleavage, 1 → 2 → 4 → … → 512 cells: the trance.
// Storyboard: docs/storyboard.md §06 · review: docs/review/pre2.md.
import * as THREE from 'three';
import { chapter } from '../engine/timeline.js';
import { Swarm } from '../engine/gl/swarm.js';
import { COLOR } from '../theme.js';
import { corners } from '../lib/hud.js';
import { clamp, lerp, easeOutCubic, easeInOutCubic, easeInCubic, smoothstep, decay } from '../lib/ease.js';
import { sparkAt } from '../lib/spark.js';
import { orbit, shake, add3, lerp3 } from '../lib/camera.js';
import { axisGizmo, dust, labels3D } from '../lib/scene3d.js';
import { transcript } from '../lib/cc.js';
import { embers, burst, shockwave, flow } from '../lib/fx.js';
import { donePlan } from './v2/plan.js';
import * as B from './pre2/bio.js';
import { SRY_CDS, SRY_PROTEIN, COMPLEMENT, codonToAA, AA3 } from './pre2/sry.js';
import * as C from './pre2/cell.js';
import { rand } from '../lib/hash.js';

const TAU = Math.PI * 2;
const start = (T) => T.cut(T.section('pre2').start);
const L = (T, text, n = 0) => T.findLine(text, n, 'pre2');
const ls = (T, text) => L(T, text).words[0].start;
const cutOf = (T, text) => T.cut(ls(T, text));
const wordIn = (T, line, text, n = 0) => L(T, line).words.filter((w) => w.text === text)[n];
const field = (ctx, focus, o = {}) => embers(ctx, { radius: [2.5, 10], n: 3000, focus, aperture: 5, size: 3.2, alpha: 0.8, color: COLOR.dim, color2: COLOR.ink2, seed: 640, ...o });
const label = (p, text, o = {}) => ({ p, id: text, text, priority: 10, o: { font: 'mono', size: 22, minSize: 20, maxSize: 24, color: COLOR.ink2, backing: 0.7, ref: 7, ...o } });
const beatFrac = (T, t) => { const b = T.beatAt(t); return b - Math.floor(b); };
const polyline = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
const finish = (ctx, cam) => { ctx.camera2D(); corners(ctx, { color: COLOR.faint }); axisGizmo(ctx, cam); };
// the drums thin out in bars 50 and 55: the energy layers breathe with the real drum level
const drums = (ctx) => 0.35 + 0.65 * ctx.F.get('rms_drums', ctx.t);

// ---- pre2.01/02: 46,XX, then 46,XY. Between "F" and "M" the second X becomes a Y: length and centromere interpolate between the real
// chromosomes (GRCh38), the shared PAR1 tip stays, and SRY (Yp11.2), the gene that switches development to male, lights
const rotY = ([x, y, z], a) => { const c = Math.cos(a), s = Math.sin(a); return [c * x + s * z, y, -s * x + c * z]; };
const sexM = (T, t) => { const f = wordIn(T, 'To F to M', 'F').start, m = wordIn(T, 'To F to M', 'M').start; return easeInOutCubic(clamp((t - f) / (m - f))); };
const CHR_POS = [[-0.75, 0.15, 0], [0.75, 0.15, 0]];
function chromosome(ctx, m, pos, { ref, rot = 0, sry = 0, key, flash = 0 }) {
  const P = (q) => add3(rotY(q, rot), pos);
  // chromatin: particles filling both sister chromatids, carried from the X's shape to the Y's
  const sw = ctx.memo(`pre2:chr:${key}`, () => {
    const n = 1600, from = new Float32Array(n * 3), to = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const sd = i % 2 ? 1 : -1, u = rand(i, 1, 690), v = rand(i, 2, 690) * 2 - 1;
      from.set(B.chromatidPt(0, sd, u, v * 0.85), i * 3);
      to.set(B.chromatidPt(key === 'y' ? 1 : 0, sd, u, v * 0.85), i * 3);
    }
    return new Swarm({ from, to, seed: 691 });
  });
  const model = new THREE.Matrix4().makeTranslation(...pos).multiply(new THREE.Matrix4().makeRotationY(rot));
  ctx.swarm(sw, { p: m, stagger: 0.2, size: 2.6, sizeVar: 0.6, perspective: true, focus: ref, aperture: 3, drift: 0.015, time: ctx.t, model, color: COLOR.me, color2: COLOR.warm, colorVar: 0.3, alpha: 0.75 });
  for (const sd of [-1, 1]) ctx.line(B.chromatidOutline(m, sd).map(P), { color: COLOR.me, width: 2.6 * (1 + 0.6 * flash), glow: 10 + 10 * flash, glowStrength: 0.4, persp: ref, intensity: 1 + 0.35 * flash });
  // a tick every 10 Mb; the PAR1 tip (shared by X and Y) in light bands
  const { len } = B.chrAt(m);
  for (let mb = 10; mb < len; mb += 10) for (const seg of B.bandAt(m, mb)) ctx.line(seg.map(P), { color: COLOR.dim, width: 1.2, alpha: 0.45, persp: ref });
  // (when SRY lights, PAR1 steps back so the two neighbouring bands do not bloom into one white cap)
  for (let mb = 0.5; mb < B.PAR1 - 0.3; mb += 0.9) for (const seg of B.bandAt(m, mb)) ctx.line(seg.map(P), { color: COLOR.ink2, width: 2, alpha: Math.min(1, 0.75 * (1 - 0.7 * sry) + 0.6 * flash), persp: ref });
  if (sry > 0) for (const seg of B.bandAt(m, B.SRY)) ctx.line(seg.map(P), { color: COLOR.warm, width: 4, alpha: sry, glow: 6, glowStrength: 0.35, persp: ref, intensity: 0.8 });
  return { tip: P(B.chromatidPt(m, 1, 0, 0)), sry: P([0.19, (B.chrAt(m).cen - B.SRY) * B.MB, 0]), bottom: P([0, -(len - B.chrAt(m).cen) * B.MB, 0]) };
}

// ---- pre2.03/04: the central dogma on SRY. A duplex along x: base pair i of the coding sequence at x = (i − c)·SP
const SP = 0.3, R_DUP = 0.42;
const dup = (x, y, i, sd) => { const a = i * B.TWIST + (sd ? B.GROOVE : 0); return [x, y + Math.cos(a) * R_DUP, Math.sin(a) * R_DUP]; };
const baseCol = (b) => (b === 'A' ? COLOR.me : b === 'T' || b === 'U' ? COLOR.warm : b === 'G' ? COLOR.ink2 : COLOR.dim);
// replication: the fork runs along the gene; the new strand on the template running 3'→5' toward the fork (bottom)
// is the leading strand, made continuously; the other (top) is made backward in Okazaki fragments of 8
const forkAt = (T, t) => { const t0 = cutOf(T, 'And then do whatever'), t1 = cutOf(T, 'From AM to PM'); return lerp(6, 34, clamp((t - t0) / (t1 - t0))); };
const OKA = 8;
const laggingMade = (i, fork) => { const j = Math.floor(i / OKA), fill = clamp((fork - (OKA * j + OKA + 1)) * 2, 0, OKA); return OKA * j + OKA - i <= fill; };
// transcription then translation: the mRNA is the coding strand with U for T; the ribosome reads it a codon at a time
const PM_AT = (T) => wordIn(T, 'From AM to PM', 'PM').start;
const txAt = (T, t) => lerp(0, 40, clamp((t - cutOf(T, 'From AM to PM')) / (PM_AT(T) - cutOf(T, 'From AM to PM'))));
const RIB = 12; // the ribosome, to the right of the transcription site
const codonsAt = (T, t) => Math.max(0, (T.beatAt(t) - T.beatAt(PM_AT(T))) / 0.25); // from "PM": a codon every quarter beat

// ---- pre2.05: the cell's role. It rolls down Waddington's landscape and waits on the saddle where the valley forks;
// on "switch" SRY (→ SOX9) tips the landscape over one beat: the ovary side rises, the cell rolls into the testis valley
const roleT0 = (T) => cutOf(T, 'Oh switch my role'), roleT1 = (T) => cutOf(T, 'To S to M');
const switchAt = (T) => wordIn(T, 'Oh switch my role', 'switch').start;
const V_FORK = 0.24;
const wadVAt = (T, t) => {
  const sw = switchAt(T);
  if (t < sw) return lerp(0.02, V_FORK, easeOutCubic(clamp((t - roleT0(T)) / (sw - T.beats(0.5) - roleT0(T)))));
  return lerp(V_FORK, 0.95, easeInOutCubic(clamp((t - sw) / (roleT1(T) - sw))));
};
const wadTiltAt = (T, t) => easeInOutCubic(clamp((t - switchAt(T)) / T.beats(1)));
// the cell: balanced on the saddle (a small wobble) until the switch, then gradient flow from there
const wadU = (T, t) => (t < switchAt(T) ? 0.05 * Math.sin(9 * t) * smoothstep(roleT0(T), switchAt(T), t) : C.wadBall((x) => wadVAt(T, x), (x) => wadTiltAt(T, x), switchAt(T), t, { u0: 0.05 * Math.sin(9 * switchAt(T)) }));

// ---- pre2.06: the cell cycle: the hand enters S on "S" and M on "M" (real phase lengths of a ~24 h cycle)
const S_AT = (T) => wordIn(T, 'To S to M', 'S').start, M_AT = (T) => wordIn(T, 'To S to M', 'M').start;
const hourAt = (T, t) => {
  const hs = C.phaseStart('S'), hm = C.phaseStart('M'), sa = S_AT(T), ma = M_AT(T), rate = (hm - hs) / (ma - sa);
  if (t < sa) return hs - 1.6 * (sa - t) / T.beats(1); // the end of G1, slowly
  if (t < ma) return hs + (t - sa) * rate;
  return hm + Math.min(0.85, (t - ma) / T.beats(1) * 0.5); // in M, the hand slows down: mitosis is next
};
const handAng = (h) => Math.PI / 2 - (h / C.CYCLE_H) * TAU; // clockwise from twelve o'clock

// ---- pre2.07: mitosis, beat by beat: prophase → metaphase (chromosomes on the plate) → anaphase on "can" → the
// membrane pinches to a figure eight exactly on "enter" → two cells
const MIT = (T) => ({ t0: cutOf(T, 'So we can enter'), can: wordIn(T, 'So we can enter', 'can').start, enter: wordIn(T, 'So we can enter', 'enter').start });
const CHROMS = [{ y: 0.78, h: 0.19 }, { y: 0.26, h: 0.13 }, { y: -0.26, h: 0.19 }, { y: -0.78, h: 0.13 }]; // 2 pairs (long, short), apart
const POLE = 1.64, CELL_B = 2.05, MIT_TILT = (15 / 180) * Math.PI; // the division axis leans 15°
const mitRot = ([x, y, z]) => [x * Math.cos(MIT_TILT) - y * Math.sin(MIT_TILT), x * Math.sin(MIT_TILT) + y * Math.cos(MIT_TILT), z];
const mitPhase = (T, t) => { const m = MIT(T); return t < m.t0 + T.beats(0.9) ? 'prophase' : t < m.can ? 'metaphase' : t < m.enter - T.beats(0.5) ? 'anaphase' : 'cytokinesis'; };

// ---- pre2.08: cleavage. It picks up the two cells mitosis just made; one division on every half beat of the grid
const tranceStart = (T) => cutOf(T, 'The trance the trance');
const DIV_BEATS = 0.5, MAX_DIV = 9;
const divAt = (T, t) => { const b0 = Math.ceil(T.beatAt(ls(T, 'The trance the trance')) * 2) / 2; return clamp(1 + (T.beatAt(t) - b0 - DIV_BEATS) / DIV_BEATS, 1, MAX_DIV); }; // the two cells from mitosis hold for a half beat first
// divisions counted once a division is half done (the label and the HUD agree)
const divCount = (T, t) => { const d = divAt(T, t), n = Math.floor(d + 1e-6); return n + (d - n > 0.225 ? 1 : 0); };

export default chapter({
  id: 'pre2',
  from: start,
  to: (T) => T.cut(T.section('pre2').end),
  overlay(ctx) {
    const { T } = ctx;
    // verse 2's plan, every item done (EXISTENCE ticks half a beat in) — read here, not under the keyword
    transcript(ctx, 72, 190, ctx.memo('pre2session', () => [donePlan(T, start(T), start(T) + T.beats(4))]));
  },
  shots: [
    {
      id: 'gender',
      hud: 'karyotype 46,XX · X = 156 Mb (GRCh38)',
      at: start,
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = start(T), dt = t - t0, ref = 5.6;
        const cam = orbit({ target: add3([0.15, -0.3, 0], shake(t, 0.02, 61)), r: lerp(7.4, 6.6, easeOutCubic(clamp(dt / T.beats(3.3)))), az: 0.42 - 0.06 * dt, el: 0.1, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref, { alpha: 0.6 + 0.3 * drums(ctx) });
        const fl = [0, 0];
        L(T, 'Switch my gender').words.forEach((w, i) => { fl[i % 2] = Math.max(fl[i % 2], decay((t - w.start) / T.beats(1), 4) * (t >= w.start ? 1 : 0)); });
        chromosome(ctx, 0, CHR_POS[0], { ref, rot: 0.15, key: 'x', flash: fl[0] });
        chromosome(ctx, 0, CHR_POS[1], { ref, rot: -0.15, key: 'x2', flash: fl[1] });
        // the section lands on the downbeat; each word of the line pulses one of the two X
        const pd = clamp((dt + 2 / 60) / T.beats(1.3));
        burst(ctx, { center: [0, 0.15, 0], seed: 610, n: 3200, r0: 0.8, r1: 7, p: pd, focus: ref, aperture: 3, size: 3.4, alpha: 1.1, color: COLOR.me, color2: COLOR.warm });
        if (pd < 1) shockwave(ctx, { center: [0, 0.15, 0], u: [1, 0, 0], v: [0, 1, 0], r: 0.6 + 4 * easeOutCubic(pd), alpha: 0.8 * (1 - pd), ref, width: 3 });
        L(T, 'Switch my gender').words.forEach((w, i) => burst(ctx, { center: CHR_POS[i % 2], seed: 612 + i, n: 1400, r0: 0.3, r1: 3, p: (t - w.start + 2 / 60) / T.beats(1), focus: ref, aperture: 3, size: 3, alpha: 0.8 * drums(ctx), color: COLOR.me, color2: COLOR.ink }));
        sparkAt(ctx, cam, { pos: [0, -0.35, 0.4], rays: 0.3 + 0.3 * decay(beatFrac(T, t), 5) });
        const xs = [ctx.project(CHR_POS[0])[0], ctx.project(CHR_POS[1])[0]], base = ctx.project(add3(CHR_POS[0], [0, -1.95, 0]))[1];
        ctx.camera2D();
        for (const x of xs) ctx.text('X', x, base, { font: 'monoBold', size: 30, align: 'center', color: COLOR.ink2 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'ftom',
      hud: (T, t) => (sexM(T, t) < 0.5 ? 'karyotype 46,XX -> 46,XY' : 'karyotype 46,XY · Y = 57 Mb · SRY at Yp11.2'),
      at: (T) => cutOf(T, 'To F to M'),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = cutOf(T, 'To F to M'), dt = t - t0, ref = 5.6;
        const cam = orbit({ target: add3([0.15, -0.3, 0], shake(t, 0.02, 62)), r: lerp(7.0, 6.2, easeOutCubic(clamp(dt / T.beats(3.7)))), az: 0.22 - 0.06 * dt, el: 0.06, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref, { alpha: 0.6 + 0.3 * drums(ctx) });
        const m = sexM(T, t), F = wordIn(T, 'To F to M', 'F').start, M = wordIn(T, 'To F to M', 'M').start;
        const sry = smoothstep(M - T.beats(0.1), M + T.beats(0.15), t);
        chromosome(ctx, 0, CHR_POS[0], { ref, rot: 0.15, key: 'x' });
        const Y = chromosome(ctx, m, CHR_POS[1], { ref, rot: -0.15, sry, key: 'y' });
        // "F": the X that will change rings out; "M": SRY, the switch, lights and rings out
        const pf = clamp((t - F + 2 / 60) / T.beats(1.2));
        burst(ctx, { center: CHR_POS[1], seed: 611, n: 2800, r0: 0.5, r1: 5, p: pf, focus: ref, aperture: 3, size: 3.2, alpha: 1.1, color: COLOR.me, color2: COLOR.warm });
        if (pf > 0 && pf < 1) shockwave(ctx, { center: CHR_POS[1], u: [1, 0, 0], v: [0, 1, 0], r: 0.4 + 2.6 * easeOutCubic(pf), alpha: 0.8 * (1 - pf), ref, width: 3 });
        const pg = clamp((t - M + 2 / 60) / T.beats(1.3));
        burst(ctx, { center: Y.sry, seed: 613, n: 2600, r0: 0.9, r1: 5, p: pg, focus: ref, aperture: 3, size: 3.2, alpha: 1.1, color: COLOR.warm, color2: COLOR.me });
        if (pg > 0 && pg < 1) shockwave(ctx, { center: Y.sry, u: [1, 0, 0], v: [0, 1, 0], r: 0.3 + 2.4 * easeOutCubic(pg), alpha: 0.85 * (1 - pg), color: COLOR.warm, ref, width: 3 });
        sparkAt(ctx, cam, { pos: [0, -0.35, 0.4], rays: 0.3 + 0.3 * decay(beatFrac(T, t), 5) });
        // 2D: the karyotype's names on one baseline under the chromosomes; SRY's label on a leader line
        const xs = [ctx.project(CHR_POS[0])[0], ctx.project(CHR_POS[1])[0]], sp = ctx.project(Y.sry), base = ctx.project(add3(CHR_POS[0], [0, -1.95, 0]))[1];
        ctx.camera2D();
        ctx.text('X', xs[0], base, { font: 'monoBold', size: 30, align: 'center', color: COLOR.ink2 });
        ctx.text(m < 0.5 ? 'X' : 'Y', xs[1], base, { font: 'monoBold', size: 30, align: 'center', color: m < 0.5 ? COLOR.ink2 : COLOR.me });
        const la = smoothstep(M + T.beats(0.25), M + T.beats(0.45), t);
        if (la > 0) {
          const lx = sp[0] + 110, tw = ctx.measure('SRY · Yp11.2', { font: 'mono', size: 22 });
          ctx.line([[sp[0] + 30, sp[1]], [lx - 10, sp[1]]], { color: COLOR.warm, width: 1.2, alpha: la });
          ctx.mask(lx - 6, sp[1] - 18, tw + 12, 30, la);
          ctx.text('SRY · Yp11.2', lx, sp[1] + 7, { font: 'mono', size: 22, color: COLOR.warm, alpha: la });
        }
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'whatever',
      hud: 'central dogma 1/3 · DNA replication · SRY coding sequence (NM_003140.3)',
      at: (T) => cutOf(T, 'And then do whatever'),
      transitionIn: { type: 'glide', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = cutOf(T, 'And then do whatever'), dt = t - t0, ref = 6.4;
        const cam = orbit({ target: add3([-0.6, 0, 0], shake(t, 0.02, 63)), r: lerp(7.2, 6.4, easeOutCubic(clamp(dt / T.beats(4)))), az: 0.18 + 0.04 * dt, el: 0.16, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref, { alpha: 0.6 + 0.3 * drums(ctx) });
        const fork = forkAt(T, t), X = (i) => (i - fork) * SP;
        const i0 = Math.max(0, Math.floor(fork) - 20), i1 = Math.floor(fork) + 20;
        const arm = (i) => R_DUP + 0.65 * smoothstep(0, 5, fork - i); // the two daughter duplexes part behind the fork
        // ahead of the fork: the parent duplex
        for (const sd of [0, 1]) {
          const pts = [];
          for (let i = Math.max(i0, Math.ceil(fork)) * 3; i <= i1 * 3; i++) pts.push(dup(X(i / 3), 0, i / 3, sd));
          if (pts.length > 1) ctx.line(pts, { color: COLOR.me, width: 3, glow: 10, glowStrength: 0.4, persp: ref });
        }
        for (let i = Math.ceil(fork); i <= i1; i++) {
          const a = dup(X(i), 0, i, 0), b = dup(X(i), 0, i, 1), mid = lerp3(a, b, 0.5), base = SRY_CDS[i];
          ctx.line([a, mid], { color: baseCol(base), width: 2.4, alpha: 0.85, persp: ref });
          ctx.line([mid, b], { color: baseCol(COMPLEMENT[base]), width: 2.4, alpha: 0.85, persp: ref });
        }
        // behind it: each parent strand with its new partner (gold); top = lagging (Okazaki fragments), bottom = leading
        const top = (i) => [X(i), arm(i), 0], topNew = (i) => [X(i), arm(i) - 0.44, 0.06];
        const bot = (i) => [X(i), -arm(i), 0], botNew = (i) => [X(i), -arm(i) + 0.44, 0.06];
        const span = []; for (let i = i0; i <= Math.ceil(fork); i++) span.push(Math.min(i, fork));
        ctx.line(span.map(top), { color: COLOR.me, width: 3, glow: 10, glowStrength: 0.4, persp: ref });
        ctx.line(span.map(bot), { color: COLOR.me, width: 3, glow: 10, glowStrength: 0.4, persp: ref });
        const lead = span.filter((i) => i < fork - 1);
        if (lead.length > 1) ctx.line(lead.map(botNew), { color: COLOR.warm, width: 3, glow: 6, persp: ref, intensity: 0.8 });
        for (let j = Math.floor(i0 / OKA); j * OKA < fork; j++) {
          const frag = []; for (let i = j * OKA; i < j * OKA + OKA - 0.5; i++) if (i >= i0 && laggingMade(i, fork)) frag.push(i);
          if (frag.length > 1) ctx.line(frag.map(topNew), { color: COLOR.warm, width: 3, glow: 6, persp: ref, intensity: 0.8 });
        }
        for (let i = i0; i < fork; i++) {
          const b = SRY_CDS[i];
          if (laggingMade(i, fork)) ctx.line([top(i), topNew(i)], { color: baseCol(b), width: 2.4, alpha: 0.85, persp: ref });
          else ctx.line([top(i), add3(top(i), [0, -0.16, 0])], { color: baseCol(b), width: 2.4, alpha: 0.6, persp: ref });
          if (i < fork - 1) ctx.line([bot(i), botNew(i)], { color: baseCol(COMPLEMENT[b]), width: 2.4, alpha: 0.85, persp: ref });
        }
        // the helicase: a ring unzipping the duplex at the fork
        ctx.line(polyline(48, (u) => [0.05, Math.cos(u * TAU) * 0.62, Math.sin(u * TAU) * 0.62]), { color: COLOR.warm, width: 2.2, glow: 6, glowStrength: 0.3, persp: ref, intensity: 0.75 });
        // the sequence just copied, spelled along the straight coding strand behind the fork
        for (let i = Math.max(0, Math.ceil(fork) - 12); i < fork - 3; i++) {
          const a = smoothstep(fork - 3, fork - 4.5, i) * (1 - smoothstep(9, 12, fork - i));
          if (a > 0.02) ctx.text3D(SRY_CDS[i], add3(top(i), [0, 0.3, 0]), { font: 'monoBold', size: 18, align: 'center', baseline: 'middle', color: baseCol(SRY_CDS[i]), alpha: a, ref, minSize: 15, maxSize: 20 });
        }
        flow(ctx, 'pre2:lead', (u) => [(u - 16) * SP, -1.07 + 0.44, 0.06], { u0: 0, u1: 15, du: 2, n: 500, ref, alpha: 0.7, color: COLOR.warm, color2: COLOR.ink, size: 2.6, jitter: 0.04 });
        const ww = wordIn(T, 'And then do whatever', 'whatever');
        const pw = clamp((t - ww.start + 2 / 60) / T.beats(1.4));
        burst(ctx, { center: [0, 0, 0], seed: 635, n: 3200, r0: 0.9, r1: 7, p: pw, focus: ref, aperture: 3, size: 3.4, alpha: 1.1, color: COLOR.me, color2: COLOR.warm });
        if (pw > 0 && pw < 1) shockwave(ctx, { center: [0, 0, 0], u: [0, 1, 0], v: [0, 0, 1], r: 0.7 + 3 * easeOutCubic(pw), alpha: 0.8 * (1 - pw), ref, width: 3 });
        sparkAt(ctx, cam, { pos: [0.05, 0, 0.7], rays: 0.3 + 0.3 * decay(beatFrac(T, t), 5) }); // me unzips its own gene
        labels3D(ctx, [
          label([X(Math.max(0, fork - 14)), -1.55, 0], 'leading strand', { ref, color: COLOR.warm, size: 20, minSize: 18, maxSize: 20 }),
          label([X(Math.max(0, fork - 14)), 1.55, 0], 'lagging · Okazaki fragments', { ref, color: COLOR.warm, size: 20, minSize: 18, maxSize: 20, priority: 9 }),
        ], { obstacles: [{ p: [0.05, 0, 0.7], r: 50 }, { a: [X(i0), 1.07, 0], b: [0, 1.07, 0], r: 14 }, { a: [X(i0), -1.07, 0], b: [0, -1.07, 0], r: 14 }] });
        finish(ctx, cam);
      },
    },
    {
      id: 'ampm',
      hud: (T, t) => (t < PM_AT(T) ? 'central dogma 2/3 · transcription · DNA -> mRNA, T -> U' : 'central dogma 3/3 · translation · mRNA -> SRY protein (Q05066, 204 aa)'),
      at: (T) => cutOf(T, 'From AM to PM'),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = cutOf(T, 'From AM to PM'), dt = t - t0, ref = 6.8, tP = PM_AT(T);
        // the camera follows the message: from the polymerase to the ribosome, arriving on "PM"
        const pan = easeInOutCubic(clamp((t - (tP - T.beats(0.8))) / T.beats(0.8)));
        const cam = orbit({ target: add3([lerp(-0.4, RIB, pan), 0.2, 0], shake(t, 0.02, 64)), r: ref, az: 0.16 + 0.05 * dt, el: 0.14, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref, center: [RIB * pan, 0, -2] });
        field(ctx, ref, { center: [RIB * pan, 0, 0], n: 6000, alpha: 0.8 + 0.2 * drums(ctx) });
        // ---- transcription: RNA polymerase holds a bubble open; the mRNA (gold, U for T) peels away up-left
        const p = txAt(T, t), Y0 = -1.1, X = (i) => (i - p) * SP;
        const open = (i) => smoothstep(7, 4, Math.abs(i - p)); // inside the bubble the strands are apart
        for (const sd of [0, 1]) {
          const pts = [];
          for (let i = Math.floor(p - 22) * 3; i <= (p + 22) * 3; i++) {
            const k = i / 3, h = dup(X(k), Y0, k, sd), o = open(k);
            pts.push(lerp3(h, [X(k), Y0 + (sd ? -0.55 : 0.55), 0], o));
          }
          ctx.line(pts, { color: COLOR.me, width: 3, glow: 10, glowStrength: 0.4, persp: ref });
        }
        for (let i = Math.max(0, Math.floor(p - 22)); i <= p + 22; i++) {
          const o = open(i), a = lerp3(dup(X(i), Y0, i, 0), [X(i), Y0 + 0.55, 0], o), b = lerp3(dup(X(i), Y0, i, 1), [X(i), Y0 - 0.55, 0], o), mid = lerp3(a, b, 0.5), base = SRY_CDS[i];
          ctx.line([a, lerp3(a, mid, 1 - 0.7 * o)], { color: baseCol(base), width: 2.4, alpha: 0.85, persp: ref });
          ctx.line([b, lerp3(b, mid, 1 - 0.7 * o)], { color: baseCol(COMPLEMENT[base]), width: 2.4, alpha: 0.85, persp: ref });
        }
        ctx.line(polyline(64, (u) => [Math.cos(u * TAU) * 1.5, Y0 + 0.1 + Math.sin(u * TAU) * 0.95, 0.1]), { color: COLOR.warm, width: 2.2, glow: 6, glowStrength: 0.3, persp: ref, intensity: 0.75 });
        const mpath = (sv) => [0.2 - sv * 0.82, Y0 + 0.75 + sv * 0.42 + 0.12 * Math.sin(sv * 2.2), 0.15];
        flow(ctx, 'pre2:ntp', (u) => lerp3([2.6, Y0 + 1.6, 0.4], [0.3, Y0 + 0.2, 0.1], u), { u0: 0, u1: 0.8, du: 0.2, n: 500, ref, alpha: 0.8 * (1 - pan), color: COLOR.warm, color2: COLOR.ink2, size: 2.8, jitter: 0.12 });
        flow(ctx, 'pre2:mrna', (u) => add3(mpath(u), [0, 0, 0.05]), { u0: 0.4, u1: 9, du: 0.6, n: 900, ref, alpha: 0.75 * (1 - pan), color: COLOR.warm, color2: COLOR.ink, size: 2.6, jitter: 0.05 });
        flow(ctx, 'pre2:msg', (u) => [RIB + u, -0.55, 0.06], { u0: -8, u1: 7, du: -0.9, n: 900, ref, alpha: 0.7 * pan, color: COLOR.warm, color2: COLOR.ink, size: 2.6, jitter: 0.04 });
        const made = Math.floor(p);
        const rna = []; for (let j = Math.max(0, made - 40); j < made; j++) rna.push(mpath((p - j) * SP));
        if (rna.length > 1) ctx.line(rna, { color: COLOR.warm, width: 3.4, glow: 12, glowStrength: 0.45, persp: ref });
        for (let j = Math.max(0, made - 9); j < made; j++) {
          const q = mpath((p - j) * SP), u = SRY_CDS[j] === 'T' ? 'U' : SRY_CDS[j];
          ctx.text3D(u, add3(q, [0, 0.3, 0]), { font: 'monoBold', size: 18, align: 'center', baseline: 'middle', color: baseCol(u), ref, minSize: 14, maxSize: 20, alpha: 1 - smoothstep(6, 9, made - j) });
        }
        // ---- translation: the mRNA through the ribosome, three bases (a codon) per step; the chain of amino acids grows
        const q = codonsAt(T, t), YM = -0.55, XM = (n) => RIB + (n - 3 * q) * SP;
        const n0 = Math.max(0, Math.floor(3 * q) - 24), n1 = Math.floor(3 * q) + 24;
        ctx.line(polyline(n1 - n0, (u) => [XM(n0 + u * (n1 - n0)), YM, 0]), { color: COLOR.warm, width: 3.4, glow: 12, glowStrength: 0.45, persp: ref });
        for (let n = n0; n <= n1; n++) {
          const u = SRY_CDS[n] === 'T' ? 'U' : SRY_CDS[n], a = 1 - smoothstep(10, 16, Math.abs(XM(n) - RIB) / SP);
          if (a > 0.02) ctx.text3D(u, [XM(n), YM - 0.26, 0.05], { font: 'monoBold', size: 18, align: 'center', baseline: 'middle', color: baseCol(u), ref, minSize: 14, maxSize: 20, alpha: a });
          if (n % 3 === 0) ctx.line([[XM(n) - 0.12, YM - 0.46, 0.05], [XM(n) + 3 * SP - 0.18, YM - 0.46, 0.05]], { color: Math.floor(n / 3) === Math.floor(q) ? COLOR.warm : COLOR.faint, width: 2, alpha: a, persp: ref });
        }
        // the ribosome: small subunit under the message, large subunit over it
        ctx.line(polyline(64, (u) => [RIB + Math.cos(u * TAU) * 1.05, YM - 0.92 + Math.sin(u * TAU) * 0.32, -0.05]), { color: COLOR.warm, width: 2.2, glow: 6, glowStrength: 0.3, persp: ref, intensity: 0.75 });
        ctx.line(polyline(64, (u) => [RIB + Math.cos(u * TAU) * 1.25, YM + 0.68 + Math.sin(u * TAU) * 0.6, -0.05]), { color: COLOR.warm, width: 2.2, glow: 6, glowStrength: 0.3, persp: ref, intensity: 0.75 });
        // the three tRNA sites of the large subunit: E (exit), P (the growing chain), A (the next codon)
        ['E', 'P', 'A'].forEach((nm, i) => ctx.text3D(nm, [RIB + (i - 1) * 3 * SP + 1.5 * SP, YM + 0.28, 0], { font: 'mono', size: 14, align: 'center', baseline: 'middle', color: COLOR.dim, ref, maxSize: 14 }));
        const nAA = t >= tP ? Math.min(SRY_PROTEIN.length, Math.floor(q) + 1) : 0;
        const ppath = (sv) => [RIB + 0.4 + sv * 0.55 + 0.25 * Math.sin(sv * 1.9), YM + 1.25 + sv * 0.55, 0.1];
        const beads = []; for (let k = 0; k < nAA; k++) beads.push(ppath((q - k) * 0.42));
        if (beads.length > 1) ctx.line(beads, { color: COLOR.me, width: 2.6, persp: ref, alpha: 0.9 });
        beads.forEach((b, k) => {
          ctx.point3D(b, 8, { fill: k === 0 ? COLOR.warm : COLOR.me, glow: 12, ref });
          ctx.text3D(SRY_PROTEIN[k], add3(b, [0.3, 0.02, 0]), { font: 'monoBold', size: 18, baseline: 'middle', color: COLOR.ink2, ref, minSize: 15, maxSize: 20 });
        });
        // AM, PM: the transcription site and the ribosome each ring out
        const AMw = wordIn(T, 'From AM to PM', 'AM');
        [[AMw.start, [0, Y0, 0]], [tP, [RIB, YM, 0]]].forEach(([ts, c], i) => {
          const pp = clamp((t - ts + 2 / 60) / T.beats(1.3));
          burst(ctx, { center: c, seed: 640 + i, n: 2800, r0: 0.7, r1: 5.5, p: pp, focus: ref, aperture: 3, size: 3.3, alpha: 1.05, color: COLOR.warm, color2: COLOR.me });
          if (pp > 0 && pp < 1) shockwave(ctx, { center: c, u: [1, 0, 0], v: [0, 1, 0], r: 1.3 + 2.5 * easeOutCubic(pp), alpha: 0.8 * (1 - pp), color: COLOR.warm, ref, width: 3 });
        });
        sparkAt(ctx, cam, { pos: lerp3([0, Y0 + 0.1, 0.7], [RIB, YM + 0.28, 0.7], pan), rays: 0.3 + 0.3 * decay(beatFrac(T, t), 5) }); // me is the polymerase, then the ribosome
        // one label: what the polymerase writes, then what the ribosome reads
        const cod = SRY_CDS.slice(3 * Math.floor(q), 3 * Math.floor(q) + 3).replace(/T/g, 'U'), aa = codonToAA(cod);
        const labels = t < tP - T.beats(0.3)
          ? [label(mpath(5.5), 'mRNA · U for T', { ref, color: COLOR.warm, alpha: smoothstep(t0 + T.beats(0.5), t0 + T.beats(0.8), t) })]
          : [label([RIB + 1.4, YM - 1.3, 0], `${cod} → ${AA3[aa]}${Math.floor(q) === 0 ? ' (start)' : ''}`, { ref, color: COLOR.warm, priority: 20, alpha: smoothstep(tP - 2 / 60, tP, t) })];
        labels3D(ctx, labels, { obstacles: [...beads.map((b) => ({ p: b, r: 22 })), { a: [XM(n0), YM, 0], b: [XM(n1), YM, 0], r: 26 }, ...rna.map((q2) => ({ p: q2, r: 24 })), { p: [0, Y0, 0], r: 120 }] });
        finish(ctx, cam);
      },
    },
    {
      id: 'role',
      hud: (T, t) => (t < switchAt(T) ? "Waddington's landscape · the cell waits where the valley forks" : 'SRY -> SOX9 tips the landscape · granulosa (ovary) or Sertoli (testis) cell'),
      at: (T) => cutOf(T, 'Oh switch my role'),
      transitionIn: { type: 'whip', frames: 10, align: 1 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = roleT0(T), ref = 10, sw = switchAt(T);
        const v = wadVAt(T, t), tilt = wadTiltAt(T, t), uu = wadU(T, t);
        const ball = add3(C.wadPt(uu, v, tilt), [0, 0.3, 0]);
        // low, from the valley mouths: the forked ridge stands against the sky
        const follow = easeInOutCubic(clamp((t - sw) / T.beats(1.5))) * (1 - 0.55 * easeInOutCubic(clamp((t - sw - T.beats(1.8)) / T.beats(1.2)))); // after the switch the camera goes down the valley with the cell
        const cam = orbit({ target: add3(lerp3([0, -0.9, -0.4], [ball[0] * 0.55, ball[1] - 0.6, ball[2] - 1.6], follow), shake(t, 0.02, 65)), r: lerp(11.5, 9.6, follow), az: 0.03 * (t - t0) + 0.25 * follow, el: lerp(0.34, 0.42, follow), fov: 40 });
        ctx.camera3D(cam);
        embers(ctx, { center: [0, 2.5, -4], radius: [4, 14], n: 4000, focus: ref, aperture: 5, size: 3, alpha: 0.6, color: COLOR.dim, color2: COLOR.ink2, seed: 643, upper: true });
        // the surface as particles, denser in the valleys (the relief reads as light), carried by SRY's tilt
        const surf = ctx.memo('pre2:surf', () => {
          const from = [], to = [];
          for (let i = 0; from.length < 9000 * 3 && i < 200000; i++) {
            const u = lerp(-1.6, 1.6, rand(i, 1, 660)), vv = rand(i, 2, 660);
            const vmin = Math.min(...[-1, 1].map((sg) => { const q = C.valleyU(vv, 0, sg); return q === null ? C.wadV(0, vv, 0) : C.wadV(q, vv, 0); }));
            if (rand(i, 3, 660) > Math.exp(-2.2 * (C.wadV(u, vv, 0) - vmin))) continue;
            from.push(...C.wadPt(u, vv, 0)); to.push(...C.wadPt(u, vv, 1));
          }
          return new Swarm({ from: new Float32Array(from), to: new Float32Array(to), seed: 661 });
        });
        ctx.swarm(surf, { p: tilt, stagger: 0, size: 2.4, sizeVar: 0.5, perspective: true, focus: ref, aperture: 3, color: COLOR.ink2, color2: COLOR.dim, colorVar: 0.3, alpha: 0.55 });
        for (let j = 0; j <= 12; j++) { const vv = j / 12; ctx.line(polyline(48, (q) => C.wadPt(lerp(-1.6, 1.6, q), vv, tilt)), { color: COLOR.faint, width: 1.2, alpha: 0.5, persp: ref, fog: [6, 24] }); }
        // the two valley floors, solved in the landscape's own coordinates; after the switch the ovary side greys out
        const floor = (sg) => { const out = []; for (let k = 0; k <= 40; k++) { const vv = lerp(0.2, 1, k / 40), q = C.valleyU(vv, tilt, sg); if (q === null) { if (out.length) break; continue; } out.push(add3(C.wadPt(q, vv, tilt), [0, 0.04, 0])); } return out; };
        const fl = floor(-1), fr = floor(1);
        if (fl.length > 1) fl.slice(1).forEach((q2, k) => ctx.line([fl[k], q2], { color: COLOR.dim, width: 2.6, alpha: (0.85 - 0.5 * tilt) * (1 - smoothstep(fl.length - 8, fl.length - 1, k)), persp: ref, fog: [6, 24] })); // tapers where the valley ends
        if (fr.length > 1) ctx.line(fr, { color: tilt > 0.3 ? COLOR.me : COLOR.dim, width: 2.6 + 2 * tilt, glow: 12 * tilt, alpha: 0.85, persp: ref, fog: [6, 24] });
        if (tilt > 0) flow(ctx, 'pre2:testis', (q) => { const vv = lerp(0.3, 0.98, q), r = C.valleyU(vv, 1, 1) ?? 1; return add3(C.wadPt(r, vv, 1), [0, 0.08, 0]); }, { u0: 0, u1: 0.9, du: 0.15, n: 700, ref, alpha: 0.85 * tilt, color: COLOR.me, color2: COLOR.warm, size: 3, jitter: 0.06 });
        // the cell's path since the switch
        // "switch": SRY tips the landscape — a ring from the cell, and a burst
        const ps = clamp((t - sw + 2 / 60) / T.beats(1.3));
        burst(ctx, { center: ball, seed: 650, n: 3000, r0: 0.6, r1: 5, p: ps, focus: ref, aperture: 3, size: 3.3, alpha: 1.1, color: COLOR.me, color2: COLOR.warm });
        if (ps > 0 && ps < 1) shockwave(ctx, { center: ball, u: [1, 0, 0], v: [0, 0, 1], r: 0.4 + 3 * easeOutCubic(ps), alpha: 0.85 * (1 - ps), ref, width: 3 });
        const rw = wordIn(T, 'Oh switch my role', 'role');
        burst(ctx, { center: ball, seed: 651, n: 1800, r0: 0.4, r1: 3, p: (t - rw.start + 2 / 60) / T.beats(1.2), focus: ref, aperture: 3, size: 3, alpha: 0.9, color: COLOR.warm, color2: COLOR.me });
        // me is the cell
        sparkAt(ctx, cam, { pos: ball, rays: 0.4 + 0.3 * decay(beatFrac(T, t), 5) });
        const big = { size: 34, minSize: 30, maxSize: 36, font: 'monoBold', backing: 1 };
        const sryA = smoothstep(sw, sw + T.beats(0.2), t) * (1 - smoothstep(sw + T.beats(1.6), sw + T.beats(2), t));
        labels3D(ctx, [
          label(add3(C.wadPt(-1.25, 0.88, tilt), [0, 0.7, 0]), 'ovary', { ...big, ref, color: COLOR.dim, alpha: 1 - 0.55 * tilt }),
          label(add3(C.wadPt(1.25, 0.88, tilt), [0, 0.7, 0]), 'testis', { ...big, ref, color: tilt > 0.5 ? COLOR.me : COLOR.dim, priority: 12 }),
          label(add3(ball, [0, 0.6, 0]), 'SRY -> SOX9', { ref, color: COLOR.warm, priority: 30, alpha: sryA, size: 24, minSize: 22, maxSize: 26, backing: 1 }),
        ], { obstacles: [{ p: ball, r: 50 }] });
        // the cell membrane around me
        const bp = ctx.project(ball);
        ctx.camera2D();
        ctx.circle(bp[0], bp[1], 52, { fill: [...COLOR.me, 0.06], stroke: COLOR.me, width: 2, alpha: 0.85 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'stom',
      hud: 'the cell cycle · G1 11 h · S 8 h · G2 4 h · M 1 h',
      at: (T) => cutOf(T, 'To S to M'),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = cutOf(T, 'To S to M'), dt = t - t0, ref = 7;
        const cam = orbit({ target: add3([0, 0.45, 0], shake(t, 0.02, 66)), r: lerp(8.8, 8.2, easeOutCubic(clamp(dt / T.beats(3)))), az: 0.12 - 0.05 * dt, el: 0.06, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref, { alpha: 0.6 + 0.3 * drums(ctx) });
        const h = hourAt(T, t), R = 2.0, ph = C.phaseAt(h);
        const at = (hh, r) => { const a = handAng(hh); return [Math.cos(a) * r, Math.sin(a) * r, 0]; };
        // the four phases as arcs of the 24 h dial
        let h0 = 0;
        for (const P of C.PHASES) {
          const cur = P.id === ph.id, col = P.id === 'S' ? COLOR.warm : P.id === 'M' ? COLOR.me : COLOR.dim;
          ctx.line(polyline(48, (q) => at(h0 + 0.12 + q * (P.h - 0.24), R)), { color: col, width: cur ? 8 : 5, glow: cur ? 8 : 3, alpha: cur ? 0.95 : 0.5, persp: ref, intensity: cur ? 0.85 : 0.75 });
          ctx.text3D(P.id, at(h0 + P.h / 2, R + 0.5), { font: 'monoBold', size: 26, align: 'center', baseline: 'middle', color: cur ? col : COLOR.dim, ref, minSize: 22, maxSize: 28 });
          h0 += P.h;
        }
        // the hand, and me riding its tip
        ctx.line([at(h, 1.15), at(h, R - 0.25)], { color: COLOR.dim, width: 3, persp: ref, alpha: 0.85 });
        // at the centre the cell's chromosome: one chromatid in G1, copied into two sister chromatids through S
        const rep = clamp((h - C.phaseStart('S')) / 8), cond = ph.id === 'M' ? 1 : 0;
        const sc = 0.62 * (1 - 0.25 * cond);
        const chrom = (sd) => B.chromatidOutline(0, sd * rep, 48).map((q) => [q[0] * sc, q[1] * sc + 0.25, 0]);
        ctx.line(chrom(-1), { color: COLOR.me, width: 2.6, glow: 10, persp: ref });
        if (rep > 0.02) ctx.line(chrom(1), { color: COLOR.warm, width: 2.6, glow: 10, persp: ref, alpha: smoothstep(0, 0.2, rep) });
        flow(ctx, 'pre2:dial', (q) => at(q, R), { u0: 0, u1: C.CYCLE_H, du: 1.6, n: 900, ref, alpha: 0.6, color: COLOR.warm, color2: COLOR.ink, size: 2.6, jitter: 0.05 });
        // "S" and "M" ring out from the dial where the hand crosses into them
        [[S_AT(T), 'S'], [M_AT(T), 'M']].forEach(([ts, id], i) => {
          const pp = clamp((t - ts + 2 / 60) / T.beats(1.3)), c = at(C.phaseStart(id), R);
          burst(ctx, { center: c, seed: 660 + i, n: 2600, r0: 0.5, r1: 4.5, p: pp, focus: ref, aperture: 3, size: 3.2, alpha: 1.1, color: i ? COLOR.me : COLOR.warm, color2: COLOR.ink });
          if (pp > 0 && pp < 1) shockwave(ctx, { center: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], r: R + 2.2 * easeOutCubic(pp), alpha: 0.8 * (1 - pp), color: i ? COLOR.me : COLOR.warm, ref, width: 3 });
        });
        sparkAt(ctx, cam, { pos: at(h, R), rays: 0.35 + 0.3 * decay(beatFrac(T, t), 5) });
        // the one thing to read: the phase the cell is in
        ctx.camera2D();
        const tw = ctx.measure(ph.name, { font: 'monoBold', size: 32 });
        ctx.mask(1860 - tw - 12, 200 - 34, tw + 24, 48, 1);
        ctx.text(ph.name, 1860, 200, { font: 'monoBold', size: 32, align: 'right', color: ph.id === 'M' ? COLOR.me : ph.id === 'S' ? COLOR.warm : COLOR.ink2 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'enter',
      hud: (T, t) => `mitosis · ${mitPhase(T, t)}`,
      at: (T) => cutOf(T, 'So we can enter'),
      transitionIn: { type: 'glide', beats: 0.5, align: 0 }, // after the cut: "M" is sung just before it
      draw(ctx) {
        const { T, t } = ctx;
        const m = MIT(T), dt = t - m.t0, ref = 7.4;
        const cam = orbit({ target: add3([0, 0, 0], shake(t, 0.02, 67)), r: lerp(7.6, 7.0, easeOutCubic(clamp(dt / T.beats(3)))) + 1.3 * easeInOutCubic(clamp((t - m.enter) / T.beats(1))), az: 0.08 - 0.03 * dt, el: 0.06, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref, { alpha: 0.6 + 0.3 * drums(ctx) });
        const kMeta = easeInOutCubic(clamp((t - m.t0 - T.beats(0.3)) / T.beats(1.4)));                   // to the plate
        const kAna = easeInOutCubic(clamp((t - m.can) / (m.enter - T.beats(0.5) - m.can)));               // sisters to the poles
        // the membrane: a Cassini oval |z − c||z + c| = b²; the waist closes exactly on "enter" (c = b: a figure eight)
        const cc = t < m.enter ? CELL_B * easeInCubic(clamp((t - (m.enter - T.beats(1))) / T.beats(1))) : CELL_B * lerp(1, 1.25, easeOutCubic(clamp((t - m.enter) / T.beats(0.8))));
        const kCyto = clamp(cc / CELL_B - 1, 0, 0.25) / 0.25;
        const dmid = cc > CELL_B ? (Math.sqrt(cc * cc + CELL_B * CELL_B) + Math.sqrt(cc * cc - CELL_B * CELL_B)) / 2 : POLE - 0.5;
        for (const loop of C.cassini(Math.max(cc, 0.001), CELL_B)) ctx.line([...loop, loop[0]].map(([x, y]) => mitRot([x, y, 0])), { color: COLOR.me, width: 3.4, glow: 14, glowStrength: 0.45, persp: ref, intensity: 1.05 });
        // the cytoplasm of each daughter as a particle cloud (one cloud before the split)
        const cyto = ctx.memo('pre2:cyto', () => { const pts = []; for (let i = 0; i < 2200; i++) { const a = rand(i, 1, 670) * TAU, r = Math.sqrt(rand(i, 2, 670)); pts.push(Math.cos(a) * r, Math.sin(a) * r, (rand(i, 3, 670) - 0.5) * 0.3); } return new Swarm({ from: new Float32Array(pts), seed: 671 }); });
        const cyM = (sx, sc) => new THREE.Matrix4().makeRotationZ(MIT_TILT).multiply(new THREE.Matrix4().makeTranslation(sx, 0, 0)).multiply(new THREE.Matrix4().makeScale(sc[0], sc[1], 1));
        if (kCyto <= 0) ctx.swarm(cyto, { p: 0, size: 2.4, perspective: true, focus: ref, aperture: 3, drift: 0.02, time: t, color: COLOR.me, color2: COLOR.dim, colorVar: 0.3, alpha: 0.35, model: cyM(0, [CELL_B * 0.9 + cc * 0.4, CELL_B * 0.9 * (1 - 0.3 * cc / CELL_B)]) });
        else for (const sx of [-1, 1]) ctx.swarm(cyto, { p: 0, size: 2.4, perspective: true, focus: ref, aperture: 3, drift: 0.02, time: t, color: COLOR.me, color2: COLOR.dim, colorVar: 0.3, alpha: 0.35, model: cyM(sx * dmid, [0.8, 0.95]) });
        // the nuclear envelope dissolves in prophase; two re-form around the daughter chromosomes
        const env = 1 - smoothstep(0.2, 0.9, dt / T.beats(1));
        if (env > 0.01) ctx.line(polyline(80, (q) => mitRot([Math.cos(q * TAU) * 1.25, Math.sin(q * TAU) * 1.25, 0])), { color: COLOR.dim, width: 2, alpha: env, persp: ref, dash: 6, gap: 5 });
        const tel = smoothstep(0.3, 0.9, kCyto);
        if (tel > 0.01) for (const sx of [-1, 1]) ctx.line(polyline(64, (q) => mitRot([sx * dmid + Math.cos(q * TAU) * 0.48, Math.sin(q * TAU) * 0.66, 0])), { color: COLOR.dim, width: 2, alpha: tel, persp: ref, dash: 6, gap: 5 });
        // the spindle: microtubules from the two poles (centrosomes) to every kinetochore
        const spin = smoothstep(0.1, 0.6, kMeta) * (1 - tel);
        const poles = [[-POLE - 0.3 * kCyto, 0, 0], [POLE + 0.3 * kCyto, 0, 0]];
        // chromosomes: each two sister chromatids (thick capsules) — scattered, on the plate, then pulled apart: each
        // chromatid is dragged by its centromere, so its arms trail behind it in a V
        CHROMS.forEach((ch, i) => {
          const scat = [Math.cos(i * 2.1 + 0.6) * 0.6, Math.sin(i * 2.1 + 0.6) * 0.6];
          const cx = lerp(scat[0], 0, kMeta), cy = lerp(scat[1], ch.y, kMeta);
          for (const sd of [-1, 1]) {
            const x = cx + sd * lerp(0.025, lerp(POLE - 0.35, dmid, kCyto), kAna), y = lerp(cy, ch.y * lerp(0.75, 0.5, kCyto), kAna);
            // joined at the centromere (an X) until anaphase; then each is dragged by it, arms trailing in a V
            const bend = 1.0 * kAna * (1 - 0.6 * kCyto), spread = 0.07 * (1 - kAna);
            const hx = -sd * Math.sin(bend) * ch.h + sd * spread, hy = Math.cos(bend) * ch.h;
            const fade = 1 - smoothstep(m.enter, m.enter + T.beats(0.5), t);
            if (fade > 0.01) ctx.line([mitRot([x + hx, y + hy, 0]), mitRot([x, y, 0]), mitRot([x + hx, y - hy, 0])], { color: i % 2 ? COLOR.warm : COLOR.me, width: 9, glow: 8, persp: ref, alpha: fade });
            if (spin > 0.01) ctx.line([mitRot(poles[sd < 0 ? 0 : 1]), mitRot([x, y, 0])], { color: COLOR.dim, width: 1.2, alpha: 0.7 * spin, persp: ref });
          }
        });
        for (const pl of poles) if (spin > 0.01) for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; ctx.line([mitRot(pl), mitRot(add3(pl, [Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0]))], { color: COLOR.dim, width: 1, alpha: 0.6 * spin, persp: ref }); }
        // the words: small pulses; "enter": light from the waist where the cell splits
        L(T, 'So we can enter').words.forEach((w, i) => {
          const pp = clamp((t - w.start + 2 / 60) / T.beats(1.2));
          burst(ctx, { center: i === 3 ? [0, 0, 0] : mitRot([0, CHROMS[i].y, 0]), seed: 670 + i, n: i === 3 ? 2600 : 1200, r0: i === 3 ? 0.3 : 0.3, r1: i === 3 ? 4 : 2.5, p: pp, focus: ref, aperture: 3, size: 3, alpha: 0.85, color: COLOR.me, color2: COLOR.warm });
        });
        // me is the left centrosome, pulling half the chromosomes to its side
        sparkAt(ctx, cam, { pos: mitRot(poles[0]), rays: 0.35 + 0.3 * decay(beatFrac(T, t), 5) });
        ctx.camera2D();
        const ph = mitPhase(T, t), tw = ctx.measure(ph, { font: 'monoBold', size: 32 });
        ctx.mask(1860 - tw - 12, 200 - 34, tw + 24, 48, 1);
        ctx.text(ph, 1860, 200, { font: 'monoBold', size: 32, align: 'right', color: ph === 'cytokinesis' ? COLOR.me : COLOR.ink2 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'trance',
      hud: (T, t) => { const n = divCount(T, t); return `cleavage · 2^${n} = ${2 ** n} cell${n ? 's' : ''} · each division halves every cell's volume`; },
      at: tranceStart,
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = tranceStart(T), dt = t - t0, ref = 7;
        const d = divAt(T, t), n = Math.floor(d + 1e-6), f = easeInOutCubic(clamp((d - n) / 0.45));
        const { pos, r } = n < MAX_DIV && d > n + 1e-6 ? C.cleavage(n + 1, f) : C.cleavage(n, 1);
        const lineage = pos[0]; // me: the cell that took the first branch at every division
        // circling ever faster, rolling: hypnotic
        const spin = 0.6 * dt + 0.35 * dt * dt, roll = 0.15 * dt * dt;
        const camPos = [Math.sin(spin) * 8.6, 1.6 * Math.cos(spin * 0.7), Math.cos(spin) * 8.6];
        const cam = { fov: 40, position: camPos, target: [0, 0, 0], up: [Math.sin(roll), Math.cos(roll), 0] };
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        embers(ctx, { radius: [3, 11], n: 5000, focus: ref, aperture: 5, size: 3.2, alpha: 0.75, color: COLOR.dim, color2: COLOR.ink2, seed: 642 });
        // the zona pellucida around the embryo
        ctx.line(polyline(96, (q) => { const a = q * TAU, rr = 2.85; const rt = [Math.cos(a) * rr, Math.sin(a) * rr, 0]; const cs = Math.cos(spin), sn = Math.sin(spin); return [rt[0] * cs, rt[1], -rt[0] * sn]; }), { color: COLOR.dim, width: 1.6, alpha: 0.5, persp: ref });
        // the cells: membrane discs with a nucleus, all the same size (the volume is shared out)
        const order = pos.map((p, i) => ({ p, i, w: ctx.project(p)[2] })).sort((a, b) => b.w - a.w);
        for (const c of order) {
          // opaque cells drawn back to front: the embryo reads as a solid ball
          ctx.point3D(c.p, r * 190, { fill: COLOR.bg2, alpha: 0.92, ref });
          ctx.point3D(c.p, r * 190, { fill: [0, 0, 0, 0], stroke: COLOR.me, width: 1.8, ref, alpha: 0.95 });
          ctx.point3D(c.p, Math.max(2, r * 24), { fill: COLOR.warm, ref, alpha: 0.55, intensity: 0.7 });
        }
        // every division is a beat of light from the middle
        const k = Math.floor(d - 1e-6), pd = clamp(((d - Math.max(0, k)) * DIV_BEATS) / 0.6);
        if (d > 0) burst(ctx, { center: [0, 0, 0], seed: 680 + (k % 3), n: 2600, r0: 1.2, r1: 6, p: pd, focus: ref, aperture: 3, size: 3.2, alpha: 0.9, color: COLOR.me, color2: COLOR.warm });
        if (d > 0 && pd < 1) shockwave(ctx, { center: [0, 0, 0], u: [Math.cos(spin), 0, -Math.sin(spin)], v: [0, 1, 0], r: 2.4 + 2 * easeOutCubic(pd), alpha: 0.7 * (1 - pd), ref, width: 2.5 });
        ctx.post({ exposure: 1 + 0.15 * decay(beatFrac(T, t), 4) });
        sparkAt(ctx, cam, { pos: lineage.map((v, i) => v * (1 + (r * 0.4) / Math.max(0.1, Math.hypot(...lineage)))), rays: 0.45 + 0.3 * decay(beatFrac(T, t), 5) });
        // the count, the one thing to read
        ctx.camera2D();
        const cnt = 2 ** divCount(T, t), txt = `${cnt} ${cnt === 1 ? 'cell' : 'cells'}`;
        const tw = ctx.measure(txt, { font: 'monoBold', size: 34 });
        ctx.mask(1500 - tw - 12, 905, tw + 24, 48, 1);
        ctx.text(txt, 1500, 940, { font: 'monoBold', size: 34, align: 'right', color: COLOR.me });
        corners(ctx, { color: COLOR.faint });
      },
    },
  ],
});
