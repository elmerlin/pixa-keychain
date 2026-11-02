import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import Logger from 'src/utils/logger.utils';

// Pixagram has no outside price. PIXA is valued through the witnesses' median feed, so the amounts
// here are in PXS, whatever the field names say.
const getPrices = async () => {
  try {
    const { base, quote } = await HiveTxUtils.getData(
      'condenser_api.get_current_median_history_price',
      [],
    );
    const prices = {
      bitcoin: {},
      hive: { usd: parseFloat(base) / parseFloat(quote) },
      hive_dollar: { usd: 1 },
    };
    await LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.LAST_PRICE,
      prices,
    );
    return prices;
  } catch (err) {
    Logger.error('Cannot read the price feed. Using last known price...', err);
    return (
      (await LocalStorageUtils.getValueFromLocalStorage(
        LocalStorageKeyEnum.LAST_PRICE,
      )) ?? {}
    );
  }
};

const CurrencyPricesUtils = {
  getPrices,
};

export default CurrencyPricesUtils;
