import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import { SavingsUtils } from '@hiveapp/utils/savings.utils';
import { ActiveAccount } from '@interfaces/active-account.interface';
import accounts from 'src/__tests__/utils-for-testing/data/accounts';
import mk from 'src/__tests__/utils-for-testing/data/mk';
import objects from 'src/__tests__/utils-for-testing/helpers/objects';
import Logger from 'src/utils/logger.utils';

describe('savings.utils.ts tests:\n', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });
  describe('getRequestId cases:\n', () => {
    it('Must return next id to use', async () => {
      HiveTxUtils.getData = jest.fn().mockResolvedValue([
        {
          request_id: 10,
        },
        {
          request_id: 100,
        },
      ]);
      expect(await SavingsUtils.getRequestId(mk.user.one)).toBe(101);
    });
  });

  describe('claimSavings cases:\n', () => {
    it('Must return false, call logger with no deposits/savings', async () => {
      const sLogger = jest.spyOn(Logger, 'error');
      const clonedActiveAccount = objects.clone(
        accounts.active,
      ) as ActiveAccount;
      clonedActiveAccount.account.pxs_balance = '0.000 PXS';
      clonedActiveAccount.account.savings_pxs_balance = '0.000 PXS';
      expect(await SavingsUtils.claimSavings(clonedActiveAccount)).toBe(false);
      expect(sLogger).toHaveBeenCalledWith(
        `@${clonedActiveAccount.name} has no PXS to deposit or savings to withdraw`,
      );
      sLogger.mockClear();
    });

    it('Must return true while claiming deposit', async () => {
      const clonedActiveAccount = objects.clone(
        accounts.active,
      ) as ActiveAccount;
      clonedActiveAccount.account.pxs_balance = '10.000 PXS';
      clonedActiveAccount.account.savings_pxs_balance = '0.000 PXS';
      SavingsUtils.deposit = jest.fn().mockResolvedValue(true);
      expect(await SavingsUtils.claimSavings(clonedActiveAccount)).toBe(true);
    });

    it('Must return true while claiming withdraw', async () => {
      const clonedActiveAccount = objects.clone(
        accounts.active,
      ) as ActiveAccount;
      clonedActiveAccount.account.pxs_balance = '0.000 PXS';
      clonedActiveAccount.account.savings_pxs_balance = '10.000 PXS';
      SavingsUtils.withdraw = jest.fn().mockResolvedValue(true);
      expect(await SavingsUtils.claimSavings(clonedActiveAccount)).toBe(true);
    });
  });
});
