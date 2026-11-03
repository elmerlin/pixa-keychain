import ClaimModule from '@background/claim.module';
import MkModule from '@background/mk.module';
import BgdAccountsUtils from '@background/utils/accounts.utils';
import AccountUtils from '@hiveapp/utils/account.utils';
import { RewardsUtils } from '@hiveapp/utils/rewards.utils';
import { SavingsUtils } from '@hiveapp/utils/savings.utils';
import { Client } from '@hiveio/dhive';
import { DefaultRpcs } from '@reference-data/default-rpc.list';
import accounts from 'src/__tests__/utils-for-testing/data/accounts';
import mk from 'src/__tests__/utils-for-testing/data/mk';
import Config from 'src/config';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import Logger from 'src/utils/logger.utils';

describe('claim.module tests:\n', () => {
  const initialMIN_RC_PCT = Config.claims.freeAccount.MIN_RC_PCT;
  const initialSavingsDelay = Config.claims.savings.delay;
  const client = new Client(DefaultRpcs[0].uri);

  afterAll(() => {
    Config.claims.freeAccount.MIN_RC_PCT = initialMIN_RC_PCT;
    Config.claims.savings.delay = initialSavingsDelay;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    Config.claims.savings.delay = initialSavingsDelay;
  });

  beforeEach(() => {
    jest.spyOn(MkModule, 'getMk').mockResolvedValue(undefined);
  });

  it('Must create alarm and call Logger', async () => {
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        __MK: undefined,
        claimAccounts: undefined,
        claimRewards: undefined,
        claimSavings: undefined,
      });
    const sLoggerInfo = jest.spyOn(Logger, 'info');
    const sCreate = jest
      .spyOn(chrome.alarms, 'create')
      .mockReturnValue(undefined);
    await ClaimModule.start();
    expect(sLoggerInfo).toHaveBeenCalledWith(
      `Will autoclaim every ${Config.claims.FREQUENCY}mn`,
    );
    expect(sCreate).toHaveBeenCalledWith({
      periodInMinutes: Config.claims.FREQUENCY,
    });
  });

  it('Must call Logger with error on each case', async () => {
    jest.spyOn(MkModule, 'getMk').mockResolvedValue(mk.user.one);
    const nonValidClaims = [
      {
        __MK: mk.user.one,
        claimAccounts: [],
        claimRewards: ['hi there'],
        claimSavings: [{ key: 1 }],
      },
      {
        __MK: mk.user.one,
        claimAccounts: 'not object',
        claimRewards: 'not object',
        claimSavings: 'not object',
      },
    ];
    const sLoggerError = jest.spyOn(Logger, 'error');
    for (let i = 0; i < nonValidClaims.length; i++) {
      LocalStorageUtils.getMultipleValueFromLocalStorage = jest
        .fn()
        .mockResolvedValue(nonValidClaims[i]);
      await ClaimModule.start();
      expect(sLoggerError).toHaveBeenNthCalledWith(
        1,
        'startClaimAccounts: claimAccounts not defined',
      );
      expect(sLoggerError).toHaveBeenNthCalledWith(
        2,
        'startClaimRewards: claimRewards not defined',
      );
      expect(sLoggerError).toHaveBeenNthCalledWith(
        3,
        'startClaimSavings: claimSavings not defined',
      );
      sLoggerError.mockReset();
    }
  });

  it('Must call logger with nothing to claim', async () => {
    jest.spyOn(MkModule, 'getMk').mockResolvedValue(mk.user.one);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        __MK: mk.user.one,
        claimAccounts: undefined,
        claimRewards: undefined,
        claimSavings: { 'keychain.tests': true },
      });
    AccountUtils.getExtendedAccounts = jest.fn().mockResolvedValue([
      {
        ...accounts.extended,
        pxs_last_interest_payment: '1970-01-01 00:00:00',
        savings_pxs_seconds: '0',
        savings_pxs_balance: '0.000 PXS',
      },
    ]);
    AccountUtils.getRCMana = jest.fn().mockResolvedValue(accounts.active.rc);
    BgdAccountsUtils.getAccountsFromLocalStorage = jest
      .fn()
      .mockResolvedValue([accounts.local.justTwoKeys]);
    client.rc.calculateRCMana = jest.fn().mockResolvedValue(accounts.active.rc);
    const sLoggerInfo = jest.spyOn(Logger, 'info');
    const sClaimSavings = jest.spyOn(SavingsUtils, 'claimSavings');
    await ClaimModule.start();
    expect(sLoggerInfo).toHaveBeenNthCalledWith(
      2,
      `@${accounts.active.name} doesn't have any savings interests to claim`,
    );
    expect(sClaimSavings).not.toHaveBeenCalled();
  });

  it('Must call logger with no time to claim', async () => {
    jest.spyOn(MkModule, 'getMk').mockResolvedValue(mk.user.one);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        __MK: mk.user.one,
        claimAccounts: undefined,
        claimRewards: undefined,
        claimSavings: { 'keychain.tests': true },
      });
    AccountUtils.getExtendedAccounts = jest.fn().mockResolvedValue([
      {
        ...accounts.extended,
        pxs_last_interest_payment: '2021-06-02 16:46:36',
        savings_pxs_seconds: '457,677,360',
        savings_pxs_balance: '3,148.720 PXS',
      },
    ]);
    AccountUtils.getRCMana = jest.fn().mockResolvedValue(accounts.active.rc);
    BgdAccountsUtils.getAccountsFromLocalStorage = jest
      .fn()
      .mockResolvedValue([accounts.local.justTwoKeys]);
    client.rc.calculateRCMana = jest.fn().mockResolvedValue(accounts.active.rc);
    Config.claims.savings.delay = 1000000000;
    const sLoggerInfo = jest.spyOn(Logger, 'info');
    const sClaimSavings = jest.spyOn(SavingsUtils, 'claimSavings');
    await ClaimModule.start();
    expect(sLoggerInfo).toHaveBeenNthCalledWith(
      2,
      `Not time to claim yet for @${accounts.active.name}`,
    );
    expect(sClaimSavings).not.toHaveBeenCalled();
  });

  describe('Account tickets:\n', () => {
    const TICKET_COST = 3e8;
    let tests = 0;

    // Each test has its own account, because a claim is remembered by name for a while.
    const setUp = ({
      percentage = 100,
      maxRc = 4e9,
      active = 'active-key',
    } = {}) => {
      const name = `ticket.tests.${++tests}`;
      jest.spyOn(MkModule, 'getMk').mockResolvedValue(mk.user.one);
      LocalStorageUtils.getMultipleValueFromLocalStorage = jest
        .fn()
        .mockResolvedValue({
          claimAccounts: { [name]: true },
          claimRewards: undefined,
          claimSavings: undefined,
        });
      AccountUtils.getExtendedAccounts = jest
        .fn()
        .mockResolvedValue([{ ...accounts.extended, name }]);
      BgdAccountsUtils.getAccountsFromLocalStorage = jest
        .fn()
        .mockResolvedValue([{ name, keys: { active, posting: 'posting-key' } }]);
      AccountUtils.getRCMana = jest.fn().mockResolvedValue({
        percentage,
        max_rc: String(maxRc),
        rc_manabar: { current_mana: '1', last_update_time: 1 },
      });
      AccountUtils.getAccountTicketCost = jest
        .fn()
        .mockResolvedValue(TICKET_COST);
      return {
        name,
        claim: jest
          .spyOn(AccountUtils, 'claimAccounts')
          .mockResolvedValue(null as any),
      };
    };

    it('Must claim one when RC reaches 100%', async () => {
      const { name, claim } = setUp();
      await ClaimModule.start();
      expect(claim).toHaveBeenCalledTimes(1);
      expect(claim.mock.calls[0][0].name).toBe(name);
    });

    it('Must wait while RC is below 100%, however close', async () => {
      const { claim } = setUp({ percentage: 99.99 });
      await ClaimModule.start();
      expect(claim).not.toHaveBeenCalled();
    });

    it('Must not claim without the active key', async () => {
      const { claim } = setUp({ active: '' });
      await ClaimModule.start();
      expect(claim).not.toHaveBeenCalled();
    });

    it('Must not claim when full RC cannot cover a ticket', async () => {
      const { claim } = setUp({ maxRc: TICKET_COST - 1 });
      await ClaimModule.start();
      expect(claim).not.toHaveBeenCalled();
    });

    it('Must claim once when an alarm and waking up both run the claims', async () => {
      const { claim } = setUp();
      await Promise.all([ClaimModule.start(), ClaimModule.start()]);
      expect(claim).toHaveBeenCalledTimes(1);
    });

    it('Must not claim again before the node shows RC going down', async () => {
      const { claim } = setUp();
      await ClaimModule.start();
      await ClaimModule.start();
      expect(claim).toHaveBeenCalledTimes(1);
    });

    it('Must claim again once RC is back at 100% later on', async () => {
      const { claim } = setUp();
      const now = Date.now();
      await ClaimModule.start();
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(now + Config.claims.FREQUENCY * 60 * 1000 + 1000);
      await ClaimModule.start();
      expect(claim).toHaveBeenCalledTimes(2);
    });

    it('Must still claim rewards when a ticket is refused', async () => {
      const { name, claim } = setUp();
      LocalStorageUtils.getMultipleValueFromLocalStorage = jest
        .fn()
        .mockResolvedValue({
          claimAccounts: { [name]: true },
          claimRewards: { [name]: true },
          claimSavings: undefined,
        });
      claim.mockRejectedValue(new Error('refused'));
      const sError = jest.spyOn(Logger, 'error').mockImplementation(() => {});
      const sHasReward = jest
        .spyOn(RewardsUtils, 'hasReward')
        .mockReturnValue(false);
      await ClaimModule.start();
      expect(sError).toHaveBeenCalled();
      expect(sHasReward).toHaveBeenCalled();
    });
  });

  describe('Rewards:\n', () => {
    let tests = 0;

    const setUp = (savings = false) => {
      const name = `reward.tests.${++tests}`;
      jest.spyOn(MkModule, 'getMk').mockResolvedValue(mk.user.one);
      LocalStorageUtils.getMultipleValueFromLocalStorage = jest
        .fn()
        .mockResolvedValue({
          claimAccounts: undefined,
          claimRewards: { [name]: true },
          claimSavings: savings ? { [name]: true } : undefined,
        });
      AccountUtils.getExtendedAccounts = jest.fn().mockResolvedValue([
        {
          ...accounts.extended,
          name,
          reward_vesting_balance: '1.898998 VESTS',
          savings_pxs_seconds: '0',
          savings_pxs_balance: '0.000 PXS',
        },
      ]);
      BgdAccountsUtils.getAccountsFromLocalStorage = jest
        .fn()
        .mockResolvedValue([{ name, keys: { posting: 'posting-key' } }]);
      AccountUtils.getRCMana = jest.fn().mockResolvedValue(accounts.active.rc);
      jest.spyOn(RewardsUtils, 'hasReward').mockReturnValue(true);
      return {
        name,
        claim: jest
          .spyOn(RewardsUtils, 'claimRewards')
          .mockResolvedValue(null as any),
      };
    };

    it('Must claim once when an alarm and waking up both run the claims', async () => {
      const { claim } = setUp();
      await Promise.all([ClaimModule.start(), ClaimModule.start()]);
      expect(claim).toHaveBeenCalledTimes(1);
    });

    it('Must not throw when the chain refuses a claim', async () => {
      const { claim } = setUp();
      claim.mockRejectedValue(new Error('Cannot claim that much'));
      jest.spyOn(Logger, 'error').mockImplementation(() => {});
      await expect(ClaimModule.start()).resolves.toBeUndefined();
    });

    it('Must still get to savings after a refused claim', async () => {
      const { name, claim } = setUp(true);
      claim.mockRejectedValue(new Error('Cannot claim that much'));
      jest.spyOn(Logger, 'error').mockImplementation(() => {});
      const sInfo = jest.spyOn(Logger, 'info');
      await ClaimModule.start();
      expect(sInfo).toHaveBeenCalledWith(
        `@${name} doesn't have any savings interests to claim`,
      );
    });

    it('Must not throw when the node stops answering', async () => {
      setUp();
      AccountUtils.getExtendedAccounts = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(Logger, 'error').mockImplementation(() => {});
      await expect(ClaimModule.start()).resolves.toBeUndefined();
    });
  });
});
