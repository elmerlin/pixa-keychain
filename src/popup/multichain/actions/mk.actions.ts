import { MultichainActionType } from '@popup/multichain/actions/action-type.enum';
import { BackgroundCommand } from '@reference-data/background-message-key.enum';
import { VaultKey } from '@reference-data/vault-message-key.enum';
import VaultUtils from 'src/utils/vault.utils';

export const setMk = (mk: string, sendMk: boolean) => {
  VaultUtils.saveValueInVault(VaultKey.__MK, mk);
  return {
    type: MultichainActionType.SET_MK,
    payload: mk,
  };
};

export const forgetMk = () => {
  VaultUtils.removeFromVault(VaultKey.__MK);
  // Any other wallet window locks too.
  chrome.runtime.sendMessage(
    { command: BackgroundCommand.LOCK_APP },
    () => void chrome.runtime.lastError,
  );
  return {
    type: MultichainActionType.SET_MK,
    payload: '',
  };
};
