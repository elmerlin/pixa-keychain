import RPCModule from '@background/rpc.module';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { config as HiveTxConfig } from 'hive-tx';
import LocalStorageUtils from 'src/utils/localStorage.utils';

const CHAIN_ID =
  '706978616772616d000000000000000000000000000000000000000000000000';

describe('RPCModule', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([undefined, { uri: 'DEFAULT', testnet: false }])(
    'initializes the default Pixagram node for %p',
    async (rpc) => {
      jest.spyOn(RPCModule, 'getActiveRpc').mockResolvedValue(rpc);
      await RPCModule.init();
      expect(HiveTxConfig.node).toBe('https://api.pixagram.com');
      expect(HiveTxConfig.chain_id).toBe(CHAIN_ID);
    },
  );

  it('initializes a custom node without changing the signing chain', async () => {
    jest.spyOn(RPCModule, 'getActiveRpc').mockResolvedValue({
      uri: 'https://custom.example',
      testnet: false,
      // Legacy stored data cannot override the signing chain.
      ...{ chainId: 'foreign-chain' },
    });
    await RPCModule.init();
    expect(HiveTxConfig.node).toBe('https://custom.example');
    expect(HiveTxConfig.chain_id).toBe(CHAIN_ID);
  });

  it.each(['DEFAULT', 'https://custom.example'])(
    'persists and selects %s',
    async (uri) => {
      const save = jest
        .spyOn(LocalStorageUtils, 'saveValueInLocalStorage')
        .mockResolvedValue(undefined);
      const rpc = { uri, testnet: false, chainId: 'foreign-chain' };
      await RPCModule.setActiveRpc(rpc);
      expect(save).toHaveBeenCalledWith(LocalStorageKeyEnum.CURRENT_RPC, rpc);
      expect(HiveTxConfig.node).toBe(
        uri === 'DEFAULT' ? 'https://api.pixagram.com' : uri,
      );
      expect(HiveTxConfig.chain_id).toBe(CHAIN_ID);
    },
  );

  it('reads the active RPC from storage', async () => {
    const rpc = { uri: 'https://custom.example', testnet: false };
    const read = jest
      .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
      .mockResolvedValue(rpc);
    await expect(RPCModule.getActiveRpc()).resolves.toEqual(rpc);
    expect(read).toHaveBeenCalledWith(LocalStorageKeyEnum.CURRENT_RPC);
  });
});
