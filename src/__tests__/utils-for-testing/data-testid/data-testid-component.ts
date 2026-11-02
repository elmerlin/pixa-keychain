import { Icons } from 'src/common-ui/icons.enum';

const dataTestIdComponent = {
  settingsMainPage: 'settings-main-page-component',
  homePage: 'home-page-component',
  selectPage: 'select-keys-page',
  signUp: 'signup-page',
  signIn: 'sign-in-page',
  input: 'password-input',
  inputConfirmation: 'password-input-confirmation',
  addAccountMain: 'add-account-page',
  transfersFundsPage: 'transfer-funds-page',
  walletItemList: 'wallet-item-list',
  governancePage: 'governance-page',
  powerUpDownPage: 'power-up-page',
  conversionPage: 'conversion-page',
  savingsPage: 'savings-page',
  delegationsPage: 'delegations-page',
  rcDelegationsPage: 'rc-delegations-page',
  confirmationPage: 'confirmation-page',
  incomingOutgoingPage: 'incoming-outgoing-page',
  addByKeysPage: 'add-by-keys-page',
  addByAuthPage: 'add-by-auth-page',
  peoplePage: 'settings-account-sub-menu-page',
  tunePage: 'user-preferences-page',
  settingsPage: 'advanced-settings-page',
  infoPage: 'about-page',
  advanceSettings: {
    rpcNodes: 'rpc-nodes-page',
    autoLock: 'auto-lock-page',
    changePassword: 'change-password-page',
    importExport: 'import-export-preferences-page',
    clearAllData: 'clear-all-data-page',
  },
  account: {
    subMenu: {
      addAccount: {
        router: 'settings-add-account-router-page',
      },
      manageAccounts: 'settings-manage-account',
      createAccountsStepOne: 'settings-create-account-step-one',
    },
  },
  userPreferences: {
    authorizedOperations: `${Icons.AUTHORIZED_OPERATIONS}-page`,
    automatedTasks: `${Icons.AUTOMATED_TASKS}-page`,
  },
};

export default dataTestIdComponent;
