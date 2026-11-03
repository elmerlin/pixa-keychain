/**
 * @jest-environment node
 */
// jsdom has its own Uint8Array, which the key and memo libraries don't recognise.
import { encode, decode } from '@hiveio/hive-js/lib/auth/memo';
import { Asset as CommonsAsset } from 'hive-keychain-commons';
import { PrivateKey, Transaction, config } from 'hive-tx';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import { readFileSync } from 'fs';
import fixture from './serializer.fixture.json';

const ByteBuffer = require('bytebuffer');
const serializer = require('hive-tx/helpers/serializer');
const VendorAsset = require('hive-tx/helpers/asset');

const CHAIN_ID =
  '706978616772616d000000000000000000000000000000000000000000000000';

// Pixagram derives keys as Pixtopia's own wallet does. These come from its portal-keys.ts.
const VECTOR = {
  posting: {
    wif: '5KfnbiZsWVWWuudbko42sSUgjm38woJZ1hqo9CtU1z6zkpCZMVS',
    pub: 'PIX8RrW2Q65qHr3NULhsbmYArGUK1JnDpxzfao99JXbXjxbER5aEo',
  },
  active: {
    wif: '5K1FmyHNCvZmby2F3j6x2s9t8Nx84TFRsgvavr1go4SyVdsxBte',
    pub: 'PIX89L4B5EgYwhGv3794kEgq7bteLMgWj1vXefEyBrr7vrXrYeSKB',
  },
  memo: {
    wif: '5HpPhmdbzjtG4naiVj5CY96x13cxhJAkUJkjzYpnMeX2DQdLP3A',
    pub: 'PIX5JdKMoD7p18Bac4FdCBmVyAzL7o7qKvtjM6hskn3wFW2ndEqnC',
  },
};

const transaction = (operation: unknown) => ({
  ref_block_num: 1,
  ref_block_prefix: 2,
  expiration: '2026-12-01T00:00:00',
  operations: [operation],
  extensions: [],
});

