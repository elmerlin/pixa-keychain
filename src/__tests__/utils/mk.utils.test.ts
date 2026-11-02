import AccountUtils from 'src/popup/hive/utils/account.utils';
import MkUtils from 'src/popup/hive/utils/mk.utils';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import mk from 'src/__tests__/utils-for-testing/data/mk';
import EncryptUtils from 'src/popup/hive/utils/encrypt.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';

describe('mk.utils tests:\n', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('login tests:\n', () => {
    test('Passing an invalid password must return false', async () => {
      AccountUtils.getAccountsFromLocalStorage = jest
        .fn()
        .mockResolvedValueOnce(undefined);
      LocalStorageUtils.getMultipleValueFromLocalStorage = jest
        .fn()
        .mockResolvedValueOnce({});
      const result = await MkUtils.login('wrong_password_to_decrypt');
      expect(result).toBe(false);
    });
    test('Passing a valid password must return true', async () => {
      AccountUtils.getAccountsFromLocalStorage = jest
        .fn()
        .mockResolvedValueOnce([]);
      LocalStorageUtils.getMultipleValueFromLocalStorage = jest
        .fn()
        .mockResolvedValueOnce({});
      const result = await MkUtils.login('right_password');
      expect(result).toBe(true);
    });
  });
});
