import { Rpc } from '@interfaces/rpc.interface';

export interface KeyChainApiGetCustomData {
  witnessRanking?: any;
  currenciesPrices?: any;
  rpc?: { rpc: Rpc };
  phishingAccounts?: string[];
  extensionVersion?: WhatsNewContent;
  delegators?: any;
  /** `hive/ecosystem/dapps` KeychainApi mock payload */
  ecosystemDapps?: any[];
}

export interface FindSmartContractsHive {
  getUserBalance?: any | TokenBalance[];
  getIncomingDelegations?: any | TokenDelegation[];
  getOutgoingDelegations?: any | TokenDelegation[];
  getAllTokens?: any | any[];
  getTokensMarket?: any | TokenMarket[];
}
