import MkModule from '@background/mk.module';
import init from '@background/requests/init';
import RpcUtils from '@hiveapp/utils/rpc.utils';
import {
  KeychainKeyTypesLC,
  KeychainRequest,
  KeychainRequestTypes,
} from '@interfaces/keychain.interface';
import { DefaultRpcs } from '@reference-data/default-rpc.list';
import accounts from 'src/__tests__/utils-for-testing/data/accounts';
import keychainRequest from 'src/__tests__/utils-for-testing/data/keychain-request';
import mk from 'src/__tests__/utils-for-testing/data/mk';
import { TEST_VAULT_MK } from 'src/__tests__/utils-for-testing/data/user-data';
import objects from 'src/__tests__/utils-for-testing/helpers/objects';
import * as LogicAddAccountRequest from 'src/background/requests/logic/addAccountRequest.logic';
import * as LogicAddAccountToEmptyWallet from 'src/background/requests/logic/addAccountToEmptyWallet.logic';
import * as LogicAnonymousRequests from 'src/background/requests/logic/anonymousRequests.logic';
import * as LogicInitializeWallet from 'src/background/requests/logic/initializeWallet.logic';
import * as LogicMissingKey from 'src/background/requests/logic/missingKey.logic';
import * as LogicMissingUser from 'src/background/requests/logic/missingUser.logic';
import * as LogicRequestWithConfirmation from 'src/background/requests/logic/requestWithConfirmation.logic';
import * as LogicRequestWithoutConfirmation from 'src/background/requests/logic/requestWithoutConfirmation.logic';
import * as LogicTransferRequest from 'src/background/requests/logic/transferRequest.logic';
import * as LogicUnlockWallet from 'src/background/requests/logic/unlockWallet.logic';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import { RequestTracker } from '@background/requests/request-tracker';
import Logger from 'src/utils/logger.utils';
import { anonymousRequests } from 'src/utils/requests.utils';

