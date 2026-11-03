import type { DynamicGlobalProperties } from '@hiveio/dhive';
import React, { useEffect, useState } from 'react';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';
import { describeOperations } from 'src/dialog/utils/operation-summary.utils';
import { DynamicGlobalPropertiesUtils } from 'src/popup/hive/utils/dynamic-global-properties.utils';
import FormatUtils from 'src/utils/format.utils';

// Past this a value reads better under its label than beside it.
const SHORT_VALUE = 36;

type Props = {
  operations: unknown;
  username?: string;
};

const OperationSummaries = ({ operations, username }: Props) => {
  const [properties, setProperties] = useState<DynamicGlobalProperties>();

  // Stake is in VESTS on chain. The estimate is a courtesy: without it the exact amount still shows.
  useEffect(() => {
    if (JSON.stringify(operations)?.includes(' VESTS')) {
      DynamicGlobalPropertiesUtils.getDynamicGlobalProperties()
        .then(setProperties)
        .catch(() => undefined);
    }
  }, []);

  const summaries = describeOperations(
    operations,
    username,
    properties
      ? (vests) => FormatUtils.toFormattedHP(parseFloat(vests), properties)
      : undefined,
  );

  return (
    <div className="operation-summaries" data-testid="operation-summaries">
      {summaries.length > 1 && (
        <div className="summary-count">
          {chrome.i18n.getMessage('dialog_op_count', [`${summaries.length}`])}
        </div>
      )}
      {summaries.map((summary, index) => (
        <div className="operation-summary" key={index}>
          <div className="summary-title">{summary.title}</div>
          {summary.warning && (
            <div className="summary-warning" role="alert">
              <SVGIcon icon={SVGIcons.MESSAGE_WARNING} />
              <span>{summary.warning}</span>
            </div>
          )}
          {summary.rows.map((row, rowIndex) => (
            <div
              className={`field ${
                row.value.length > SHORT_VALUE ? 'stacked' : ''
              }`}
              key={rowIndex}
            >
              <div className="label">{row.label}</div>
              <div className="value">{row.value}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default OperationSummaries;
