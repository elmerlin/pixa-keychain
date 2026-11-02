/** @jest-environment node */
import { PrivateKey } from 'hive-tx';
import AccountUtils from 'src/popup/hive/utils/account.utils';

const username = 'fixture';
const password = 'not-a-real-password';
const keys = Object.fromEntries(
  ['owner', 'active', 'posting', 'memo'].map((role) => {
    const key = PrivateKey.fromLogin(username, password, role);
    return [role, { wif: key.toString(), pub: key.createPublic().toString() }];
  }),
);
const authority = (pub: string) => ({
  weight_threshold: 1,
  account_auths: [],
  key_auths: [[pub, 1]],
});
const account = {
  name: username,
  owner: authority(keys.owner.pub),
  active: authority(keys.active.pub),
  posting: authority(keys.posting.pub),
  memo_key: keys.memo.pub,
};

describe('AccountUtils key import policy', () => {
  beforeEach(() =>
    jest
      .spyOn(AccountUtils, 'getAccount')
      .mockResolvedValue([account] as never),
  );
  afterEach(() => jest.restoreAllMocks());

  it('refuses the owner WIF', async () => {
    await expect(
      AccountUtils.getKeys(username, keys.owner.wif),
    ).rejects.toThrow('popup_accounts_owner_key_refused');
  });

  it.each(['active', 'posting', 'memo'])(
    'refuses a %s key that also holds owner authority',
    async (role) => {
      jest
        .spyOn(AccountUtils, 'getAccount')
        .mockResolvedValue([
          { ...account, owner: authority(keys[role].pub) },
        ] as never);
      await expect(
        AccountUtils.getKeys(username, keys[role].wif),
      ).rejects.toThrow('popup_accounts_owner_key_refused');
    },
  );

  it('derives only posting, active and memo keys from a master password', async () => {
    await expect(AccountUtils.getKeys(username, password)).resolves.toEqual({
      posting: keys.posting.wif,
      postingPubkey: keys.posting.pub,
      active: keys.active.wif,
      activePubkey: keys.active.pub,
      memo: keys.memo.wif,
      memoPubkey: keys.memo.pub,
    });
  });
});
