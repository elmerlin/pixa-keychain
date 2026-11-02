import CurrencyPricesUtils from '@hiveapp/utils/currency-prices.utils';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import LocalStorageUtils from 'src/utils/localStorage.utils';

describe('Pixagram prices in PXS', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reads the median feed, values PXS at one and caches prices', async () => {
    const getData = jest.spyOn(HiveTxUtils, 'getData').mockResolvedValue({
      base: '3.000 PXS',
      quote: '2.000 PIXA',
    });
    const save = jest
      .spyOn(LocalStorageUtils, 'saveValueInLocalStorage')
      .mockResolvedValue(undefined);
    const prices = { bitcoin: {}, hive: { usd: 1.5 }, hive_dollar: { usd: 1 } };
    await expect(CurrencyPricesUtils.getPrices()).resolves.toEqual(prices);
    expect(getData).toHaveBeenCalledWith(
      'condenser_api.get_current_median_history_price',
      [],
    );
    expect(save).toHaveBeenCalledWith(LocalStorageKeyEnum.LAST_PRICE, prices);
  });

  it('falls back to the cached price when the RPC fails', async () => {
    jest
      .spyOn(HiveTxUtils, 'getData')
      .mockRejectedValue(new Error('RPC unavailable'));
    const cached = { bitcoin: {}, hive: { usd: 0.5 }, hive_dollar: { usd: 1 } };
    const read = jest
      .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
      .mockResolvedValue(cached);
    const save = jest
      .spyOn(LocalStorageUtils, 'saveValueInLocalStorage')
      .mockResolvedValue(undefined);
    await expect(CurrencyPricesUtils.getPrices()).resolves.toEqual(cached);
    expect(read).toHaveBeenCalledWith(LocalStorageKeyEnum.LAST_PRICE);
    expect(save).not.toHaveBeenCalled();
  });

  it('returns an empty price map when neither the feed nor a cache is available', async () => {
    jest
      .spyOn(HiveTxUtils, 'getData')
      .mockRejectedValue(new Error('RPC unavailable'));
    jest
      .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
      .mockResolvedValue(undefined);
    await expect(CurrencyPricesUtils.getPrices()).resolves.toEqual({});
  });
});
