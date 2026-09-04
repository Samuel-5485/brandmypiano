export type Pt = { x: number; y: number };

export type PlateQuadDef = {
  tl: Pt;
  tr: Pt;
  br: Pt;
  bl: Pt;
};

/** Cream-plate corners on public/e383-sticker.jpg (% of image). */
export const STICKER_PLATE_QUADS: Record<1 | 2, PlateQuadDef> = {
  1: {
    tl: { x: 14.2, y: 15.2 },
    tr: { x: 69.8, y: 10.4 },
    br: { x: 74.6, y: 47.8 },
    bl: { x: 17.1, y: 55.6 },
  },
  2: {
    tl: { x: 36.2, y: 63.8 },
    tr: { x: 64.8, y: 62.1 },
    br: { x: 67.9, y: 72.4 },
    bl: { x: 38.1, y: 74.2 },
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

/** Map unit square (0,0)-(1,0)-(1,1)-(0,1) → quad in 0–1 space. CSS matrix3d. */
export function squareToQuadMatrix3d(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): string {
  const dx1 = x1 - x2;
  const dy1 = y1 - y2;
  const dx2 = x3 - x2;
  const dy2 = y3 - y2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy3 = y0 - y1 + y2 - y3;
  const denom = dx1 * dy2 - dx2 * dy1;
  let g = 0;
  let h = 0;
  if (Math.abs(denom) > 1e-8) {
    g = (dx3 * dy2 - dx2 * dy3) / denom;
    h = (dx1 * dy3 - dx3 * dy1) / denom;
  }
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const f = y0;

  return `matrix3d(${[
    a, d, 0, g,
    b, e, 0, h,
    0, 0, 1, 0,
    c, f, 0, 1,
  ].join(",")})`;
}

export function quadHomographyMatrix3d(
  q: PlateQuadDef,
  bounds = quadBounds(q),
): string {
  const n = (p: Pt) => ({
    x: (p.x - bounds.minX) / bounds.w,
    y: (p.y - bounds.minY) / bounds.h,
  });
  const tl = n(q.tl);
  const tr = n(q.tr);
  const br = n(q.br);
  const bl = n(q.bl);
  return squareToQuadMatrix3d(tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y);
}

/** @deprecated Use STICKER_PLATE_QUADS + quadBounds for perspective plates. */
export const PLATE_BOXES = {
  1: { left: "17%", top: "15%", width: "53%", height: "40%" },
  2: { left: "37%", top: "63%", width: "30%", height: "15%" },
} as const;

export const STICKER_PLATE_ASPECT = {
  1: { width: 220, height: 166 },
  2: { width: 180, height: 90 },
} as const;
