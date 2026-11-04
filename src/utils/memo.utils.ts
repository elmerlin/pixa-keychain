import {
  decode as decodeMemo,
  encode as encodeMemo,
  getPubKeys,
} from '@hiveio/hive-js/lib/auth/memo';
import { PublicKey } from 'hive-tx';

// Encrypting multiplies a private key by the other side's public key, and what comes back depends on
// the answer. A "key" that isn't on the curve would leak the private key a little at a time, and
// hive-js doesn't check, so every memo goes through here. PublicKey.from refuses anything else.
export const encode = (
  privateKey: unknown,
  publicKey: string,
  memo: string,
): string => {
  PublicKey.from(publicKey);
  return encodeMemo(privateKey, publicKey, memo);
};

export const decode = (privateKey: unknown, memo: string): string => {
  getPubKeys(memo).forEach((key: unknown) => PublicKey.from(String(key)));
  return decodeMemo(privateKey, memo);
};
