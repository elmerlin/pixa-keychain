const Config = {
  claims: {
    FREQUENCY: +(process.env.DEV_CLAIM_FREQUENCY || 10),
    freeAccount: {
      MIN_RC_PCT: +(process.env.DEV_CLAIM_ACCOUNT_RC_PCT || 85),
      MIN_RC: +(process.env.DEV_CLAIM_ACCOUNT_MIN_RC || 9484331370472),
    },
    savings: {
      delay: +(process.env.DEV_CLAIM_SAVINGS_DELAY || 30),
    },
  },

  MIN_LOADING_TIME: 1000,
  rpc: {
    DEFAULT: { uri: 'https://api.pixagram.com', testnet: false },
  },
  treasuryAccount: 'pixa.omnibus',
  explorer: {
    baseURL: 'https://pixtopia.net/chain',
  },
  governanceReminderDelayInSeconds: 30 * 24 * 3600, //days

  loader: {
    minDuration: process.env.NODE_ENV === 'test' ? 0 : 1000,
  },
  transactions: {
    expirationTimeInMinutes: 10,
  },

  witnesses: {
    feedWarningLimitInHours: 5,
  },

  vault: {
    portName: 'vault-connection',
  },
};

export default Config;
