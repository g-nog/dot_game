import type { Dot } from './model';

export function orientation(a: Dot, b: Dot, c: Dot): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

export function pointOnSegment(point: Dot, a: Dot, b: Dot): boolean {
  return (
    orientation(a, b, point) === 0 &&
    point.x >= Math.min(a.x, b.x) &&
    point.x <= Math.max(a.x, b.x) &&
    point.y >= Math.min(a.y, b.y) &&
    point.y <= Math.max(a.y, b.y)
  );
}

export function segmentsIntersectOrTouch(a: Dot, b: Dot, c: Dot, d: Dot): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 > 0 !== o2 > 0 && o3 > 0 !== o4 > 0) return true;
  return (
    (o1 === 0 && pointOnSegment(c, a, b)) ||
    (o2 === 0 && pointOnSegment(d, a, b)) ||
    (o3 === 0 && pointOnSegment(a, c, d)) ||
    (o4 === 0 && pointOnSegment(b, c, d))
  );
}

export function pointStrictlyInTriangle(point: Dot, a: Dot, b: Dot, c: Dot): boolean {
  const o1 = orientation(a, b, point);
  const o2 = orientation(b, c, point);
  const o3 = orientation(c, a, point);
  if (o1 === 0 || o2 === 0 || o3 === 0) return false;
  return (o1 > 0 && o2 > 0 && o3 > 0) || (o1 < 0 && o2 < 0 && o3 < 0);
}

export function squaredDistance(a: Dot, b: Dot): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
