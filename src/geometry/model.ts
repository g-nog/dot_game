/** Integer logical coordinates shared by both games; rendering never changes them. */
export type DotId = string;
export type Dot = Readonly<{ id: DotId; x: number; y: number }>;
export type DotField = Readonly<{
  width: number;
  height: number;
  margin: number;
  minimumSeparation: number;
  dots: readonly Dot[];
}>;
export function lineKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
