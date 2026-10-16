// Real 4D hypercube: 16 vertices (±1)^4, 32 edges between vertices differing in one coordinate.
// Rotated in the XW, YW and ZW planes, then perspective-projected 4D → 3D (eye on the w axis).
const V = [];
for (let i = 0; i < 16; i++) V.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
const E = [];
for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) { const j = i ^ (1 << b); if (j > i) E.push([i, j]); }

function rot(p, a, b, th) {
  const c = Math.cos(th), s = Math.sin(th);
  const q = p.slice();
  q[a] = c * p[a] - s * p[b];
  q[b] = s * p[a] + c * p[b];
  return q;
}

// returns [{ pts: [[x,y,z],[x,y,z]], depth: 0..1 (1 = nearest in w) }]
export function tesseract(angle, { dist4 = 3 } = {}) {
  const P = V.map((v) => {
    let p = rot(v, 0, 3, angle);
    p = rot(p, 1, 3, angle * 0.7);
    p = rot(p, 2, 3, angle * 0.45);
    p = rot(p, 0, 2, angle * 0.3);
    const k = dist4 / (dist4 - p[3]);
    return { x: [p[0] * k, p[1] * k, p[2] * k], w: p[3] };
  });
  return E.map(([i, j]) => ({ pts: [P[i].x, P[j].x], depth: ((P[i].w + P[j].w) / 2 + 2) / 4 }));
}
