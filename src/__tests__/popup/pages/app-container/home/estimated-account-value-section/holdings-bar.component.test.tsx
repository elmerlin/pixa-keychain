import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  holdingColumns,
  HoldingsBar,
} from 'src/popup/hive/pages/app-container/home/estimated-account-value-section/holdings-bar/holdings-bar.component';

describe('holdings-bar.component tests:\n', () => {
  const sum = ({ pixa, pxs, pp }: ReturnType<typeof holdingColumns>) =>
    pixa + pxs + pp;

  it('Must fill the whole bar, whatever the amounts', () => {
    for (const holdings of [
      { pixa: 1, pxs: 1, pp: 1 },
      { pixa: 0.001, pxs: 1000000, pp: 0.001 },
      { pixa: 12.3, pxs: 67.9, pp: 1053.4 },
      { pixa: 5, pxs: 0, pp: 0 },
      { pixa: 0, pxs: 0.002, pp: 0.001 },
      { pixa: 1e-9, pxs: 1e-9, pp: 1e12 },
    ]) {
      expect(sum(holdingColumns(holdings))).toBe(45);
    }
  });

  it('Must not let a small holding vanish', () => {
    expect(holdingColumns({ pixa: 0.001, pxs: 0.001, pp: 1e9 })).toEqual({
      pixa: 1,
      pxs: 1,
      pp: 43,
    });
  });

  it('Must give nothing to what is not held', () => {
    expect(holdingColumns({ pixa: 0, pxs: 3, pp: 0 })).toEqual({
      pixa: 0,
      pxs: 45,
      pp: 0,
    });
  });

  it('Must stay empty when nothing is held, or the numbers are bad', () => {
    const empty = { pixa: 0, pxs: 0, pp: 0 };
    expect(holdingColumns(empty)).toEqual(empty);
    expect(holdingColumns({ pixa: NaN, pxs: 1, pp: 1 })).toEqual(empty);
  });

  it('Must say the same thing without the colours', () => {
    render(
      <HoldingsBar holdings={{ pixa: 1, pxs: 1, pp: 1 }} label="1% 2% 3%" />,
    );
    expect(screen.getByRole('img', { name: '1% 2% 3%' })).toBeInTheDocument();
  });

  it('Must draw an empty bar before anything has arrived', () => {
    const { container } = render(<HoldingsBar label="nothing" />);
    expect(container.querySelector('svg')).not.toHaveClass('held');
    expect(container.querySelectorAll('rect.nothing')).toHaveLength(90);
  });
});
