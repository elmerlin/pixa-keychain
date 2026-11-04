import { RequestsHandler } from '@background/requests/request-handler';
import { DefaultRpcs } from '@reference-data/default-rpc.list';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { KeychainRequestWrapper } from 'hive-keychain-commons';
import accounts from 'src/__tests__/utils-for-testing/data/accounts';
import keychainRequest from 'src/__tests__/utils-for-testing/data/keychain-request';
import userData from 'src/__tests__/utils-for-testing/data/user-data';
import * as DialogLifeCycle from 'src/background/requests/dialog-lifecycle';
import * as Init from 'src/background/requests/init';
import Config from 'src/config';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import VaultUtils from 'src/utils/vault.utils';

describe('index tests:\n', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });
  it('Must create a new RequestHandler Instance', () => {
    const requestHandler = new RequestsHandler();
    expect(requestHandler).toBeInstanceOf(RequestsHandler);
  });

  it('Must match this values by default', () => {
    expect(keychainRequest.requestHandler.data).toEqual({
      confirmed: false,
      isWaitingForConfirmation: false,
    });
  });

  it('Must return handler if no values on local storage', async () => {
    jest
      .spyOn(VaultUtils, 'getValueFromVault')
      .mockResolvedValue('test-mk' as unknown as string);
    jest
      .spyOn(AccountUtils, 'getAccountsFromLocalStorage')
      .mockResolvedValue([]);
    jest
      .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
      .mockResolvedValue(undefined);
    const sGetValueFromLocalStorage = jest.spyOn(
      LocalStorageUtils,
      'getValueFromLocalStorage',
    );
    const _requestHandler = await RequestsHandler.getFromLocalStorage();
    expect(sGetValueFromLocalStorage).toHaveBeenCalledWith(
      LocalStorageKeyEnum.__REQUEST_HANDLER,
    );
    expect(_requestHandler).toBeInstanceOf(RequestsHandler);
  });

  it('Must initialize parameters', async () => {
    const requestHandler = new RequestsHandler();
    requestHandler.initializeParameters(
      accounts.twoAccounts,
      DefaultRpcs[0],
      {},
    );
    expect(requestHandler.data.accounts).toEqual(accounts.twoAccounts);
  });

  it('Must leave a newer request\'s record alone when an older one finishes', async () => {
    const save = jest
      .spyOn(LocalStorageUtils, 'saveValueInLocalStorage')
      .mockResolvedValue(undefined as never);
    jest.spyOn(LocalStorageUtils, 'getValueFromLocalStorage').mockResolvedValue({
      data: { documentToken: 'newer', request_id: 9, request: { type: 'vote' } },
    } as never);
    const requestHandler = new RequestsHandler();
    requestHandler.data.documentToken = 'older';
    requestHandler.data.request_id = 1;
    requestHandler.reset(false);
    await new Promise((resolve) => setTimeout(resolve));
    expect(save).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('Must not reset resetWinId and reset data', async () => {
    const sSaveValueInLocalStorage = jest
      .spyOn(LocalStorageUtils, 'saveValueInLocalStorage')
      .mockReturnValue(undefined);
    jest
      .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
      .mockResolvedValue(undefined as never);
    const requestHandler = new RequestsHandler();
    requestHandler.reset(false);
    expect(requestHandler.data).toEqual({
      confirmed: false,
      windowId: undefined,
      isWaitingForConfirmation: false,
    });
    await new Promise((resolve) => setTimeout(resolve));
    expect(sSaveValueInLocalStorage).toHaveBeenCalledWith(
      LocalStorageKeyEnum.__REQUEST_HANDLER,
      expect.objectContaining({
        data: expect.objectContaining({
          confirmed: false,
          windowId: undefined,
          isWaitingForConfirmation: false,
        }),
      }),
    );
  });

  it('Must set windowId and call removeWindow', () => {
    const sRemoveWindow = jest.spyOn(DialogLifeCycle, 'removeWindow');
    const requestHandler = new RequestsHandler();
    requestHandler.setWindowId(1);
    expect(requestHandler.data.windowId).toBe(1);
    requestHandler.closeWindow();
    expect(sRemoveWindow).toHaveBeenNthCalledWith(1, 1);
  });

  it('Must reset resetWinId', async () => {
    const sRemoveFromLocalStorage = jest
      .spyOn(LocalStorageUtils, 'removeFromLocalStorage')
      .mockResolvedValue(undefined);
    const requestHandler = new RequestsHandler();
    requestHandler.reset(true);
    expect(sRemoveFromLocalStorage).toHaveBeenCalledWith(
      LocalStorageKeyEnum.__REQUEST_HANDLER,
    );
  });

  it('Must set confirmed', () => {
    const requestHandler = new RequestsHandler();
    [false, true].forEach((value) => {
      requestHandler.setConfirmed(value);
      expect(requestHandler.data.confirmed).toBe(value);
    });
  });

  it('Must set keys', () => {
    const requestHandler = new RequestsHandler();
    requestHandler.setKeys(
      userData.one.nonEncryptKeys.posting,
      userData.one.encryptKeys.posting,
    );
    expect(requestHandler.data.key).toBe(userData.one.nonEncryptKeys.posting);
    expect(requestHandler.data.publicKey).toBe(
      userData.one.encryptKeys.posting,
    );
  });

  it('Must call init', () => {
    const sInit = jest.spyOn(Init, 'default').mockResolvedValue(undefined);
    const requestHandler = new RequestsHandler();
    requestHandler.sendRequest(
      { tab: { id: 1 } } as chrome.runtime.MessageSender,
      {
        domain: 'domain',
        request: keychainRequest.noValues.decode,
      } as KeychainRequestWrapper,
    );
    expect(sInit).toHaveBeenCalledWith(
      keychainRequest.noValues.decode,
      requestHandler.data.tab,
      'domain',
      requestHandler,
    );
  });

  it('sendRequest ignores an rpc a site sends', () => {
    const sInit = jest.spyOn(Init, 'default').mockResolvedValue(undefined);
    const requestHandler = new RequestsHandler();
    requestHandler.sendRequest(
      { tab: { id: 2 } } as chrome.runtime.MessageSender,
      {
        domain: 'd',
        request: {
          ...keychainRequest.noValues.decode,
          rpc: 'https://hived.example',
        },
      } as KeychainRequestWrapper,
    );
    expect(requestHandler.data.rpc).toBeUndefined();
    sInit.mockRestore();
  });

  describe('answer', () => {
    const send = () => jest.spyOn(chrome.tabs, 'sendMessage').mockImplementation();
    afterEach(() => jest.restoreAllMocks());

    it('goes to the document that asked', () => {
      const sInit = jest.spyOn(Init, 'default').mockResolvedValue(undefined);
      const sSend = send();
      const requestHandler = new RequestsHandler();
      requestHandler.sendRequest(
        { tab: { id: 2 }, frameId: 7, documentId: 'doc-1' } as any,
        {
          domain: 'd',
          documentToken: 'token-1',
          request: keychainRequest.noValues.decode,
        } as any,
      );
      requestHandler.answer(2, { command: 'x' });
      expect(sSend).toHaveBeenCalledWith(
        2,
        { documentToken: 'token-1', message: { command: 'x' } },
        { documentId: 'doc-1' },
        expect.any(Function),
      );
      sInit.mockRestore();
    });

    it('goes to the frame that asked where documents have no ID', () => {
      const sInit = jest.spyOn(Init, 'default').mockResolvedValue(undefined);
      const sSend = send();
      const requestHandler = new RequestsHandler();
      requestHandler.sendRequest(
        { tab: { id: 2 }, frameId: 7 } as any,
        { domain: 'd', request: keychainRequest.noValues.decode } as any,
      );
      requestHandler.answer(2, { command: 'x' });
      expect(sSend).toHaveBeenCalledWith(
        2,
        { documentToken: undefined, message: { command: 'x' } },
        { frameId: 7 },
        expect.any(Function),
      );
      sInit.mockRestore();
    });

    it('never goes to every frame', () => {
      const sSend = send();
      new RequestsHandler().answer(2, { command: 'x' });
      expect(sSend).toHaveBeenCalledWith(
        2,
        { documentToken: undefined, message: { command: 'x' } },
        { frameId: 0 },
        expect.any(Function),
      );
    });
  });

  it('getUserKeyPair and getUserPrivateKey resolve keys from loaded accounts', () => {
    const requestHandler = new RequestsHandler();
    requestHandler.data.accounts = [accounts.local.oneAllkeys] as any;
    const name = accounts.local.oneAllkeys.name;
    expect(requestHandler.getUserPrivateKey(name, 'active')).toBe(
      accounts.local.oneAllkeys.keys.active,
    );
    const [priv, pub] = requestHandler.getUserKeyPair(name, 'posting');
    expect(priv).toBe(accounts.local.oneAllkeys.keys.posting);
    expect(pub).toBe(accounts.local.oneAllkeys.keys.postingPubkey);
  });

  it('setIsWaitingForConfirmation persists handler state', async () => {
    const save = jest
      .spyOn(LocalStorageUtils, 'saveValueInLocalStorage')
      .mockResolvedValue(undefined);
    const requestHandler = new RequestsHandler();
    await requestHandler.setIsWaitingForConfirmation(true);
    expect(requestHandler.data.isWaitingForConfirmation).toBe(true);
    expect(save).toHaveBeenCalled();
    save.mockRestore();
  });
});
