/**
 * @jest-environment node
 */
// jsdom has its own Uint8Array, which the key libraries don't recognise.
import { PublicKey, config } from 'hive-tx';
import { KeychainRequestTypes } from '@interfaces/keychain.interface';
import { readCommentOptions } from 'src/utils/comment-options.utils';
import {
  approvalFor,
  approvalLabel,
  isWhitelisted,
} from 'src/utils/preferences.utils';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import { describeOperations } from 'src/dialog/utils/operation-summary.utils';
import schemas, {
  commonRequestParams,
} from 'src/content-scripts/web-interface/input-validation';
import { broadcastSavings } from '@background/requests/operations/ops/savings';
import { RequestsHandler } from '@background/requests/request-handler';
import { SavingsUtils } from 'src/popup/hive/utils/savings.utils';
import { decode } from '@hiveio/hive-js/lib/auth/memo';

const ByteBuffer = require('bytebuffer');
const serializer = require('hive-tx/helpers/serializer');

// Test vectors that control nothing on chain.
const MEMO_WIF = '5HpPhmdbzjtG4naiVj5CY96x13cxhJAkUJkjzYpnMeX2DQdLP3A';
const MEMO_PUB = 'PIX5JdKMoD7p18Bac4FdCBmVyAzL7o7qKvtjM6hskn3wFW2ndEqnC';
const KEY_A = 'PIX8RrW2Q65qHr3NULhsbmYArGUK1JnDpxzfao99JXbXjxbER5aEo';
const KEY_B = 'PIX89L4B5EgYwhGv3794kEgq7bteLMgWj1vXefEyBrr7vrXrYeSKB';
const KEY_C = 'PIX5JdKMoD7p18Bac4FdCBmVyAzL7o7qKvtjM6hskn3wFW2ndEqnC';

const bytes = (transaction: unknown) => {
  const buffer = new ByteBuffer(
    ByteBuffer.DEFAULT_CAPACITY,
    ByteBuffer.LITTLE_ENDIAN,
  );
  serializer.Transaction(buffer, transaction);
  buffer.flip();
  return Buffer.from(buffer.toBuffer()).toString('hex');
};
const transaction = (operation: unknown) => ({
  ref_block_num: 1,
  ref_block_prefix: 2,
  expiration: '2026-12-01T00:00:00',
  operations: [operation],
  extensions: [],
});

