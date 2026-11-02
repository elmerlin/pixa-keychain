import Config from 'src/config';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import { KeysUtils } from '@popup/hive/utils/keys.utils';
import AccountUtils from '@popup/hive/utils/account.utils';
import TransferUtils from '@hiveapp/utils/transfer.utils';
import {
  AccountCreateOperation,
  Operation,
  SignedTransaction,
} from '@hiveio/dhive';
import { DefaultRpcs } from '@reference-data/default-rpc.list';
import {
  Transaction as HiveTransaction,
  config as HiveTxConfig,
} from 'hive-tx';
import accounts from 'src/__tests__/utils-for-testing/data/accounts';
import mk from 'src/__tests__/utils-for-testing/data/mk';
import userData from 'src/__tests__/utils-for-testing/data/user-data';
import { KeychainError } from 'src/keychain-error';
import Logger from 'src/utils/logger.utils';
import VaultUtils from 'src/utils/vault.utils';

describe('hive-tx.utils.ts tests:\n', () => {
  const constants = {
    operations: [
      {
        0: 'account_create',
        1: {
          fee: '1 PIXA',
          creator: mk.user.one,
          new_account_name: 'new_account',
          owner: accounts.extended.owner,
          active: accounts.extended.active,
          posting: accounts.extended.posting,
          memo_key: accounts.extended.memo_key,
          json_metadata: {},
        } as unknown as AccountCreateOperation,
      },
    ] as Operation[],
    tx: {
      expiration: '10/10/2023',
      extensions: [],
      operations: [
        TransferUtils.getRecurrentTransferOperation(
          'sender',
          'receiver',
          '1.000 PXS',
          '',
          24,
          2,
        ),
      ],
      ref_block_num: 1125554,
      ref_block_prefix: 1111222,
    },
    broadcastResponse: {
      success: {
        id: 999,
        jsonrpc: 'condenser_api',
        result: {
          tx_id: '9999',
          status: 'confirmed',
        },
      },
      error: {
        error: 'Error',
      },
    },
  };

  /**
   * createSignAndBroadcastTransaction loads accounts from chain/local storage before signing.
   * Stub RPC/account calls so tests stay offline and do not leave unhandled rejections.
   */
  beforeEach(() => {
    jest
      .spyOn(HiveTxUtils, 'getData')
      .mockImplementation(async (method: string) => {
        if (method === 'condenser_api.get_accounts') {
          return [accounts.extended];
        }
        return undefined;
      });
    jest
      .spyOn(AccountUtils, 'getExtendedAccount')
      .mockResolvedValue(accounts.extended as any);
    jest
      .spyOn(AccountUtils, 'getAccountsFromLocalStorage')
      .mockResolvedValue([]);
    jest.spyOn(VaultUtils, 'getValueFromVault').mockResolvedValue('mk');
    jest
      .spyOn(AccountUtils, 'getAccountFromLocalStorage')
      .mockResolvedValue(accounts.local.oneAllkeys as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  describe('createTransaction', () => {
    it('returns transaction from hive-tx create', async () => {
      const created = { ...constants.tx, id: 'created' };
      jest
        .spyOn(HiveTransaction.prototype, 'create')
        .mockResolvedValue(created as any);

      const tx = await HiveTxUtils.createTransaction(constants.operations);

      expect(tx).toEqual(created);
    });
  });

  describe('setRpc cases:\n', () => {
    it('uses the configured Pixagram node for DEFAULT', async () => {
      await HiveTxUtils.setRpc({ uri: 'DEFAULT', testnet: false });
      expect(HiveTxConfig.node).toBe('https://api.pixagram.com');
      expect(HiveTxConfig.node).toBe(Config.rpc.DEFAULT.uri);
    });

    it('changes the node without allowing legacy node data to override the chain ID', async () => {
      const chainId = HiveTxConfig.chain_id;
      const rpc = { uri: 'https://custom.example', testnet: false, chainId: 'foreign-chain' };
      await HiveTxUtils.setRpc(rpc);
      expect(HiveTxConfig.node).toBe(rpc.uri);
      expect(HiveTxConfig.chain_id).toBe(chainId);
    });
  });

  describe('createSignAndBroadcastTransaction cases: \n', () => {});

  describe('signTransaction cases:\n', () => {});

  describe('broadcastAndConfirmTransactionWithSignature cases:\n', () => {
    it('adds multiple signatures when signature is a string array', async () => {
      const addSig = jest
        .spyOn(HiveTransaction.prototype, 'addSignature')
        .mockReturnValue({
          ...constants.tx,
          signatures: ['a', 'b'],
        } as any);
      jest.spyOn(HiveTransaction.prototype, 'broadcast').mockResolvedValue({
        result: { tx_id: 'multi-sig-tx' },
      } as any);

      const result =
        await HiveTxUtils.broadcastAndConfirmTransactionWithSignature(
          constants.tx,
          ['sig-one', 'sig-two'],
          false,
        );

      expect(addSig).toHaveBeenCalledTimes(2);
      expect(addSig).toHaveBeenNthCalledWith(1, 'sig-one');
      expect(addSig).toHaveBeenNthCalledWith(2, 'sig-two');
      expect(result).toMatchObject({
        tx_id: 'multi-sig-tx',
        id: 'multi-sig-tx',
        confirmed: false,
      });
    });

    it('Must throw error and call logger if error on Hive Tx', async () => {
      jest
        .spyOn(HiveTransaction.prototype, 'addSignature')
        .mockReturnValue({ ...constants.tx, signatures: ['signature'] });
      jest
        .spyOn(HiveTransaction.prototype, 'broadcast')
        .mockRejectedValue(constants.broadcastResponse.error);
      const sLoggerError = jest.spyOn(Logger, 'error');
      try {
        await HiveTxUtils.broadcastAndConfirmTransactionWithSignature(
          constants.tx,
          'signature',
        );
      } catch (error) {
        expect(error).toEqual(new Error('html_popup_error_while_broadcasting'));
        expect(sLoggerError).toHaveBeenCalledWith(
          constants.broadcastResponse.error,
        );
      }
    });

    it('Must throw error and call logger if error on broadcast', async () => {
      jest
        .spyOn(HiveTransaction.prototype, 'addSignature')
        .mockReturnValue({ ...constants.tx, signatures: ['signature'] });
      jest
        .spyOn(HiveTransaction.prototype, 'broadcast')
        .mockRejectedValue(new Error('error on broadcast'));
      const sLoggerError = jest.spyOn(Logger, 'error');
      try {
        await HiveTxUtils.broadcastAndConfirmTransactionWithSignature(
          constants.tx,
          'signature',
        );
      } catch (error) {
        expect(error).toEqual(new Error('html_popup_error_while_broadcasting'));
        expect(sLoggerError).toHaveBeenCalledWith(
          new Error('error on broadcast'),
        );
      }
    });
  });
});
