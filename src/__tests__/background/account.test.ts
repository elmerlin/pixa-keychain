import AccountModule from '@background/account';
import MkModule from '@background/mk.module';
import BgdAccountsUtils from '@background/utils/accounts.utils';
import { BackgroundCommand } from '@reference-data/background-message-key.enum';
import accounts from 'src/__tests__/utils-for-testing/data/accounts';
import mk from 'src/__tests__/utils-for-testing/data/mk';
import LocalStorageUtils from 'src/utils/localStorage.utils';

describe('account tests:\n', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('Must return undefined', async () => {
    const sGetMk = jest.spyOn(MkModule, 'getMk').mockResolvedValue(undefined);
    await AccountModule.sendBackImportedAccounts('');
    expect(sGetMk).not.toHaveBeenCalled();
  });

  it('Must call sendMessage with error', async () => {
    jest.spyOn(MkModule, 'getMk').mockResolvedValue(mk.user.one);
    const sSendMessage = jest
      .spyOn(chrome.runtime, 'sendMessage')
      .mockResolvedValue(undefined);
    await AccountModule.sendBackImportedAccounts('Wrong_FileContent0000');
    expect(sSendMessage).toHaveBeenCalledWith({
      command: BackgroundCommand.SEND_BACK_IMPORTED_ACCOUNTS,
      value: { success: false, message: 'import_html_error' },
    });
  });

  it('Must import and save accounts', async () => {
    jest
      .spyOn(BgdAccountsUtils, 'withoutOwnerKeys')
      .mockImplementation(async (imported) => ({
        accounts: imported,
        removed: false,
      }));
    jest
      .spyOn(MkModule, 'getMk')
      .mockResolvedValue(accounts.encrypted.noHash.oneAccount.mkUsed);
    LocalStorageUtils.getValueFromLocalStorage = jest
      .fn()
      .mockResolvedValue(null);
    const sSendMessage = jest
      .spyOn(chrome.runtime, 'sendMessage')
      .mockResolvedValue(undefined);
    await AccountModule.sendBackImportedAccounts(
      accounts.encrypted.noHash.oneAccount.msg,
    );
    expect(sSendMessage).toHaveBeenCalledWith({
      command: BackgroundCommand.SEND_BACK_IMPORTED_ACCOUNTS,
      value: expect.objectContaining({
        success: true,
        message: 'import_html_success',
        accounts: expect.arrayContaining([
          expect.objectContaining({
            name: accounts.encrypted.noHash.oneAccount.original.list[0].name,
          }),
        ]),
      }),
    });
  });

  it('Must add nothing if the accounts can not be checked', async () => {
    jest
      .spyOn(BgdAccountsUtils, 'withoutOwnerKeys')
      .mockRejectedValue(new Error('offline'));
    jest
      .spyOn(MkModule, 'getMk')
      .mockResolvedValue(accounts.encrypted.noHash.oneAccount.mkUsed);
    const save = jest.spyOn(LocalStorageUtils, 'saveValueInLocalStorage');
    const sSendMessage = jest
      .spyOn(chrome.runtime, 'sendMessage')
      .mockResolvedValue(undefined);
    await AccountModule.sendBackImportedAccounts(
      accounts.encrypted.noHash.oneAccount.msg,
    );
    expect(save).not.toHaveBeenCalled();
    expect(sSendMessage).toHaveBeenCalledWith({
      command: BackgroundCommand.SEND_BACK_IMPORTED_ACCOUNTS,
      value: { success: false, message: 'import_html_check_failed' },
    });
  });
});
