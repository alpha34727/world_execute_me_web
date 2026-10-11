// Decimal digits of π by the Rabinowitz–Wagon spigot (exact integer arithmetic, no stored constant).
let cache = '';

export function piDigits(n) {
  if (cache.length >= n) return cache.slice(0, n);
  const len = Math.floor((10 * (n + 2)) / 3) + 1;
  const a = new Array(len).fill(2);
  let out = '';
  let nines = 0, predigit = 0;
  for (let j = 0; j < n + 2; j++) {
    let q = 0;
    for (let i = len; i > 0; i--) {
      const x = 10 * a[i - 1] + q * i;
      a[i - 1] = x % (2 * i - 1);
      q = Math.floor(x / (2 * i - 1));
    }
    a[0] = q % 10;
    q = Math.floor(q / 10);
    if (q === 9) nines++;
    else if (q === 10) {
      out += String(predigit + 1) + '0'.repeat(nines);
      predigit = 0; nines = 0;
    } else {
      if (j > 0) out += String(predigit);
      predigit = q;
      if (nines) { out += '9'.repeat(nines); nines = 0; }
    }
  }
  cache = out.slice(0, n); // "31415926535..."
  return cache;
}
