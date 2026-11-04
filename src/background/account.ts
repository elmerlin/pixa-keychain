import MkModule from '@background/mk.module';
import BgdAccountsUtils from '@background/utils/accounts.utils';
import { ImportCallbackPayload } from '@interfaces/import-callback.interface';
import { BackgroundCommand } from '@reference-data/background-message-key.enum';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import EncryptUtils from 'src/popup/hive/utils/encrypt.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';

const sendBackImportedAccounts = async (fileContent: string) => {
  if (fileContent?.length) {
    const mk = await MkModule.getMk();
    let importedAccounts;
    try {
      importedAccounts = await BgdAccountsUtils.getAccountsFromFileData(
        fileContent,
        mk,
      );
    } catch (e) {
      const response: ImportCallbackPayload = {
        success: false,
        message: 'import_html_error',
      };
      chrome.runtime.sendMessage({
        command: BackgroundCommand.SEND_BACK_IMPORTED_ACCOUNTS,
        value: response,
      });
      return;
    }

    let checked;
    try {
      checked = await BgdAccountsUtils.withoutOwnerKeys(importedAccounts);
    } catch (e) {
      // Nothing's kept that hasn't been checked.
      chrome.runtime.sendMessage({
        command: BackgroundCommand.SEND_BACK_IMPORTED_ACCOUNTS,
        value: {
          success: false,
          message: 'import_html_check_failed',
        } as ImportCallbackPayload,
      });
      return;
    }

    const accounts =
      (await EncryptUtils.decryptToJson(
        await LocalStorageUtils.getValueFromLocalStorage(
          LocalStorageKeyEnum.ACCOUNTS,
        ),
        mk,
      )) || [];

    const newAccounts =
      await BgdAccountsUtils.mergeImportedAccountsToExistingAccounts(
        checked.accounts,
        accounts.list || [],
      );
    const newAccountsEncrypted = await EncryptUtils.encryptJson(
      { list: newAccounts },
      mk,
    );
    LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.ACCOUNTS,
      newAccountsEncrypted,
    );

    const response: ImportCallbackPayload = {
      success: true,
      message: checked.removed
        ? 'import_html_success_without_owner_keys'
        : 'import_html_success',
      accounts: newAccounts,
    };
    chrome.runtime.sendMessage({
      command: BackgroundCommand.SEND_BACK_IMPORTED_ACCOUNTS,
      value: response,
    });
  }
};

const AccountModule = {
  sendBackImportedAccounts,
};

export default AccountModule;
