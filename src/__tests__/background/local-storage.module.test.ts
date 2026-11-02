import MkModule from '@background/mk.module';
import LocalStorageModule from '@background/local-storage.module';
import BgdAccountsUtils from '@background/utils/accounts.utils';
import { Rpc } from '@interfaces/rpc.interface';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import mocksImplementation from 'src/__tests__/utils-for-testing/implementations/implementations';
import { CustomDataFromLocalStorage } from 'src/__tests__/utils-for-testing/interfaces/mocks.interface';
import mk from 'src/__tests__/utils-for-testing/data/mk';
import LocalStorageUtils from 'src/utils/localStorage.utils';

describe('local-storage.module tests:\n', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('migrates preferences without rewriting an old Hive RPC', async () => {
    jest.spyOn(MkModule, 'getMk').mockResolvedValue(mk.user.one);
    jest
      .spyOn(BgdAccountsUtils, 'getAccountsFromLocalStorage')
      .mockResolvedValue([]);
    LocalStorageUtils.getValueFromLocalStorage = jest
      .fn()
      .mockImplementation((...args: any[]) =>
        mocksImplementation.getValuefromLS(args[0], {
          customStorageVersion: 2,
          customCurrentRpc: {
            uri: 'https://hived.privex.io/',
          } as Rpc,
        } as CustomDataFromLocalStorage),
      );
    const sSaveValueInLocalStorage = jest.spyOn(
      LocalStorageUtils,
      'saveValueInLocalStorage',
    );
    await LocalStorageModule.checkAndUpdateLocalStorage();
    expect(sSaveValueInLocalStorage).not.toHaveBeenCalledWith(
      LocalStorageKeyEnum.CURRENT_RPC,
      expect.anything(),
    );
    expect(sSaveValueInLocalStorage).toHaveBeenNthCalledWith(
      1,
      LocalStorageKeyEnum.LOCAL_STORAGE_VERSION,
      3,
    );
    expect(sSaveValueInLocalStorage).toHaveBeenNthCalledWith(
      2,
      LocalStorageKeyEnum.FAVORITE_USERS,
      {
        'keychain.tests': [
          { value: 'one1', subLabel: '' },
          { value: 'two2', subLabel: '' },
          { value: 'three3', subLabel: '' },
        ],
      },
    );
    expect(sSaveValueInLocalStorage).toHaveBeenNthCalledWith(
      3,
      LocalStorageKeyEnum.LOCAL_STORAGE_VERSION,
      4,
    );
  });
});
