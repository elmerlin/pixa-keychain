export type Key = string | null;

export interface Keys {
  memo?: Key;
  memoPubkey?: Key;
  posting?: Key;
  postingPubkey?: Key;
  active?: Key;
  activePubkey?: Key;
}

export enum KeyType {
  OWNER = 'OWNER',
  ACTIVE = 'ACTIVE',
  POSTING = 'POSTING',
  MEMO = 'MEMO',
}

export enum PrivateKeyType {
  AUTHORIZED_ACCOUNT = 'AUTHORIZED_ACCOUNT',

  PRIVATE_KEY = 'PRIVATE_KEY',
}

// Retain the shared call signature for transaction helpers; no extra options are supported.
export type TransactionOptions = Record<string, never>;
