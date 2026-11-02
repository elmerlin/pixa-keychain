import { KeychainApi } from '@api/keychain';
import type { Operation, Transaction } from '@hiveio/dhive';
import {
  HiveTxBroadcastErrorResponse,
  HiveTxBroadcastResult,
  HiveTxBroadcastSuccessResponse,
  TransactionResult,
} from '@interfaces/hive-tx.interface';
import { Key, TransactionOptions } from '@interfaces/keys.interface';
import { Rpc } from '@interfaces/rpc.interface';
import {
  call,
  config as HiveTxConfig,
  PrivateKey,
  Transaction as HiveTransaction,
} from 'hive-tx';
import Config from 'src/config';
import { KeychainError } from 'src/keychain-error';
import { ErrorUtils } from 'src/popup/hive/utils/error.utils';
import { AsyncUtils } from 'src/utils/async.utils';
import Logger from 'src/utils/logger.utils';

const MINUTE = 60;

const setRpc = async (rpc: Rpc) => {
  HiveTxConfig.node =
    rpc.uri === 'DEFAULT' ? (await KeychainApi.get('hive/rpc')).rpc : rpc.uri;
  if (rpc.chainId) {
    HiveTxConfig.chain_id = rpc.chainId;
  }
};
const sendOperation = async (
  operations: Operation[],
  key: Key,
  confirmation?: boolean,
  options?: TransactionOptions,
): Promise<TransactionResult | null> => {
  const transactionResult = await HiveTxUtils.createSignAndBroadcastTransaction(
    operations,
    key,
    options,
  );
  if (transactionResult) {
    return {
      id: transactionResult.tx_id,
      tx_id: transactionResult.tx_id,
      confirmed: confirmation
        ? await confirmTransaction(transactionResult.tx_id)
        : false,
    } as TransactionResult;
  } else {
    return null;
  }
};

const createTransaction = async (operations: Operation[]) => {
  let hiveTransaction = new HiveTransaction();
  const tx = await hiveTransaction.create(
    operations,
    Config.transactions.expirationTimeInMinutes * MINUTE,
  );
  Logger.log(`length of transaction => ${JSON.stringify(tx).length}`);
  return tx;
};

const createSignAndBroadcastTransaction = async (
  operations: Operation[],
  key: Key,
  options?: TransactionOptions,
): Promise<HiveTxBroadcastResult | undefined> => {
  if (key == null || key === '') {
    throw new Error('html_popup_error_while_signing_transaction');
  }
  let hiveTransaction = new HiveTransaction();
  await hiveTransaction.create(
    operations,
    Config.transactions.expirationTimeInMinutes * MINUTE,
  );

  try {
    const privateKey = PrivateKey.fromString(key!.toString());
    hiveTransaction.sign(privateKey);
  } catch (err) {
    Logger.error(err);
    throw new Error('html_popup_error_while_signing_transaction');
  }
  let response;
  try {
    response = await hiveTransaction.broadcast();
    if ((response as HiveTxBroadcastSuccessResponse).result) {
      const result = (response as HiveTxBroadcastSuccessResponse).result;
      return {
        ...result,
      };
    }
  } catch (err) {
    Logger.error(err);
    throw new Error('html_popup_error_while_broadcasting');
  }
  response = response as HiveTxBroadcastErrorResponse;
  if (response.error) {
    Logger.error('Error during broadcast', response.error);
    throw ErrorUtils.parse(response.error);
  }
};
/* istanbul ignore next */
const confirmTransaction = async (transactionId: string) => {
  let response = null;
  const MAX_RETRY_COUNT = 6;
  let retryCount = 0;
  do {
    response = await call('transaction_status_api.find_transaction', {
      transaction_id: transactionId,
    });
    await AsyncUtils.sleep(1000);
    retryCount++;
  } while (
    ['within_mempool', 'unknown'].includes(response.result.status) &&
    retryCount < MAX_RETRY_COUNT
  );
  if (
    ['within_reversible_block', 'within_irreversible_block'].includes(
      response.result.status,
    )
  ) {
    Logger.info('Transaction confirmed');
    return true;
  } else {
    Logger.error(`Transaction failed with status: ${response.result.status}`);
    return false;
  }
};

const signTransaction = async (tx: Transaction, key: Key) => {
  const hiveTransaction = new HiveTransaction(tx);
  try {
    const privateKey = PrivateKey.fromString(key!.toString());
    return hiveTransaction.sign(privateKey);
  } catch (err) {
    Logger.error(err);
    throw new KeychainError('html_popup_error_while_signing_transaction');
  }
};

const broadcastAndConfirmTransactionWithSignature = async (
  transaction: Transaction,
  signature: string | string[],
  confirmation?: boolean,
): Promise<TransactionResult | undefined> => {
  let hiveTransaction = new HiveTransaction(transaction);
  if (typeof signature === 'string') {
    hiveTransaction.addSignature(signature);
  } else {
    for (const si of signature) {
      hiveTransaction.addSignature(si);
    }
  }
  let response;
  try {
    Logger.log(hiveTransaction);
    response = await hiveTransaction.broadcast();
    if ((response as HiveTxBroadcastSuccessResponse).result) {
      const transactionResult: HiveTxBroadcastResult = (
        response as HiveTxBroadcastSuccessResponse
      ).result;
      return {
        id: transactionResult.tx_id,
        tx_id: transactionResult.tx_id,
        confirmed: confirmation
          ? await confirmTransaction(transactionResult.tx_id)
          : false,
      } as TransactionResult;
    }
  } catch (err) {
    Logger.error(err);
    throw new Error('html_popup_error_while_broadcasting');
  }
  response = response as HiveTxBroadcastErrorResponse;
  if (response.error) {
    Logger.error('Error during broadcast', response.error);
    throw ErrorUtils.parse(response.error);
  }
};
/* istanbul ignore next */
const getData = async (
  method: string,
  params: any[] | object,
  key?: string,
) => {
  try {
    const response = await call(method, params, 3000);
    if (response?.result) {
      return key ? response.result[key] : response.result;
    } else {
      switchToWorkingRpc(method, response.error);
    }
  } catch (err) {
    switchToWorkingRpc(method, err);
  }
};

const switchToWorkingRpc = async (method: string, error: any) => {
  if (window && window.document) {
    import('src/utils/rpc-switcher.utils').then(({ useWorkingRPC }) => {
      useWorkingRPC();
    });
  }
  throw new Error(
    `Error while retrieving data from ${method} : ${JSON.stringify(error)}`,
  );
};

const getTransaction = async (txId: string) => {
  await AsyncUtils.sleep(3000);
  return HiveTxUtils.getData('condenser_api.get_transaction', [txId]);
};

export const HiveTxUtils = {
  getTransaction,
  sendOperation,
  createSignAndBroadcastTransaction,
  // confirmTransaction,
  getData,
  setRpc,
  createTransaction,
  signTransaction,
  broadcastAndConfirmTransactionWithSignature,
};
