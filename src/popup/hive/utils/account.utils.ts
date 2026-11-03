import type {
  AccountUpdateOperation,
  Authority,
  ClaimAccountOperation,
  DynamicGlobalProperties,
  ExtendedAccount,
} from '@hiveio/dhive/lib/index-browser';
import { CurrencyPrices } from '@interfaces/bittrex.interface';
import { HiveInternalMarketLockedInOrders } from '@interfaces/hive-market.interface';
import { AccountValueType } from '@reference-data/account-value-type.enum';
import { VaultKey } from '@reference-data/vault-message-key.enum';
import axios from 'axios';
import { isWif } from 'hive-keychain-commons';
import { config as HiveTxConfig, PublicKey } from 'hive-tx';
import Config from 'src/config';
import { Accounts } from 'src/interfaces/accounts.interface';
import { ActiveAccount, RC } from 'src/interfaces/active-account.interface';
import {
  Key,
  Keys,
  KeyType,
  TransactionOptions,
} from 'src/interfaces/keys.interface';
import { LocalAccount } from 'src/interfaces/local-account.interface';
import { KeychainError } from 'src/keychain-error';
import EncryptUtils from 'src/popup/hive/utils/encrypt.utils';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import { KeysUtils } from 'src/popup/hive/utils/keys.utils';
import { LocalStorageKeyEnum } from 'src/reference-data/local-storage-key.enum';
import FormatUtils from 'src/utils/format.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import Logger from 'src/utils/logger.utils';
import VaultUtils from 'src/utils/vault.utils';

export enum AccountErrorMessages {
  OWNER_KEY = 'popup_accounts_owner_key_refused',
  INCORRECT_KEY = 'popup_accounts_incorrect_key',
  INCORRECT_USER = 'popup_accounts_incorrect_user',
  MISSING_FIELDS = 'popup_accounts_fill',
  ALREADY_REGISTERED = 'popup_accounts_already_registered',
  PASSWORD_IS_PUBLIC_KEY = 'popup_account_password_is_public_key',
}

const getKeys = async (
  username: string,
  password: string,
): Promise<Keys> => {
  const hiveAccounts = await AccountUtils.getAccount(username);
  if (hiveAccounts.length === 0) {
    throw new Error(AccountErrorMessages.INCORRECT_USER);
  }
  const activeInfo = hiveAccounts[0].active;
  const postingInfo = hiveAccounts[0].posting;
  const memoKey = hiveAccounts[0].memo_key;

  if (isWif(password)) {
    let matchingKeys: Keys = {};
    const pubUnknown = KeysUtils.getPublicKeyFromPrivateKeyString(password);
    // Owner keys are never stored, even when the same key also holds another role.
    if (KeysUtils.getPubkeyWeight(pubUnknown, hiveAccounts[0].owner)) {
      throw new Error(AccountErrorMessages.OWNER_KEY);
    }
    if (pubUnknown === memoKey) {
      matchingKeys = {
        ...matchingKeys,
        memo: password,
        memoPubkey: memoKey,
      };
    }
    if (KeysUtils.getPubkeyWeight(pubUnknown, postingInfo)) {
      matchingKeys = {
        ...matchingKeys,
        posting: password,
        postingPubkey: pubUnknown,
      };
    }
    if (KeysUtils.getPubkeyWeight(pubUnknown, activeInfo)) {
      matchingKeys = {
        ...matchingKeys,
        active: password,
        activePubkey: pubUnknown,
      };
    }
    if (KeysUtils.keysCount(matchingKeys) > 0) {
      return matchingKeys;
    }
  }

  // Anything else may be a master key, whatever it looks like: Pixagram doesn't fix its shape.
  const keys = KeysUtils.derivateFromMasterPassword(
    username,
    password,
    hiveAccounts[0],
  );
  if (keys) {
    // The same rule as a key typed in directly: this one may also be the account's owner key.
    if (
      [keys.postingPubkey, keys.activePubkey, keys.memoPubkey].some(
        (publicKey) =>
          publicKey &&
          KeysUtils.getPubkeyWeight(publicKey, hiveAccounts[0].owner),
      )
    ) {
      throw new Error(AccountErrorMessages.OWNER_KEY);
    }
    return keys;
  }

  // Copied from a PDF, a long key can pick up a space or a line break.
  const compact = password.replace(/\s+/g, '');
  if (compact !== password) {
    return getKeys(username, compact);
  }

  if (isWif(password)) {
    return {};
  }
  throw new Error(AccountErrorMessages.INCORRECT_KEY);
};

