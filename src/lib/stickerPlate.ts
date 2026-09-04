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

export function quadClipPath(q: PlateQuadDef): string {
  const { tl, tr, br, bl } = q;
  return `polygon(${tl.x}% ${tl.y}%, ${tr.x}% ${tr.y}%, ${br.x}% ${br.y}%, ${bl.x}% ${bl.y}%)`;
}

/**
 * Map unit square → quad in 0–1 image space. For a layer sized to the full photo.
 * Corner order: tl, tr, br, bl.
 */
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

/** Homography for a layer covering the full sticker image (inset-0). */
export function quadHomographyMatrix3d(q: PlateQuadDef): string {
  return squareToQuadMatrix3d(
    q.tl.x / 100,
    q.tl.y / 100,
    q.tr.x / 100,
    q.tr.y / 100,
    q.br.x / 100,
    q.br.y / 100,
    q.bl.x / 100,
    q.bl.y / 100,
  );
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
