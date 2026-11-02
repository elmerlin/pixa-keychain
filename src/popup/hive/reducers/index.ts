import { recurrentTransfersReducer } from '@popup/hive/reducers/recurrent-transfers.reducer';
import { RpcSwitcherReducer } from '@popup/hive/reducers/rpc-switcher.reducer';
import { combineReducers } from 'redux';
import { ActiveAccountReducer } from 'src/popup/hive/reducers/active-account.reducer';
import { ActiveRpcReducer } from 'src/popup/hive/reducers/active-rpc.reducer';
import { AppStatusReducer } from 'src/popup/hive/reducers/app-status.reducer';
import ConversionsReducer from 'src/popup/hive/reducers/conversion.reducer';
import CurrencyPricesReducer from 'src/popup/hive/reducers/currency-prices.reducer';
import DelegationsReducer from 'src/popup/hive/reducers/delegation.reducer';
import GlobalPropertiesReducer from 'src/popup/hive/reducers/global-properties.reducer';
import { PhishingReducer } from 'src/popup/hive/reducers/phishing.reducer';
import transactionsReducer from 'src/popup/hive/reducers/transactions.reducer';
import { AccountReducer } from './account.reducer';

const hiveReducers = combineReducers({
  accounts: AccountReducer,
  activeAccount: ActiveAccountReducer,
  activeRpc: ActiveRpcReducer,
  currencyPrices: CurrencyPricesReducer,
  globalProperties: GlobalPropertiesReducer,
  delegations: DelegationsReducer,
  conversions: ConversionsReducer,
  phishing: PhishingReducer,
  transactions: transactionsReducer,
  appStatus: AppStatusReducer,
  rpcSwitcher: RpcSwitcherReducer,
  recurrentTransfers: recurrentTransfersReducer,
});

export default hiveReducers;