const verifyAccount = async (
  username: string,
  password: string,
  existingAccounts: LocalAccount[],
): Promise<Keys | null> => {
  if (username.length === 0 || password.length === 0) {
    throw new Error(AccountErrorMessages.MISSING_FIELDS);
  }
  if (isAccountNameAlreadyExisting(existingAccounts, username)) {
    throw new Error(AccountErrorMessages.ALREADY_REGISTERED);
  }

  // Only once nothing has matched can it be a public key: a master key could begin with these letters too.
  const notKeys = () =>
    new Error(
      password.startsWith('PIX')
        ? AccountErrorMessages.PASSWORD_IS_PUBLIC_KEY
        : AccountErrorMessages.INCORRECT_KEY,
    );
  let keys;
  try {
    keys = await getKeys(username, password);
  } catch (error) {
    throw (error as Error).message === AccountErrorMessages.INCORRECT_KEY
      ? notKeys()
      : error;
  }
  if (!keys || KeysUtils.keysCount(keys) === 0) {
    throw notKeys();
  }
  return keys;
};
/* istanbul ignore next */
const saveAccounts = async (localAccounts: LocalAccount[], mk: string) => {
  const accounts: Accounts = { list: localAccounts };
  const encyptedAccounts = await AccountUtils.encryptAccounts(accounts, mk);
  LocalStorageUtils.saveValueInLocalStorage(
    LocalStorageKeyEnum.ACCOUNTS,
    encyptedAccounts,
  );
};

const getAccountFromLocalStorage = async (
  username: string,
): Promise<LocalAccount | undefined> => {
  const mk = await VaultUtils.getValueFromVault(VaultKey.__MK);
  const accounts = await getAccountsFromLocalStorage(mk);
  return accounts.find((acc) => acc.name === username);
};

/* istanbul ignore next */
const getAccountsFromLocalStorage = async (
  mk: string,
): Promise<LocalAccount[]> => {
  const encryptedAccounts = await LocalStorageUtils.getValueFromLocalStorage(
    LocalStorageKeyEnum.ACCOUNTS,
  );
  const accounts = await EncryptUtils.decryptToJson(encryptedAccounts, mk);
  if (
    accounts &&
    encryptedAccounts &&
    !EncryptUtils.isEncryptedJsonV2(encryptedAccounts)
  ) {
    await LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.ACCOUNTS,
      await EncryptUtils.encryptJson({ list: accounts.list }, mk),
    );
  }
  return accounts?.list.filter(
    (e: LocalAccount) => e.name.length,
  ) as LocalAccount[];
};

const isAccountNameAlreadyExisting = (
  existingAccounts: LocalAccount[],
  accountName: string,
): boolean => {
  if (!existingAccounts || existingAccounts.length === 0) {
    return false;
  }
  return existingAccounts.some(
    (account: LocalAccount) => account.name === accountName,
  );
};
/* istanbul ignore next */
const encryptAccounts = async (accounts: Accounts, mk: string) => {
  return await EncryptUtils.encryptJson(accounts, mk);
};

const hasStoredAccounts = async () => {
  return (
    (await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.ACCOUNTS,
    )) !== undefined
  );
};

const addAuthorizedKey = async (
  activeAccount: ActiveAccount,
  authorizedAccountName: string,
  existingAccounts: LocalAccount[],
  mk: string,
  keyType: string,
) => {
  let authorizedAccount = existingAccounts.find(
    (account: LocalAccount) => account.name === authorizedAccountName,
  );

  let localActiveAccount = existingAccounts.find(
    (account: LocalAccount) => account.name === activeAccount.name,
  );

  if (!authorizedAccount || !localActiveAccount) return; // check error

  localActiveAccount.keys[keyType.toLowerCase() as keyof Keys] =
    authorizedAccount.keys[keyType.toLowerCase() as keyof Keys];
  localActiveAccount.keys[
    `${keyType.toLowerCase()}Pubkey` as keyof Keys
  ] = `@${authorizedAccountName}`;

  return await AccountUtils.saveAccounts(existingAccounts, mk);
};

