import { createMessage } from '@background/requests/operations/operations.utils';
import { RequestsHandler } from '@background/requests/request-handler';
import {
  KeychainKeyTypesLC,
  RequestId,
  RequestSignBuffer,
} from '@interfaces/keychain.interface';
import { config } from 'hive-tx';
import { KeychainError } from 'src/keychain-error';
import Logger from 'src/utils/logger.utils';
const signature = require('@hiveio/hive-js/lib/auth/ecc');

export type SignedBuffer = string;

export const signBuffer = async (
  requestHandler: RequestsHandler,
  data: RequestSignBuffer & RequestId,
) => {
  let signed = null;
  let error = null;
  let err_message = null;
  let publicKey = requestHandler.data.publicKey;

  try {
    let key = requestHandler.data.key;
    if (!key) {
      [key, publicKey] = requestHandler.getUserKeyPair(
        data.username!,
        data.method.toLowerCase() as KeychainKeyTypesLC,
      ) as [string, string];
    }
    signed = await signMessage(data.message, key!);
  } catch (err) {
    Logger.error(err);
    error = err;
    err_message = await chrome.i18n.getMessage(
      (err as KeychainError).message,
      (err as KeychainError).messageParams,
    );
  } finally {
    return await createMessage(
      error,
      signed,
      data,
      await chrome.i18n.getMessage('bgd_ops_sign_success'),
      err_message ?? (await chrome.i18n.getMessage('bgd_ops_sign_error')),
      publicKey,
    );
  }
};

// A message is signed as the text the person read, never as bytes decoded from it. A transaction's
// signature covers the chain ID and then its bytes, so text starting with the chain ID could be
// signed into a real transaction nobody reviewed.
const signMessage = (message: string, privateKey: string): SignedBuffer => {
  const chainId = Buffer.from(config.chain_id, 'hex');
  if (Buffer.from(message).subarray(0, chainId.length).equals(chainId)) {
    throw new KeychainError('bgd_ops_sign_refused_transaction');
  }
  return signature.Signature.signBuffer(message, privateKey).toHex();
};
