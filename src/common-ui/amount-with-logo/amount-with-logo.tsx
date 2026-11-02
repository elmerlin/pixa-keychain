import React from 'react';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { PreloadedImage } from 'src/common-ui/preloaded-image/preloaded-image.component';

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
    <PreloadedImage
      className="amount-logo"
      src={`/assets/images/icons/${icon}.svg`}
      addBackground
      useDefaultSVG={icon}
    />
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
