import { HiveInternalMarketLockedInOrders } from '@interfaces/hive-market.interface';
import { HiveTxUtils } from '@popup/hive/utils/hive-tx.utils';
import Logger from 'src/utils/logger.utils';

const getHiveInternalMarketOrders = async (username: string) => {
  let totals: HiveInternalMarketLockedInOrders = {
    hive: 0,
    hbd: 0,
  };
  try {
    const openMarketOrders = await HiveTxUtils.getData(
      'condenser_api.get_open_orders',
      [username],
    );
    // for_sale is what's still locked, in thousandths. The price stays as the order was placed.
    const stillLocked = (symbol: string) =>
      openMarketOrders
        .filter((order: any) => order.sell_price.base.endsWith(` ${symbol}`))
        .reduce(
          (acc: number, openOrder: any) =>
            acc + Number(openOrder.for_sale) / 1000,
          0,
        );
    totals.hive = stillLocked('PIXA');
    totals.hbd = stillLocked('PXS');
  } catch (error) {
    Logger.log('Error getting Hive Open orders for user', { error });
  } finally {
    return totals;
  }
};

export const HiveInternalMarketUtils = {
  getHiveInternalMarketOrders,
};
