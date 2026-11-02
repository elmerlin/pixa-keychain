import { AutoCompleteValue } from '@interfaces/autocomplete.interface';
import {
  FavoriteUserItems,
  FavoriteUserList,
  FavoriteUserListName,
} from '@interfaces/favorite-user.interface';
import { LocalAccountListItem } from '@interfaces/list-item.interface';
import { LocalAccount } from '@interfaces/local-account.interface';
import { setTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import { RootState } from '@popup/multichain/store';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { Screen } from '@reference-data/screen.enum';
import React, { useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { SelectAccountSectionComponent } from 'src/common-ui/select-account-section/select-account-section.component';
import { loadActiveAccount } from 'src/popup/hive/actions/active-account.actions';
import { FavoriteAccountsListComponent } from 'src/popup/hive/pages/app-container/settings/user-preferences/favorite-accounts/favorite-accounts-list/favorite-accounts-list.component';
import { FavoriteUserUtils } from 'src/popup/hive/utils/favorite-user.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';

const FavoriteAccounts = ({
  accounts,
  activeAccount,
  localAccounts,
  loadActiveAccount,
  setTitleContainerProperties,
}: PropsFromRedux) => {
  const defaultOptions: LocalAccountListItem[] = [];
  const [options, setOptions] = useState(defaultOptions);
  const [selectedLocalAccount, setSelectedLocalAccount] = useState(
    accounts[0].name,
  );
  const [favoriteAccountsList, setFavoriteAccountsList] = useState<
    FavoriteUserList[]
  >([{ name: FavoriteUserListName.USERS, list: [] }]);

  useEffect(() => {
    setTitleContainerProperties({
      title: 'popup_html_favorite_accounts',
      isBackButtonEnabled: true,
    });
  }, []);

  useEffect(() => {
    init();
    setOptions(
      accounts.map((account: LocalAccount) => {
        return { label: account.name, value: account.name };
      }),
    );

    setSelectedLocalAccount(activeAccount.name!);
  }, [accounts, activeAccount]);

  const init = async () => {
    const favoriteUsers = await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.FAVORITE_USERS,
    );

    await FavoriteUserUtils.fixFavoriteList(favoriteUsers);

    setFavoriteAccountsList([
      {
        name: FavoriteUserListName.USERS,
        list: favoriteUsers?.[activeAccount.name!] ?? [],
      },
    ]);
  };

  const handleDeleteFavorite = (
    listName: FavoriteUserListName,
    favoriteItem: AutoCompleteValue,
  ) => {
    const favoriteAccountsListCopy = [...favoriteAccountsList];
    const selectedList = favoriteAccountsListCopy.filter(
      (favoriteList) => favoriteList.name === listName,
    )[0];
    const filteredSelectedList = selectedList.list.filter(
      (favorite) => favorite !== favoriteItem,
    );
    selectedList.list = filteredSelectedList;
    setFavoriteAccountsList([...favoriteAccountsListCopy]);
    saveFavoriteList(selectedList);
  };

  const saveFavoriteList = async (list: FavoriteUserList) => {
    const actualFavoriteUsersLists: FavoriteUserItems[] =
      await LocalStorageUtils.getValueFromLocalStorage(
        LocalStorageKeyEnum.FAVORITE_USERS,
      );
    const updatedFavoriteUserLists = {
      ...actualFavoriteUsersLists,
      [activeAccount.name!]: list.list,
    };
    LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.FAVORITE_USERS,
      updatedFavoriteUserLists,
    );
  };

  const handleEditFavoriteLabel = (
    listName: FavoriteUserListName,
    favoriteItem: AutoCompleteValue,
    newLabel: string,
  ) => {
    const favoriteAccountsListCopy = [...favoriteAccountsList];
    const selectedList = favoriteAccountsListCopy.filter(
      (favoriteList) => favoriteList.name === listName,
    )[0];
    const favoriteItemIndexToEdit = selectedList.list.findIndex(
      (favorite) => favorite === favoriteItem,
    );
    selectedList.list[favoriteItemIndexToEdit] = {
      ...selectedList.list[favoriteItemIndexToEdit],
      subLabel: newLabel,
    };
    setFavoriteAccountsList([...favoriteAccountsListCopy]);
    saveFavoriteList(selectedList);
  };

  return (
    <div
      data-testid={`${Screen.SETTINGS_FAVORITE_ACCOUNTS}-page`}
      className="favorite-accounts-page"
    >
      <SelectAccountSectionComponent background="white" fullSize />
      <FavoriteAccountsListComponent
        key={`${Math.random().toFixed(6).toString()}-${
          FavoriteUserListName.USERS
        }`}
        favoriteList={
          favoriteAccountsList.filter(
            (favoriteList) => favoriteList.name === FavoriteUserListName.USERS,
          )[0]
        }
        handleDeleteFavorite={handleDeleteFavorite}
        handleEditFavoriteLabel={handleEditFavoriteLabel}
      />
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    accounts: state.hive.accounts,
    activeAccount: state.hive.activeAccount,
    localAccounts: state.hive.accounts,
  };
};

const connector = connect(mapStateToProps, {
  loadActiveAccount,
  setTitleContainerProperties,
});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const FavoriteAccountsComponent = connector(FavoriteAccounts);
