import React from 'react';

export type Holdings = { pixa: number; pxs: number; pp: number };

const COLUMNS = 45;
const ROWS = 2;
const PITCH = 9;
const SIZE = 7;
const ASSETS = ['pixa', 'pxs', 'pp'] as const;

/**
 * How many of the bar's columns each holding gets. Anything held gets at least one, so that a small
 * holding doesn't vanish, and they always add up to the whole bar. Exported for the tests.
 */
export const holdingColumns = (holdings: Holdings, columns = COLUMNS) => {
  const total = ASSETS.reduce((sum, asset) => sum + holdings[asset], 0);
  if (!(total > 0)) return { pixa: 0, pxs: 0, pp: 0 };
  const shares = ASSETS.map((asset) => ({
    asset,
    exact: (holdings[asset] / total) * columns,
    count: holdings[asset] > 0 ? 1 : 0,
  }));
  shares.forEach((share) => {
    if (share.count) share.count = Math.max(1, Math.floor(share.exact));
  });
  let left = columns - shares.reduce((sum, { count }) => sum + count, 0);
  const byRemainder = [...shares]
    .filter(({ count }) => count)
    .sort((a, b) => b.exact - b.count - (a.exact - a.count));
  for (let i = 0; left !== 0 && byRemainder.length; i++) {
    const share = byRemainder[i % byRemainder.length];
    if (left > 0) {
      share.count++;
      left--;
    } else if (share.count > 1) {
      share.count--;
      left++;
    }
  }
  return Object.fromEntries(
    shares.map(({ asset, count }) => [asset, count]),
  ) as Holdings;
};

type Props = { holdings?: Holdings; label: string };

// What the account is made of, in the colours of its three tokens' glyphs. Where two meet, one pixel
// steps across, the way two colours meet in pixel art.
export const HoldingsBar = ({ holdings, label }: Props) => {
  const counts = holdings ? holdingColumns(holdings) : undefined;
  const owner: (string | undefined)[] = [];
  if (counts) {
    ASSETS.forEach((asset) => {
      for (let i = 0; i < counts[asset]; i++) owner.push(asset);
    });
  }
  const held = owner.length > 0;

  return (
    <svg
      // Set anew when there's something to show, which is what plays it in.
      key={held ? 'held' : 'empty'}
      className={`holdings-bar ${held ? 'held' : ''}`}
      viewBox={`0 0 ${COLUMNS * PITCH - (PITCH - SIZE)} ${
        ROWS * PITCH - (PITCH - SIZE)
      }`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}>
      {Array.from({ length: COLUMNS }, (_, column) =>
        Array.from({ length: ROWS }, (_, row) => {
          const stepsAcross =
            row === 0 && owner[column + 1] && owner[column + 1] !== owner[column];
          const asset = stepsAcross ? owner[column + 1] : owner[column];
          return (
            <rect
              key={`${column}-${row}`}
              x={column * PITCH}
              y={row * PITCH}
              width={SIZE}
              height={SIZE}
              className={asset ?? 'nothing'}
              style={{ animationDelay: `${column * 14}ms` }}
            />
          );
        }),
      )}
    </svg>
  );
};
