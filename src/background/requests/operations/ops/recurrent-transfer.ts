import { createMessage } from '@background/requests/operations/operations.utils';
import { RequestsHandler } from '@background/requests/request-handler';
import { encode } from '@hiveio/hive-js/lib/auth/memo';
import {
  KeychainKeyTypesLC,
  RequestId,
  RequestRecurrentTransfer,
} from '@interfaces/keychain.interface';
import { TransactionOptions } from '@interfaces/keys.interface';
import { KeychainError } from 'src/keychain-error';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import CurrencyUtils from 'src/popup/hive/utils/currency.utils';
import TransferUtils from 'src/popup/hive/utils/transfer.utils';
import Logger from 'src/utils/logger.utils';

export const recurrentTransfer = async (
  requestHandler: RequestsHandler,
  data: RequestRecurrentTransfer & RequestId,
  options?: TransactionOptions,
) => {
  const { username, to, amount, recurrence, executions, pair_id } = data;
  let { memo } = data;
  let currency = CurrencyUtils.getCurrencyLabel(
    data.currency,
    requestHandler.data.rpc?.testnet || false,
  );
  let result, err, err_message;

  try {
    let key = requestHandler.data.key;
    if (!key) {
      [key] = requestHandler.getUserKeyPair(
        data.username!,
        KeychainKeyTypesLC.active,
      ) as [string, string];
    }
    if (memo && memo.length > 0 && memo[0] == '#') {
      const receiver = await AccountUtils.getExtendedAccount(to);
      const memoKey: string = requestHandler.getUserKeyPair(
        username!,
        KeychainKeyTypesLC.memo,
      )[0];
      if (!receiver || !memoKey) {
        throw new KeychainError('bgd_ops_encode_err');
      }
      const memoReceiver = receiver.memo_key;
      memo = encode(memoKey, memoReceiver, memo);
    }

    result = await TransferUtils.sendTransfer(
      username!,
      to,
      `${amount} ${currency}`,
      memo || '',
      true,
      executions,
      recurrence,
      key,
      options,
      pair_id,
    );
  } catch (e) {
    Logger.error(e);
    err = (e as KeychainError).trace || e;
    err_message = await chrome.i18n.getMessage(
      (e as KeychainError).message,
      (e as KeychainError).messageParams,
    );
  } finally {
    const message = await createMessage(
      err,
      result,
      data,
      parseFloat(amount) === 0
        ? await chrome.i18n.getMessage('bgd_ops_stop_recurrent_transfer')
        : await chrome.i18n.getMessage('bgd_ops_recurrent_transfer'),
      err_message,
    );
    return message;
  }
};
