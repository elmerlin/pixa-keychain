import { AutoLockType } from '@interfaces/autolock.interface';
import { NoConfirm } from '@interfaces/no-confirm.interface';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { CustomDataFromLocalStorage } from 'src/__tests__/utils-for-testing/interfaces/mocks.interface';
import { DEFAULT_FILTER } from 'src/popup/hive/pages/app-container/home/wallet-history/wallet-history.component';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';

const manifestFile = {
  chromium: require('../../../../manifests/chromium/manifest.json'),
};
const messagesJsonFile = require('public/_locales/en/messages.json');

const hasKeys = (obj: {}) => {
  return Object.keys(obj).length > 0;
};
/**
 *
 * @param args
 * @param args[0] Is always used for the LocalStorageKeyEnum.
 * @param customData Used to pass custom readed value from LS. To use, assign dataMocks.customDataFromLocalStorage
 * @returns Undefined if not found or not mocked yet. Enable console.log in default case, to see which key is not being mocked.
 * If debug needed, just uncomment the console.log
 */
const getValuefromLS = async (...args: any[]): Promise<any> => {
  let customData: CustomDataFromLocalStorage = args[1] ?? {};
  // console.log('being called with: ', args[0], customData);
  switch (args[0]) {
    case LocalStorageKeyEnum.AUTOLOCK:
      return customData.hasOwnProperty('customAutolock')
        ? customData.customAutolock
        : {
            type: AutoLockType.DEFAULT,
            mn: 1,
          };
    case LocalStorageKeyEnum.SWITCH_RPC_AUTO:
      return customData.hasOwnProperty('customSwitchAuto')
        ? customData.customSwitchAuto
        : true;
    case LocalStorageKeyEnum.WALLET_HISTORY_FILTERS:
      return customData.hasOwnProperty('customWalletHistoryFilters')
        ? customData.customWalletHistoryFilters
        : DEFAULT_FILTER;
    case LocalStorageKeyEnum.FAVORITE_USERS:
      return customData.hasOwnProperty('customFavoriteUsers')
        ? customData.customFavoriteUsers
        : { 'keychain.tests': ['one1', 'two2', 'three3'] };
    case LocalStorageKeyEnum.RPC_LIST:
      return customData.hasOwnProperty('customsRpcs')
        ? customData.customsRpcs
        : [];
    case LocalStorageKeyEnum.NO_CONFIRM:
      return customData.hasOwnProperty('customAuthorizedOP')
        ? customData.customAuthorizedOP
        : ({} as NoConfirm);
    case LocalStorageKeyEnum.LOCAL_STORAGE_VERSION:
      return customData.hasOwnProperty('customStorageVersion')
        ? customData.customStorageVersion
        : undefined;
    case LocalStorageKeyEnum.CURRENT_RPC:
      return customData.hasOwnProperty('customCurrentRpc')
        ? customData.customCurrentRpc
        : undefined;
    case LocalStorageKeyEnum.__MK:
      return customData.hasOwnProperty('customMK')
        ? customData.customMK
        : undefined;
    case LocalStorageKeyEnum.ACCOUNTS:
      return customData.hasOwnProperty('customAccounts')
        ? customData.customAccounts
        : undefined;
    default:
      //Cases not being handled yet:
      // - __REQUEST_HANDLER

      //console.log('Not handled and being called by: ', args[0]);
      return undefined;
  }
};

const i18nGetMessage = (message: string) => {
  if (messagesJsonFile[message]) {
    return messagesJsonFile[message].message;
  }
  return message + ' check as not found on jsonFile.';
};

const withOptions = (message: string, options?: string[]) => {
  if (options && options.length) {
    let str = message;
    for (const [key, value] of Object.entries(options)) {
      str = str.replace(`$${+key + 1}`, value);
    }
    return str;
  } else {
    return message;
  }
};

const i18nGetMessageCustom = (message: string, options?: string[]) => {
  if (messagesJsonFile[message]) {
    return withOptions(messagesJsonFile[message].message, options);
  }
  return message; // + ' check as not found on jsonFile.';
};
const hiveTxUtils = {
  getData: (toUse: {
    conversionRequests?: any;
    collateralized?: any;
    listProposals?: any;
    listProposalVotes?: any;
    dynamicGlobalProperties?: any;
  }) => {
    HiveTxUtils.getData = jest.fn().mockImplementation((...args) => {
      switch (args[0]) {
        case 'condenser_api.get_conversion_requests':
          return Promise.resolve(toUse.conversionRequests);
        case 'condenser_api.get_collateralized_conversion_requests':
          return Promise.resolve(toUse.collateralized);
        case 'condenser_api.list_proposals':
          return Promise.resolve(toUse.listProposals);
        case 'condenser_api.list_proposal_votes':
          return Promise.resolve(toUse.listProposalVotes);
        case 'condenser_api.get_dynamic_global_properties':
          return Promise.resolve(toUse.dynamicGlobalProperties);
        default:
          return Promise.resolve('Please check data assignment!');
      }
    });
  },
};

const mocksImplementation = {
  getValuefromLS,
  i18nGetMessage,
  i18nGetMessageCustom,
  manifestFile,
  hiveTxUtils,
};

export default mocksImplementation;
