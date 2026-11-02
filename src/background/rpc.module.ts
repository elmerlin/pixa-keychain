import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { config as HiveTxConfig } from 'hive-tx';
import Config from 'src/config';
import { Rpc } from 'src/interfaces/rpc.interface';
import LocalStorageUtils from 'src/utils/localStorage.utils';

const nodeFor = (rpc?: Rpc) =>
  !rpc || rpc.uri === 'DEFAULT' ? Config.rpc.DEFAULT.uri : rpc.uri;

const init = async () => {
  HiveTxConfig.node = nodeFor(await RPCModule.getActiveRpc());
};

const setActiveRpc = async (rpc: Rpc) => {
  HiveTxConfig.node = nodeFor(rpc);
  await LocalStorageUtils.saveValueInLocalStorage(
    LocalStorageKeyEnum.CURRENT_RPC,
    rpc,
  );
};

const getActiveRpc = async (): Promise<Rpc> => {
  return await LocalStorageUtils.getValueFromLocalStorage(
    LocalStorageKeyEnum.CURRENT_RPC,
  );
};

const RPCModule = {
  setActiveRpc,
  getActiveRpc,
  init,
};

export default RPCModule;
