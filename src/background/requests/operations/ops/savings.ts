import { createMessage } from '@background/requests/operations/operations.utils';
import { RequestsHandler } from '@background/requests/request-handler';
import { encode } from '@hiveio/hive-js/lib/auth/memo';
import {
  KeychainKeyTypesLC,
  RequestId,
  RequestSavings,
} from '@interfaces/keychain.interface';
import { TransactionOptions } from '@interfaces/keys.interface';
import { KeychainError } from 'src/keychain-error';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import { SavingsUtils } from 'src/popup/hive/utils/savings.utils';
import FormatUtils from 'src/utils/format.utils';
import Logger from 'src/utils/logger.utils';

export const broadcastSavings = async (
  requestHandler: RequestsHandler,
  data: RequestSavings & RequestId,
  options?: TransactionOptions,
) => {
  let result, err, err_message;
  let key = requestHandler.data.key;
  const amountLabel = `${FormatUtils.formatCurrencyValue(data.amount)} ${
    data.currency
  }`;
  const amount = `${data.amount} ${data.currency}`;
  const isDeposit = data.operation === 'deposit';
  const username = data.username!;
  let memo = data.memo ?? '';
  if (!key) {
    key = requestHandler.getUserPrivateKey(username, KeychainKeyTypesLC.active);
  }

  try {
    // The review says a memo starting with # is encrypted, and it must not reach the chain as text.
    if (memo.startsWith('#')) {
      const memoKey = requestHandler.getUserPrivateKey(
        username,
        KeychainKeyTypesLC.memo,
      );
      if (!memoKey) {
        throw new KeychainError('popup_html_memo_key_missing');
      }
      const receiver = await AccountUtils.getExtendedAccount(data.to);
      if (!receiver) {
        throw new KeychainError('bgd_ops_transfer_get_account', [data.to]);
      }
      memo = encode(memoKey, receiver.memo_key, memo);
    }
    result = isDeposit
      ? await SavingsUtils.deposit(
          amount,
          data.to,
          username,
          key!,
          options,
          memo,
        )
      : await SavingsUtils.withdraw(
          amount,
          data.to,
          username,
          key!,
          options,
          memo,
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
      await chrome.i18n.getMessage(
        isDeposit
          ? 'popup_html_deposit_success'
          : 'popup_html_withdraw_success',
        [amountLabel],
      ),
      err_message,
    );
    return message;
  }
};
