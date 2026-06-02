export type Point = { x: number; y: number; pressure: number; t: number };
export type Stroke = { id: string; points: Point[]; color: string; size: number };

export function newStrokeId() {
  return Math.random().toString(36).slice(2, 10);
}

export function strokeBBox(s: Stroke) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of s.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export function groupStrokesIntoLines(strokes: Stroke[], lineHeightPx = 60) {
  const items = strokes.map((s) => ({ s, bb: strokeBBox(s) }));
  items.sort((a, b) => (a.bb.minY + a.bb.maxY) / 2 - (b.bb.minY + b.bb.maxY) / 2);
  const lines: Stroke[][] = [];
  let current: typeof items = [];
  let currentMidY = -Infinity;
  for (const it of items) {
    const mid = (it.bb.minY + it.bb.maxY) / 2;
    if (Math.abs(mid - currentMidY) > lineHeightPx && current.length > 0) {
      lines.push(current.map((c) => c.s));
      current = [];
    }
    current.push(it);
    currentMidY = current.reduce((a, c) => a + (c.bb.minY + c.bb.maxY) / 2, 0) / current.length;
  }
  if (current.length) lines.push(current.map((c) => c.s));
  return lines;
}
