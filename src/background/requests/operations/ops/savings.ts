import { createMessage } from '@background/requests/operations/operations.utils';
import { RequestsHandler } from '@background/requests/request-handler';
import {
  KeychainKeyTypesLC,
  RequestId,
  RequestSavings,
} from '@interfaces/keychain.interface';
import { TransactionOptions } from '@interfaces/keys.interface';
import { KeychainError } from 'src/keychain-error';
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
  const memo = data.memo ?? '';
  if (!key) {
    key = requestHandler.getUserPrivateKey(username, KeychainKeyTypesLC.active);
  }

  try {
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
