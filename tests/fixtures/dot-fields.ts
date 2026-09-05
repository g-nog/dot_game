import type { Dot, DotField } from '../../src/domain/galaxy-duel/model';

export function field(dots: readonly Dot[]): DotField {
  return { width: 1000, height: 1000, margin: 0, minimumSeparation: 1, dots };
}

export const crossingField = field([
  { id: 'a', x: 100, y: 100 },
  { id: 'b', x: 900, y: 900 },
  { id: 'c', x: 100, y: 900 },
  { id: 'd', x: 900, y: 100 },
]);

export const throughDotField = field([
  { id: 'a', x: 100, y: 500 },
  { id: 'b', x: 900, y: 500 },
  { id: 'middle', x: 500, y: 500 },
]);

export const triangleField = field([
  { id: 'a', x: 100, y: 200 },
  { id: 'b', x: 900, y: 200 },
  { id: 'c', x: 500, y: 800 },
]);

export const interiorDotField = field([...triangleField.dots, { id: 'inside', x: 500, y: 400 }]);

export const multiClaimField = field([
  { id: 'a', x: 100, y: 500 },
  { id: 'b', x: 900, y: 500 },
  { id: 'c', x: 500, y: 100 },
  { id: 'd', x: 500, y: 900 },
]);
