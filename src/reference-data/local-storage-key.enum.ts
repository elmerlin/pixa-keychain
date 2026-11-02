export enum LocalStorageKeyEnum {
  ACCOUNTS = 'accounts',
  RPC_LIST = 'rpc',
  CURRENT_RPC = 'current_rpc',
  ACTIVE_ACCOUNT_NAME = 'active_account_name',
  FAVORITE_USERS = 'transfer_to',

  CLAIM_REWARDS = 'claimRewards',
  CLAIM_ACCOUNTS = 'claimAccounts',
  CLAIM_SAVINGS = 'claimSavings',
  AUTOLOCK = 'autolock',
  SHORTCUTS = 'shortcuts',
  NO_CONFIRM = 'no_confirm',
  WALLET_HISTORY_FILTERS = 'walletHistoryFilters',

  LOCAL_STORAGE_VERSION = 'LOCAL_STORAGE_VERSION',
  __MK = '__MK',
  __REQUEST_HANDLER = '__REQUEST_HANDLER',
  SWITCH_RPC_AUTO = 'switchRpcAuto',

  GOVERNANCE_RENEWAL_IGNORED = 'GOVERNANCE_RENEWAL_IGNORED',

  NO_KEY_CHECK = 'NO_KEY_CHECK',
  WITNESS_LAST_SIGNING_KEY = 'WITNESS_LAST_SIGNING_KEY',
  LAST_PRICE = 'LAST_PRICE',

  LAST_VESTING_ROUTES = 'LAST_VESTING_ROUTES',

  // Global keys
  ACTIVE_CHAIN = 'ACTIVE_CHAIN',
  ACTIVE_THEME = 'ACTIVE_THEME',

  // To show the right type of account value
  ACCOUNT_VALUE_TYPE = 'ACCOUNT_VALUE_TYPE',

  // To check if some account (regardless of chain) has been setup
  HAS_FINISHED_SIGNUP = 'HAS_FINISHED_SIGNUP',
}