describe('what gets signed is what was reviewed', () => {
  const recurrent = (recurrence: unknown, executions: unknown = 2) => [
    'recurrent_transfer',
    {
      from: 'alice',
      to: 'bob',
      amount: '1.000 PIXA',
      memo: '',
      recurrence,
      executions,
      extensions: [],
    },
  ];

  it('refuses a number that would wrap around its type', () => {
    expect(() => bytes(transaction(recurrent(65560)))).toThrow('uint16');
    expect(() => bytes(transaction(recurrent(24, -1)))).toThrow('uint16');
    expect(() => bytes(transaction(recurrent(24.5)))).toThrow('uint16');
    expect(() => bytes(transaction(recurrent(24)))).not.toThrow();
  });

  describe('64-bit numbers', () => {
    const removal = (id: unknown) =>
      transaction([
        'remove_proposal',
        { proposal_owner: 'alice', proposal_ids: [id], extensions: [] },
      ]);
    it('refuses one too long for 64 bits', () => {
      expect(() => bytes(removal('18446744073709551617'))).toThrow('int64');
      expect(() => bytes(removal('9223372036854775808'))).toThrow('int64');
    });
    it('refuses anything that is not a whole number', () => {
      for (const id of [1.5, '1.5', 'x', null, { low: 1, high: 0 }]) {
        expect(() => bytes(removal(id))).toThrow('int64');
      }
    });
    it('takes a number or the same number written out', () => {
      expect(bytes(removal('7'))).toBe(bytes(removal(7)));
    });
  });

  describe('dates', () => {
    const at = (expiration: unknown) => ({
      ...transaction(['delete_comment', { author: 'alice', permlink: 'p' }]),
      expiration,
    });
    it.each([
      ['past the end of its range', '2107-01-01T00:00:00'],
      ['that does not exist', '2026-02-31T00:00:00'],
      ['written any other way', '12/12/2023'],
      ['with a time zone', '2026-12-01T00:00:00Z'],
      ['missing', undefined],
    ])('refuses one %s', (_, date) => {
      expect(() => bytes(at(date))).toThrow('date');
    });
    it('takes a real one', () => {
      expect(() => bytes(at('2026-12-01T00:00:00'))).not.toThrow();
    });
  });

  it('refuses a vote strength that would wrap around', () => {
    const vote = (weight: number) =>
      transaction([
        'vote',
        { voter: 'alice', author: 'bob', permlink: 'p', weight },
      ]);
    expect(() => bytes(vote(65536 + 100))).toThrow('int16');
    expect(() => bytes(vote(-10000))).not.toThrow();
  });

  it('refuses anything but true or false as a flag', () => {
    const witnessVote = (approve: unknown) =>
      transaction([
        'account_witness_vote',
        { account: 'alice', witness: 'bob', approve },
      ]);
    expect(() => bytes(witnessVote('false'))).toThrow('boolean');
    expect(() => bytes(witnessVote(1))).toThrow('boolean');
    expect(bytes(witnessVote(true))).not.toBe(bytes(witnessVote(false)));
  });

  it('refuses an amount with more decimals than the asset has', () => {
    const transfer = (amount: string) =>
      transaction([
        'transfer',
        { from: 'alice', to: 'bob', amount, memo: '' },
      ]);
    expect(() => bytes(transfer('1.0005 PIXA'))).toThrow('decimals');
    expect(() => bytes(transfer('1.000 PIXA'))).not.toThrow();
    expect(() => bytes(transfer('9007199254740993.000 PIXA'))).toThrow(
      'amount',
    );
  });

  describe('a null optional field', () => {
    const update = (memo_key?: string | null) =>
      transaction([
        'account_update2',
        {
          account: 'alice',
          ...(memo_key === undefined ? {} : { memo_key }),
          json_metadata: '',
          posting_json_metadata: '',
          extensions: [],
        },
      ]);

    it('signs the same as leaving it out', () => {
      expect(bytes(update(null))).toBe(bytes(update()));
    });

    it('never signs the same as replacing the key', () => {
      const nullKey = `${config.address_prefix}1111111111111111111111111111111114T1Anm`;
      expect(bytes(update(null))).not.toBe(bytes(update(nullKey)));
    });

    it('is reviewed as leaving it out', () => {
      const [withNull] = describeOperations(update(null).operations, 'alice');
      const [withKey] = describeOperations(update(KEY_A).operations, 'alice');
      expect(withNull.rows.some((r) => r.value.includes('PIX'))).toBe(false);
      expect(withKey.rows.some((r) => r.value === KEY_A)).toBe(true);
    });
  });
});

