import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import axios from 'axios';
import Config from 'src/config';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import Logger from 'src/utils/logger.utils';

// Everything here is a reference, for looking at. Pixa has no market price: its witnesses' feed sets
// 1 PXS to one US Big Mac, by The Economist's index, and quotes PIXA against that. Nothing that gets
// signed ever comes from here.

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

/** `rate` is what 1 PXS is worth in that currency. */
export type Fiat = {
  code: string;
  rate: number;
  pxsUsd: number;
  unavailable?: string;
};
export type FiatRates = {
  date: string;
  fetchedAt: number;
  rates: Record<string, number>;
};
export type BigMac = { date: string; usd: number; fetchedAt: number };

// The index when this was released, until the wallet has read a newer one. It changes twice a year.
const BUILT_IN_BIG_MAC = { date: '2026-07-01', usd: 6.22 };
const US_DOLLARS: Fiat = {
  code: 'USD',
  rate: BUILT_IN_BIG_MAC.usd,
  pxsUsd: BUILT_IN_BIG_MAC.usd,
};
const HOUR_MS = 60 * 60 * 1000;

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

// One row per country per edition. Only other countries' names are ever quoted, and they come after
// the country's code, so splitting on commas is enough to find the US price.
const readBigMac = (csv: any): Omit<BigMac, 'fetchedAt'> | null => {
  if (typeof csv !== 'string') return null;
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(',');
  const [date, country, price] = ['date', 'iso_a3', 'local_price'].map(
    (name) => columns.indexOf(name),
  );
  if (date < 0 || country < 0 || price < 0) return null;
  let latest: Omit<BigMac, 'fetchedAt'> | null = null;
  for (const row of rows) {
    const cells = row.split(',');
    if (cells[country] !== 'USA') continue;
    const usd = Number(cells[price]);
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(cells[date]) &&
      Number.isFinite(usd) &&
      usd > 0 &&
      (!latest || cells[date] > latest.date)
    ) {
      latest = { date: cells[date], usd };
    }
  }
  return latest;
};

// What was saved while it's fresh, or the latest, or what was saved if that can't be had.
const cached = <T extends { fetchedAt: number }>(
  key: LocalStorageKeyEnum,
  url: string,
  read: (data: any) => Omit<T, 'fetchedAt'> | null,
  maxAgeMs: number,
) => {
  let fetching: Promise<T | null> | null = null;
  const fetchLatest = async (saved: T | null) => {
    try {
      const { data } = await axios.get(url, { timeout: 10000 });
      const found = read(data);
      if (!found) return saved;
      const latest = { ...found, fetchedAt: Date.now() } as T;
      await LocalStorageUtils.saveValueInLocalStorage(key, latest);
      return latest;
    } catch (e) {
      Logger.error(`Could not read ${url}`, e);
      return saved;
    }
  };
  return async (): Promise<T | null> => {
    const saved: T | null =
      (await LocalStorageUtils.getValueFromLocalStorage(key)) ?? null;
    if (saved && Date.now() - saved.fetchedAt < maxAgeMs) return saved;
    fetching ??= fetchLatest(saved).finally(() => {
      fetching = null;
    });
    return fetching;
  };
};

// Only ever asked for once someone picks a currency other than US dollars.
const getRates = cached<FiatRates>(
  LocalStorageKeyEnum.FIAT_RATES,
  Config.fiat.RATES_URL,
  readRates,
  12 * HOUR_MS,
);

const getBigMac = cached<BigMac>(
  LocalStorageKeyEnum.FIAT_BIG_MAC,
  Config.fiat.BIG_MAC_URL,
  readBigMac,
  7 * 24 * HOUR_MS,
);

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
  const [bigMac, rates] = await Promise.all([
    getBigMac(),
    code === US_DOLLARS.code ? null : getRates(),
  ]);
  const pxsUsd =
    bigMac && bigMac.date >= BUILT_IN_BIG_MAC.date
      ? bigMac.usd
      : BUILT_IN_BIG_MAC.usd;
  const inDollars = { code: US_DOLLARS.code, rate: pxsUsd, pxsUsd };
  if (code === US_DOLLARS.code) return inDollars;
  const rate = rates?.rates[code];
  return rate
    ? { code, rate: pxsUsd * rate, pxsUsd }
    : { ...inDollars, unavailable: code };
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
const getParts = (pxs: number, fiat: Pick<Fiat, 'code' | 'rate'>) => {
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
const formatPrice = (pxs: number, fiat: Pick<Fiat, 'code' | 'rate'>) =>
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
  US_DOLLARS,
  readRates,
  readBigMac,
  getRates,
  getBigMac,
  getSelectedCode,
  select,
  getFiat,
  getParts,
  formatPrice,
  getName,
};
