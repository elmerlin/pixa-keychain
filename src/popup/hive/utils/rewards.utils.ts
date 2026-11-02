import type { Asset, ClaimRewardBalanceOperation } from '@hiveio/dhive';
import { ActiveAccount } from '@interfaces/active-account.interface';
import { TransactionResult } from '@interfaces/hive-tx.interface';
import { TransactionOptions } from '@interfaces/keys.interface';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import FormatUtils from 'src/utils/format.utils';

const claimRewards = async (
  username: string,
  rewardHive: string | Asset,
  rewardHBD: string | Asset,
  rewardVests: string | Asset,
  postingKey: string,
  options?: TransactionOptions,
): Promise<TransactionResult | null> => {
  return await HiveTxUtils.sendOperation(
    [
      [
        'claim_reward_balance',
        {
          account: username,
          reward_pixa: rewardHive,
          reward_pxs: rewardHBD,
          reward_vests: rewardVests,
        },
      ] as ClaimRewardBalanceOperation,
    ],
    postingKey,
    false,
    options,
  );
};

const hasReward = (
  reward_pxs: string,
  reward_hp: string,
  reward_pixa: string,
): boolean => {
  return (
    FormatUtils.getValFromString(reward_pxs) !== 0 ||
    FormatUtils.getValFromString(reward_hp) !== 0 ||
    FormatUtils.getValFromString(reward_pixa) !== 0
  );
};

const getAvailableRewards = (activeAccount: ActiveAccount) => {
  let reward_pxs = activeAccount.account.reward_pxs_balance;
  let reward_vests = activeAccount.account.reward_vesting_balance;
  const reward_hp = FormatUtils.toHP(reward_vests as string) + ' PP';
  let reward_pixa = activeAccount.account.reward_pixa_balance;
  let rewardText = chrome.i18n.getMessage('popup_account_redeem') + ':<br>';
  if (FormatUtils.getValFromString(reward_hp) != 0)
    rewardText += reward_hp + ' / ';
  if (FormatUtils.getValFromString(reward_pxs as string) != 0)
    rewardText += reward_pxs + ' / ';
  if (FormatUtils.getValFromString(reward_pixa as string) != 0)
    rewardText += reward_pixa + ' / ';
  rewardText = rewardText.slice(0, -3);
  return [reward_pxs, reward_hp, reward_pixa, rewardText];
};

export const RewardsUtils = {
  claimRewards,
  hasReward,
  getAvailableRewards,
};
