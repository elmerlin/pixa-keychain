import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import axios from 'axios';
import { FiatUtils } from 'src/popup/hive/utils/fiat.utils';
import Config from 'src/config';
import LocalStorageUtils from 'src/utils/localStorage.utils';

const HOUR = 60 * 60 * 1000;

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
    get = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { date: '2026-11-03', rates: { EUR: 0.9, JPY: 150 } },
    });
    chrome.i18n.getUILanguage = jest.fn().mockReturnValue('en-US');
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getFiat', () => {
    it('Must not ask anyone anything for US dollars', async () => {
      expect(await FiatUtils.getFiat()).toEqual({ code: 'USD', rate: 1 });
      saved[LocalStorageKeyEnum.FIAT_CURRENCY] = 'USD';
      expect(await FiatUtils.getFiat()).toEqual({ code: 'USD', rate: 1 });
      expect(get).not.toHaveBeenCalled();
    });

    it('Must ask for rates once another currency is chosen, sending nothing about the person', async () => {
      await FiatUtils.select('EUR');
      expect(await FiatUtils.getFiat()).toEqual({ code: 'EUR', rate: 0.9 });
      expect(get).toHaveBeenCalledTimes(1);
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
      expect((await FiatUtils.getFiat()).rate).toBe(0.5);
      expect(get).not.toHaveBeenCalled();
    });

    it('Must refresh old rates, and keep them if that fails', async () => {
      saved[LocalStorageKeyEnum.FIAT_CURRENCY] = 'EUR';
      saved[LocalStorageKeyEnum.FIAT_RATES] = {
        date: '2026-10-01',
        fetchedAt: Date.now() - 13 * HOUR,
        rates: { EUR: 0.5 },
      };
      expect((await FiatUtils.getFiat()).rate).toBe(0.9);

      saved[LocalStorageKeyEnum.FIAT_RATES].fetchedAt = Date.now() - 13 * HOUR;
      saved[LocalStorageKeyEnum.FIAT_RATES].rates = { EUR: 0.5 };
      get.mockRejectedValue(new Error('offline'));
      expect((await FiatUtils.getFiat()).rate).toBe(0.5);
    });

    it('Must fall back to dollars, and say so, when there is no rate at all', async () => {
      saved[LocalStorageKeyEnum.FIAT_CURRENCY] = 'EUR';
      get.mockRejectedValue(new Error('offline'));
      expect(await FiatUtils.getFiat()).toEqual({
        code: 'USD',
        rate: 1,
        unavailable: 'EUR',
      });
    });

    it('Must not believe a currency it does not know from storage', async () => {
      saved[LocalStorageKeyEnum.FIAT_CURRENCY] = 'XXX';
      expect(await FiatUtils.getSelectedCode()).toBe('USD');
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
