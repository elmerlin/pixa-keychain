import { LocalAccount } from '@interfaces/local-account.interface';
import { setAccounts } from '@popup/hive/actions/account.actions';
import { loadActiveAccount } from '@popup/hive/actions/active-account.actions';
import { MultichainActionType } from '@popup/multichain/actions/action-type.enum';
import { setHasFinishedSignup } from '@popup/multichain/actions/has-finished-signup.actions';
import reducers from '@popup/multichain/reducers';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { VaultKey } from '@reference-data/vault-message-key.enum';
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import EncryptUtils from 'src/popup/hive/utils/encrypt.utils';
import ActiveAccountUtils from 'src/popup/hive/utils/active-account.utils';
import RpcUtils from 'src/popup/hive/utils/rpc.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import VaultUtils from 'src/utils/vault.utils';

/* istanbul ignore next */
const store = createStore(
  reducers,
  /* preloadedState, */ applyMiddleware(thunk),
);

if (store.getState().hive) {
  let previousAccounts = store.getState().hive.accounts as LocalAccount[];
  let previousRpc = store.getState().hive.activeRpc;
  let previousActiveAccountName = store.getState().hive.activeAccount?.name;
  let previousMk = store.getState().mk;

  // Another wallet window saved something. Without this, this one would later save its old list over
  // the top, and any keys added since would be gone.
  /* istanbul ignore next */
  chrome.storage.onChanged.addListener(async (changes, area) => {
    const saved = changes[LocalStorageKeyEnum.ACCOUNTS]?.newValue;
    const { mk, hive } = store.getState();
    if (area !== 'local' || !saved || !mk) return;
    const latest = await EncryptUtils.decryptToJson(saved, mk).catch(() => null);
    if (!latest?.list) {
      // The password was changed elsewhere, so this window's is no good. The vault has the new one.
      previousMk = '';
      store.dispatch({ type: MultichainActionType.SET_MK, payload: '' });
    } else if (!AccountUtils.isAccountListIdentical(hive.accounts, latest.list)) {
      previousAccounts = latest.list;
      store.dispatch(setAccounts(latest.list));
      // The keys this window has in hand have to follow, or it could still use deleted ones.
      const active = hive.activeAccount;
      const current =
        latest.list.find(({ name }: LocalAccount) => name === active?.name) ??
        latest.list[0];
      if (
        current &&
        (current.name !== active?.name ||
          JSON.stringify(current.keys) !== JSON.stringify(active?.keys))
      ) {
        store.dispatch(loadActiveAccount(current) as never);
      }
    }
  });

  /* istanbul ignore next */

  store.subscribe(() => {
    const {
      mk,
      hive: { accounts, activeRpc, activeAccount },
      hasFinishedSignup,
    } = store.getState();
    if (!AccountUtils.isAccountListIdentical(previousAccounts, accounts)) {
      if (
        previousAccounts.length === 0 &&
        previousAccounts.length !== accounts.length &&
        !hasFinishedSignup
      ) {
        LocalStorageUtils.saveValueInLocalStorage(
          LocalStorageKeyEnum.HAS_FINISHED_SIGNUP,
          true,
        );
        store.dispatch(setHasFinishedSignup(true));
      }
      previousAccounts = accounts;
      if (accounts.length !== 0) {
        AccountUtils.saveAccounts(accounts, mk);
      }
    }
    if (previousRpc && previousRpc.uri !== activeRpc?.uri && activeRpc) {
      previousRpc = activeRpc;
      RpcUtils.saveCurrentRpc(activeRpc);
    }
    if (activeAccount && previousActiveAccountName !== activeAccount.name) {
      previousActiveAccountName = activeAccount.name;
      ActiveAccountUtils.saveActiveAccountNameInLocalStorage(
        activeAccount.name as string,
      );
    }
    if (previousMk !== mk) {
      previousMk = mk;
      VaultUtils.saveValueInVault(VaultKey.__MK, mk);
    }
  });
}

export { store };

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
