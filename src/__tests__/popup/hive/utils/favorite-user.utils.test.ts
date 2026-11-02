import BgdAccountsUtils from '@background/utils/accounts.utils';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { FavoriteUserListName } from '@interfaces/favorite-user.interface';
import { FavoriteUserUtils } from 'src/popup/hive/utils/favorite-user.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import VaultUtils from 'src/utils/vault.utils';

describe('FavoriteUserUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAutocompleteList', () => {
    it('combines saved favorites and other local accounts without injecting recipients', async () => {
      jest
        .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
        .mockResolvedValue({
          alice: ['bob', 'carol'],
        });
      expect(
        await FavoriteUserUtils.getAutocompleteList('alice', [
          { name: 'alice', keys: {} },
          { name: 'bob', keys: {} },
        ]),
      ).toEqual([{ value: 'carol' }, { value: 'bob' }]);
    });

    it('returns no suggestions when there are no saved recipients', async () => {
      jest
        .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
        .mockResolvedValue(undefined);
      expect(
        await FavoriteUserUtils.getAutocompleteList('alice', [
          { name: 'alice', keys: {} },
        ]),
      ).toEqual([]);
    });
  });

  describe('getAutocompleteListByCategories', () => {
    it('includes only saved favorites and other local accounts', async () => {
      jest
        .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
        .mockResolvedValue({
          alice: [{ value: 'carol', subLabel: '' }],
        });
      expect(
        await FavoriteUserUtils.getAutocompleteListByCategories('alice', [
          { name: 'alice', keys: {} },
          { name: 'bob', keys: {} },
        ]),
      ).toEqual({
        categories: [
          {
            title: FavoriteUserListName.USERS,
            translateTitle: true,
            values: [{ value: 'carol', subLabel: '' }],
          },
          {
            title: FavoriteUserListName.LOCAL_ACCOUNTS,
            translateTitle: true,
            values: [{ value: 'bob', subLabel: '' }],
          },
        ],
      });
    });

    it('does not create empty categories', async () => {
      jest
        .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
        .mockResolvedValue(undefined);
      expect(
        await FavoriteUserUtils.getAutocompleteListByCategories('alice', []),
      ).toEqual({ categories: [] });
    });
  });

  describe('fixFavoriteList', () => {
    it('parses string storage, normalizes string entries, and persists when changed', async () => {
      const save = jest
        .spyOn(LocalStorageUtils, 'saveValueInLocalStorage')
        .mockResolvedValue(undefined);

      const raw = JSON.stringify({
        u1: ['plain', { value: 'x', subLabel: '' }],
      });

      const fixed = await FavoriteUserUtils.fixFavoriteList(raw);

      expect(fixed.u1[0]).toEqual({ label: 'plain', value: 'plain' });
      expect(save).toHaveBeenCalledWith(
        LocalStorageKeyEnum.FAVORITE_USERS,
        expect.objectContaining({
          u1: expect.arrayContaining([
            expect.objectContaining({ value: 'plain' }),
          ]),
        }),
      );
    });

    it('ensures each user key maps to an array', async () => {
      jest
        .spyOn(LocalStorageUtils, 'saveValueInLocalStorage')
        .mockResolvedValue(undefined);

      const fixed = await FavoriteUserUtils.fixFavoriteList({
        u: 'not-array' as any,
      });

      expect(Array.isArray((fixed as any).u)).toBe(true);
    });
  });

  describe('saveFavoriteUser', () => {
    it('does not duplicate an existing favorite', async () => {
      jest.spyOn(VaultUtils, 'getValueFromVault').mockResolvedValue('mk');
      jest
        .spyOn(BgdAccountsUtils, 'getAccountsFromLocalStorage')
        .mockResolvedValue([]);
      jest
        .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
        .mockResolvedValue({
          alice: [{ value: 'dup', subLabel: '' }],
        });
      const save = jest.spyOn(LocalStorageUtils, 'saveValueInLocalStorage');

      await FavoriteUserUtils.saveFavoriteUser('dup', {
        name: 'alice',
        keys: {},
      } as any);

      expect(save).toHaveBeenCalledWith(
        LocalStorageKeyEnum.FAVORITE_USERS,
        expect.objectContaining({
          alice: [{ value: 'dup', subLabel: '' }],
        }),
      );
    });
  });
});