describe('init tests:\n', () => {
  const _accounts = {
    encrypt: {
      msg: '0000009b000000770000005700000029000000ae0000008d000000ae00000046WHrXFxuZRaj4uDwLXR8vFw+tW0M7fUZqAfRqnqga+fvyVCNAEnutR76JDJ+Hi6zfX2bMEkzk2c/fnL2FZb9e+ZNoklar2xYnxvM3tXjkh8Qj0roAbwXfWt+DzjqMfeTvuzHzbgnCzir7r5v6NgDug0pBplvNAsk83kj5Kd3gBmJfhRieDf8VRk18bZ8DUmhGqu0U0EmFn9KqSE6HxOKo/sZFRu0In8090s/05IHro9OLCZQ3vEy6A0GPyzoc5PyL/a7qgNiERpK37e3h3LXZBG9HkmDh0HimY2GoQzBYr7sOKFrrmfZlT7rtIuXWfa0nhQSM1pI9Y1s9Y2GWkoiUlweNRuTuAwFAi+SuEHRHBtmokqkgChUUT4bNs0fGbszm3NuB3rqiCXj27kcVWw/aqglb0qJGT77cv2gqhqSKu3BJkw7KNwkjFRYow/5ScHvh6RP1hUPEpEavIiuYZEi0cMu7cmROyZYbc8XLDry8Jpc=',
      mkUsed: mk.user.one,
      differentName: {
        msg: '0000005900000096000000c500000028000000cb000000ce00000020000000afoZAc9WPwIS3MsSe/vHGK/GhcAc9cf9s+8wsrGNKgC3dVkA1T6WpMZeUFkoBp1xwWExHtkBqplucrygjHr/uhGjjDQfE7+458c3YyNNBi0FedgUPwAUA9lmgG0n97Iji+',
        mkUsed: mk.user.one,
      },
    },
  };

  /** Legacy ciphertext still used by the unlock-wallet path (empty mk). */
  const legacyAccountsEncryptMsg = _accounts.encrypt.msg;

  beforeEach(() => {
    jest.spyOn(chrome.i18n, 'getUILanguage').mockReturnValue('en-US');
  });

  afterEach(() => {
    RequestTracker.clear();
    jest.clearAllMocks();
    jest.resetModules();
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('Must call Logger', async () => {
    const cloneKeychainRequestData = objects.clone(
      keychainRequest.data,
    ) as KeychainRequest;
    const sLoggerInfo = jest.spyOn(Logger, 'info');
    MkModule.getMk = jest.fn().mockResolvedValue(TEST_VAULT_MK);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        accounts: accounts.encrypted.noHash.oneAccount.msg,
        current_rpc: DefaultRpcs[0],
        no_confirm: {},
      });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);

    await init(
      cloneKeychainRequestData,
      0,
      cloneKeychainRequestData.domain,
      keychainRequest.requestHandler,
    );
    expect(sLoggerInfo).toHaveBeenCalledWith('Initializing request logic');
  });

  it('Must call initializeWallet & saveInLocalStorage', async () => {
    const cloneKeychainRequestData = objects.clone(
      keychainRequest.data,
    ) as KeychainRequest;
    cloneKeychainRequestData.type = KeychainRequestTypes.transfer;
    const sInitializeWallet = jest.spyOn(
      LogicInitializeWallet,
      'initializeWallet',
    );
    MkModule.getMk = jest.fn().mockResolvedValue(mk.user.one);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        accounts: '',
        current_rpc: DefaultRpcs[0],
        no_confirm: {},
      });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    await init(
      cloneKeychainRequestData,
      0,
      cloneKeychainRequestData.domain,
      keychainRequest.requestHandler,
    );
    expect(sInitializeWallet).toHaveBeenCalledWith(
      keychainRequest.requestHandler,
      0,
      cloneKeychainRequestData,
    );
  });

  it('Must call addAccountToEmptyWallet', async () => {
    const cloneKeychainRequestData = objects.clone(
      keychainRequest.data,
    ) as KeychainRequest;
    cloneKeychainRequestData.type = KeychainRequestTypes.addAccount;
    const sAddAccountToEmptyWallet = jest.spyOn(
      LogicAddAccountToEmptyWallet,
      'addAccountToEmptyWallet',
    );
    MkModule.getMk = jest.fn().mockResolvedValue('');
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        accounts: '',
        current_rpc: DefaultRpcs[0],
        no_confirm: {},
      });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    await init(
      cloneKeychainRequestData,
      0,
      cloneKeychainRequestData.domain,
      keychainRequest.requestHandler,
    );
    expect(sAddAccountToEmptyWallet).toHaveBeenCalledWith(
      keychainRequest.requestHandler,
      0,
      cloneKeychainRequestData,
      cloneKeychainRequestData.domain,
    );
  });

  it('Must call unlockWallet', async () => {
    const cloneKeychainRequestData = objects.clone(
      keychainRequest.data,
    ) as KeychainRequest;
    cloneKeychainRequestData.type = KeychainRequestTypes.transfer;
    const sUnlockWallet = jest.spyOn(LogicUnlockWallet, 'unlockWallet');
    MkModule.getMk = jest.fn().mockResolvedValue('');
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        accounts: legacyAccountsEncryptMsg,
        current_rpc: DefaultRpcs[0],
        no_confirm: {},
      });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    await init(
      cloneKeychainRequestData,
      0,
      cloneKeychainRequestData.domain,
      keychainRequest.requestHandler,
    );
    expect(sUnlockWallet).toHaveBeenCalledWith(
      keychainRequest.requestHandler,
      0,
      cloneKeychainRequestData,
      cloneKeychainRequestData.domain,
    );
  });

  it('Must call addAccountRequest', async () => {
    const cloneKeychainRequestData = objects.clone(
      keychainRequest.data,
    ) as KeychainRequest;
    cloneKeychainRequestData.type = KeychainRequestTypes.addAccount;
    const sAddAccountRequest = jest.spyOn(
      LogicAddAccountRequest,
      'addAccountRequest',
    );
    MkModule.getMk = jest.fn().mockResolvedValue(TEST_VAULT_MK);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        accounts: accounts.encrypted.noHash.oneAccount.msg,
        current_rpc: DefaultRpcs[0],
        no_confirm: {},
      });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    await init(
      cloneKeychainRequestData,
      0,
      cloneKeychainRequestData.domain,
      keychainRequest.requestHandler,
    );
    expect(sAddAccountRequest).toHaveBeenCalledWith(
      keychainRequest.requestHandler,
      0,
      cloneKeychainRequestData,
      cloneKeychainRequestData.domain,
      accounts.local.justTwoKeys,
    );
  });

  it('Must call transferRequest', async () => {
    const cloneKeychainRequestData = objects.clone(
      keychainRequest.data,
    ) as KeychainRequest;
    cloneKeychainRequestData.type = KeychainRequestTypes.transfer;
    const sTransferRequest = jest.spyOn(
      LogicTransferRequest,
      'transferRequest',
    );
    MkModule.getMk = jest.fn().mockResolvedValue(TEST_VAULT_MK);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        accounts: accounts.encrypted.noHash.oneAccount.msg,
        current_rpc: DefaultRpcs[0],
        no_confirm: {},
      });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    await init(
      cloneKeychainRequestData,
      0,
      cloneKeychainRequestData.domain,
      keychainRequest.requestHandler,
    );
    expect(sTransferRequest).toHaveBeenCalledWith(
      keychainRequest.requestHandler,
      0,
      cloneKeychainRequestData,
      cloneKeychainRequestData.domain,
      [accounts.local.justTwoKeys],
      DefaultRpcs[0],
      accounts.local.justTwoKeys,
    );
  });

  it('Must call anonymousRequests', async () => {
    const cloneKeychainRequestData = objects.clone(
      keychainRequest.data,
    ) as KeychainRequest;
    cloneKeychainRequestData.type = anonymousRequests[0];
    const sAnonymousRequests = jest.spyOn(
      LogicAnonymousRequests,
      'anonymousRequests',
    );
    MkModule.getMk = jest.fn().mockResolvedValue(TEST_VAULT_MK);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        accounts: accounts.encrypted.noHash.oneAccount.msg,
        current_rpc: DefaultRpcs[0],
        no_confirm: {},
      });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    delete cloneKeychainRequestData.username;
    await init(
      cloneKeychainRequestData,
      0,
      cloneKeychainRequestData.domain,
      keychainRequest.requestHandler,
    );
    expect(sAnonymousRequests).toHaveBeenCalledWith(
      keychainRequest.requestHandler,
      0,
      cloneKeychainRequestData,
      cloneKeychainRequestData.domain,
      [accounts.local.justTwoKeys],
      DefaultRpcs[0],
    );
  });

  it('Must call missingUser', async () => {
    const cloneKeychainRequestData = objects.clone(
      keychainRequest.data,
    ) as KeychainRequest;
    cloneKeychainRequestData.type = KeychainRequestTypes.post;
    const sMissingUser = jest.spyOn(LogicMissingUser, 'missingUser');
    MkModule.getMk = jest.fn().mockResolvedValue(mk.user.one);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        accounts: _accounts.encrypt.differentName.msg,
        current_rpc: DefaultRpcs[0],
        no_confirm: {},
      });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    await init(
      cloneKeychainRequestData,
      0,
      cloneKeychainRequestData.domain,
      keychainRequest.requestHandler,
    );
    expect(sMissingUser).toHaveBeenCalledWith(
      keychainRequest.requestHandler,
      0,
      cloneKeychainRequestData,
      cloneKeychainRequestData.username!,
    );
  });

  it('Must call missingKey', async () => {
    const cloneKeychainRequestDecodeData = objects.clone(
      keychainRequest.decodeData,
    ) as KeychainRequest;
    const sMissingKey = jest.spyOn(LogicMissingKey, 'missingKey');
    MkModule.getMk = jest.fn().mockResolvedValue(TEST_VAULT_MK);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        accounts: accounts.encrypted.noHash.oneAccount.msg,
        current_rpc: DefaultRpcs[0],
        no_confirm: {},
      });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    await init(
      cloneKeychainRequestDecodeData,
      0,
      cloneKeychainRequestDecodeData.domain,
      keychainRequest.requestHandler,
    );
    expect(sMissingKey).toHaveBeenCalledWith(
      keychainRequest.requestHandler,
      0,
      cloneKeychainRequestDecodeData,
      cloneKeychainRequestDecodeData.username!,
      KeychainKeyTypesLC.memo,
    );
  });

  it('Must call requestWithoutConfirmation', async () => {
    const cloneKeychainRequestPostData = objects.clone(
      keychainRequest.postData,
    ) as KeychainRequest;
    const sRequestWithoutConfirmation = jest.spyOn(
      LogicRequestWithoutConfirmation,
      'requestWithoutConfirmation',
    );
    MkModule.getMk = jest.fn().mockResolvedValue(TEST_VAULT_MK);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        accounts: accounts.encrypted.noHash.oneAccount.msg,
        current_rpc: DefaultRpcs[0],
        no_confirm: {
          'keychain.tests': { domain: { post: true } },
        },
      });
    // Read again just before signing, in case it was taken back meanwhile.
    LocalStorageUtils.getValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({ 'keychain.tests': { domain: { post: true } } });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    await init(
      cloneKeychainRequestPostData,
      0,
      cloneKeychainRequestPostData.domain,
      keychainRequest.requestHandler,
    );
    expect(sRequestWithoutConfirmation).toHaveBeenCalledWith(
      keychainRequest.requestHandler,
      0,
      cloneKeychainRequestPostData,
    );
  });

  it('Must do nothing more for a request already cancelled', async () => {
    const request = objects.clone(keychainRequest.postData) as KeychainRequest;
    const sWithout = jest.spyOn(LogicRequestWithoutConfirmation, 'requestWithoutConfirmation');
    const sWith = jest.spyOn(LogicRequestWithConfirmation, 'requestWithConfirmation');
    const sUnlock = jest.spyOn(LogicUnlockWallet, 'unlockWallet');
    [sWithout, sWith, sUnlock].forEach((spy) => spy.mockClear());
    const handler = keychainRequest.requestHandler;
    handler.data.documentToken = 'page-token';
    request.request_id = 1;
    // Its window closed while the password was checked: the page heard it was cancelled.
    RequestTracker.accept('page-token', 1);
    RequestTracker.answered('page-token', 1);
    await init(request, 0, request.domain, handler);
    expect(sWithout).not.toHaveBeenCalled();
    expect(sWith).not.toHaveBeenCalled();
    expect(sUnlock).not.toHaveBeenCalled();
    handler.data.documentToken = undefined;
  });

  it('Must drop a request its page replaced while it was getting ready', async () => {
    const request = objects.clone(keychainRequest.postData) as KeychainRequest;
    const sWithout = jest.spyOn(LogicRequestWithoutConfirmation, 'requestWithoutConfirmation');
    const sWith = jest.spyOn(LogicRequestWithConfirmation, 'requestWithConfirmation');
    sWithout.mockClear();
    sWith.mockClear();
    const handler = keychainRequest.requestHandler;
    handler.data.documentToken = 'page-token';
    request.request_id = 1;
    RequestTracker.accept('page-token', 1);
    MkModule.getMk = jest.fn().mockResolvedValue(TEST_VAULT_MK);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest.fn().mockResolvedValue({
      accounts: accounts.encrypted.noHash.oneAccount.msg,
      current_rpc: DefaultRpcs[0],
      no_confirm: { 'keychain.tests': { domain: { post: true } } },
    });
    // The page asks again, and that one finishes, while this one reads what's saved.
    LocalStorageUtils.getValueFromLocalStorage = jest.fn().mockImplementation(async () => {
      RequestTracker.accept('page-token', 2);
      RequestTracker.finishSending('page-token');
      return { 'keychain.tests': { domain: { post: true } } };
    });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    await init(request, 0, request.domain, handler);
    expect(sWithout).not.toHaveBeenCalled();
    expect(sWith).not.toHaveBeenCalled();
    handler.data.documentToken = undefined;
  });

  it.each([
    ['unlock the wallet if it locked', false, { 'keychain.tests': { domain: { post: true } } }, 'unlock'],
    ['ask if the approval was taken back', true, {}, 'confirm'],
  ])('Must %s while it was getting ready', async (_, unlocked, saved, then) => {
    const request = objects.clone(keychainRequest.postData) as KeychainRequest;
    const sWithout = jest.spyOn(LogicRequestWithoutConfirmation, 'requestWithoutConfirmation');
    const sWith = jest.spyOn(LogicRequestWithConfirmation, 'requestWithConfirmation');
    const sUnlock = jest.spyOn(LogicUnlockWallet, 'unlockWallet');
    sWithout.mockClear();
    sWith.mockClear();
    sUnlock.mockClear();
    MkModule.getMk = jest
      .fn()
      .mockResolvedValueOnce(TEST_VAULT_MK)
      .mockResolvedValueOnce(unlocked ? TEST_VAULT_MK : undefined);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest.fn().mockResolvedValue({
      accounts: accounts.encrypted.noHash.oneAccount.msg,
      current_rpc: DefaultRpcs[0],
      no_confirm: { 'keychain.tests': { domain: { post: true } } },
    });
    LocalStorageUtils.getValueFromLocalStorage = jest.fn().mockResolvedValue(saved);
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    await init(request, 0, request.domain, keychainRequest.requestHandler);
    expect(sWithout).not.toHaveBeenCalled();
    expect(then === 'unlock' ? sUnlock : sWith).toHaveBeenCalled();
  });

  it('Must call requestWithConfirmation', async () => {
    const cloneKeychainRequestPostData = objects.clone(
      keychainRequest.postData,
    ) as KeychainRequest;
    const sRequestWithConfirmation = jest.spyOn(
      LogicRequestWithConfirmation,
      'requestWithConfirmation',
    );
    MkModule.getMk = jest.fn().mockResolvedValue(TEST_VAULT_MK);
    LocalStorageUtils.getMultipleValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue({
        accounts: accounts.encrypted.noHash.oneAccount.msg,
        current_rpc: DefaultRpcs[0],
        no_confirm: {},
      });
    RpcUtils.findRpc = jest.fn().mockResolvedValue(DefaultRpcs[0]);
    cloneKeychainRequestPostData.username = mk.user.one;
    await init(
      cloneKeychainRequestPostData,
      0,
      cloneKeychainRequestPostData.domain,
      keychainRequest.requestHandler,
    );
    expect(sRequestWithConfirmation).toHaveBeenCalledWith(
      keychainRequest.requestHandler,
      0,
      cloneKeychainRequestPostData,
      cloneKeychainRequestPostData.domain,
      DefaultRpcs[0],
    );
  });
});
