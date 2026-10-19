/**
 * Deterministic beeswarm: positions along `along` are fixed; each dot gets the smallest
 * cross offset (alternating sides) that keeps it at least 2r from every placed dot.
 */
export function beeswarm(along: number[], radius: number): number[] {
  const order = along.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const placed: { a: number; c: number }[] = [];
  const offsets = new Array<number>(along.length).fill(0);
  const minDist = 2 * radius;
  for (const [a, i] of order) {
    const near = placed.filter((p) => Math.abs(p.a - a) < minDist);
    let c = 0;
    for (let k = 0; k < 4 * along.length; k++) {
      c = k === 0 ? 0 : Math.ceil(k / 2) * (k % 2 ? 1 : -1) * (radius / 2);
      if (near.every((p) => (p.a - a) ** 2 + (p.c - c) ** 2 >= minDist ** 2 - 1e-9)) break;
    }
    placed.push({ a, c });
    offsets[i] = c;
  }
  return offsets;
}