const addAuthorizedAccount = async (
  username: string,
  authorizedAccount: string,
  existingAccounts: LocalAccount[],
): Promise<Keys | null> => {
  let localAuthorizedAccount: LocalAccount;

  if (username === '' || authorizedAccount === '') {
    throw new KeychainError('popup_accounts_fill', []);
  }

  if (
    !existingAccounts
      .map((localAccount: LocalAccount) => localAccount.name)
      .includes(authorizedAccount)
  ) {
    throw new KeychainError('popup_no_auth_account', [authorizedAccount]);
  } else {
    localAuthorizedAccount = existingAccounts.find(
      (localAccount: LocalAccount) => localAccount.name === authorizedAccount,
    )!;
  }

  if (
    existingAccounts
      .map((localAccount: LocalAccount) => localAccount.name)
      .includes(username)
  ) {
    throw new KeychainError('popup_accounts_already_registered', []);
  }

  const hiveAccounts = await AccountUtils.getAccount(username);
  if (!hiveAccounts || hiveAccounts.length === 0) {
    throw new KeychainError('popup_accounts_incorrect_user', []);
  }
  let hiveAccount = hiveAccounts[0];

  const activeKeyInfo = hiveAccount.active;
  const postingKeyInfo = hiveAccount.posting;

  let keys: Keys = {};

  const activeAuth = activeKeyInfo.account_auths.find(
    (accountAuth) => accountAuth[0] === authorizedAccount,
  );
  const postingAuth = postingKeyInfo.account_auths.find(
    (accountAuth) => accountAuth[0] === authorizedAccount,
  );
  if (!activeAuth && !postingAuth) {
    throw new KeychainError('popup_accounts_no_auth', [
      authorizedAccount,
      username,
    ]);
  }

  if (activeAuth) {
    keys.active = localAuthorizedAccount.keys.active;
    keys.activePubkey = `@${authorizedAccount}`;
  }
  if (postingAuth) {
    keys.posting = localAuthorizedAccount.keys.posting;
    keys.postingPubkey = `@${authorizedAccount}`;
  }

  return keys;
};

const addKey = async (
  activeAccount: ActiveAccount,
  accounts: LocalAccount[],
  privateKey: string,
  keyType: KeyType,
  mk: string,
) => {
  if (privateKey.length === 0 || privateKey.trim().length === 0) {
    throw new Error(AccountErrorMessages.MISSING_FIELDS);
  }

  if (privateKey.startsWith('PIX')) {
    throw new Error(AccountErrorMessages.PASSWORD_IS_PUBLIC_KEY);
  }
  const keys = await AccountUtils.getKeys(activeAccount.name!, privateKey);
  let account = accounts.find(
    (account: LocalAccount) => account.name === activeAccount.name,
  );
  if (keys && account) {
    switch (keyType) {
      case KeyType.ACTIVE:
        if (!keys.active) {
          throw new Error('popup_html_wrong_key_active');
        }
        account.keys.active = keys.active;
        account.keys.activePubkey = keys.activePubkey;
        break;
      case KeyType.POSTING:
        if (!keys.posting) {
          throw new Error('popup_html_wrong_key_posting');
        }
        account.keys.posting = keys.posting;
        account.keys.postingPubkey = keys.postingPubkey;
        break;
      case KeyType.MEMO:
        if (!keys.memo) {
          throw new Error('popup_html_wrong_key_memo');
        }
        account.keys.memo = keys.memo;
        account.keys.memoPubkey = keys.memoPubkey;
        break;
    }

    AccountUtils.saveAccounts(accounts, mk);
    return accounts;
  }
};