describe('Pixagram chain', () => {
  it('signs for Pixagram, with PIX keys', () => {
    expect(config.chain_id).toBe(CHAIN_ID);
    expect(config.address_prefix).toBe('PIX');
    expect(config.node).toBe('https://api.pixagram.com');
  });

  describe('serialization matches the node', () => {
    it.each(Object.entries(fixture))('%s', (_name, { operation, hex }) => {
      const buffer = new ByteBuffer(
        ByteBuffer.DEFAULT_CAPACITY,
        ByteBuffer.LITTLE_ENDIAN,
      );
      serializer.Transaction(buffer, transaction(operation));
      buffer.flip();
      // The node's hex is of a signed transaction, so it ends in an empty signature list.
      expect(Buffer.from(buffer.toBuffer()).toString('hex') + '00').toBe(hex);
    });

    it('covers the operations the wallet can send', () => {
      for (const name of [
        'transfer',
        'recurrent_transfer',
        'transfer_to_vesting',
        'withdraw_vesting',
        'delegate_vesting_shares',
        'transfer_to_savings',
        'transfer_from_savings',
        'cancel_transfer_from_savings',
        'convert',
        'collateralized_convert',
        'claim_reward_balance',
        'claim_account',
        'create_claimed_account',
        'account_create',
        'account_update',
        'account_update2',
        'account_witness_vote',
        'account_witness_proxy',
        'witness_update',
        'witness_set_properties',
        'create_proposal',
        'update_proposal_votes',
        'remove_proposal',
        'vote',
        'comment',
        'comment_options',
        'custom_json',
      ]) {
        expect(fixture).toHaveProperty(name);
      }
    });
  });

  describe('assets', () => {
    it.each(['1.000 HIVE', '1.000 HBD', '1.000 STEEM', '1.000 SBD'])(
      'refuses %s',
      (text) => {
        expect(() => VendorAsset.fromString(text)).toThrow();
        expect(() => CommonsAsset.fromString(text)).toThrow();
      },
    );

    it('serializes PIXA and PXS literally', () => {
      expect(VendorAsset.fromString('1.000 PIXA').symbol).toBe('PIXA');
      expect(VendorAsset.fromString('1.000 PXS').symbol).toBe('PXS');
      expect(CommonsAsset.fromString('1.000 PIXA').toString()).toBe(
        '1.000 PIXA',
      );
    });
  });

  describe('keys', () => {
    it.each(Object.entries(VECTOR))('derives %s as Pixtopia does', (role, k) => {
      const key = PrivateKey.fromLogin('fixture', 'not-a-real-password', role);
      expect(key.toString()).toBe(k.wif);
      expect(key.createPublic().toString()).toBe(k.pub);
    });

    it('encrypts memos between PIX keys', () => {
      const encoded = encode(VECTOR.memo.wif, VECTOR.posting.pub, '#hello');
      expect(encoded.startsWith('#')).toBe(true);
      expect(decode(VECTOR.posting.wif, encoded)).toBe('#hello');
    });

    it('signs over the Pixagram chain ID', () => {
      const key = PrivateKey.fromString(VECTOR.posting.wif);
      const unsigned = transaction(fixture.vote.operation);
      const signed = new Transaction({ ...unsigned }).sign(key);
      const { digest } = new Transaction(unsigned).digest();
      const expected = require('hive-tx/transactions/signTransaction').transactionDigest(
        unsigned,
        Buffer.from(CHAIN_ID, 'hex'),
      ).digest;
      expect(Buffer.from(digest).toString('hex')).toBe(
        Buffer.from(expected).toString('hex'),
      );
      expect(signed.signatures).toHaveLength(1);
    });
  });

  describe('owner keys', () => {
    const account = {
      owner: { key_auths: [[VECTOR.active.pub, 1]] },
      active: { key_auths: [[VECTOR.active.pub, 1]] },
      posting: { key_auths: [[VECTOR.posting.pub, 1]] },
      memo_key: VECTOR.memo.pub,
    };

    beforeEach(() => {
      jest
        .spyOn(AccountUtils, 'getAccount')
        .mockResolvedValue([account] as never);
    });
    afterEach(() => jest.restoreAllMocks());

    it('refuses a key that is on the owner authority, whatever else it holds', async () => {
      await expect(
        AccountUtils.getKeys('fixture', VECTOR.active.wif),
      ).rejects.toThrow('popup_accounts_owner_key_refused');
    });

    it('takes a posting key', async () => {
      const keys = await AccountUtils.getKeys('fixture', VECTOR.posting.wif);
      expect(keys?.posting).toBe(VECTOR.posting.wif);
      expect(keys?.postingPubkey).toBe(VECTOR.posting.pub);
    });
  });

  describe('what a page can see', () => {
    const provider = readFileSync('public/pixa_keychain.js', 'utf8');

    it('shares no name with Hive Keychain', () => {
      expect(provider).toContain('var pixa_keychain');
      expect(provider).not.toContain('hive_keychain');
      expect(provider).not.toContain('swRequest_hive');
      expect(provider).not.toContain('swHandshake_hive');
    });

    it('injects the renamed provider', () => {
      const webInterface = readFileSync(
        'src/content-scripts/web-interface/index.ts',
        'utf8',
      );
      expect(webInterface).toContain('pixa_keychain.js');
      expect(webInterface).toContain('swRequest_pixa');
      for (const browser of ['chromium', 'firefox']) {
        const manifest = readFileSync(
          `manifests/${browser}/manifest.json`,
          'utf8',
        );
        expect(manifest).toContain('pixa_keychain.js');
        expect(manifest).not.toContain('hive_keychain.js');
      }
    });

    it('declares the provider on Chromium, instead of fetching it into the page', () => {
      const manifest = JSON.parse(
        readFileSync('manifests/chromium/manifest.json', 'utf8'),
      );
      const [listener, provider] = manifest.content_scripts;
      // The listener comes first, so a page's first request has somewhere to go.
      expect(listener.js).toEqual(['web_interfaceBundle.js']);
      expect(listener.world).toBeUndefined();
      expect(provider.js).toEqual(['pixa_keychain.js']);
      expect(provider.world).toBe('MAIN');
      expect(provider.matches).toEqual(listener.matches);
      expect(provider.all_frames).toBe(listener.all_frames);
      expect(
        manifest.web_accessible_resources.flatMap((entry: any) => entry.resources),
      ).not.toContain('pixa_keychain.js');
      expect(Number(manifest.minimum_chrome_version)).toBeGreaterThanOrEqual(111);
    });
  });
});
