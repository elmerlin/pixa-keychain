import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';
import {
  GLYPHS,
  PixelNumber,
  pixelNumberColumns,
} from 'src/common-ui/pixel-number/pixel-number.component';

describe('pixel-number.component tests:\n', () => {
  const width = (value: string, available: number) =>
    Number(
      render(<PixelNumber value={value} available={available} />)
        .container.querySelector('svg')!
        .getAttribute('width'),
    );

  it.each(Object.entries(GLYPHS))('Must have a square-edged glyph for %j', (_, glyph) => {
    expect(glyph.length).toBeGreaterThanOrEqual(9);
    expect(glyph.length).toBeLessThanOrEqual(10);
    expect(new Set(glyph.map((row) => row.length)).size).toBe(1);
  });

  it('Must have every digit', () => {
    for (const digit of '0123456789') expect(GLYPHS[digit]).toBeDefined();
  });

  it('Must count columns, with one between glyphs', () => {
    expect(pixelNumberColumns('0')).toBe(7);
    expect(pixelNumberColumns('00')).toBe(15);
    expect(pixelNumberColumns('')).toBe(0);
  });

  it('Must leave out what it cannot draw, but no digit', () => {
    expect(pixelNumberColumns("1'000")).toBe(pixelNumberColumns('1000'));
  });

  it('Must stay big when there is room and fit when there is not', () => {
    expect(width('1', 403)).toBe(pixelNumberColumns('1') * 8 - 1);
    const long = '1,234,567.890';
    expect(width(long, 300)).toBeLessThanOrEqual(300);
  });

  it('Must never draw too small to read, however long the number', () => {
    const huge = '1'.repeat(200);
    expect(width(huge, 300)).toBe(pixelNumberColumns(huge) * 3 - 1);
  });

  it('Must be hidden from screen readers, which read the button instead', () => {
    const { container } = render(<PixelNumber value="1" available={100} />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