const deleteKey = (
  keyType: KeyType,
  accounts: LocalAccount[],
  activeAccount: ActiveAccount,
  mk: string,
): LocalAccount[] => {
  const account = accounts.find(
    (account: LocalAccount) => account.name === activeAccount.name,
  );

  if (KeysUtils.keysCount(account?.keys!) > 2) {
    switch (keyType) {
      case KeyType.ACTIVE:
        delete account?.keys.active;
        delete account?.keys.activePubkey;
        break;
      case KeyType.POSTING:
        delete account?.keys.posting;
        delete account?.keys.postingPubkey;
        break;
      case KeyType.MEMO:
        delete account?.keys.memo;
        delete account?.keys.memoPubkey;
        break;
    }
    AccountUtils.saveAccounts(accounts, mk);
    return accounts;
  } else {
    Logger.error('Cannot delete the last key');
    return accounts;
  }
};

const deleteAccount = (
  accountName: string,
  accounts: LocalAccount[],
): LocalAccount[] => {
  return accounts.filter(
    (account: LocalAccount) => account.name !== accountName,
  );
};

const isAccountListIdentical = (
  a: LocalAccount[],
  b: LocalAccount[],
): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};
/* istanbul ignore next */
const downloadAccounts = async (acc: LocalAccount[], mk: string) => {
  const accounts = { list: acc };
  var data = new Blob([await AccountUtils.encryptAccounts(accounts, mk)], {
    type: 'text/plain',
  });
  var url = window.URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'accounts.kc';
  a.click();
};

const getAccountValue = (
  {
    pxs_balance,
    balance,
    vesting_shares,
    savings_balance,
    savings_pxs_balance,
    name,
  }: ExtendedAccount,
  prices: CurrencyPrices,
  props: DynamicGlobalProperties,
  accountValueType: AccountValueType,
  hiveMarketLockedOpenOrdersValues: HiveInternalMarketLockedInOrders,
) => {
  if (accountValueType === AccountValueType.HIDDEN) return '⁎ ⁎ ⁎';
  if (!prices.hive_dollar?.usd || !prices.hive?.usd) return 0;

  const totalLockedValueInHiveMarket =
    hiveMarketLockedOpenOrdersValues.hbd * prices.hive_dollar.usd +
    hiveMarketLockedOpenOrdersValues.hive * prices.hive.usd;
  const dollarValue =
    (parseFloat(pxs_balance as string) +
      parseFloat(savings_pxs_balance as string)) *
      prices.hive_dollar.usd +
    (FormatUtils.toHP(vesting_shares as string, props) +
      parseFloat(balance as string) +
      parseFloat(savings_balance as string)) *
      prices.hive.usd +
    totalLockedValueInHiveMarket;
  const value =
    accountValueType === AccountValueType.PXS
      ? dollarValue
      : dollarValue / prices.hive.usd;
  return FormatUtils.withCommas(value.toString());
};
/* istanbul ignore next */
const getPublicMemo = async (username: string): Promise<string> => {
  const extendedAccounts = await AccountUtils.getAccount(username);
  return extendedAccounts[0].memo_key;
};

const getPowerDown = (
  account: ExtendedAccount,
  globalProperties: DynamicGlobalProperties,
) => {
  const totalSteem = Number(
    globalProperties.total_vesting_fund_pixa.toString().split(' ')[0],
  );
  const totalVests = Number(
    globalProperties.total_vesting_shares.toString().split(' ')[0],
  );

  const withdrawn = (
    ((Number(account.withdrawn) / totalVests) * totalSteem) /
    1000000
  ).toFixed(0);

  const total_withdrawing = (
    ((Number(account.to_withdraw) / totalVests) * totalSteem) /
    1000000
  ).toFixed(0);
  const next_vesting_withdrawal = account.next_vesting_withdrawal;
  return [withdrawn, total_withdrawing, next_vesting_withdrawal];
};

const doesAccountExist = async (username: string) => {
  return (await AccountUtils.getAccount(username)).length > 0;
};
/* istanbul ignore next */
const getExtendedAccount = async (
  username: string,
): Promise<ExtendedAccount> => {
  return (await AccountUtils.getExtendedAccounts([username]))[0];
};

