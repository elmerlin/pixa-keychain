import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import axios from 'axios';
import { FiatUtils } from 'src/popup/hive/utils/fiat.utils';
import Config from 'src/config';
import LocalStorageUtils from 'src/utils/localStorage.utils';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// A US price out of order, a quoted name with a comma in it, and a line that isn't a price.
const INDEX = [
  'date,iso_a3,currency_code,name,local_price,dollar_ex',
  '2026-07-01,USA,USD,United States,7.5,1',
  '2026-07-01,KOR,KRW,"Korea, South",5500,1400',
  '2026-01-01,USA,USD,United States,7.25,1',
  '2026-07-01,GBR,GBP,Britain,4.9,0.75',
  'nonsense,USA,USD,United States,99,1',
  '2026-08-01,USA,USD,United States,nope,1',
].join('\r\n');

describe('fiat.utils tests:\n', () => {
  let saved: Record<string, any>;
  let get: jest.SpyInstance;

  beforeEach(() => {
    saved = {};
    jest
      .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
      .mockImplementation(async (key: string) => saved[key]);
    jest
      .spyOn(LocalStorageUtils, 'saveValueInLocalStorage')
      .mockImplementation(async (key: string, value: any) => {
        saved[key] = value;
      });
    get = jest.spyOn(axios, 'get').mockImplementation(async (url: string) => ({
      data:
        url === Config.fiat.BIG_MAC_URL
          ? INDEX
          : { date: '2026-11-03', rates: { EUR: 0.9, JPY: 150 } },
    }));
    chrome.i18n.getUILanguage = jest.fn().mockReturnValue('en-US');
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const asked = (url: string) =>
    get.mock.calls.filter(([called]) => called === url).length;

  describe('getFiat', () => {
    it('Must value 1 PXS at the latest US Big Mac, and need no rates for US dollars', async () => {
      expect(await FiatUtils.getFiat()).toEqual({
        code: 'USD',
        rate: 7.5,
        pxsUsd: 7.5,
      });
      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith(Config.fiat.BIG_MAC_URL, {
        timeout: 10000,
      });
      expect(saved[LocalStorageKeyEnum.FIAT_BIG_MAC].usd).toBe(7.5);
    });

    it('Must convert a Big Mac at the rate once another currency is chosen, sending nothing about the person', async () => {
      await FiatUtils.select('EUR');
      expect(await FiatUtils.getFiat()).toEqual({
        code: 'EUR',
        rate: 7.5 * 0.9,
        pxsUsd: 7.5,
      });
      expect(get).toHaveBeenCalledWith(Config.fiat.RATES_URL, {
        timeout: 10000,
      });
      expect(saved[LocalStorageKeyEnum.FIAT_RATES].rates.JPY).toBe(150);
    });

    it('Must use saved rates while they are fresh', async () => {
      saved[LocalStorageKeyEnum.FIAT_CURRENCY] = 'EUR';
      saved[LocalStorageKeyEnum.FIAT_RATES] = {
        date: '2026-11-03',
        fetchedAt: Date.now() - HOUR,
        rates: { EUR: 0.5 },
      };
      expect((await FiatUtils.getFiat()).rate).toBe(7.5 * 0.5);
      expect(asked(Config.fiat.RATES_URL)).toBe(0);
    });

    it('Must refresh old rates, and keep them if that fails', async () => {
      saved[LocalStorageKeyEnum.FIAT_CURRENCY] = 'EUR';
      saved[LocalStorageKeyEnum.FIAT_RATES] = {
        date: '2026-10-01',
        fetchedAt: Date.now() - 13 * HOUR,
        rates: { EUR: 0.5 },
      };
      expect((await FiatUtils.getFiat()).rate).toBe(7.5 * 0.9);

      saved[LocalStorageKeyEnum.FIAT_RATES].fetchedAt = Date.now() - 13 * HOUR;
      saved[LocalStorageKeyEnum.FIAT_RATES].rates = { EUR: 0.5 };
      get.mockRejectedValue(new Error('offline'));
      expect((await FiatUtils.getFiat()).rate).toBe(7.5 * 0.5);
    });

    it('Must read the index at most once a week', async () => {
      saved[LocalStorageKeyEnum.FIAT_BIG_MAC] = {
        date: '2026-07-01',
        usd: 7,
        fetchedAt: Date.now() - 6 * DAY,
      };
      expect((await FiatUtils.getFiat()).rate).toBe(7);
      expect(get).not.toHaveBeenCalled();

      saved[LocalStorageKeyEnum.FIAT_BIG_MAC].fetchedAt = Date.now() - 8 * DAY;
      expect((await FiatUtils.getFiat()).rate).toBe(7.5);
    });

    it('Must keep the last price it read when the index cannot be read', async () => {
      saved[LocalStorageKeyEnum.FIAT_BIG_MAC] = {
        date: '2026-07-01',
        usd: 7,
        fetchedAt: Date.now() - 8 * DAY,
      };
      get.mockRejectedValue(new Error('offline'));
      expect((await FiatUtils.getFiat()).rate).toBe(7);
    });

    it('Must never count a PXS as a dollar: without the index it uses the price it shipped with', async () => {
      get.mockRejectedValue(new Error('offline'));
      expect(await FiatUtils.getFiat()).toEqual(FiatUtils.US_DOLLARS);
      expect(FiatUtils.US_DOLLARS.rate).toBeGreaterThan(1);
    });

    it('Must prefer the price it shipped with over an older one that was saved', async () => {
      saved[LocalStorageKeyEnum.FIAT_BIG_MAC] = {
        date: '2020-01-01',
        usd: 5.67,
        fetchedAt: Date.now(),
      };
      expect((await FiatUtils.getFiat()).rate).toBe(FiatUtils.US_DOLLARS.rate);
    });

    it('Must fall back to dollars, and say so, when there is no rate at all', async () => {
      saved[LocalStorageKeyEnum.FIAT_CURRENCY] = 'EUR';
      get.mockImplementation(async (url: string) => {
        if (url === Config.fiat.BIG_MAC_URL) return { data: INDEX };
        throw new Error('offline');
      });
      expect(await FiatUtils.getFiat()).toEqual({
        code: 'USD',
        rate: 7.5,
        pxsUsd: 7.5,
        unavailable: 'EUR',
      });
    });

    it('Must not believe a currency it does not know from storage', async () => {
      saved[LocalStorageKeyEnum.FIAT_CURRENCY] = 'XXX';
      expect(await FiatUtils.getSelectedCode()).toBe('USD');
    });
  });

  describe('readBigMac', () => {
    it('Must find the latest US price', () => {
      expect(FiatUtils.readBigMac(INDEX)).toEqual({
        date: '2026-07-01',
        usd: 7.5,
      });
    });

    it.each([
      [undefined],
      [null],
      [{}],
      [''],
      ['<html>'],
      ['date,iso_a3,name\n2026-07-01,USA,United States'],
      ['date,iso_a3,local_price\n2026-07-01,GBR,4.9'],
      ['date,iso_a3,local_price\n2026-07-01,USA,0'],
      ['date,iso_a3,local_price\n2026-07-01,USA,-6'],
      ['date,iso_a3,local_price\nJuly,USA,6.22'],
    ])('Must refuse %j', (csv) => {
      expect(FiatUtils.readBigMac(csv)).toBeNull();
    });
  });

  describe('readRates', () => {
    it.each([
      [undefined],
      [null],
      ['<html>'],
      [{}],
      [{ rates: 'EUR' }],
      [{ rates: { EUR: 0 } }],
      [{ rates: { EUR: -1 } }],
      [{ rates: { EUR: '0.9' } }],
      [{ rates: { EUR: null } }],
      [{ rates: { EUR: Infinity } }],
      [{ rates: { NOPE: 1 } }],
    ])('Must refuse %j', (data) => {
      expect(FiatUtils.readRates(data)).toBeNull();
    });

    it('Must keep only sensible numbers for known currencies', () => {
      expect(
        FiatUtils.readRates({
          date: '2026-11-03',
          rates: { EUR: 0.9, JPY: NaN, NOPE: 2 },
        }),
      ).toEqual({ date: '2026-11-03', rates: { EUR: 0.9 } });
    });
  });

  describe('getParts', () => {
    it('Must give the symbol and the digits apart', () => {
      expect(FiatUtils.getParts(12.5, { code: 'USD', rate: 1 })).toEqual({
        unit: '$',
        number: '12.50',
        text: '$12.50',
      });
    });
    it('Must drop the cents past a thousand', () => {
      expect(FiatUtils.getParts(1133.67, { code: 'USD', rate: 1 }).number).toBe(
        '1,134',
      );
    });
    it('Must apply the rate, and keep the currency own digits', () => {
      const parts = FiatUtils.getParts(2, { code: 'JPY', rate: 150 });
      expect(parts.unit).toBe('¥');
      expect(parts.number).toBe('300');
    });
    it('Must use western digits whatever the language', () => {
      chrome.i18n.getUILanguage = jest.fn().mockReturnValue('ar-EG');
      expect(
        FiatUtils.getParts(12.5, { code: 'USD', rate: 1 }).number,
      ).toMatch(/^[0-9.,\s]+$/);
    });
  });

  describe('formatPrice', () => {
    it('Must keep a tiny price readable', () => {
      expect(FiatUtils.formatPrice(1 / 51, { code: 'USD', rate: 1 })).toBe(
        '$0.0196',
      );
    });
    it('Must apply the rate', () => {
      expect(FiatUtils.formatPrice(1 / 51, { code: 'JPY', rate: 158 })).toBe(
        '¥3.1',
      );
    });
  });

  describe('getName', () => {
    it('Must name a currency, or give its code back', () => {
      expect(FiatUtils.getName('EUR')).toBe('Euro');
      chrome.i18n.getUILanguage = jest.fn().mockReturnValue('!!');
      expect(FiatUtils.getName('EUR')).toBe('EUR');
    });
  });
});
