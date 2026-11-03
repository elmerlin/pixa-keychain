import { ActiveAccountModule } from '@background/active-account.module';
import MkModule from '@background/mk.module';
import BgdAccountsUtils from '@background/utils/accounts.utils';
import { ActiveAccount } from '@interfaces/active-account.interface';
import { LocalAccount } from '@interfaces/local-account.interface';
import { LocalStorageClaimItem } from '@interfaces/local-storage-claim-item.interface';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { Asset } from 'hive-keychain-commons';
import moment from 'moment';
import Config from 'src/config';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import { RewardsUtils } from 'src/popup/hive/utils/rewards.utils';
import { SavingsUtils } from 'src/popup/hive/utils/savings.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import Logger from 'src/utils/logger.utils';
import { ObjectUtils } from 'src/utils/object.utils';

const start = async () => {
  if (!!process.env.STOP_AUTOLOCK) return;
  Logger.info(`Will autoclaim every ${Config.claims.FREQUENCY}mn`);
  chrome.alarms.create({ periodInMinutes: Config.claims.FREQUENCY });
  await alarmHandler();
};

const alarmHandler = async () => {
  const localStorage = await LocalStorageUtils.getMultipleValueFromLocalStorage(
    [
      LocalStorageKeyEnum.CLAIM_ACCOUNTS,
      LocalStorageKeyEnum.CLAIM_REWARDS,
      LocalStorageKeyEnum.CLAIM_SAVINGS,
    ],
  );
  const mk = await MkModule.getMk();
  const claimAccounts = localStorage[LocalStorageKeyEnum.CLAIM_ACCOUNTS];
  const claimRewards = localStorage[LocalStorageKeyEnum.CLAIM_REWARDS];
  const claimSavings = localStorage[LocalStorageKeyEnum.CLAIM_SAVINGS];
  if (!mk) return;
  if (claimAccounts) {
    await initClaimAccounts(claimAccounts, mk);
  }
  if (claimRewards) {
    await initClaimRewards(claimRewards, mk);
  }
  if (claimSavings) {
    await initClaimSavings(claimSavings, mk);
  }
};

chrome.alarms.onAlarm.addListener(alarmHandler);

const initClaimRewards = async (
  claimRewards: LocalStorageClaimItem,
  mk: string,
) => {
  if (ObjectUtils.isPureObject(claimRewards)) {
    const users = Object.keys(claimRewards).filter(
      (user) => claimRewards[user] === true,
    );
    await iterateClaimRewards(users, mk);
  } else {
    Logger.error('startClaimRewards: claimRewards not defined');
  }
};

const iterateClaimRewards = async (users: string[], mk: string) => {
  const userExtendedAccounts = await AccountUtils.getExtendedAccounts(users);
  const localAccounts: LocalAccount[] =
    await BgdAccountsUtils.getAccountsFromLocalStorage(mk);
  for (const userAccount of userExtendedAccounts) {
    const activeAccount = await ActiveAccountModule.createActiveAccount(
      userAccount,
      localAccounts,
    );
    if (
      activeAccount &&
      RewardsUtils.hasReward(
        activeAccount.account.reward_pxs_balance as string,
        activeAccount.account.reward_vesting_balance
          .toString()
          .replace('VESTS', ''),
        activeAccount.account.reward_pixa_balance as string,
      )
    ) {
      Logger.info(`Claiming rewards for @${activeAccount.name}`);

      await RewardsUtils.claimRewards(
        activeAccount.name!,
        userAccount.reward_pixa_balance,
        userAccount.reward_pxs_balance,
        userAccount.reward_vesting_balance,
        activeAccount.keys.posting!,
      );
    }
  }
};

const initClaimSavings = async (
  claimSavings: { [username: string]: boolean },
  mk: string,
) => {
  if (ObjectUtils.isPureObject(claimSavings)) {
    const users = Object.keys(claimSavings).filter(
      (username) => claimSavings[username] === true,
    );
    await iterateClaimSavings(users, mk);
  } else {
    Logger.error('startClaimSavings: claimSavings not defined');
  }
};

