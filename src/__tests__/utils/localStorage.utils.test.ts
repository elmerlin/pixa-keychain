import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import LocalStorageUtils from 'src/utils/localStorage.utils';

describe('localStorage.utils tests:\n', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('getValueFromLocalStorage resolves the value for the requested key', async () => {
    jest
      .spyOn(chrome.storage.local, 'get')
      .mockImplementation((keys: any, cb: any) => {
        cb({ [LocalStorageKeyEnum.CURRENT_RPC]: { uri: 'https://node' } });
      });

    await expect(
      LocalStorageUtils.getValueFromLocalStorage(
        LocalStorageKeyEnum.CURRENT_RPC,
      ),
    ).resolves.toEqual({ uri: 'https://node' });
  });

  it('getMultipleValueFromLocalStorage resolves the full result object', async () => {
    jest
      .spyOn(chrome.storage.local, 'get')
      .mockImplementation((keys: any, cb: any) => {
        cb({
          [LocalStorageKeyEnum.CURRENT_RPC]: { uri: 'a' },
          [LocalStorageKeyEnum.FAVORITE_USERS]: ['X'],
        });
      });

    await expect(
      LocalStorageUtils.getMultipleValueFromLocalStorage([
        LocalStorageKeyEnum.CURRENT_RPC,
        LocalStorageKeyEnum.FAVORITE_USERS,
      ]),
    ).resolves.toEqual({
      [LocalStorageKeyEnum.CURRENT_RPC]: { uri: 'a' },
      [LocalStorageKeyEnum.FAVORITE_USERS]: ['X'],
    });
  });

  it('removeFromLocalStorage delegates to chrome.storage.local.remove', () => {
    const remove = jest
      .spyOn(chrome.storage.local, 'remove')
      .mockImplementation();

    LocalStorageUtils.removeFromLocalStorage(
      LocalStorageKeyEnum.FAVORITE_USERS,
    );

    expect(remove).toHaveBeenCalledWith(LocalStorageKeyEnum.FAVORITE_USERS);
  });

  it('clearLocalStorage delegates to chrome.storage.local.clear', () => {
    const clear = jest
      .spyOn(chrome.storage.local, 'clear')
      .mockImplementation();

    LocalStorageUtils.clearLocalStorage();

    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('Must call chrome.storage.local.set with the storage area context', async () => {
    const setSpy = jest
      .spyOn(chrome.storage.local, 'set')
      .mockImplementation(function (
        this: typeof chrome.storage.local,
        items: { [key: string]: unknown },
        callback?: () => void,
      ) {
        expect(this).toBe(chrome.storage.local);
        expect(items).toEqual({
          [LocalStorageKeyEnum.SWITCH_RPC_AUTO]: true,
        });
        callback?.();
      });

    await expect(
      LocalStorageUtils.saveValueInLocalStorage(
        LocalStorageKeyEnum.SWITCH_RPC_AUTO,
        true,
      ),
    ).resolves.toBeUndefined();

    expect(setSpy).toHaveBeenCalledTimes(1);
  });
});
