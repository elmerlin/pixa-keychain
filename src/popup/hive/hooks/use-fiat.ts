import { Fiat, FiatUtils } from '@popup/hive/utils/fiat.utils';
import { useEffect, useState } from 'react';

/** The currency to show values in. US dollars until it's known, which needs nothing from anyone. */
export const useFiat = () => {
  const [fiat, setFiat] = useState<Fiat>({ code: 'USD', rate: 1 });
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