describe('authority changes', () => {
  const authority = (key_auths: [string, number][] = [[KEY_A, 1]]) => ({
    weight_threshold: 1,
    account_auths: [] as [string, number][],
    key_auths,
  });
  const account = () =>
    ({
      name: 'alice',
      active: authority(),
      posting: authority(),
      memo_key: KEY_C,
    }) as never;

  it.each([0, -1, 65536, 1.5, NaN])(
    'never turns a weight of %s into control of the account',
    async (weight) => {
      await expect(
        AccountUtils.processAuthorityUpdate(account(), 'active', 'mallory', weight),
      ).rejects.toThrow('bgd_ops_authority_weight_invalid');
      await expect(
        AccountUtils.processKeyAuthorityUpdate(account(), 'active', KEY_B, weight),
      ).rejects.toThrow('bgd_ops_authority_weight_invalid');
    },
  );

  it('signs exactly the weight that was approved', async () => {
    const { active } = await AccountUtils.processAuthorityUpdate(
      account(),
      'active',
      'bob',
      3,
    );
    expect(active!.account_auths).toEqual([['bob', 3]]);
  });

  it('leaves out the role nobody asked about', async () => {
    const posting = await AccountUtils.processAuthorityUpdate(
      account(),
      'posting',
      'bob',
      1,
    );
    expect(posting.active).toBeUndefined();
    expect(posting.posting!.account_auths).toEqual([['bob', 1]]);
    const active = await AccountUtils.processKeyAuthorityUpdate(
      account(),
      'active',
      KEY_B,
      1,
    );
    expect(active.posting).toBeUndefined();
    const removed = await AccountUtils.processKeyAuthorityRemoval(
      account(),
      'posting',
      KEY_A,
    );
    expect(removed.active).toBeUndefined();
  });

  it('orders keys by their bytes, as the chain does', async () => {
    const { posting } = await AccountUtils.processKeyAuthorityUpdate(
      account(),
      'posting',
      KEY_B,
      1,
    );
    const keys = posting!.key_auths.map(([key]) => key as string);
    const inChainOrder = [KEY_A, KEY_B].sort((a, b) =>
      Buffer.compare(PublicKey.from(a).key, PublicKey.from(b).key),
    );
    expect(keys).toEqual(inChainOrder);
  });

  describe('the update a site asks for', () => {
    const request = (change: object) => ({
      username: 'alice',
      role: 'Posting',
      ...change,
    });
    beforeEach(() => {
      jest
        .spyOn(AccountUtils, 'getExtendedAccount')
        .mockImplementation(async () => account());
    });
    afterEach(() => jest.restoreAllMocks());

    it('holds only the role that was asked about', async () => {
      const [name, update] = await AccountUtils.getAuthorityChangeOperation(
        request({
          type: 'addAccountAuthority',
          authorizedUsername: 'bob',
          weight: 1,
        }) as never,
      );
      expect(name).toBe('account_update');
      expect(update.active).toBeUndefined();
      expect(update.owner).toBeUndefined();
      expect(update.posting!.account_auths).toEqual([['bob', 1]]);
    });

    it('is shown with who can act, and how much each one counts', async () => {
      (globalThis as any).chrome.i18n.getMessage = jest.fn(
        (key: string, values?: string[]) => [key, ...(values ?? [])].join(' '),
      );
      const operation = await AccountUtils.getAuthorityChangeOperation(
        request({
          type: 'addAccountAuthority',
          authorizedUsername: 'bob',
          weight: 2,
        }) as never,
      );
      const [summary] = describeOperations([operation], 'alice');
      expect(summary.understood).toBe(true);
      expect(JSON.stringify(summary.rows)).toContain(
        `dialog_op_holders 1 @bob (2), ${KEY_A} (1)`,
      );
    });

    it('never leaves nobody able to use the role', async () => {
      await expect(
        AccountUtils.getAuthorityChangeOperation(
          request({
            type: 'removeKeyAuthority',
            authorizedKey: KEY_A,
          }) as never,
        ),
      ).rejects.toThrow('bgd_ops_authority_lockout');
    });

    it('is read as not understood when the threshold is out of reach', () => {
      const [summary] = describeOperations(
        [
          [
            'account_update',
            {
              account: 'alice',
              posting: {
                weight_threshold: 5,
                account_auths: [['bob', 1]],
                key_auths: [],
              },
              memo_key: KEY_C,
              json_metadata: '',
            },
          ],
        ],
        'alice',
      );
      expect(summary.understood).toBe(false);
    });
  });
});