// An authority change is built on what a node says the account looks like, and that gets signed
// with the active key. So a node the person chose has to agree with the default one first.
const getExtendedAccountToChange = async (
  username: string,
): Promise<ExtendedAccount> => {
  const account = await AccountUtils.getExtendedAccount(username);
  const defaultNode = Config.rpc.DEFAULT.uri;
  if (HiveTxConfig.node.replace(/\/$/, '') !== defaultNode) {
    const authorities = ({ active, posting, memo_key }: ExtendedAccount) =>
      JSON.stringify({ active, posting, memo_key });
    let second: ExtendedAccount | undefined;
    try {
      const { data } = await axios.post(defaultNode, {
        jsonrpc: '2.0',
        id: 1,
        method: 'condenser_api.get_accounts',
        params: [[username]],
      });
      second = data?.result?.[0];
    } catch (e) {
      Logger.error('Could not check the account with the default node', e);
    }
    if (!second || authorities(second) !== authorities(account)) {
      throw new KeychainError('bgd_ops_authority_node_mismatch', [defaultNode]);
    }
  }
  return account;
};

const getExtendedAccounts = async (
  usernames: string[],
): Promise<ExtendedAccount[]> => {
  return await HiveTxUtils.getData('condenser_api.get_accounts', [usernames]);
};
/* istanbul ignore next */
const getAccount = async (username: string): Promise<ExtendedAccount[]> => {
  return HiveTxUtils.getData('condenser_api.get_accounts', [[username]]);
};
const getRCMana = async (username: string) => {
  const result = await HiveTxUtils.getData('rc_api.find_rc_accounts', {
    accounts: [username],
  });

  let manabar = result.rc_accounts[0].rc_manabar;
  const max_mana = Number(result.rc_accounts[0].max_rc);

  const delta: number = Date.now() / 1000 - manabar.last_update_time;
  let current_mana = Number(manabar.current_mana) + (delta * max_mana) / 432000;
  let percentage: number = +((current_mana / max_mana) * 100).toFixed(2);

  if (!isFinite(percentage) || percentage < 0) {
    percentage = 0;
  } else if (percentage > 100) {
    percentage = 100;
  }

  return {
    ...result.rc_accounts[0],
    percentage: percentage,
  };
};

/* istanbul ignore next */

const claimAccounts = async (
  activeAccount: ActiveAccount,
  options?: TransactionOptions,
) => {
  Logger.info(`Claiming free account for @${activeAccount.name}`);

  return HiveTxUtils.sendOperation(
    [
      [
        'claim_account',
        {
          creator: activeAccount.name,
          extensions: [],
          fee: '0.000 PIXA',
        },
      ] as ClaimAccountOperation,
    ],
    activeAccount.keys.active!,
    false,
    options,
  );
};

// What one account ticket costs in RC right now. The price moves with how many were claimed lately,
// so it's worked out from what the chain publishes: its price curve for each resource a claim uses.
const getAccountTicketCost = async (): Promise<number> => {
  const [params, pools, stats, globals] = await Promise.all([
    HiveTxUtils.getData('rc_api.get_resource_params', {}),
    HiveTxUtils.getData('rc_api.get_resource_pool', {}),
    HiveTxUtils.getData('rc_api.get_rc_stats', {}),
    HiveTxUtils.getData('condenser_api.get_dynamic_global_properties', []),
  ]);
  const { resource_state_bytes: state, resource_execution_time: time } =
    params.size_info;
  const used: { [resource: string]: number } = {
    resource_history_bytes: 110,
    resource_new_accounts: 1,
    resource_state_bytes: state.transaction_base_size,
    resource_execution_time:
      time.claim_account_time +
      time.transaction_time +
      time.verify_authority_time,
  };
  const regen =
    (parseFloat(globals.total_vesting_shares) * 1e6) / (432000 / 3);
  return (params.resource_names as string[]).reduce((total, name, index) => {
    if (!used[name]) return total;
    const { resource_dynamics_params: dynamics, price_curve_params: curve } =
      params.resource_params[name];
    const share = (regen * (stats.rc_stats.share[index] ?? 10000)) / 10000;
    const pool = Math.max(0, pools.resource_pool[name].pool);
    return (
      total +
      (((share * Number(curve.coeff_a)) / Math.pow(2, curve.shift) + 1) *
        (used[name] * dynamics.resource_unit)) /
        (curve.coeff_b + pool) +
      1
    );
  }, 0);
};

