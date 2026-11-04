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
  HiveTxConfig.node = rpc.uri === 'DEFAULT' ? Config.rpc.DEFAULT.uri : rpc.uri;
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
    throw new Error('html_popup_broadcast_outcome_unknown');
  }
  response = response as HiveTxBroadcastErrorResponse;
  if (response.error) {
    Logger.error('Error during broadcast', response.error);
    throw ErrorUtils.parse(response.error);
  }
};
// Waits for the transaction to reach a block, so what's read next includes it. The node has accepted
// it by now, so nothing here may throw: someone shown an error would send the money again.
const confirmTransaction = async (transactionId: string) => {
  const MAX_RETRY_COUNT = 6;
  for (let retryCount = 0; retryCount < MAX_RETRY_COUNT; retryCount++) {
    await AsyncUtils.sleep(1000);
    try {
      const response = await call(
        'condenser_api.get_transaction',
        [transactionId],
        3,
      );
      if (response?.result) {
        Logger.info('Transaction confirmed');
        return true;
      }
    } catch (err) {
      Logger.info(`Could not look up transaction ${transactionId}`);
    }
  }
  Logger.info(`Transaction ${transactionId} isn't in a block yet`);
  return false;
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
    throw new Error('html_popup_broadcast_outcome_unknown');
  }
  response = response as HiveTxBroadcastErrorResponse;
  if (response.error) {
    Logger.error('Error during broadcast', response.error);
    throw ErrorUtils.parse(response.error);
  }
};
const READ_TIMEOUT_SECONDS = 20;

/* istanbul ignore next */
const getData = async (
  method: string,
  params: any[] | object,
  key?: string,
) => {
  try {
    const response = await call(method, params, READ_TIMEOUT_SECONDS);
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
