export {
  KeychainKeyTypes,
  KeychainKeyTypesLC,
  LoadingState,
} from 'hive-keychain-commons/lib/interfaces/keychain';
export type {
  ExcludeCommonParams,
  HiveErrorMessage,
  RequestAddAccount,
  RequestAddAccountAuthority,
  RequestAddAccountKeys,
  RequestAddKeyAuthority,
  RequestBroadcast,
  RequestConvert,
  RequestCreateClaimedAccount,
  RequestCreateProposal,
  RequestCustomJSON,
  RequestDecode,
  RequestDelegation,
  RequestEncode,
  RequestEncodeWithKeys,
  RequestId,
  RequestPost,
  RequestPowerDown,
  RequestPowerUp,
  RequestProxy,
  RequestRecurrentTransfer,
  RequestRemoveAccountAuthority,
  RequestRemoveKeyAuthority,
  RequestRemoveProposal,
  RequestSavings,
  RequestSignBuffer,
  RequestSignedCall,
  RequestSignTx,
  RequestTransfer,
  RequestUpdateProposalVote,
  RequestVote,
  RequestWitnessVote,
} from 'hive-keychain-commons/lib/interfaces/keychain';
import * as Commons from 'hive-keychain-commons/lib/interfaces/keychain';

export const KeychainRequestTypes = {
  decode: Commons.KeychainRequestTypes.decode,
  encode: Commons.KeychainRequestTypes.encode,
  encodeWithKeys: Commons.KeychainRequestTypes.encodeWithKeys,
  signBuffer: Commons.KeychainRequestTypes.signBuffer,
  broadcast: Commons.KeychainRequestTypes.broadcast,
  addAccountAuthority: Commons.KeychainRequestTypes.addAccountAuthority,
  removeAccountAuthority: Commons.KeychainRequestTypes.removeAccountAuthority,
  removeKeyAuthority: Commons.KeychainRequestTypes.removeKeyAuthority,
  addKeyAuthority: Commons.KeychainRequestTypes.addKeyAuthority,
  signTx: Commons.KeychainRequestTypes.signTx,
  post: Commons.KeychainRequestTypes.post,
  vote: Commons.KeychainRequestTypes.vote,
  custom: Commons.KeychainRequestTypes.custom,
  signedCall: Commons.KeychainRequestTypes.signedCall,
  transfer: Commons.KeychainRequestTypes.transfer,
  savings: Commons.KeychainRequestTypes.savings,
  delegation: Commons.KeychainRequestTypes.delegation,
  witnessVote: Commons.KeychainRequestTypes.witnessVote,
  proxy: Commons.KeychainRequestTypes.proxy,
  powerUp: Commons.KeychainRequestTypes.powerUp,
  powerDown: Commons.KeychainRequestTypes.powerDown,
  createClaimedAccount: Commons.KeychainRequestTypes.createClaimedAccount,
  createProposal: Commons.KeychainRequestTypes.createProposal,
  removeProposal: Commons.KeychainRequestTypes.removeProposal,
  updateProposalVote: Commons.KeychainRequestTypes.updateProposalVote,
  addAccount: Commons.KeychainRequestTypes.addAccount,
  convert: Commons.KeychainRequestTypes.convert,
  recurrentTransfer: Commons.KeychainRequestTypes.recurrentTransfer,
} as const;

export type KeychainRequestTypes =
  (typeof KeychainRequestTypes)[keyof typeof KeychainRequestTypes];
export type KeychainRequestData = Extract<
  Commons.KeychainRequestData,
  { type: KeychainRequestTypes }
>;
export type KeychainRequest = KeychainRequestData & Commons.RequestId;
export type KeychainRequestWrapper = Omit<
  Commons.KeychainRequestWrapper,
  'request'
> & {
  request: KeychainRequest;
};
export type RequestSuccess = Omit<Commons.RequestSuccess, 'data'> & {
  data: KeychainRequestData;
};
export type RequestError = Omit<Commons.RequestError, 'data'> & {
  data: KeychainRequestData;
};
export type RequestResponse = Omit<Commons.RequestResponse, 'data'> & {
  data: KeychainRequestData;
};
