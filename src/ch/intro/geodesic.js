// Geodesic sphere: icosahedron, each triangle split in 4 per level, vertices pushed onto the sphere.
// level 2 -> 162 vertices, 480 edges, 320 faces. Edges are returned sorted bottom-to-top (mean y), so the shell can
// be "grown" from the base by revealing a prefix.
export function geodesic(level = 2, radius = 1) {
  const p = (1 + Math.sqrt(5)) / 2;
  let V = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]];
  let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  V = V.map(norm);
  for (let s = 0; s < level; s++) {
    const mid = new Map();
    const m = (a, b) => {
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      if (!mid.has(k)) { V.push(norm(V[a].map((x, i) => (x + V[b][i]) / 2))); mid.set(k, V.length - 1); }
      return mid.get(k);
    };
    F = F.flatMap(([a, b, c]) => { const ab = m(a, b), bc = m(b, c), ca = m(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
  }
  const verts = V.map((v) => v.map((x) => x * radius));
  const seen = new Set(), edges = [];
  for (const [a, b, c] of F) for (const [i, j] of [[a, b], [b, c], [c, a]]) {
    const k = i < j ? `${i},${j}` : `${j},${i}`;
    if (!seen.has(k)) { seen.add(k); edges.push([Math.min(i, j), Math.max(i, j)]); }
  }
  edges.sort((e, f) => (verts[e[0]][1] + verts[e[1]][1]) - (verts[f[0]][1] + verts[f[1]][1]) || e[0] - f[0] || e[1] - f[1]);
  return { verts, edges, faces: F };
}
