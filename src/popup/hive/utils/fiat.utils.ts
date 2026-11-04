import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import axios from 'axios';
import Config from 'src/config';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import Logger from 'src/utils/logger.utils';

// Everything here is a rough idea, for looking at. Pixa has no outside price, so 1 PXS is taken as
// 1 US dollar, as the chain's own price feed does. Nothing that gets signed ever comes from here.

export const FIAT_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'CNY',
  'HKD',
  'SGD',
  'KRW',
  'INR',
  'IDR',
  'MYR',
  'PHP',
  'THB',
  'NZD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  'TRY',
  'ILS',
  'ZAR',
  'BRL',
  'MXN',
  'ISK',
];

export type Fiat = { code: string; rate: number; unavailable?: string };
export type FiatRates = {
  date: string;
  fetchedAt: number;
  rates: Record<string, number>;
};

const US_DOLLARS: Fiat = { code: 'USD', rate: 1 };
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

// Whatever came back, only sensible numbers for currencies we know are kept.
const readRates = (data: any): Omit<FiatRates, 'fetchedAt'> | null => {
  if (!data?.rates || typeof data.rates !== 'object') return null;
  const rates: Record<string, number> = {};
  for (const code of FIAT_CURRENCIES) {
    const rate = data.rates[code];
    if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
      rates[code] = rate;
    }
  }
  return Object.keys(rates).length
    ? { date: String(data.date ?? ''), rates }
    : null;
};

let fetching: Promise<FiatRates | null> | null = null;

const fetchRates = async (saved: FiatRates | null) => {
  try {
    const { data } = await axios.get(Config.fiat.RATES_URL, {
      timeout: 10000,
    });
    const read = readRates(data);
    if (!read) return saved;
    const rates = { ...read, fetchedAt: Date.now() };
    await LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.FIAT_RATES,
      rates,
    );
    return rates;
  } catch (e) {
    Logger.error('Could not get exchange rates', e);
    return saved;
  }
};

// Only ever asked for once someone picks a currency other than US dollars.
const getRates = async (): Promise<FiatRates | null> => {
  const saved: FiatRates | null =
    (await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.FIAT_RATES,
    )) ?? null;
  if (saved && Date.now() - saved.fetchedAt < MAX_AGE_MS) return saved;
  fetching ??= fetchRates(saved).finally(() => {
    fetching = null;
  });
  return fetching;
};

const getSelectedCode = async (): Promise<string> => {
  const code = await LocalStorageUtils.getValueFromLocalStorage(
    LocalStorageKeyEnum.FIAT_CURRENCY,
  );
  return FIAT_CURRENCIES.includes(code) ? code : US_DOLLARS.code;
};

const select = (code: string) =>
  LocalStorageUtils.saveValueInLocalStorage(
    LocalStorageKeyEnum.FIAT_CURRENCY,
    code,
  );

const getFiat = async (): Promise<Fiat> => {
  const code = await getSelectedCode();
  if (code === US_DOLLARS.code) return US_DOLLARS;
  const rate = (await getRates())?.rates[code];
  return rate ? { code, rate } : { ...US_DOLLARS, unavailable: code };
};

const locale = () => `${chrome.i18n.getUILanguage()}-u-nu-latn`;

const formatter = (options: Intl.NumberFormatOptions) => {
  try {
    return new Intl.NumberFormat(locale(), options);
  } catch (e) {
    return new Intl.NumberFormat('en', options);
  }
};

/** The symbol and the digits apart, because they're drawn apart. */
const getParts = (pxs: number, fiat: Fiat) => {
  const value = pxs * fiat.rate;
  const format = formatter({
    style: 'currency',
    currency: fiat.code,
    currencyDisplay: 'narrowSymbol',
    // Past a thousand, cents only get in the way.
    ...(value >= 1000 ? { maximumFractionDigits: 0 } : {}),
  });
  const parts = format.formatToParts(value);
  return {
    unit: parts.find(({ type }) => type === 'currency')?.value ?? fiat.code,
    number: parts
      .filter(({ type }) =>
        ['integer', 'group', 'decimal', 'fraction'].includes(type),
      )
      .map((part) => part.value)
      .join(''),
    text: format.format(value),
  };
};

/** A price can be a tiny fraction of a cent's worth of anything, so it keeps its significant digits. */
const formatPrice = (pxs: number, fiat: Fiat) =>
  formatter({
    style: 'currency',
    currency: fiat.code,
    currencyDisplay: 'narrowSymbol',
    minimumSignificantDigits: 2,
    maximumSignificantDigits: 3,
  }).format(pxs * fiat.rate);

const getName = (code: string) => {
  try {
    return (
      new Intl.DisplayNames([chrome.i18n.getUILanguage()], {
        type: 'currency',
      }).of(code) ?? code
    );
  } catch (e) {
    return code;
  }
};

export const FiatUtils = {
  readRates,
  getRates,
  getSelectedCode,
  select,
  getFiat,
  getParts,
  formatPrice,
  getName,
};