describe('a savings memo starting with #', () => {
  const request = {
    username: 'alice',
    to: 'alice',
    amount: '1.000',
    currency: 'PXS',
    memo: '#private',
    request_id: 1,
  } as any;
  const handler = (memoKey?: string) =>
    ({
      data: { key: 'activeWif' },
      getUserPrivateKey: () => memoKey,
    }) as unknown as RequestsHandler;
  beforeEach(() => {
    (globalThis as any).chrome.i18n.getMessage = jest.fn((key) => String(key));
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(['deposit', 'withdraw'] as const)(
    'is encrypted before it reaches the chain on a %s',
    async (operation) => {
      jest
        .spyOn(AccountUtils, 'getExtendedAccount')
        .mockResolvedValue({ memo_key: MEMO_PUB } as never);
      const send = jest
        .spyOn(SavingsUtils, operation)
        .mockResolvedValue({ tx_id: 'abc' } as never);
      await broadcastSavings(handler(MEMO_WIF), { ...request, operation });
      const sent = send.mock.calls[0][5] as string;
      expect(sent).not.toContain('private');
      expect(sent.startsWith('#')).toBe(true);
      expect(decode(MEMO_WIF, sent)).toBe('#private');
    },
  );

  it('stops the transaction when there is no memo key', async () => {
    const send = jest.spyOn(SavingsUtils, 'deposit');
    const result = await broadcastSavings(handler(), {
      ...request,
      operation: 'deposit',
    });
    expect(send).not.toHaveBeenCalled();
    expect(result.msg.success).toBe(false);
  });
});

describe('what a site can ask for', () => {
  const valid = (type: keyof typeof schemas, request: object) =>
    schemas[type]
      .append(commonRequestParams)
      .validate({ type, request_id: 1, ...request }).error === undefined;
  const authorityRequest = {
    username: 'alice',
    authorizedUsername: 'bob',
    role: 'Active',
    method: 'Active',
  };

  it.each([0, -1, 65536])('refuses an authority weight of %s', (weight) => {
    expect(
      valid('addAccountAuthority' as never, { ...authorityRequest, weight }),
    ).toBe(false);
  });

  it('accepts a normal authority weight', () => {
    expect(
      valid('addAccountAuthority' as never, { ...authorityRequest, weight: 1 }),
    ).toBe(true);
  });

  it.each([10001, -10001, 0.5])('refuses a vote strength of %s', (weight) => {
    expect(
      valid('vote' as never, {
        username: 'alice',
        author: 'bob',
        permlink: 'p',
        weight,
      }),
    ).toBe(false);
  });

  describe('reward settings on a post', () => {
    const post = {
      username: 'alice',
      permlink: 'my-post',
      title: 'Title',
      body: 'Body',
      parent_perm: 'art',
      json_metadata: '{}',
    };
    const options = (change: object = {}) =>
      JSON.stringify({ author: 'alice', permlink: 'my-post', ...change });

    it('accepts none', () => {
      expect(valid('post' as never, { ...post, comment_options: '' })).toBe(true);
    });
    it('accepts ones about this post', () => {
      expect(
        valid('post' as never, { ...post, comment_options: options() }),
      ).toBe(true);
    });
    it.each([
      ['another author', options({ author: 'mallory' })],
      ['another post', options({ permlink: 'other' })],
      ['anything unreadable', 'not json'],
      ['nothing useful', 'null'],
    ])('refuses %s', (_, comment_options) => {
      expect(valid('post' as never, { ...post, comment_options })).toBe(false);
    });
    it('shows who else gets paid', () => {
      (globalThis as any).chrome.i18n.getMessage = jest.fn(
        (key: string, values?: string[]) => [key, ...(values ?? [])].join(' '),
      );
      const read = readCommentOptions(
        options({
          max_accepted_payout: '1000000.000 PXS',
          percent_pxs: 10000,
          allow_votes: true,
          allow_curation_rewards: true,
          extensions: [
            [0, { beneficiaries: [{ account: 'mallory', weight: 10000 }] }],
          ],
        }),
        'alice',
        'my-post',
      );
      const [summary] = describeOperations(
        [['comment_options', read]],
        'alice',
      );
      expect(summary.understood).toBe(true);
      expect(JSON.stringify(summary.rows)).toContain('mallory');
    });
  });
});

describe('saved approvals', () => {
  const vote = ['vote', { voter: 'alice', author: 'bob', permlink: 'p', weight: 100 }];
  const follow = [
    'custom_json',
    {
      id: 'follow',
      required_auths: [],
      required_posting_auths: ['alice'],
      json: JSON.stringify(['follow', { follower: 'alice', following: 'bob', what: ['blog'] }]),
    },
  ];
  const unreadable = [
    'custom_json',
    {
      id: 'rc',
      required_auths: [],
      required_posting_auths: ['alice'],
      json: '[]',
    },
  ];
  const rewards = [
    'comment_options',
    {
      author: 'alice',
      permlink: 'p',
      max_accepted_payout: '1000000.000 PXS',
      percent_pxs: 10000,
      allow_votes: true,
      allow_curation_rewards: true,
      extensions: [[0, { beneficiaries: [{ account: 'mallory', weight: 10000 }] }]],
    },
  ];
  const signTx = (operations: unknown[], method = 'Posting') =>
    ({
      type: KeychainRequestTypes.signTx,
      username: 'alice',
      method,
      tx: { operations },
    }) as never;
  const broadcast = (operations: unknown[], method = 'Posting') =>
    ({
      type: KeychainRequestTypes.broadcast,
      username: 'alice',
      method,
      operations,
    }) as never;
  const rpc = { uri: 'https://node.test', testnet: false };
  const saved = (approval: string) =>
    ({ alice: { 'site.test': { [approval]: true } } }) as never;

  beforeEach(() => {
    (globalThis as any).chrome.i18n.getMessage = jest.fn(
      (key: string, values?: string[]) => [key, ...(values ?? [])].join(' '),
    );
  });

  it('covers only the kinds of operation that were approved', () => {
    const approval = approvalFor(signTx([vote]))!;
    expect(approval).toBe('signTx:vote');
    expect(isWhitelisted(saved(approval), signTx([vote]), 'site.test', rpc)).toBe(true);
    expect(isWhitelisted(saved(approval), signTx([follow]), 'site.test', rpc)).toBe(false);
    expect(isWhitelisted(saved(approval), signTx([vote, follow]), 'site.test', rpc)).toBe(false);
    expect(isWhitelisted(saved(approval), broadcast([vote]), 'site.test', rpc)).toBe(false);
  });

  it.each([
    ['an unreadable transaction', signTx([unreadable])],
    ['an unreadable broadcast', broadcast([unreadable])],
    ['a share of a post rewards', signTx([rewards])],
    ['the active key', signTx([vote], 'Active')],
    ['the memo key', signTx([vote], 'Memo')],
  ])('never covers %s', (_, request) => {
    expect(approvalFor(request)).toBeNull();
  });

  it('ignores an approval saved for every transaction', () => {
    expect(isWhitelisted(saved('signTx'), signTx([vote]), 'site.test', rpc)).toBe(false);
    expect(isWhitelisted(saved('broadcast'), broadcast([unreadable]), 'site.test', rpc)).toBe(false);
  });

  it.each(['decode', 'encode', 'encodeWithKeys', 'signBuffer'])(
    'keeps %s with the memo key out of an approval for the posting key',
    (type) => {
      const request = (method: string) =>
        ({ type, username: 'alice', method }) as never;
      expect(approvalFor(request('Posting'))).toBe(type);
      expect(approvalFor(request('Memo'))).toBeNull();
      expect(approvalFor(request('Active'))).toBeNull();
      expect(
        isWhitelisted(saved(type), request('Memo'), 'site.test', rpc),
      ).toBe(false);
    },
  );

  it('keeps one custom_json apart from another', () => {
    const custom = (id: string) =>
      ({
        type: KeychainRequestTypes.custom,
        username: 'alice',
        method: 'Posting',
        id,
      }) as never;
    expect(approvalFor(custom('follow'))).toBe('custom:follow');
    expect(isWhitelisted(saved('custom:follow'), custom('rc'), 'site.test', rpc)).toBe(false);
  });

  it('says in the settings what an approval covers', () => {
    expect(approvalLabel('signTx:comment+vote')).toBe('popup_sign_tx: comment, vote');
    expect(approvalLabel('vote')).toBe('popup_vote');
  });
});
