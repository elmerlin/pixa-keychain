import {
  DynamicGlobalProperties,
  ExtendedAccount,
  Price,
  VestingDelegation,
} from '@hiveio/dhive';
import { RC } from '@interfaces/active-account.interface';
import { Conversion } from '@interfaces/conversion.interface';
import { RewardFund } from '@interfaces/global-properties.interface';
import { LocalAccount } from '@interfaces/local-account.interface';
import { Proposal } from '@interfaces/proposal.interface';
import { RcDelegation } from '@interfaces/rc-delegation.interface';
import { Rpc } from '@interfaces/rpc.interface';
import { Transaction } from '@interfaces/transaction.interface';
import accounts from 'src/__tests__/utils-for-testing/data/accounts';
import delegations from 'src/__tests__/utils-for-testing/data/delegations';
import dynamic from 'src/__tests__/utils-for-testing/data/dynamic.hive';
import mk from 'src/__tests__/utils-for-testing/data/mk';
import fake_RC from 'src/__tests__/utils-for-testing/data/rc';
import rpc from 'src/__tests__/utils-for-testing/data/rpc';
import mocksImplementation from 'src/__tests__/utils-for-testing/implementations/implementations';
import witness from 'src/__tests__/utils-for-testing/data/witness';
import WitnessUtils from 'src/popup/hive/utils/witness.utils';
import {
  CustomDataFromLocalStorage,
  GetManifest,
} from 'src/__tests__/utils-for-testing/interfaces/mocks.interface';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import ActiveAccountUtils from 'src/popup/hive/utils/active-account.utils';
import CurrencyPricesUtils from 'src/popup/hive/utils/currency-prices.utils';
import { ConversionUtils } from 'src/popup/hive/utils/conversion.utils';
import { DelegationUtils } from 'src/popup/hive/utils/delegation.utils';
import { DynamicGlobalPropertiesUtils } from 'src/popup/hive/utils/dynamic-global-properties.utils';
import { GovernanceUtils } from 'src/popup/hive/utils/governance.utils';
import HiveUtils from 'src/popup/hive/utils/hive.utils';
import MkUtils from 'src/popup/hive/utils/mk.utils';
import ProposalUtils from 'src/popup/hive/utils/proposal.utils';
import ProxyUtils from 'src/popup/hive/utils/proxy.utils';
import { RcDelegationsUtils } from 'src/popup/hive/utils/rc-delegations.utils';
import { RewardsUtils } from 'src/popup/hive/utils/rewards.utils';
import RpcUtils from 'src/popup/hive/utils/rpc.utils';
import TransactionUtils from 'src/popup/hive/utils/transaction.utils';
import { AsyncUtils } from 'src/utils/async.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import PopupUtils from 'src/utils/popup.utils';

const manifestFile = {
  chromium: require('../../../../manifests/chromium/manifest.json'),
};

export interface TestsConfigureModules {
  jestTimeOut?: number;
}

export interface TestsAppLoadingValues {
  chrome?: {
    i18n?: {
      getMessageImplementation?: (
        message: string,
        options?: string[] | undefined,
      ) => string;
    };
    runtime?: { sendMessage?: jest.Mock };
    tabs?: {
      create?: jest.Mock;
    };
    storage?: {
      local?: {
        clear?: jest.Mock;
      };
    };
  };
  operativeSystem?: {
    fixPopupOnMacOs?: jest.Mock | (() => void);
  };
  globalData?: {
    globalProperties?: DynamicGlobalProperties;
    medianHistoryPrice?: Price;
    rewardFund?: RewardFund;
  };
  rpc?: {
    getCurrentRpc?: Rpc;
    checkRpcStatus?: boolean;
  };
  currencyPrices?: {
    getPrices?: Record<string, unknown>;
  };
  proposal?: {
    ProposalUtils?: {
      hasVotedForProposal?: boolean;
      getProposalList?: Proposal[];
    };
  };
  chain?: {
    getDelegators?: jest.Mock;
    getWitnessRanking?: jest.Mock;
  };
  localStorageRelated?: {
    implementations?: {
      getValueFromLocalStorage?: jest.Mock;
    };
    customData?: CustomDataFromLocalStorage;
    LocalStorageUtils?: {
      getMultipleValueFromLocalStorage?: any;
    };
  };
}

/**
 * It will load all necessary values before the app loads. Includes: Mocking/Constants.
 * if not used, default will be loaded before app gets rendered for testing.
 * app: Here you can add/change/update all that affects initial states of the app.
 */
