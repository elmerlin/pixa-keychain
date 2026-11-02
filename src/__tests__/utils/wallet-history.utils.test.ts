import { WalletHistoryUtils } from '@hiveapp/utils/wallet-history.utils';
import {
  ClaimReward,
  CollateralizedConvert,
  Convert,
  Delegation,
  DepositSavings,
  FillCollateralizedConvert,
  FillConvert,
  PowerDown,
  PowerUp,
  ReceivedInterests,
  Transfer,
  WithdrawSavings,
} from '@interfaces/transaction.interface';
import userData from 'src/__tests__/utils-for-testing/data/user-data';

describe('wallet-history.utils tests:\n', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });
  describe('filterTransfer tests:\n', () => {
    let fakeTransfer = {
      from: 'workerjab1',
      to: 'keychain.tests',
      amount: '0.001 PIXA',
      memo: 'Not encrypted Memo',
    } as Transfer;
    const activeAccountName = userData.one.username;
    test('Passing a string contained on field memo, must return true', () => {
      expect(
        WalletHistoryUtils.filterTransfer(
          fakeTransfer,
          'Not',
          activeAccountName,
        ),
      ).toBe(true);
    });
    test('Passing a string contained on field amount, must return true', () => {
      expect(
        WalletHistoryUtils.filterTransfer(
          fakeTransfer,
          'PI',
          activeAccountName,
        ),
      ).toBe(true);
    });
    test('if the transfer is not on itself, passing a string contained on field from, must return true', () => {
      expect(
        WalletHistoryUtils.filterTransfer(
          fakeTransfer,
          'jab1',
          activeAccountName,
        ),
      ).toBe(true);
    });
    test('if (transfer.to === activeAccountName), must return false', () => {
      expect(
        WalletHistoryUtils.filterTransfer(
          fakeTransfer,
          'test',
          activeAccountName,
        ),
      ).toBe(false);
    });
    test('if (transfer.from === activeAccountName), must return false', () => {
      expect(
        WalletHistoryUtils.filterTransfer(fakeTransfer, 'jab1', 'workerjab1'),
      ).toBe(false);
    });
    test('Passing a string not contained on fields[amount, memo] must return false', () => {
      expect(
        WalletHistoryUtils.filterTransfer(
          fakeTransfer,
          'new',
          activeAccountName,
        ),
      ).toBe(false);
    });
  });

  describe('filterClaimReward tests:\n', () => {
    test('Passing empty values will return true', () => {
      expect(WalletHistoryUtils.filterClaimReward({} as ClaimReward, '')).toBe(
        true,
      );
    });
    test('Passing valid ClaimReward but with empty rewards, will return true', () => {
      expect(
        WalletHistoryUtils.filterClaimReward(
          { hbd: '', hive: '', hp: '' } as ClaimReward,
          '',
        ),
      ).toBe(true);
    });
    test('Passing valid ClaimReward with rewards, but filtering "test", will return false', () => {
      expect(
        WalletHistoryUtils.filterClaimReward(
          {
            hbd: '100.000 PXS',
            hive: '120.000 PIXA',
            hp: '1000.000 PP',
          } as ClaimReward,
          'test',
        ),
      ).toBe(false);
    });
    test('Passing valid ClaimReward with rewards, but filtering "PP", will return true', () => {
      expect(
        WalletHistoryUtils.filterClaimReward(
          {
            hbd: '100.000 PXS',
            hive: '120.000 PIXA',
            hp: '1000.000 PP',
          } as ClaimReward,
          'PP',
        ),
      ).toBe(true);
    });
    test('Passing ClaimReward with rewards, but filtering "pixa", will return true', () => {
      expect(
        WalletHistoryUtils.filterClaimReward(
          {
            hbd: '100.000',
            hive: '120.000 PIXA',
            hp: '1000.000 ',
          } as ClaimReward,
          'pixa',
        ),
      ).toBe(true);
    });
    test('Passing ClaimReward with rewards, but filtering "PXS", will return true', () => {
      expect(
        WalletHistoryUtils.filterClaimReward(
          {
            hbd: '100.000 pxs',
            hive: '120.000 PIX',
            hp: '1000.000 ',
          } as ClaimReward,
          'pxs',
        ),
      ).toBe(true);
    });
  });

  describe('filterPowerUpDown tests:\n', () => {
    test('Passing a powerUp with a contained filterable value, must return true', () => {
      const powerUp = {
        amount: '1000.000 PIXA',
      } as PowerUp;
      expect(WalletHistoryUtils.filterPowerUpDown(powerUp, '1000')).toBe(true);
    });
    test('Passing a powerUp with a non contained filterable value, must return false', () => {
      const powerUp = {
        amount: '1000.000 PIXA',
      } as PowerUp;
      expect(WalletHistoryUtils.filterPowerUpDown(powerUp, '3459')).toBe(false);
    });
    test('Passing a powerDown with a non contained filterable value, must return false', () => {
      const powerDown = {
        amount: '1000.000 VESTS',
      } as PowerDown;
      expect(WalletHistoryUtils.filterPowerUpDown(powerDown, '3459')).toBe(
        false,
      );
    });
    test('Passing a powerDown with a contained filterable value, must return true', () => {
      const powerDown = {
        amount: '1000.000 VESTS',
      } as PowerDown;
      expect(WalletHistoryUtils.filterPowerUpDown(powerDown, 'vests')).toBe(
        true,
      );
    });
  });

  describe('filterSavingsTransaction tests:\n', () => {
    test('Passing a WithdrawSavings with a contained filterable value, must return true', () => {
      const WithdrawSavings = {
        amount: '1000.000 PXS',
      } as WithdrawSavings;
      expect(WalletHistoryUtils.filterPowerUpDown(WithdrawSavings, 'pxs')).toBe(
        true,
      );
    });
    test('Passing a WithdrawSavings with a non contained filterable value, must return false', () => {
      const WithdrawSavings = {
        amount: '1000.000 PXS',
      } as WithdrawSavings;
      expect(
        WalletHistoryUtils.filterPowerUpDown(WithdrawSavings, '2435'),
      ).toBe(false);
    });
    test('Passing a DepositSavings with a non contained filterable value, must return false', () => {
      const DepositSavings = {
        amount: '1000.000 VESTS',
      } as DepositSavings;
      expect(WalletHistoryUtils.filterPowerUpDown(DepositSavings, '3459')).toBe(
        false,
      );
    });
    test('Passing a DepositSavings with a contained filterable value, must return true', () => {
      const DepositSavings = {
        amount: '1000.000 PXS',
      } as DepositSavings;
      expect(WalletHistoryUtils.filterPowerUpDown(DepositSavings, '1000')).toBe(
        true,
      );
    });
  });

  describe('filterDelegation tests:\n', () => {
    const delegation = {
      amount: '100.000 VESTS',
      delegatee: 'workerjab1',
      delegator: 'keychain.tests',
    } as Delegation;
    test('Passing a filterable value contained in amount must return true', () => {
      expect(
        WalletHistoryUtils.filterDelegation(delegation, 'vests', 'workerjab1'),
      ).toBe(true);
    });
    test('Passing a filterable value not contained in amount must return false', () => {
      expect(
        WalletHistoryUtils.filterDelegation(
          delegation,
          '234.800',
          'workerjab1',
        ),
      ).toBe(false);
    });
    test('If (delegation.delegatee === activeAccountName) and trying to filter a value in delegatee, will return false', () => {
      expect(
        WalletHistoryUtils.filterDelegation(delegation, 'jab1', 'workerjab1'),
      ).toBe(false);
    });
    test('If (delegation.delegator === activeAccountName) and trying to filter a value in delegator, will return false', () => {
      expect(
        WalletHistoryUtils.filterDelegation(
          delegation,
          'keychain',
          'keychain.tests',
        ),
      ).toBe(false);
    });
    test('If (delegation.delegator === delegation.delegatee === activeAccountName) and trying to filter a value in delegator, will return false', () => {
      const selfDelegation = {
        amount: '1000.000 PIXA',
        delegatee: 'keychain.tests',
        delegator: 'keychain.tests',
      } as Delegation;
      expect(
        WalletHistoryUtils.filterDelegation(
          selfDelegation,
          'keychain',
          'keychain.tests',
        ),
      ).toBe(false);
    });
    test('If (delegation.delegator === delegation.delegatee === activeAccountName) and trying to filter a value in delegatee, will return false', () => {
      const selfDelegation = {
        amount: '1000.000 PIXA',
        delegatee: 'keychain.tests',
        delegator: 'keychain.tests',
      } as Delegation;
      expect(
        WalletHistoryUtils.filterDelegation(
          selfDelegation,
          'key',
          'keychain.tests',
        ),
      ).toBe(false);
    });
  });

  describe('filterInterest tests:\n', () => {
    const interest = {
      interest: '1000.000 PXS',
    } as ReceivedInterests;
    test('Passing a value not contained in interest must return false', () => {
      expect(WalletHistoryUtils.filterInterest(interest, 'PIXA')).toBe(false);
    });
    test('Passing a value contained in interest must return true', () => {
      expect(WalletHistoryUtils.filterInterest(interest, 'pxs')).toBe(true);
    });
  });

  describe('filterConversion tests:\n', () => {
    const convert = {
      amount: '123.005 PIXA',
    } as Convert;
    const collateralizedConvert = {
      amount: '128.005 PIXA',
    } as CollateralizedConvert;
    test('Passing a value not contained in a Convert must return false', () => {
      expect(WalletHistoryUtils.filterConversion(convert, 'PXS')).toBe(false);
    });
    test('Passing a value contained in Convert must return true', () => {
      expect(WalletHistoryUtils.filterConversion(convert, 'pixa')).toBe(true);
    });
    test('Passing a value not contained in a CollateralizedConvert must return false', () => {
      expect(
        WalletHistoryUtils.filterConversion(collateralizedConvert, 'PXS'),
      ).toBe(false);
    });
    test('Passing a value contained in CollateralizedConvert must return true', () => {
      expect(
        WalletHistoryUtils.filterConversion(collateralizedConvert, '128.0'),
      ).toBe(true);
    });
  });

  describe('filterFillConversion tests:\n', () => {
    const fillConvert = {
      amount_in: '10.000 PIXA',
      amount_out: '100.005 PXS',
    } as FillConvert;
    const fillCollateralizedConvert = {
      amount_in: '30.001 PXS',
      amount_out: '3009.009 PIXA',
    } as FillCollateralizedConvert;
    test('Passing a value contained in a fillConvert(amount_in) must return true', () => {
      expect(
        WalletHistoryUtils.filterFillConversion(fillConvert, '10.000'),
      ).toBe(true);
    });
    test('Passing a value contained in a fillConvert(amount_out) must return true', () => {
      expect(
        WalletHistoryUtils.filterFillConversion(fillConvert, '100.005'),
      ).toBe(true);
    });
    test('Passing a value not contained in a fillConvert(amount_in,amount_out) must return false', () => {
      expect(WalletHistoryUtils.filterFillConversion(fillConvert, '200')).toBe(
        false,
      );
    });
    test('Passing a value contained in a fillConvert(amount_out or amount_in) must return true', () => {
      expect(WalletHistoryUtils.filterFillConversion(fillConvert, '.')).toBe(
        true,
      );
    });

    test('Passing a value contained in a FillCollateralizedConvert(amount_in) must return true', () => {
      expect(
        WalletHistoryUtils.filterFillConversion(
          fillCollateralizedConvert,
          'pxs',
        ),
      ).toBe(true);
    });
    test('Passing a value contained in a FillCollateralizedConvert(amount_out) must return true', () => {
      expect(
        WalletHistoryUtils.filterFillConversion(
          fillCollateralizedConvert,
          '.009',
        ),
      ).toBe(true);
    });
    test('Passing a value not contained in a FillCollateralizedConvert(amount_in,amount_out) must return false', () => {
      expect(
        WalletHistoryUtils.filterFillConversion(
          fillCollateralizedConvert,
          'BTC',
        ),
      ).toBe(false);
    });
    test('Passing a value contained in a FillCollateralizedConvert(amount_out or amount_in) must return true', () => {
      expect(
        WalletHistoryUtils.filterFillConversion(fillCollateralizedConvert, 'P'),
      ).toBe(true);
    });
  });
});
