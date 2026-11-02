export interface CurrencyLabels {
  hive: string;
  hbd: string;
  hp: string;
}

export enum BaseCurrencies {
  PIXA = 'pixa',
  PXS = 'pxs',
}

const getCurrencyLabels = (isTestnet: boolean): CurrencyLabels => {
  return {
    hive: 'PIXA',
    hbd: 'PXS',
    hp: 'PP',
  };
};

const getCurrencyLabel = (currency: string, isTestnet: boolean) => {
  const cur = currency.toLowerCase() as keyof CurrencyLabels;
  const label = getCurrencyLabels(isTestnet)[cur];
  return label ? label : cur.toUpperCase();
};

const CurrencyUtils = {
  getCurrencyLabels,
  getCurrencyLabel,
};

export default CurrencyUtils;