const set = (params?: {
  modules?: TestsConfigureModules;
  app?: TestsAppLoadingValues;
}) => {
  //////////////
  //Jest/Global Modules configuration used prior loading the app.

  jest.setTimeout(params?.modules?.jestTimeOut ?? 10000);
  //////////////

  /////////
  //chrome related
  chrome.i18n.getMessage = jest
    .fn()
    .mockImplementation(
      params?.app?.chrome?.i18n?.getMessageImplementation ??
        mocksImplementation.i18nGetMessageCustom,
    );
  chrome.runtime.sendMessage =
    params?.app?.chrome?.runtime?.sendMessage ?? jest.fn();
  chrome.tabs.create = params?.app?.chrome?.tabs?.create ?? jest.fn();
  chrome.storage.local.clear =
    params?.app?.chrome?.storage?.local?.clear ?? jest.fn();
  /////////

  ////////
  //LocalStorate related
  LocalStorageUtils.getValueFromLocalStorage = jest
    .fn()
    .mockImplementation(
      params?.app?.localStorageRelated?.implementations
        ?.getValueFromLocalStorage ??
        jest
          .fn()
          .mockImplementation((...args: any[]) =>
            mocksImplementation.getValuefromLS(
              args[0],
              params?.app?.localStorageRelated?.customData,
            ),
          ),
    );
  LocalStorageUtils.saveValueInLocalStorage = jest.fn();
  LocalStorageUtils.removeFromLocalStorage = jest.fn();
  LocalStorageUtils.getMultipleValueFromLocalStorage = jest
    .fn()
    .mockResolvedValue(
      params?.app?.localStorageRelated?.LocalStorageUtils
        ?.getMultipleValueFromLocalStorage ?? undefined,
    );
  ////////

  ///////
  //Specific Operative Systems related
  PopupUtils.fixPopupOnMacOs =
    params?.app?.operativeSystem?.fixPopupOnMacOs ?? jest.fn();
  ///////

  ///////
  //Global app data related
  DynamicGlobalPropertiesUtils.getDynamicGlobalProperties = jest
    .fn()
    .mockResolvedValue(
      params?.app?.globalData?.globalProperties ?? dynamic.globalProperties,
    );
  HiveUtils.getCurrentMedianHistoryPrice = jest
    .fn()
    .mockResolvedValue(
      params?.app?.globalData?.medianHistoryPrice ?? dynamic.medianHistoryPrice,
    );
  HiveUtils.getRewardFund = jest
    .fn()
    .mockResolvedValue(
      params?.app?.globalData?.rewardFund ?? dynamic.rewardFund,
    );
  CurrencyPricesUtils.getPrices = jest
    .fn()
    .mockResolvedValue(params?.app?.currencyPrices?.getPrices ?? {});
  AsyncUtils.sleep = jest.fn().mockImplementation(() => Promise.resolve());
  //////////

  //////////
  //RPC related.
  RpcUtils.getCurrentRpc = jest
    .fn()
    .mockResolvedValue(params?.app?.rpc?.getCurrentRpc ?? rpc.defaultRpc);
  RpcUtils.checkRpcStatus = jest
    .fn()
    .mockResolvedValue(params?.app?.rpc?.checkRpcStatus ?? true);
  /////////

  ////////////
  //Accounts + ActiveAccounts + mk related
  //(including rewards, transactions, tokens. Delegations, Rc delegations, Convertions, Proxy)
  ActiveAccountUtils.getActiveAccountNameFromLocalStorage = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.ActiveAccountUtils
        ?.getActiveAccountNameFromLocalStorage ?? mk.user.one,
    );
  AccountUtils.getAccount = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.AccountUtils?.getAccount ??
        accounts.asArray.extended,
    );
  AccountUtils.getRCMana = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.AccountUtils?.getRCMana ?? fake_RC.rc,
    );
  AccountUtils.getExtendedAccount = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.AccountUtils?.getExtendedAccount ??
        accounts.extended,
    );
  AccountUtils.getExtendedAccounts = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.AccountUtils?.getExtendedAccounts ?? [
        accounts.extended,
      ],
    );
  AccountUtils.hasStoredAccounts = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.AccountUtils?.hasStoredAccounts ?? true,
    );
  AccountUtils.getAccountsFromLocalStorage = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.AccountUtils?.getAccountsFromLocalStorage ??
        accounts.twoAccounts,
    );
  AccountUtils.getAccountValue = jest
    .fn()
    .mockReturnValue(
      params?.app?.accountsRelated?.AccountUtils?.getAccountValue ?? '100000',
    );
  AccountUtils.getPowerDown = jest
    .fn()
    .mockReturnValue(
      params?.app?.accountsRelated?.AccountUtils?.getPowerDown ?? [],
    );
  MkUtils.getMkFromLocalStorage = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.MkUtils?.getMkFromLocalStorage ??
        mk.user.one,
    );
  HiveUtils.getAccountPrice = jest
    .fn()
    .mockReturnValue(
      params?.app?.accountsRelated?.HiveUtils?.getAccountPrice ?? 1,
    );
  HiveUtils.getVP = jest
    .fn()
    .mockReturnValue(params?.app?.accountsRelated?.HiveUtils?.getVP ?? 1);
  HiveUtils.getVotingDollarsPerAccount = jest
    .fn()
    .mockReturnValue(
      params?.app?.accountsRelated?.HiveUtils?.getVotingDollarsPerAccount ?? 1,
    );
  RewardsUtils.hasReward = jest
    .fn()
    .mockReturnValue(
      params?.app?.accountsRelated?.RewardsUtils?.hasReward ?? false,
    );
  TransactionUtils.getTransactions = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.TransactionUtils?.getTransactions ?? [],
    );
  TransactionUtils.getLastTransaction = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.TransactionUtils?.getLastTransaction ?? 1,
    );
  DelegationUtils.getDelegatees = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.DelegationUtils?.getDelegatees ??
        delegations.delegatees,
    );
  DelegationUtils.getPendingOutgoingUndelegation = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.DelegationUtils
        ?.getPendingOutgoingUndelegation ?? [],
    );
  RcDelegationsUtils.getAllOutgoingDelegations = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.RcDelegationsUtils
        ?.getAllOutgoingDelegations ?? [],
    );
  ConversionUtils.getConversionRequests = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.ConversionUtils?.getConversionRequests ??
        [],
    );
  ProxyUtils.findUserProxy = jest
    .fn()
    .mockResolvedValue(
      params?.app?.accountsRelated?.ProxyUtils?.findUserProxy ?? null,
    );
  /////////////

  /////////
  //Proposals related
  ProposalUtils.hasVotedForProposal = jest
    .fn()
    .mockResolvedValue(
      params?.app?.proposal?.ProposalUtils?.hasVotedForProposal ?? true,
    );
  ProposalUtils.getProposalList = jest
    .fn()
    .mockResolvedValue(
      params?.app?.proposal?.ProposalUtils?.getProposalList ?? [],
    );
  //////////

  GovernanceUtils.addToIgnoreRenewal =
    params?.app?.popupsRelated?.GovernanceUtils?.addToIgnoreRenewal ??
    jest.fn().mockImplementation(() => Promise.resolve(undefined));
  GovernanceUtils.getGovernanceReminderList = jest
    .fn()
    .mockResolvedValue(
      params?.app?.popupsRelated?.GovernanceUtils?.getGovernanceReminderList ??
        [],
    );
  GovernanceUtils.getGovernanceRenewalIgnored = jest
    .fn()
    .mockResolvedValue(
      params?.app?.popupsRelated?.GovernanceUtils
        ?.getGovernanceRenewalIgnored ?? [],
    );
  GovernanceUtils.removeFromIgnoreRenewal = jest
    .fn()
    .mockImplementation(
      params?.app?.popupsRelated?.GovernanceUtils?.removeFromIgnoreRenewal ??
        (() => Promise.resolve(undefined)),
    );
  GovernanceUtils.renewUsersGovernance = jest
    .fn()
    .mockImplementation(
      params?.app?.popupsRelated?.GovernanceUtils?.renewUsersGovernance ??
        (() => Promise.resolve(undefined)),
    );
  chrome.runtime.getManifest = jest.fn().mockReturnValue(
    params?.app?.popupsRelated?.whatsnew?.chrome?.runtime?.getManifest ?? {
      name: manifestFile.chromium.name,
      version: manifestFile.chromium.version,
    },
  );
  //////////

  //////////
  // Chain-backed lists used by popup screens. Unit tests cover their RPC requests.
  DelegationUtils.getDelegators =
    params?.app?.chain?.getDelegators ??
    jest.fn().mockResolvedValue(delegations.delegators);
  WitnessUtils.getWitnessRanking =
    params?.app?.chain?.getWitnessRanking ??
    jest.fn().mockResolvedValue(witness.ranking);
};

export const LoadingValuesConfiguration = { set };
