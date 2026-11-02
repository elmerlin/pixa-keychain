import CurrencyUtils from '@hiveapp/utils/currency.utils';

describe('currency.utils tests:\n', () => {
  describe('getCurrencyLabels tests:\n', () => {
    test('Passing isTestnet as true must return currency labels (same as mainnet for now)', () => {
      const isTestnet = true;
      const result = CurrencyUtils.getCurrencyLabels(isTestnet);
      expect(result).toEqual({ hbd: 'PXS', hive: 'PIXA', hp: 'PP' });
    });

    test('Passing isTestnet as false must return currency labels for mainnet', () => {
      const isTestnet = false;
      const result = CurrencyUtils.getCurrencyLabels(isTestnet);
      expect(result).toEqual({ hbd: 'PXS', hive: 'PIXA', hp: 'PP' });
    });
  });

  describe('getCurrencyLabel tests:\n', () => {
    test('Passing an empty currency and isTesnet as true, must return ""', () => {
      const isTestnet = true;
      const currency = '';
      const result = CurrencyUtils.getCurrencyLabel(currency, isTestnet);
      expect(result).toBe('');
    });

    test('Passing an empty currency and isTesnet as false, must return ""', () => {
      const isTestnet = false;
      const currency = '';
      const result = CurrencyUtils.getCurrencyLabel(currency, isTestnet);
      expect(result).toBe('');
    });

    test('Passing currency="hive" and isTesnet as false, must return currency in uppercase', () => {
      const isTestnet = false;
      const currency = 'hive';
      const result = CurrencyUtils.getCurrencyLabel(currency, isTestnet);
      expect(result).toBe('PIXA');
    });

    test('Passing currency="hbd" and isTesnet as false, must return currency in uppercase', () => {
      const isTestnet = false;
      const currency = 'hbd';
      const result = CurrencyUtils.getCurrencyLabel(currency, isTestnet);
      expect(result).toBe('PXS');
    });

    test('Passing currency="hp" and isTesnet as false, must return currency in uppercase', () => {
      const isTestnet = false;
      const currency = 'hp';
      const result = CurrencyUtils.getCurrencyLabel(currency, isTestnet);
      expect(result).toBe('PP');
    });

    test('Passing currency="hive" and isTesnet as true, must return PIXA', () => {
      const isTestnet = true;
      const currency = 'hive';
      const result = CurrencyUtils.getCurrencyLabel(currency, isTestnet);
      expect(result).toBe('PIXA');
    });

    test('Passing currency="hbd" and isTesnet as true, must return PXS', () => {
      const isTestnet = true;
      const currency = 'hbd';
      const result = CurrencyUtils.getCurrencyLabel(currency, isTestnet);
      expect(result).toBe('PXS');
    });

    test('Passing currency="hp" and isTesnet as true, must return PP', () => {
      const isTestnet = true;
      const currency = 'hp';
      const result = CurrencyUtils.getCurrencyLabel(currency, isTestnet);
      expect(result).toBe('PP');
    });
  });
});
