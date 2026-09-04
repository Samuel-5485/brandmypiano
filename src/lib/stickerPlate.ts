export type Pt = { x: number; y: number };

export type PlateQuadDef = {
  tl: Pt;
  tr: Pt;
  br: Pt;
  bl: Pt;
};

/**
 * Inner cream surface corners on public/e383-sticker.jpg (% of image).
 * Inset from the black bezel so vinyl sits on cream only.
 */
export const STICKER_PLATE_QUADS: Record<1 | 2, PlateQuadDef> = {
  1: {
    tl: { x: 16.4, y: 17.2 },
    tr: { x: 67.8, y: 12.0 },
    br: { x: 71.8, y: 46.2 },
    bl: { x: 18.6, y: 53.8 },
  },
  2: {
    tl: { x: 37.8, y: 64.6 },
    tr: { x: 63.2, y: 63.2 },
    br: { x: 66.2, y: 71.8 },
    bl: { x: 39.4, y: 73.4 },
  },
};

export function quadBounds(q: PlateQuadDef) {
  const xs = [q.tl.x, q.tr.x, q.br.x, q.bl.x];
  const ys = [q.tl.y, q.tr.y, q.br.y, q.bl.y];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}

function dist(a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

/** Bilinear point inside a quad (u,v ∈ [0,1]). */
export function bilinearQuad(q: PlateQuadDef, u: number, v: number): Pt {
  const { tl, tr, br, bl } = q;
  const a = 1 - u;
  const b = 1 - v;
  return {
    x: a * b * tl.x + u * b * tr.x + a * v * bl.x + u * v * br.x,
    y: a * b * tl.y + u * b * tr.y + a * v * bl.y + u * v * br.y,
  };
}

function quadFromParametric(
  q: PlateQuadDef,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
): PlateQuadDef {
  return {
    tl: bilinearQuad(q, u0, v0),
    tr: bilinearQuad(q, u1, v0),
    br: bilinearQuad(q, u1, v1),
    bl: bilinearQuad(q, u0, v1),
  };
}

/** Average vertical edge length of a quad in pixels. */
export function quadPlateHeight(q: PlateQuadDef): number {
  return (dist(q.tl, q.bl) + dist(q.tr, q.br)) / 2;
}

/** Centered inner quad preserving plate perspective; height ≈ fraction of outer. */
export function innerCenteredLogoQuad(
  q: PlateQuadDef,
  heightFraction = 0.6,
): PlateQuadDef {
  const outerH = quadPlateHeight(q);
  const targetH = outerH * heightFraction;

  let lo = 0;
  let hi = 0.49;
  for (let i = 0; i < 24; i++) {
    const t = (lo + hi) / 2;
    const inner = quadFromParametric(q, 0.5 - t, 0.5 - t, 0.5 + t, 0.5 + t);
    const innerH = quadPlateHeight(inner);
    if (innerH < targetH) lo = t;
    else hi = t;
  }

  const t = (lo + hi) / 2;
  return quadFromParametric(q, 0.5 - t, 0.5 - t, 0.5 + t, 0.5 + t);
}

export function quadClipPath(q: PlateQuadDef): string {
  const { tl, tr, br, bl } = q;
  return `polygon(${tl.x}% ${tl.y}%, ${tr.x}% ${tr.y}%, ${br.x}% ${br.y}%, ${bl.x}% ${bl.y}%)`;
}

/** Convert percent quad corners to pixel coordinates for a measured photo size. */
export function quadPercentToPixels(
  q: PlateQuadDef,
  photoW: number,
  photoH: number,
): PlateQuadDef {
  const sx = (x: number) => (x / 100) * photoW;
  const sy = (y: number) => (y / 100) * photoH;
  return {
    tl: { x: sx(q.tl.x), y: sy(q.tl.y) },
    tr: { x: sx(q.tr.x), y: sy(q.tr.y) },
    br: { x: sx(q.br.x), y: sy(q.br.y) },
    bl: { x: sx(q.bl.x), y: sy(q.bl.y) },
  };
}

function solveLinear8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]!]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row]![col]!) > Math.abs(M[pivot]![col]!)) pivot = row;
    }
    if (Math.abs(M[pivot]![col]!) < 1e-10) return null;
    [M[col], M[pivot]] = [M[pivot]!, M[col]!];

    for (let row = col + 1; row < n; row++) {
      const factor = M[row]![col]! / M[col]![col]!;
      for (let j = col; j <= n; j++) {
        M[row]![j]! -= factor * M[col]![j]!;
      }
    }
  }

  const x = new Array<number>(n);
  for (let row = n - 1; row >= 0; row--) {
    let sum = M[row]![n]!;
    for (let col = row + 1; col < n; col++) sum -= M[row]![col]! * x[col]!;
    x[row] = sum / M[row]![row]!;
  }
  return x;
}

/**
 * Homography matrix3d mapping a logo rectangle (0,0)-(logoW,logoH) to a dest quad in pixels.
 * Returns null when the system is singular / unstable.
 */
export function rectToQuadMatrix3d(
  logoW: number,
  logoH: number,
  dest: PlateQuadDef,
): string | null {
  if (logoW <= 0 || logoH <= 0) return null;

  const src: Pt[] = [
    { x: 0, y: 0 },
    { x: logoW, y: 0 },
    { x: logoW, y: logoH },
    { x: 0, y: logoH },
  ];
  const dst: Pt[] = [dest.tl, dest.tr, dest.br, dest.bl];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = src[i]!;
    const { x: dx, y: dy } = dst[i]!;
    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    b.push(dy);
  }

  const sol = solveLinear8(A, b);
  if (!sol) return null;

  const [a, bVal, c, d, e, f, g, h] = sol;
  if (!sol.every((v) => Number.isFinite(v))) return null;

  return `matrix3d(${[
    a, d, 0, g,
    bVal, e, 0, h,
    0, 0, 1, 0,
    c, f, 0, 1,
  ].join(",")})`;
}

export function isMatrix3dStable(matrix: string | null): matrix is string {
  if (!matrix) return false;
  const nums = matrix
    .replace(/^matrix3d\(/, "")
    .replace(/\)$/, "")
    .split(",")
    .map(Number);
  return nums.length === 16 && nums.every((n) => Number.isFinite(n));
}

/** Square logo layer sized to a centered inner mark (~heightFraction of plate). */
export function centeredLogoLayerSize(
  platePx: PlateQuadDef,
  heightFraction = 0.6,
): { logoW: number; logoH: number; innerQuad: PlateQuadDef } {
  const innerQuad = innerCenteredLogoQuad(platePx, heightFraction);
  const side = Math.max(quadPlateHeight(innerQuad), 1);
  return { logoW: side, logoH: side, innerQuad };
}

/** @deprecated Use STICKER_PLATE_QUADS + quadClipPath for perspective plates. */
export const PLATE_BOXES = {
  1: { left: "17%", top: "15%", width: "53%", height: "40%" },
  2: { left: "37%", top: "63%", width: "30%", height: "15%" },
} as const;

export const STICKER_PLATE_ASPECT = {
  1: { width: 220, height: 166 },
  2: { width: 180, height: 90 },
} as const;
