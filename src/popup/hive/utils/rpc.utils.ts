import axios from 'axios';
import { config as HiveTxConfig } from 'hive-tx';
import Config from 'src/config';
import { Rpc } from 'src/interfaces/rpc.interface';
import { DefaultRpcs } from 'src/reference-data/default-rpc.list';
import { LocalStorageKeyEnum } from 'src/reference-data/local-storage-key.enum';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import Logger from 'src/utils/logger.utils';

const getFullList = (): Rpc[] => {
  return DefaultRpcs.map((rpc: Rpc) => {
    return {
      ...rpc,
      custom: false,
      uri: rpc.uri.endsWith('/')
        ? rpc.uri.substring(0, rpc.uri.length - 1)
        : rpc.uri,
    };
  });
};

const isDefault = (rpc: Rpc): boolean => {
  return (
    DefaultRpcs.find((r: Rpc) => {
      const defaultUri = r.uri.trim().endsWith('/')
        ? r.uri.trim().substring(0, r.uri.trim().length - 1)
        : r.uri.trim();
      const uri = rpc.uri.trim().endsWith('/')
        ? rpc.uri.trim().substring(0, rpc.uri.trim().length - 1)
        : rpc.uri.trim();
      return defaultUri === uri;
    }) !== undefined
  );
};

const getCustomRpcs = async (): Promise<Rpc[]> => {
  const customRpcs: Rpc[] = await LocalStorageUtils.getValueFromLocalStorage(
    LocalStorageKeyEnum.RPC_LIST,
  );
  const rpcList = customRpcs ? customRpcs : ([] as Rpc[]);
  return rpcList.map((rpc) => ({
    ...rpc,
    custom: true,
  }));
};

const addCustomRpc = async (rpc: Rpc): Promise<void> => {
  const savedCustomRpc = await LocalStorageUtils.getValueFromLocalStorage(
    LocalStorageKeyEnum.RPC_LIST,
  );
  const newRpcList = savedCustomRpc ? savedCustomRpc : [];
  newRpcList.push(rpc);
  LocalStorageUtils.saveValueInLocalStorage(
    LocalStorageKeyEnum.RPC_LIST,
    newRpcList,
  );
};

const deleteCustomRpc = (rpcs: Rpc[], rpc: Rpc) => {
  const newRpcs = rpcs.filter((r) => rpc.uri !== r.uri);
  saveCustomRpc(newRpcs);
  return newRpcs;
};

const getCurrentRpc = async (): Promise<Rpc> => {
  let currentRpc = await LocalStorageUtils.getValueFromLocalStorage(
    LocalStorageKeyEnum.CURRENT_RPC,
  );
  currentRpc = currentRpc ? currentRpc : { uri: 'DEFAULT', testnet: false };
  if (currentRpc.uri.endsWith('/'))
    currentRpc = {
      ...currentRpc,
      uri: currentRpc.uri.substring(0, currentRpc.uri.length - 1),
    };

  return currentRpc;
};
/* istanbul ignore next */
const saveCustomRpc = (rpcs: Rpc[]) => {
  LocalStorageUtils.saveValueInLocalStorage(LocalStorageKeyEnum.RPC_LIST, rpcs);
};
/* istanbul ignore next */
const saveCurrentRpc = (rpc: Rpc) => {
  LocalStorageUtils.saveValueInLocalStorage(
    LocalStorageKeyEnum.CURRENT_RPC,
    rpc,
  );
};

const findRpc = async (uri: string) => {
  const list = [...getFullList(), ...(await RpcUtils.getCustomRpcs())];
  return list.find(
    (e) => e.uri === uri || e.uri === uri + '/' || e.uri + '/' === uri,
  );
};

// A node is usable only if it says it is on Pixagram. Signing always uses Pixagram's chain ID, so a
// node on another chain could only ever produce failed transactions.
const checkRpcStatus = async (uri: string) => {
  try {
    const result = await axios.post(
      uri === 'DEFAULT' ? Config.rpc.DEFAULT.uri : uri,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'condenser_api.get_config',
        params: [],
      },
      { timeout: 10000 },
    );
    return (
      result?.data?.result?.HIVE_CHAIN_ID === HiveTxConfig.chain_id &&
      result?.data?.result?.HIVE_ADDRESS_PREFIX === HiveTxConfig.address_prefix
    );
  } catch (err) {
    Logger.error('error', err);
    return false;
  }
};

// const test = async () => {
//   const list = [...getFullList(), ...(await RpcUtils.getCustomRpcs())];
//   for (const rpc of list) {
//     try {
//       const start = Date.now();
//       await HiveTxUtils.setRpc(rpc);
//       const res = await HiveTxUtils.getData(
//         'transaction_status_api.find_transaction',
//         { transaction_id: 'f5178d311dd17927d460e8674cabd074df8e24fe' },
//       );
//       const end = Date.now();
//       if (res.status) {
//         console.log(`${rpc.uri} responded in ${end - start}ms`);
//       } else {
//         console.log(`${rpc.uri} responded without status`);
//       }
//     } catch (e) {
//       console.log(`${rpc.uri} had an error`, e);
//     }
//   }
// };

const RpcUtils = {
  getFullList,
  addCustomRpc,
  getCurrentRpc,
  saveCurrentRpc,
  getCustomRpcs,
  isDefault,
  saveCustomRpc,
  deleteCustomRpc,
  findRpc,
  checkRpcStatus,
};

export default RpcUtils;
