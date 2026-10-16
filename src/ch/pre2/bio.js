// The biology of pre2: the sex chromosomes and the DNA double helix. Pure geometry, no drawing.

const TAU = Math.PI * 2;

// ---- X and Y at metaphase (GRCh38): length, centromere (mid-point), the shared pseudoautosomal tip PAR1, and SRY,
// the sex-determining gene on the Y's short arm (Yp11.2) — the one switch that turns XX development into XY
export const CHR = {
  X: { len: 156.04, cen: 59.55 },
  Y: { len: 57.23, cen: 10.45 },
};
export const PAR1 = 2.78; // Mb from the p-arm tip, identical on X and Y
export const SRY = 2.787; // Mb from the Yp tip, just past PAR1
export const MB = 1 / 55; // world units per megabase
// the chromosome at morph m (0 = X, 1 = Y): length and centromere interpolate; y = 0 at the centromere
export const chrAt = (m) => ({ len: CHR.X.len + (CHR.Y.len - CHR.X.len) * m, cen: CHR.X.cen + (CHR.Y.cen - CHR.X.cen) * m });
// position of a point on sister chromatid s (±1) at fraction u along it (0 = p tip, 1 = q tip), v ∈ [-1, 1] across
const HW = 0.15;
export function chromatidPt(m, s, u, v) {
  const { len, cen } = chrAt(m);
  const y = (cen - u * len) * MB;
  const top = cen * MB, bot = -(len - cen) * MB;
  // the sisters are held together at the centromere (the primary constriction), so the pair reads as an X shape
  const pinch = 1 - 0.55 * Math.exp(-((y / 0.1) ** 2));
  const cap = Math.sqrt(Math.max(0, Math.min(1, (top - y) / HW, (y - bot) / HW))); // rounded tips
  const hw = HW * pinch * Math.min(1, 0.25 + 0.75 * cap);
  const cx = s * (0.19 - 0.12 * Math.exp(-((y / 0.22) ** 2)));
  return [cx + v * hw, y, 0];
}
// the outline of one sister chromatid (a closed polyline)
export function chromatidOutline(m, s, n = 64) {
  const left = Array.from({ length: n + 1 }, (_, i) => chromatidPt(m, s, i / n, -1));
  const right = Array.from({ length: n + 1 }, (_, i) => chromatidPt(m, s, 1 - i / n, 1));
  return [...left, ...right, left[0]];
}
// a band across both sisters at `mb` megabases from the p tip (0 when outside the chromosome)
export function bandAt(m, mb) {
  const { len } = chrAt(m);
  if (mb < 0 || mb > len) return null;
  const u = mb / len;
  return [-1, 1].map((s) => [chromatidPt(m, s, u, -1), chromatidPt(m, s, u, 1)]);
}

// ---- B-DNA: 10.5 base pairs per turn, and the two backbones 144° apart around the axis (the minor and major groove)
export const TWIST = TAU / 10.5, GROOVE = (144 / 180) * Math.PI;
