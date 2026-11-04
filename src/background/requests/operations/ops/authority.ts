import {
  beautifyErrorMessage,
  createMessage,
} from '@background/requests/operations/operations.utils';
import { RequestsHandler } from '@background/requests/request-handler';
import {
  RequestAddAccountAuthority,
  RequestAddKeyAuthority,
  RequestId,
  RequestRemoveAccountAuthority,
  RequestRemoveKeyAuthority,
} from '@interfaces/keychain.interface';
import { TransactionOptions } from '@interfaces/keys.interface';
import { KeychainError } from 'src/keychain-error';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import Logger from 'src/utils/logger.utils';

export type ReviewedAuthorityChange = { reviewedOperation?: any };

// The review builds the update and shows it. This signs that, and reads nothing again, so a node
// can't change what was approved between the two.
const sendReviewed = async (
  requestHandler: RequestsHandler,
  data: { username: string } & ReviewedAuthorityChange,
  options?: TransactionOptions,
) => {
  const operation = data.reviewedOperation;
  if (
    operation?.[0] !== 'account_update' ||
    operation[1]?.account !== data.username ||
    operation[1]?.owner
  ) {
    throw new KeychainError('bgd_ops_authority_not_reviewed');
  }
  return HiveTxUtils.sendOperation(
    [operation],
    requestHandler.data.key!,
    false,
    options,
  );
};

const broadcastAuthorityChange = async (
  requestHandler: RequestsHandler,
  data: any,
  successMessage: string,
  options?: TransactionOptions,
) => {
  let err, result, err_message;
  try {
    result = await sendReviewed(requestHandler, data, options);
  } catch (e) {
    Logger.error(e);
    err = (e as KeychainError).trace || e;
    err_message = await chrome.i18n.getMessage(
      (e as KeychainError).message,
      (e as KeychainError).messageParams,
    );
  } finally {
    return await createMessage(
      err,
      result,
      data,
      successMessage,
      err_message || (await beautifyErrorMessage(err)),
    );
  }
};

export const broadcastAddAccountAuthority = async (
  requestHandler: RequestsHandler,
  data: RequestAddAccountAuthority & RequestId & ReviewedAuthorityChange,
  options?: TransactionOptions,
) =>
  broadcastAuthorityChange(
    requestHandler,
    data,
    await chrome.i18n.getMessage('bgd_ops_add_auth', [
      data.role.toLowerCase(),
      data.authorizedUsername,
      data.username,
    ]),
    options,
  );

export const broadcastRemoveAccountAuthority = async (
  requestHandler: RequestsHandler,
  data: RequestRemoveAccountAuthority & RequestId & ReviewedAuthorityChange,
  options?: TransactionOptions,
) =>
  broadcastAuthorityChange(
    requestHandler,
    data,
    await chrome.i18n.getMessage('bgd_ops_remove_auth', [
      data.role.toLowerCase(),
      data.authorizedUsername,
      data.username,
    ]),
    options,
  );

export const broadcastAddKeyAuthority = async (
  requestHandler: RequestsHandler,
  data: RequestAddKeyAuthority & RequestId & ReviewedAuthorityChange,
  options?: TransactionOptions,
) =>
  broadcastAuthorityChange(
    requestHandler,
    data,
    await chrome.i18n.getMessage('bgd_ops_add_key_auth', [
      data.authorizedKey,
      await chrome.i18n.getMessage(data.role.toLowerCase()),
      data.username,
      data.weight + '',
    ]),
    options,
  );

export const broadcastRemoveKeyAuthority = async (
  requestHandler: RequestsHandler,
  data: RequestRemoveKeyAuthority & RequestId & ReviewedAuthorityChange,
  options?: TransactionOptions,
) =>
  broadcastAuthorityChange(
    requestHandler,
    data,
    await chrome.i18n.getMessage('bgd_ops_remove_key_auth', [
      data.authorizedKey,
      await chrome.i18n.getMessage(data.role.toLowerCase()),
      data.username,
    ]),
    options,
  );
