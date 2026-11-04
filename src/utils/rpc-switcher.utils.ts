import { Rpc } from '@interfaces/rpc.interface';
import { setActiveRpc } from '@popup/hive/actions/active-rpc.actions';
import {
  setDisplayChangeRpcPopup,
  setSwitchToRpc,
} from '@popup/hive/actions/rpc-switcher';
import RpcUtils from '@popup/hive/utils/rpc.utils';
import { store } from '@popup/multichain/store';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { AsyncUtils } from 'src/utils/async.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';

export const useWorkingRPC = async (activeRpc?: Rpc) => {
  const switchAuto = await LocalStorageUtils.getValueFromLocalStorage(
    LocalStorageKeyEnum.SWITCH_RPC_AUTO,
  );
  const currentRpc = activeRpc || (await store.getState().hive.activeRpc);
  const others = RpcUtils.getFullList().filter(
    (rpc) => rpc.uri !== currentRpc?.uri && !rpc.testnet,
  );
  // Asks first, and tries nothing until then: even checking another node tells it someone's there.
  if (!switchAuto) {
    if (others.length) {
      store.dispatch(setSwitchToRpc(others[0]));
      store.dispatch(setDisplayChangeRpcPopup(true));
    }
    return;
  }
  for (const rpc of others) {
    await AsyncUtils.sleep(1000);
    if (await RpcUtils.checkRpcStatus(rpc.uri)) {
      store.dispatch(setActiveRpc(rpc));
      return;
    }
  }
};
