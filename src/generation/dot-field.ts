import {
  MATCH_SIZE_DOTS,
  type Dot,
  type DotField,
  type MatchSize,
} from '../domain/triangle-duel/model';
import { orientation, squaredDistance } from '../geometry/predicates';
import { seededRandom, type RandomSource } from './random';

export const FIELD_WIDTH = 900;
export const FIELD_HEIGHT = 1400;
export const FIELD_MARGIN = 65;
export const MINIMUM_SEPARATION: Readonly<Record<MatchSize, number>> = {
  quick: 125,
  standard: 95,
  extended: 75,
};

export function generateDotField(size: MatchSize, seed: number): DotField {
  return generateWithRandom(size, seededRandom(seed));
}

export function generateWithRandom(size: MatchSize, random: RandomSource): DotField {
  const count = MATCH_SIZE_DOTS[size];
  const minimumSeparation = MINIMUM_SEPARATION[size];
  const dots: Dot[] = [];
  let attempts = 0;
  while (dots.length < count && attempts < 100_000) {
    attempts += 1;
    const candidate: Dot = {
      id: `dot-${String(dots.length + 1).padStart(2, '0')}`,
      x: FIELD_MARGIN + Math.floor(random() * (FIELD_WIDTH - FIELD_MARGIN * 2 + 1)),
      y: FIELD_MARGIN + Math.floor(random() * (FIELD_HEIGHT - FIELD_MARGIN * 2 + 1)),
    };
    if (dots.some((dot) => dot.x === candidate.x && dot.y === candidate.y)) continue;
    if (dots.some((dot) => squaredDistance(dot, candidate) < minimumSeparation ** 2)) continue;
    let collinear = false;
    for (let first = 0; first < dots.length && !collinear; first += 1) {
      for (let second = first + 1; second < dots.length; second += 1) {
        if (orientation(dots[first], dots[second], candidate) === 0) {
          collinear = true;
          break;
        }
      }
    }
    if (!collinear) dots.push(candidate);
  }
  if (dots.length !== count) throw new Error(`Could not generate a valid ${size} dot field`);
  const field = {
    width: FIELD_WIDTH,
    height: FIELD_HEIGHT,
    margin: FIELD_MARGIN,
    minimumSeparation,
    dots,
  };
  const validation = validateDotField(field, size);
  if (!validation.valid) throw new Error(validation.reason);
  return field;
}

export function validateDotField(
  field: DotField,
  size: MatchSize,
): { valid: true } | { valid: false; reason: string } {
  if (field.dots.length !== MATCH_SIZE_DOTS[size])
    return { valid: false, reason: 'Incorrect dot count' };
  const ids = new Set<string>();
  for (const dot of field.dots) {
    if (!Number.isSafeInteger(dot.x) || !Number.isSafeInteger(dot.y))
      return { valid: false, reason: 'Coordinates must be safe integers' };
    if (ids.has(dot.id)) return { valid: false, reason: 'Duplicate dot ID' };
    ids.add(dot.id);
    if (
      dot.x < field.margin ||
      dot.x > field.width - field.margin ||
      dot.y < field.margin ||
      dot.y > field.height - field.margin
    ) {
      return { valid: false, reason: 'Dot outside logical margins' };
    }
  }
  for (let i = 0; i < field.dots.length; i += 1) {
    for (let j = i + 1; j < field.dots.length; j += 1) {
      if (squaredDistance(field.dots[i], field.dots[j]) < field.minimumSeparation ** 2) {
        return { valid: false, reason: 'Dots violate minimum separation' };
      }
      for (let k = j + 1; k < field.dots.length; k += 1) {
        if (orientation(field.dots[i], field.dots[j], field.dots[k]) === 0) {
          return { valid: false, reason: 'Collinear dot triple' };
        }
      }
    }
  }
  return { valid: true };
}
