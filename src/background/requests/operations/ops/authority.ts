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
import AccountUtils from 'src/popup/hive/utils/account.utils';
import Logger from 'src/utils/logger.utils';

export const broadcastAddAccountAuthority = async (
  requestHandler: RequestsHandler,
  data: RequestAddAccountAuthority & RequestId,
  options?: TransactionOptions,
) => {
  let err, result, err_message;
  const { username, authorizedUsername } = data;
  let role = data.role.toLowerCase();
  let { weight } = data;
  try {
    const key = requestHandler.data.key;
    const userAccount = await AccountUtils.getExtendedAccount(username);

    const { active, posting } = await AccountUtils.processAuthorityUpdate(
      userAccount,
      role as 'posting' | 'active',
      authorizedUsername,
      weight,
    );

    result = await AccountUtils.updateAccount(
      userAccount.name,
      active,
      posting,
      userAccount.memo_key,
      userAccount.json_metadata,
      key!,
      options,
    );
  } catch (e) {
    Logger.error(e);
    err = (e as KeychainError).trace || e;
    err_message = await chrome.i18n.getMessage(
      (e as KeychainError).message,
      (e as KeychainError).messageParams,
    );
  } finally {
    const err_message = await beautifyErrorMessage(err);
    return await createMessage(
      err,
      result,
      data,
      await chrome.i18n.getMessage('bgd_ops_add_auth', [
        data.role.toLowerCase(),
        data.authorizedUsername,
        data.username,
      ]),
      err_message,
    );
  }
};

export const broadcastRemoveAccountAuthority = async (
  requestHandler: RequestsHandler,
  data: RequestRemoveAccountAuthority & RequestId,
  options?: TransactionOptions,
) => {
  let err, result, err_message;
  const { username, authorizedUsername } = data;
  let role = data.role.toLowerCase();
  try {
    const key = requestHandler.data.key;
    const userAccount = await AccountUtils.getExtendedAccount(username);

    const { active, posting } = await AccountUtils.processAuthorityRemoval(
      userAccount,
      role as 'posting' | 'active',
      authorizedUsername,
    );

    result = await AccountUtils.updateAccount(
      userAccount.name,
      active,
      posting,
      userAccount.memo_key,
      userAccount.json_metadata,
      key!,
      options,
    );
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
      await chrome.i18n.getMessage('bgd_ops_remove_auth', [
        data.role.toLowerCase(),
        data.authorizedUsername,
        data.username,
      ]),
      err_message,
    );
  }
};

export const broadcastAddKeyAuthority = async (
  requestHandler: RequestsHandler,
  data: RequestAddKeyAuthority & RequestId,
  options?: TransactionOptions,
) => {
  let result, err, err_message;
  const { username, authorizedKey } = data;
  let role = data.role.toLowerCase();
  let { weight } = data;

  try {
    const key = requestHandler.data.key;
    const userAccount = await AccountUtils.getExtendedAccount(username);

    const { active, posting } = await AccountUtils.processKeyAuthorityUpdate(
      userAccount,
      role as 'posting' | 'active',
      authorizedKey,
      weight,
    );

    result = await AccountUtils.updateAccount(
      userAccount.name,
      active,
      posting,
      userAccount.memo_key,
      userAccount.json_metadata,
      key!,
      options,
    );
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
      await chrome.i18n.getMessage('bgd_ops_add_key_auth', [
        data.authorizedKey,
        await chrome.i18n.getMessage(data.role.toLowerCase()),
        data.username,
        data.weight + '',
      ]),
      err_message,
    );
  }
};

export const broadcastRemoveKeyAuthority = async (
  requestHandler: RequestsHandler,
  data: RequestRemoveKeyAuthority & RequestId,
  options?: TransactionOptions,
) => {
  let err, result, err_message;
  const { username, authorizedKey } = data;
  let role = data.role.toLowerCase();

  try {
    const key = requestHandler.data.key;
    const userAccount = await AccountUtils.getExtendedAccount(username);

    const { active, posting } = await AccountUtils.processKeyAuthorityRemoval(
      userAccount,
      role as 'posting' | 'active',
      authorizedKey,
    );

    result = await AccountUtils.updateAccount(
      userAccount.name,
      active,
      posting,
      userAccount.memo_key,
      userAccount.json_metadata,
      key!,
      options,
    );
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
      await chrome.i18n.getMessage('bgd_ops_remove_key_auth', [
        data.authorizedKey,
        await chrome.i18n.getMessage(data.role.toLowerCase()),
        data.username,
      ]),
      err_message,
    );
  }
};
