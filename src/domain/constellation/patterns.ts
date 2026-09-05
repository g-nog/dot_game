import type { PatternId, SequenceId } from './model';
export type Pattern = Readonly<{
  id: PatternId;
  name: string;
  description: string;
  vertices: readonly (readonly [number, number])[];
  edges: readonly (readonly [number, number])[];
}>;
export const PATTERNS: Record<PatternId, Pattern> = {
  thread: {
    id: 'thread',
    name: 'The Thread',
    description: 'A path through four stars',
    vertices: [
      [12, 65],
      [36, 27],
      [65, 64],
      [88, 26],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  crown: {
    id: 'crown',
    name: 'The Crown',
    description: 'A loop of four stars',
    vertices: [
      [15, 48],
      [46, 16],
      [86, 44],
      [52, 79],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
  },
  halo: {
    id: 'halo',
    name: 'The Halo',
    description: 'A loop of five stars',
    vertices: [
      [50, 12],
      [88, 39],
      [72, 80],
      [28, 80],
      [12, 39],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
    ],
  },
  beacon: {
    id: 'beacon',
    name: 'The Beacon',
    description: 'Three spokes from one star',
    vertices: [
      [50, 46],
      [18, 76],
      [50, 12],
      [84, 73],
    ],
    edges: [
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  },
  kite: {
    id: 'kite',
    name: 'The Kite',
    description: 'A triangle with a tail',
    vertices: [
      [25, 45],
      [53, 12],
      [77, 47],
      [48, 84],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 3],
    ],
  },
  lantern: {
    id: 'lantern',
    name: 'The Lantern',
    description: 'A four-star loop with a tail',
    vertices: [
      [20, 35],
      [47, 10],
      [77, 35],
      [48, 62],
      [65, 89],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
    ],
  },
};
export const SEQUENCES: Record<SequenceId, readonly PatternId[]> = {
  A: ['thread', 'crown', 'halo'],
  B: ['beacon', 'kite', 'lantern'],
};
