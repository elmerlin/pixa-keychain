import type {
  RecurrentTransferOperation,
  Transaction,
  TransferOperation,
} from '@hiveio/dhive';
import { Key, TransactionOptions } from '@interfaces/keys.interface';
import { PendingRecurrentTransfer } from '@interfaces/transaction.interface';
import { KeysUtils } from '@popup/hive/utils/keys.utils';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';

const getTransferWarningLabel = (
  account: string,
  currency: string,
  memo: any,
  phisingAccounts: any,
  isRecurrent?: boolean,
) => {
  const plainMemo = memo.startsWith('#') ? memo.substring(1) : memo;
  for (const word of plainMemo.match(/[\w\d]{51,52}/g) ?? []) {
    if (
      (word.length === 51 &&
        KeysUtils.getPublicKeyFromPrivateKeyString(word)) ||
      (word.length === 52 && word.startsWith('P'))
    ) {
      return chrome.i18n.getMessage('popup_warning_private_key_in_memo');
    }
  }
  if (phisingAccounts.includes(account)) {
    return chrome.i18n.getMessage('popup_warning_phishing', [account]);
  }
};

const sendTransfer = (
  sender: string,
  receiver: string,
  amount: string,
  memo: string,
  recurrent: boolean,
  iterations: number,
  frequency: number,
  activeKey: Key,
  options?: TransactionOptions,
  pair_id?: number,
) => {
  if (!recurrent) {
    return HiveTxUtils.sendOperation(
      [getTransferOperation(sender, receiver, amount, memo)],
      activeKey,
      true,
      options,
    );
  } else {
    return HiveTxUtils.sendOperation(
      [
        getRecurrentTransferOperation(
          sender,
          receiver,
          amount,
          memo,
          frequency,
          iterations,
          pair_id,
        ),
      ],
      activeKey,
      true,
      options,
    );
  }
};

const getTransferOperation = (
  sender: string,
  receiver: string,
  amount: string,
  memo: string,
) => {
  return [
    'transfer',
    {
      from: sender,
      to: receiver,
      amount: amount,
      memo: memo,
    },
  ] as TransferOperation;
};

const getRecurrentTransferOperation = (
  sender: string,
  receiver: string,
  amount: string,
  memo: string,
  frequency: number,
  iterations: number,
  pair_id: number = 0,
) => {
  return [
    'recurrent_transfer',
    {
      from: sender,
      to: receiver,
      amount: amount,
      memo: memo,
      recurrence: frequency,
      executions: iterations,
      extensions: [{ type: 1, value: { pair_id } }],
    },
  ] as RecurrentTransferOperation;
};

const getTransferTransaction = (
  sender: string,
  receiver: string,
  amount: string,
  memo: string,
  recurrent: boolean,
  iterations: number,
  frequency: number,
): Promise<Transaction> => {
  if (!recurrent) {
    return HiveTxUtils.createTransaction([
      getTransferOperation(sender, receiver, amount, memo),
    ]);
  } else {
    return HiveTxUtils.createTransaction([
      getRecurrentTransferOperation(
        sender,
        receiver,
        amount,
        memo,
        frequency,
        iterations,
      ),
    ]);
  }
};

const getRecurrentTransfers = async (
  name: string,
): Promise<{ recurrent_transfers: PendingRecurrentTransfer[] }> => {
  const recurrentTransfers = await HiveTxUtils.getData(
    'database_api.find_recurrent_transfers',
    { from: name },
  );
  return recurrentTransfers;
};

const getRecurrentTransferPairId = (
  recurrentTransfers: PendingRecurrentTransfer[],
  to: string,
): number => {
  const pairTrx = recurrentTransfers.filter((transfer) => transfer.to === to);
  if (pairTrx.length === 0) return 0;
  const pairId = pairTrx.reduce(
    (max: number, transfer: PendingRecurrentTransfer) => {
      return max === 0 || transfer.pair_id > max ? transfer.pair_id : max;
    },
    0,
  );
  return pairId + 1;
};

const TransferUtils = {
  sendTransfer,
  getTransferOperation,
  getRecurrentTransferOperation,
  getTransferTransaction,
  getTransferWarningLabel,
  getRecurrentTransfers,
  getRecurrentTransferPairId,
};

export default TransferUtils;
