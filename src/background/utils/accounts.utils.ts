import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { LocalAccount } from 'src/interfaces/local-account.interface';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import { KeysUtils } from 'src/popup/hive/utils/keys.utils';
import EncryptUtils from 'src/popup/hive/utils/encrypt.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';

const getAccountsFromFileData = async (
  fileContent: string,
  mk: string,
): Promise<LocalAccount[]> => {
  try {
    const accounts = await EncryptUtils.decryptToJsonWithLegacySupport(
      fileContent,
      mk,
    );
    if (accounts) {
      return accounts?.list;
    } else {
      return [];
    }
  } catch (e) {
    throw new Error();
  }
};

const mergeImportedAccountsToExistingAccounts = async (
  importedAccounts: LocalAccount[],
  existingAccounts: LocalAccount[],
) => {
  const newAccounts = [];
  for (const importedAccount of importedAccounts) {
    if (
      existingAccounts
        .map((existingAccount) => existingAccount.name)
        .includes(importedAccount.name)
    ) {
      const existingAccount = existingAccounts.find(
        (existingAccount) => existingAccount.name === importedAccount.name,
      );
      if (!existingAccount) continue;
      const account = {
        name: existingAccount.name,
        keys: existingAccount.keys,
      };
      if (importedAccount.keys.active && !existingAccount.keys.active) {
        account!.keys.active = importedAccount.keys.active;
        account!.keys.activePubkey = importedAccount.keys.activePubkey;
      }
      if (importedAccount.keys.memo && !existingAccount.keys.memo) {
        account!.keys.memo = importedAccount.keys.memo;
        account!.keys.memoPubkey = importedAccount.keys.memoPubkey;
      }
      if (importedAccount.keys.posting && !existingAccount.keys.posting) {
        account!.keys.posting = importedAccount.keys.posting;
        account!.keys.postingPubkey = importedAccount.keys.postingPubkey;
      }
      newAccounts.push(account);
    } else {
      newAccounts.push(importedAccount);
    }
  }
  for (const existingAccount of existingAccounts) {
    if (
      !newAccounts
        .map((existingAccount) => existingAccount.name)
        .includes(existingAccount.name)
    ) {
      newAccounts.push(existingAccount);
    }
  }
  return newAccounts;
};

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
  return accounts?.list;
};

// Owner keys are never kept, and that goes for a backup too. Keys that also hold the owner role are
// taken out, and an account left with nothing isn't added.
const withoutOwnerKeys = async (imported: LocalAccount[]) => {
  const onChain = await AccountUtils.getExtendedAccounts(
    imported.map(({ name }) => name!),
  );
  let removed = false;
  const accounts = imported.flatMap((account) => {
    const owner = onChain.find(({ name }) => name === account.name)?.owner;
    if (!owner) return [account];
    const keys = { ...account.keys };
    for (const role of ['posting', 'active', 'memo'] as const) {
      const key = keys[role];
      if (
        key &&
        !String(key).startsWith('@') &&
        KeysUtils.getPubkeyWeight(
          KeysUtils.getPublicKeyFromPrivateKeyString(String(key)),
          owner,
        )
      ) {
        delete keys[role];
        delete keys[`${role}Pubkey`];
        removed = true;
      }
    }
    return Object.keys(keys).length ? [{ ...account, keys }] : [];
  });
  return { accounts, removed };
};

const BgdAccountsUtils = {
  withoutOwnerKeys,
  getAccountsFromFileData,
  mergeImportedAccountsToExistingAccounts,
  getAccountsFromLocalStorage,
};

export default BgdAccountsUtils;
