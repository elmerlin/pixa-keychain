import BgdAccountsUtils from '@background/utils/accounts.utils';
import { ActiveAccount } from '@interfaces/active-account.interface';
import {
  AutoCompleteCategory,
  AutoCompleteValue,
  AutoCompleteValues,
} from '@interfaces/autocomplete.interface';
import {
  FavoriteUserItems,
  FavoriteUserListName,
} from '@interfaces/favorite-user.interface';
import { LocalAccount } from '@interfaces/local-account.interface';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { VaultKey } from '@reference-data/vault-message-key.enum';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import VaultUtils from 'src/utils/vault.utils';

const getAutocompleteList = async (
  username: string,
  localAccounts: LocalAccount[],
): Promise<AutoCompleteValue[]> => {
  const favoriteUsers: FavoriteUserItems =
    await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.FAVORITE_USERS,
    );
  const autoCompleteList: AutoCompleteValue[] = [];
  if (favoriteUsers && favoriteUsers[username]) {
    for (const fav of favoriteUsers[username]) {
      if (!localAccounts.find((localAccount) => localAccount.name === fav))
        autoCompleteList.push({ value: fav });
    }
  }
  for (const localAccount of localAccounts) {
    if (localAccount.name !== username) {
      autoCompleteList.push({
        value: localAccount.name,
      });
    }
  }

  return autoCompleteList;
};

const saveFavoriteUser = async (
  username: string,
  activeAccount: ActiveAccount,
) => {
  const mk = await VaultUtils.getValueFromVault(VaultKey.__MK);
  const localAccounts = await BgdAccountsUtils.getAccountsFromLocalStorage(mk);
  let favoriteUser = await LocalStorageUtils.getValueFromLocalStorage(
    LocalStorageKeyEnum.FAVORITE_USERS,
  );
  if (!favoriteUser) {
    favoriteUser = { [activeAccount.name!]: [] };
  }
  if (!favoriteUser[activeAccount.name!]) {
    favoriteUser[activeAccount.name!] = [];
  }

  let found = false;
  if (favoriteUser[activeAccount.name!].length > 0) {
    found = Object.values(favoriteUser[activeAccount.name!]).some(
      (favValue: any) => favValue.value === username,
    );
  }

  if (
    !found &&
    !localAccounts.find((localAccount) => localAccount.name === username)
  ) {
    favoriteUser[activeAccount.name!].push({
      value: username,
      subLabel: '',
    } as AutoCompleteValue);
  }
  LocalStorageUtils.saveValueInLocalStorage(
    LocalStorageKeyEnum.FAVORITE_USERS,
    favoriteUser,
  );
};

const getAutocompleteListByCategories = async (
  username: string,
  localAccounts: LocalAccount[],
): Promise<AutoCompleteValues> => {
  const favoriteUsers: {
    [key: string]: any[];
  } = await fixFavoriteList(
    await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.FAVORITE_USERS,
    ),
  );
  const favoriteUsersList: AutoCompleteCategory = {
    title: FavoriteUserListName.USERS,
    translateTitle: true,
    values: [],
  };
  const favoriteLocalAccountsList: AutoCompleteCategory = {
    title: FavoriteUserListName.LOCAL_ACCOUNTS,
    translateTitle: true,
    values: [],
  };

  const favoriteUsersCompleteList: AutoCompleteValues = {
    categories: [],
  };

  if (favoriteUsers && favoriteUsers[username]) {
    for (const fav of favoriteUsers[username]) {
      if (!localAccounts.find((localAccount) => localAccount.name === fav))
        favoriteUsersList.values.push(fav);
    }
  }

  for (const localAccount of localAccounts) {
    if (localAccount.name !== username) {
      favoriteLocalAccountsList.values.push({
        value: localAccount.name,
        subLabel: '',
      });
    }
  }

  if (favoriteUsersList.values.length > 0) {
    favoriteUsersCompleteList.categories.push(favoriteUsersList);
  }
  if (favoriteLocalAccountsList.values.length > 0) {
    favoriteUsersCompleteList.categories.push(favoriteLocalAccountsList);
  }

  return favoriteUsersCompleteList;
};

const fixFavoriteList = async (favoriteUsers: any) => {
  let hasChanged = false;
  if (typeof favoriteUsers === 'string') {
    favoriteUsers = JSON.parse(favoriteUsers);
  }
  for (const user in favoriteUsers) {
    if (!Array.isArray(favoriteUsers[user])) favoriteUsers[user] = [];
    favoriteUsers[user] = favoriteUsers[user].map((e: any) => {
      if (typeof e === 'string') {
        hasChanged = true;
        return { label: e, value: e };
      } else return e;
    });
  }
  if (hasChanged) {
    await LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.FAVORITE_USERS,
      favoriteUsers,
    );
  }
  return favoriteUsers;
};

export const FavoriteUserUtils = {
  getAutocompleteList,
  saveFavoriteUser,
  getAutocompleteListByCategories,
  fixFavoriteList,
};
