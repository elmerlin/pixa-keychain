import React, { useEffect, useState } from 'react';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';

interface PreloadedImageProps {
  className?: string;
  src: string;
  alt?: string;
  placeholder?: string;
  addBackground?: boolean;
  useDefaultSVG?: SVGIcons;
}

export const PreloadedImage = ({
  src,
  alt,
  className,
  addBackground,
  placeholder = '/assets/images/placeholders/account-placeholder.png',
  useDefaultSVG,
}: PreloadedImageProps) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (failed && useDefaultSVG) {
    return (
      <SVGIcon
        icon={useDefaultSVG}
        className={`currency-icon is-svg ${
          addBackground ? 'add-background' : ''
        }`}
      />
    );
  }

  return (
    <img
      src={failed ? placeholder : src}
      alt={alt ?? ''}
      className={`${className ?? ''} ${addBackground ? 'add-background' : ''}`}
      onError={() => setFailed(true)}
    />
  );
};