const iterateClaimSavings = async (users: string[], mk: string) => {
  const userExtendedAccounts = await AccountUtils.getExtendedAccounts(users);
  const localAccounts: LocalAccount[] =
    await BgdAccountsUtils.getAccountsFromLocalStorage(mk);

  for (const userAccount of userExtendedAccounts) {
    const activeAccount = await ActiveAccountModule.createActiveAccount(
      userAccount,
      localAccounts,
    );
    if (!activeAccount) continue;
    let baseDate: any =
      new Date(
        activeAccount?.account.savings_pxs_last_interest_payment!,
      ).getUTCFullYear() === 1970
        ? activeAccount?.account.savings_pxs_seconds_last_update
        : activeAccount?.account.savings_pxs_last_interest_payment;

    baseDate = moment(baseDate).utcOffset('+0000', true);
    const hasSavingsToClaim =
      Number(activeAccount?.account.savings_pxs_seconds) > 0 ||
      Asset.from(activeAccount?.account.savings_pxs_balance! as Asset).amount >
        0;

    if (!hasSavingsToClaim) {
      Logger.info(
        `@${activeAccount?.name} doesn't have any savings interests to claim`,
      );
    } else {
      const canClaimSavings =
        moment(moment().utc()).diff(baseDate, 'days') >=
        Config.claims.savings.delay;
      if (canClaimSavings) {
        try {
          if (await SavingsUtils.claimSavings(activeAccount!)) {
            Logger.info(`Claim savings for @${activeAccount?.name} successful`);
          }
        } catch (err: any) {
          Logger.error('Error while claiming savings');
        }
      } else {
        Logger.info(`Not time to claim yet for @${activeAccount?.name}`);
      }
    }
  }
};

const initClaimAccounts = async (
  claimAccounts: { [x: string]: boolean },
  mk: string,
) => {
  if (ObjectUtils.isPureObject(claimAccounts)) {
    const users = Object.keys(claimAccounts).filter(
      (user) => claimAccounts[user] === true,
    );
    await iterateClaimAccounts(users, mk);
  } else {
    Logger.error('startClaimAccounts: claimAccounts not defined');
  }
};

const iterateClaimAccounts = async (users: string[], mk: string) => {
  const userExtendedAccounts = await AccountUtils.getExtendedAccounts(users);
  const localAccounts: LocalAccount[] =
    await BgdAccountsUtils.getAccountsFromLocalStorage(mk);
  for (const userAccount of userExtendedAccounts) {
    // A refused ticket mustn't stop the rewards and savings claims that come after it.
    try {
      const activeAccount = await ActiveAccountModule.createActiveAccount(
        userAccount,
        localAccounts,
      );
      if (activeAccount) await claimTicketIfFull(activeAccount);
    } catch (err) {
      Logger.error(`Could not claim a ticket for @${userAccount.name}`, err);
    }
  }
};

// One ticket each time RC fills. An alarm that wakes the service worker runs the claims twice at
// once, and the node can take a block to show RC going down, so a claim is remembered for a while.
// Losing this when the worker stops is fine: by then the node has caught up.
const lastTicketClaim: { [username: string]: number } = {};

const claimTicketIfFull = async (activeAccount: ActiveAccount) => {
  const { name, rc, keys } = activeAccount;
  if (!keys.active || rc.percentage < Config.claims.freeAccount.MIN_RC_PCT) {
    return;
  }
  const available = Number(rc.max_rc) * (rc.percentage / 100);
  if (available < (await AccountUtils.getAccountTicketCost())) {
    Logger.info(`@${name} doesn't have enough RC for a ticket`);
    return;
  }
  const claimedAgo = Date.now() - (lastTicketClaim[name!] ?? 0);
  if (claimedAgo < Config.claims.FREQUENCY * 60 * 1000) return;
  lastTicketClaim[name!] = Date.now();
  await AccountUtils.claimAccounts(activeAccount);
};

const ClaimModule = {
  start,
};

export default ClaimModule;
