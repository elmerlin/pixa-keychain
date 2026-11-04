import { Fiat, FiatUtils } from '@popup/hive/utils/fiat.utils';
import { useEffect, useState } from 'react';

/** The currency to show values in. US dollars, at the wallet's own Big Mac price, until it's known. */
export const useFiat = () => {
  const [fiat, setFiat] = useState<Fiat>(FiatUtils.US_DOLLARS);
  useEffect(() => {
    let live = true;
    FiatUtils.getFiat().then((found) => {
      if (live) setFiat(found);
    });
    return () => {
      live = false;
    };
  }, []);
  return fiat;
};