const updateAccount = (
  username: string,
  active: Authority | undefined,
  posting: Authority | undefined,
  memo: string,
  stringifiedMetadata: string,
  key: Key,
  options?: TransactionOptions,
) => {
  return HiveTxUtils.sendOperation(
    [
      AccountUtils.getUpdateAccountOperation(
        username,
        active,
        posting,
        memo,
        stringifiedMetadata,
      ),
    ],
    key!,
    false,
    options,
  );
};

const getUpdateAccountOperation = (
  username: string,
  active: Authority | undefined,
  posting: Authority | undefined,
  memo: string,
  stringifiedMetadata: string,
) => {
  return [
    'account_update',
    {
      account: username,
      owner: undefined,
      active,
      posting,
      memo_key: memo,
      json_metadata: stringifiedMetadata,
    },
  ] as AccountUpdateOperation;
};
/* istanbul ignore next */
const getUpdateAccountTransaction = (
  username: string,
  active: Authority | undefined,
  posting: Authority | undefined,
  memo: string,
  stringifiedMetadata: string,
) => {
  return HiveTxUtils.createTransaction([
    AccountUtils.getUpdateAccountOperation(
      username,
      active,
      posting,
      memo,
      stringifiedMetadata,
    ),
  ]);
};

const addAccount = async (username: string, keys: Keys) => {
  const mk = await VaultUtils.getValueFromVault(VaultKey.__MK);

  const localAccounts = await AccountUtils.getAccountsFromLocalStorage(mk);
  localAccounts.push({ name: username, keys: keys });
  await AccountUtils.saveAccounts(localAccounts, mk);
};

const addMultipleAccounts = async (localAccounts: LocalAccount[]) => {
  const mk = await VaultUtils.getValueFromVault(VaultKey.__MK);

  let savedAccounts = await AccountUtils.getAccountsFromLocalStorage(mk);
  if (!savedAccounts) savedAccounts = [];
  const newSavedAccounts = [...savedAccounts, ...localAccounts];
  await AccountUtils.saveAccounts(newSavedAccounts, mk);
};

const reorderAccounts = (
  accounts: LocalAccount[],
  start: number,
  end: number,
) => {
  const list = Array.from(accounts);
  const [removed] = list.splice(start, 1);
  list.splice(end, 0, removed);
  return list;
};

// A weight of 0 used to fall through to the threshold, so approving 0 granted full control.
const authorityWeight = (weight: number | undefined, threshold: number) => {
  if (weight === undefined || weight === null) return threshold;
  if (!Number.isInteger(+weight) || +weight < 1 || +weight > 0xffff) {
    throw new KeychainError('bgd_ops_authority_weight_invalid');
  }
  return +weight;
};

// In the chain's own order: by name for accounts, by the key's bytes for keys. Any other order
// signs different bytes from the ones the node checks.
const compareNames = (a: [string, number], b: [string, number]) =>
  a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
const compareKeys = (a: [any, number], b: [any, number]) =>
  Buffer.compare(PublicKey.from(a[0]).key, PublicKey.from(b[0]).key);

// Only the role that was asked about goes in the operation. The other one stays as it is on chain,
// so whatever a node says about it can't be signed along with this.
const onlyRole = (role: 'posting' | 'active', authority: Authority) =>
  role === 'active'
    ? { active: authority, posting: undefined }
    : { active: undefined, posting: authority };

