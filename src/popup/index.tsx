import React from 'react';
import ReactDOM from 'react-dom';
import { MultichainContainer } from '@popup/multichain/multichain-container';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import './style.scss';

// Before anything mounts, so an account is never looked up on the default node when another is chosen.
LocalStorageUtils.getValueFromLocalStorage(LocalStorageKeyEnum.CURRENT_RPC)
  .then((rpc) => (rpc ? HiveTxUtils.setRpc(rpc) : undefined))
  .finally(() => {
    ReactDOM.render(<MultichainContainer />, document.getElementById('root'));
  });
