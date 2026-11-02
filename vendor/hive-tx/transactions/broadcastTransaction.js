const call = require('../helpers/call')

/** Broadcast signed transaction */
const broadcastTransaction = async (signedTransaction, overrideRpc = null, timeout = 10) => {
  const result = await call('condenser_api.broadcast_transaction', [
    signedTransaction
  ], timeout, overrideRpc)
  return result
}

module.exports = broadcastTransaction
