import React from 'react';
import { CustomTooltip } from 'src/common-ui/custom-tooltip/custom-tooltip.component';

const CELLS = 22;

type Props = {
  label: string;
  percent?: number;
  tooltip?: string;
  dataTestId: string;
};

// How full something is, as a row of pixels. The number beside it says it without the picture.
export const EnergyMeter = ({ label, percent, tooltip, dataTestId }: Props) => {
  const known = percent !== undefined && Number.isFinite(percent);
  const full = known
    ? Math.min(
        CELLS,
        percent! > 0 ? Math.max(1, Math.round((percent! / 100) * CELLS)) : 0,
      )
    : 0;
  return (
    <CustomTooltip
      dataTestId={`custom-tool-tip-${dataTestId}`}
      message={tooltip}
      position="top"
      skipTranslation>
      <div
        className={`energy-meter ${tooltip ? 'has-tooltip' : ''}`}
        data-testid={dataTestId}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={known ? percent : undefined}>
        <div className="energy-text">
          <span className="label">{label}</span>
          <span className="percent">{known ? `${percent!.toFixed(2)}%` : '--%'}</span>
        </div>
        <div className="energy-cells" aria-hidden="true">
          {Array.from({ length: CELLS }, (_, index) => (
            <i key={index} className={index < full ? 'full' : ''} />
          ))}
        </div>
      </div>
    </CustomTooltip>
  );
};
