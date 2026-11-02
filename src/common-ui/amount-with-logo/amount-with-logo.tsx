import React from 'react';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';

type Props = {
  amount: string | number;
  icon?: SVGIcons;
  symbol?: string;
  className?: string;
  title?: string;
};

const AmountWithLogo = ({
  amount,
  icon,
  symbol,
  className = '',
  title,
}: Props) => {
  const iconElement = icon ? (
    <SVGIcon className="amount-logo" icon={icon} />
  ) : null;

  const amountElement = (
    <span className="amount">
      {typeof amount === 'string' ? amount.split(' ')[0] : amount} {symbol}
    </span>
  );

  return (
    <div className={`amount-with-logo ${className}`}>
      {title && <span className="title">{chrome.i18n.getMessage(title)}</span>}
      <div className="amount-logo-container">
        <>
          {amountElement}
          {iconElement}
        </>
      </div>
    </div>
  );
};

export default AmountWithLogo;