const processAuthorityUpdate = async (
  userAccount: ExtendedAccount,
  role: 'posting' | 'active',
  authorizedUsername: string,
  weight?: number,
) => {
  const updatedAuthority = userAccount[role];

  /** Check if account already exists in the account_auths array */
  const authorizedAccounts = updatedAuthority.account_auths.map(
    (auth) => auth[0],
  );

  const hasAuthority = authorizedAccounts.indexOf(authorizedUsername) !== -1;
  if (hasAuthority) {
    throw new KeychainError('already_has_authority_error');
  }

  /** Use weight_threshold as default weight */
  const finalWeight = authorityWeight(weight, userAccount[role].weight_threshold);
  updatedAuthority.account_auths.push([authorizedUsername, finalWeight]);
  updatedAuthority.account_auths.sort(compareNames);

  return onlyRole(role, updatedAuthority);
};

const processAuthorityRemoval = async (
  userAccount: ExtendedAccount,
  role: 'posting' | 'active',
  authorizedUsername: string,
) => {
  const updatedAuthority = userAccount[role];
  const totalAuthorizedUser = updatedAuthority.account_auths.length;

  // Remove the authority if it exists
  for (let i = 0; i < totalAuthorizedUser; i++) {
    const user = updatedAuthority.account_auths[i];
    if (user[0] === authorizedUsername) {
      updatedAuthority.account_auths.splice(i, 1);
      break;
    }
  }

  /** Check if the account was actually removed */
  if (totalAuthorizedUser === updatedAuthority.account_auths.length) {
    throw new KeychainError('nothing_to_remove_error');
  }

  return onlyRole(role, updatedAuthority);
};

const processKeyAuthorityUpdate = async (
  userAccount: ExtendedAccount,
  role: 'posting' | 'active',
  authorizedKey: string,
  weight?: number,
) => {
  const updatedAuthority = userAccount[role];

  /** Check if key already exists in the key_auths array */
  const authorizedKeys = updatedAuthority.key_auths.map((auth) => auth[0]);
  const hasAuthority = authorizedKeys.indexOf(authorizedKey) !== -1;
  if (hasAuthority) {
    throw new KeychainError('already_has_authority_error');
  }

  /** Use weight_threshold as default weight */
  const finalWeight = authorityWeight(weight, userAccount[role].weight_threshold);
  updatedAuthority.key_auths.push([authorizedKey, finalWeight]);
  updatedAuthority.key_auths.sort(compareKeys);

  return onlyRole(role, updatedAuthority);
};

const processKeyAuthorityRemoval = async (
  userAccount: ExtendedAccount,
  role: 'posting' | 'active',
  authorizedKey: string,
) => {
  const updatedAuthority = userAccount[role];
  const totalAuthorizedKey = updatedAuthority.key_auths.length;

  // Remove the key authority if it exists
  for (let i = 0; i < totalAuthorizedKey; i++) {
    const key = updatedAuthority.key_auths[i];
    if (key[0] === authorizedKey) {
      updatedAuthority.key_auths.splice(i, 1);
      break;
    }
  }

  /** Check if the key was actually removed */
  if (totalAuthorizedKey === updatedAuthority.key_auths.length) {
    throw new KeychainError('missing_authority_error');
  }

  return onlyRole(role, updatedAuthority);
};

const AccountUtils = {
  verifyAccount,
  getAccountsFromLocalStorage,
  getAccountFromLocalStorage,
  saveAccounts,
  hasStoredAccounts,
  addAuthorizedAccount,
  addKey,

  addMultipleAccounts,
  deleteKey,
  isAccountListIdentical,
  deleteAccount,
  downloadAccounts,
  getKeys,
  getAccountValue,
  getPublicMemo,
  getPowerDown,
  doesAccountExist,
  getExtendedAccount,
  getExtendedAccounts,
  AccountErrorMessages,
  isAccountNameAlreadyExisting,
  getRCMana,
  getAccount,

  encryptAccounts,
  claimAccounts,
  getAccountTicketCost,
  updateAccount,
  getUpdateAccountOperation,
  getUpdateAccountTransaction,
  addAccount,
  reorderAccounts,
  addAuthorizedKey,
  getExtendedAccountToChange,
  processAuthorityUpdate,
  processAuthorityRemoval,
  processKeyAuthorityUpdate,
  processKeyAuthorityRemoval,
};

export const BackgroundAccountUtils = {
  getAccountsFromLocalStorage,
};

export default AccountUtils;
