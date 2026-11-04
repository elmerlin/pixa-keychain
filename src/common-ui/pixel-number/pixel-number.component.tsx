import React from 'react';

// Numbers drawn like the logo: on a pixel grid, with stems two pixels wide. The tenth row is only for
// the tail of a comma.
const GAP_GLYPH = ['..', '..', '..', '..', '..', '..', '..', '..', '..'];
export const GLYPHS: Record<string, string[]> = {
  '0': ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  '1': ['..##.', '.###.', '####.', '..##.', '..##.', '..##.', '..##.', '..##.', '#####'],
  '2': ['.#####.', '##...##', '.....##', '.....##', '.#####.', '##.....', '##.....', '##.....', '#######'],
  '3': ['######.', '.....##', '.....##', '.....##', '.#####.', '.....##', '.....##', '.....##', '######.'],
  '4': ['##...##', '##...##', '##...##', '##...##', '#######', '.....##', '.....##', '.....##', '.....##'],
  '5': ['#######', '##.....', '##.....', '##.....', '######.', '.....##', '.....##', '.....##', '######.'],
  '6': ['.#####.', '##.....', '##.....', '##.....', '######.', '##...##', '##...##', '##...##', '.#####.'],
  '7': ['#######', '.....##', '.....##', '....##.', '...##..', '..##...', '..##...', '..##...', '..##...'],
  '8': ['.#####.', '##...##', '##...##', '##...##', '.#####.', '##...##', '##...##', '##...##', '.#####.'],
  '9': ['.#####.', '##...##', '##...##', '##...##', '.######', '.....##', '.....##', '.....##', '.#####.'],
  '.': ['..', '..', '..', '..', '..', '..', '..', '##', '##'],
  ',': ['..', '..', '..', '..', '..', '..', '..', '##', '##', '.#'],
  // A thousands gap, however a language writes it.
  ' ': GAP_GLYPH,
  '\u00a0': GAP_GLYPH,
  '\u202f': GAP_GLYPH,
  '*': ['....', '....', '....', '####', '####', '####', '####', '....', '....'],
};

const ROWS = 10;
const MIN_PITCH = 3;
const MAX_PITCH = 8;
const GAP = 1;

const rects = (cells: [number, number][], pitch: number, size: number) =>
  cells
    .map(([x, y]) => `M${x * pitch} ${y * pitch}h${size}v${size}h-${size}z`)
    .join('');

/** How far apart the pixels go, as big as fits. Exported for the tests. */
export const pixelNumberColumns = (value: string) =>
  [...value]
    .map((char) => GLYPHS[char])
    .filter(Boolean)
    .reduce((sum, glyph, index) => sum + glyph[0].length + (index ? 1 : 0), 0);

type Props = {
  value: string;
  /** The room it has, in CSS pixels. */
  available: number;
};

export const PixelNumber = ({ value, available }: Props) => {
  const columns = pixelNumberColumns(value);
  const pitch = Math.max(
    MIN_PITCH,
    Math.min(MAX_PITCH, Math.floor(available / Math.max(columns, 1))),
  );
  const size = pitch - GAP;

  const digits: [number, number][] = [];
  const marks: [number, number][] = [];
  let left = 0;
  for (const char of value) {
    const glyph = GLYPHS[char];
    if (!glyph) continue;
    glyph.forEach((row, y) =>
      [...row].forEach((pixel, x) => {
        if (pixel === '#') {
          ('.,'.includes(char) ? marks : digits).push([left + x, y]);
        }
      }),
    );
    left += glyph[0].length + 1;
  }

  return (
    <svg
      className="pixel-number"
      width={columns * pitch - GAP}
      height={ROWS * pitch - GAP}
      shapeRendering="crispEdges"
      aria-hidden="true">
      <path d={rects(digits, pitch, size)} fill="currentColor" />
      <path d={rects(marks, pitch, size)} className="pixel-number-mark" />
    </svg>
  );
};
