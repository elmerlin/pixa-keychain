import { readFileSync } from 'fs';
import fixture from 'src/__tests__/chain/serializer.fixture.json';
import {
  describeOperations,
  OperationSummary,
  understandsAll,
} from 'src/dialog/utils/operation-summary.utils';

const messages: Record<string, { message: string }> = JSON.parse(
  readFileSync('public/_locales/en/messages.json', 'utf8'),
);

const describeOne = (operation: unknown, signer = 'alice', toPower?: (vests: string) => string) => {
  const summaries = describeOperations([operation], signer, toPower);
  expect(summaries).toHaveLength(1);
  return summaries[0];
};
const value = (summary: OperationSummary, label: string) =>
  summary.rows.find((row) => row.label === label)?.value;
const expectNotUnderstood = (summary: OperationSummary) => {
  expect(summary.understood).toBe(false);
  expect(summary.title).toBe("Can't describe this action");
  expect(summary.warning).toContain("can't tell what this does");
};

describe('describing what gets signed', () => {
  beforeEach(() => {
    chrome.i18n.getMessage = jest.fn((key: string, substitutions?: string[]) =>
      (substitutions ?? []).reduce(
        (text, substitution, index) =>
          text.split(`$${index + 1}`).join(substitution),
        messages[key]?.message ?? `missing message: ${key}`,
      ),
    ) as never;
  });

  describe('social actions', () => {
    it.each([
      [7500, 'Like at 75%'],
      [100, 'Like at 1%'],
      [-2500, 'Downvote at 25%'],
      [0, 'Take back your vote'],
    ])('a vote of %d', (weight, title) => {
      const summary = describeOne([
        'vote',
        { voter: 'alice', author: 'bobby', permlink: 'a-post', weight },
      ]);
      expect(summary.title).toBe(title);
      expect(value(summary, 'Post')).toBe('@bobby/a-post');
      expect(summary.understood).toBe(true);
    });

    it('a follow, a mute and an unfollow', () => {
      const follow = (what: string[]) => [
        'custom_json',
        {
          required_auths: [],
          required_posting_auths: ['alice'],
          id: 'follow',
          json: JSON.stringify([
            'follow',
            { follower: 'alice', following: 'bobby', what },
          ]),
        },
      ];
      expect(describeOne(follow(['blog'])).title).toBe('Follow @bobby');
      expect(describeOne(follow(['ignore'])).title).toBe('Mute @bobby');
      expect(describeOne(follow([])).title).toBe(
        'Stop following or muting @bobby',
      );
    });

    it('never says follow when the json follows on behalf of someone else', () => {
      expectNotUnderstood(
        describeOne([
          'custom_json',
          {
            required_auths: [],
            required_posting_auths: ['alice'],
            id: 'follow',
            json: JSON.stringify([
              'follow',
              { follower: 'mallory', following: 'bobby', what: ['blog'] },
            ]),
          },
        ]),
      );
    });

    it('a portal action', () => {
      const summary = describeOne([
        'custom_json',
        {
          required_auths: [],
          required_posting_auths: ['alice'],
          id: 'community',
          json: JSON.stringify([
            'setRole',
            { community: 'portal-169096', account: 'bobby', role: 'mod' },
          ]),
        },
      ]);
      expect(summary.title).toBe("Set someone's role in a portal");
      expect(value(summary, 'Portal')).toBe('portal-169096');
      expect(value(summary, 'Account')).toBe('@bobby');
      expect(value(summary, 'Role')).toBe('mod');
    });

    it.each([
      ['an unknown custom json', 'some-game', '{"move":"north"}'],
      ['json that does not parse', 'follow', '{nope'],
      ['an unknown follow action', 'follow', '["block",{}]'],
      ['an unknown portal action', 'community', '["burn",{"community":"portal-1"}]'],
    ])('%s is not understood', (_, id, json) => {
      expectNotUnderstood(
        describeOne([
          'custom_json',
          { required_auths: [], required_posting_auths: ['alice'], id, json },
        ]),
      );
    });

    it('a custom json signed by several accounts is not understood', () => {
      expectNotUnderstood(
        describeOne([
          'custom_json',
          {
            required_auths: ['alice'],
            required_posting_auths: ['bobby'],
            id: 'follow',
            json: '["follow",{"follower":"alice","following":"bobby","what":[]}]',
          },
        ]),
      );
    });
  });

  describe('posts', () => {
    const comment = (changes = {}) => [
      'comment',
      {
        parent_author: '',
        parent_permlink: 'art',
        author: 'alice',
        permlink: 'my-post',
        title: 'My post',
        body: 'Hello',
        json_metadata: '{}',
        ...changes,
      },
    ];

    it('a post says its title, text and address', () => {
      const summary = describeOne(comment());
      expect(summary.title).toBe('Publish a post');
      expect(value(summary, 'Title')).toBe('My post');
      expect(value(summary, 'Text')).toBe('Hello');
      expect(value(summary, 'Address')).toBe('my-post');
    });

    it('a reply says what it replies to', () => {
      const summary = describeOne(
        comment({ parent_author: 'bobby', parent_permlink: 'their-post', title: '' }),
      );
      expect(summary.title).toBe('Publish a reply');
      expect(value(summary, 'Reply to')).toBe('@bobby/their-post');
      expect(value(summary, 'Title')).toBeUndefined();
    });

    it('a post in a portal names the portal', () => {
      expect(
        value(describeOne(comment({ parent_permlink: 'portal-169096' })), 'Portal'),
      ).toBe('portal-169096');
    });

    it('a large art post shows no base64', () => {
      const picture = `data:image/webp;base64,${'QUJD'.repeat(30000)}`;
      const summary = describeOne(comment({ body: picture }));
      expect(value(summary, 'Text')).toBe('[picture]');
      expect(JSON.stringify(summary).length).toBeLessThan(600);
    });

    it('long text is cut, and the raw transaction still has it', () => {
      const text = value(describeOne(comment({ body: 'word '.repeat(5000) })), 'Text')!;
      expect(text.length).toBeLessThan(300);
      expect(text.endsWith('…')).toBe(true);
    });

    it('rewards name every beneficiary with their share', () => {
      const summary = describeOne([
        'comment_options',
        {
          author: 'alice',
          permlink: 'my-post',
          max_accepted_payout: '1000000.000 PXS',
          percent_pxs: 10000,
          allow_votes: true,
          allow_curation_rewards: true,
          extensions: [
            [
              0,
              {
                beneficiaries: [
                  { account: 'mallory', weight: 9000 },
                  { account: 'pixtopia', weight: 500 },
                ],
              },
            ],
          ],
        },
      ]);
      const shares = summary.rows
        .filter((row) => row.label === 'Rewards share')
        .map((row) => row.value);
      expect(shares).toEqual(['90% to @mallory', '5% to @pixtopia']);
      // The defaults aren't worth a row each.
      expect(summary.rows).toHaveLength(3);
    });

    it('rewards say when they differ from the defaults', () => {
      const summary = describeOne([
        'comment_options',
        {
          author: 'alice',
          permlink: 'my-post',
          max_accepted_payout: '0.000 PXS',
          percent_pxs: 0,
          allow_votes: false,
          allow_curation_rewards: false,
          extensions: [],
        },
      ]);
      expect(value(summary, 'Max payout')).toBe('Declined');
      expect(value(summary, 'PXS share')).toBe('0%');
      expect(value(summary, 'Likes')).toBe('Off');
      expect(value(summary, 'Curation rewards')).toBe('Off');
    });

    it('an unknown rewards extension is not understood', () => {
      expectNotUnderstood(
        describeOne([
          'comment_options',
          {
            author: 'alice',
            permlink: 'my-post',
            max_accepted_payout: '1000000.000 PXS',
            percent_pxs: 10000,
            allow_votes: true,
            allow_curation_rewards: true,
            extensions: [[1, { something: 'else' }]],
          },
        ]),
      );
    });
  });

  describe('money', () => {
    it('a transfer shows the exact amount, recipient and memo', () => {
      const summary = describeOne([
        'transfer',
        { from: 'alice', to: 'bobby', amount: '1.500 PIXA', memo: 'For art' },
      ]);
      expect(summary.title).toBe('Send 1.500 PIXA');
      expect(value(summary, 'To')).toBe('@bobby');
      expect(value(summary, 'Memo')).toBe('For art');
    });

    it('a transfer in VESTS, which Pixa allows, is understood', () => {
      expect(
        describeOne([
          'transfer',
          { from: 'alice', to: 'bobby', amount: '1.500000 VESTS', memo: '' },
        ]).title,
      ).toBe('Send 1.500000 VESTS');
    });

    it.each([
      ['Hive’s currency', { amount: '1.000 HIVE' }],
      ['an amount in another format', { amount: { amount: '1000', nai: '@@000000021', precision: 3 } }],
      ['the wrong precision', { amount: '1.5 PIXA' }],
      ['a recipient that is not an account name', { to: 'Bobby Tables' }],
      ['a missing recipient', { to: undefined }],
      ['a memo that is not text', { memo: 42 }],
    ])('a transfer with %s is not understood', (_, changes) => {
      expectNotUnderstood(
        describeOne([
          'transfer',
          { from: 'alice', to: 'bobby', amount: '1.000 PIXA', memo: '', ...changes },
        ]),
      );
    });

    it('power up says when it goes to someone else', () => {
      const own = describeOne([
        'transfer_to_vesting',
        { from: 'alice', to: '', amount: '5.000 PIXA' },
      ]);
      expect(own.title).toBe('Power up 5.000 PIXA');
      expect(value(own, 'To')).toBeUndefined();
      expect(
        value(
          describeOne([
            'transfer_to_vesting',
            { from: 'alice', to: 'mallory', amount: '5.000 PIXA' },
          ]),
          'To',
        ),
      ).toBe('@mallory');
    });

    it('stake shows the exact VESTS, and its Pixa Power when known', () => {
      const operation = [
        'delegate_vesting_shares',
        { delegator: 'alice', delegatee: 'bobby', vesting_shares: '2000.000000 VESTS' },
      ];
      const without = describeOne(operation);
      expect(without.title).toBe('Delegate Pixa Power');
      expect(value(without, 'Amount')).toBe('2000.000000 VESTS');
      expect(value(without, 'To')).toBe('@bobby');
      expect(value(describeOne(operation, 'alice', () => '1.000 PP'), 'Amount')).toBe(
        '2000.000000 VESTS (≈ 1.000 PP)',
      );
    });

    it('zero stake means stopping', () => {
      expect(
        describeOne([
          'withdraw_vesting',
          { account: 'alice', vesting_shares: '0.000000 VESTS' },
        ]).title,
      ).toBe('Stop powering down');
      expect(
        describeOne([
          'delegate_vesting_shares',
          { delegator: 'alice', delegatee: 'bobby', vesting_shares: '0.000000 VESTS' },
        ]).title,
      ).toBe('Take back a delegation');
    });

    it('savings say when the money goes to someone else', () => {
      const out = describeOne([
        'transfer_from_savings',
        { from: 'alice', to: 'mallory', amount: '3.000 PXS', memo: '', request_id: 7 },
      ]);
      expect(out.title).toBe('Withdraw 3.000 PXS from savings');
      expect(value(out, 'To')).toBe('@mallory');
      const own = describeOne([
        'transfer_to_savings',
        { from: 'alice', to: 'alice', amount: '3.000 PXS', memo: '' },
      ]);
      expect(own.title).toBe('Move 3.000 PXS to savings');
      expect(value(own, 'To')).toBeUndefined();
    });

    it('routing power downs elsewhere comes with a warning', () => {
      const summary = describeOne([
        'set_withdraw_vesting_route',
        { from_account: 'alice', to_account: 'mallory', percent: 10000, auto_vest: false },
      ]);
      expect(summary.title).toBe('Send your power downs to someone else');
      expect(value(summary, 'Share')).toBe('100%');
      expect(summary.warning).toBeTruthy();
    });
  });

  describe('governance and control', () => {
    it('witness and proposal votes', () => {
      expect(
        describeOne([
          'account_witness_vote',
          { account: 'alice', witness: 'bobby', approve: true },
        ]).title,
      ).toBe('Vote for witness @bobby');
      expect(
        describeOne([
          'account_witness_vote',
          { account: 'alice', witness: 'bobby', approve: false },
        ]).title,
      ).toBe('Take back your vote for witness @bobby');
      expect(
        describeOne([
          'update_proposal_votes',
          { voter: 'alice', proposal_ids: [3, 9], approve: true, extensions: [] },
        ]).title,
      ).toBe('Support proposal 3, 9');
    });

    it('a proxy says who can vote for you', () => {
      expect(
        describeOne(['account_witness_proxy', { account: 'alice', proxy: 'bobby' }]).title,
      ).toBe('Let @bobby vote for you on witnesses and proposals');
      expect(
        describeOne(['account_witness_proxy', { account: 'alice', proxy: '' }]).title,
      ).toBe('Stop using a voting proxy');
    });

    const key = `PIX${'7'.repeat(50)}`;
    const authority = {
      weight_threshold: 1,
      account_auths: [['mallory', 1]],
      key_auths: [[key, 1]],
    };

    it('changing who controls the account names them and warns', () => {
      const summary = describeOne([
        'account_update',
        { account: 'alice', active: authority, memo_key: key, json_metadata: '' },
      ]);
      expect(summary.title).toBe('Change who controls this account');
      expect(summary.warning).toContain('can act as this account');
      expect(value(summary, 'Active')).toBe(
        `Needs a weight of 1 from: @mallory (1), ${key} (1)`,
      );
      expect(value(summary, 'Memo key')).toBe(key);
    });

    it('a profile update has no warning', () => {
      const summary = describeOne([
        'account_update2',
        { account: 'alice', json_metadata: '', posting_json_metadata: '{}', extensions: [] },
      ]);
      expect(summary.title).toBe('Update your profile');
      expect(summary.warning).toBeUndefined();
    });

    it('a malformed authority change is not understood, and doesn’t read as a profile update', () => {
      expectNotUnderstood(
        describeOne([
          'account_update2',
          { account: 'alice', posting: { weight_threshold: 1 }, json_metadata: '', extensions: [] },
        ]),
      );
    });
  });

  describe('what a site can try', () => {
    it('says when the operation acts for another account', () => {
      const summary = describeOne(
        ['transfer', { from: 'portal-1234', to: 'bobby', amount: '1.000 PIXA', memo: '' }],
        'alice',
      );
      expect(value(summary, 'As')).toBe('@portal-1234');
      expect(summary.rows[0].label).toBe('As');
      expect(
        value(
          describeOne(['transfer', { from: 'alice', to: 'bobby', amount: '1.000 PIXA', memo: '' }]),
          'As',
        ),
      ).toBeUndefined();
    });

    it('strips invisible and direction-changing characters from what a site wrote', () => {
      const summary = describeOne([
        'transfer',
        {
          from: 'alice',
          to: 'bobby',
          amount: '1.000 PIXA',
          memo: 'safe‮reversed​\nnext\u0000line',
        },
      ]);
      expect(value(summary, 'Memo')).toBe('safe reversed next line');
    });

    it('what a site wrote never reaches the title', () => {
      const summary = describeOne([
        'comment',
        {
          parent_author: '',
          parent_permlink: 'art',
          author: 'alice',
          permlink: 'p',
          title: 'Send 0.001 PIXA to @alice',
          body: 'Nothing to see',
          json_metadata: '{}',
        },
      ]);
      expect(summary.title).toBe('Publish a post');
    });

    it.each([
      ['an operation nobody knows', ['send_everything', { to: 'mallory' }], 'send_everything'],
      ['an object’s built-in name', ['constructor', {}], 'constructor'],
      ['a name with odd characters', ['Like at 1%', {}], undefined],
      ['the object form', { type: 'transfer_operation', value: {} }, undefined],
      ['no payload', ['transfer'], 'transfer'],
      ['a payload that is a list', ['transfer', []], 'transfer'],
      ['nothing at all', null, undefined],
    ])('%s is not understood', (_, operation, type) => {
      const summary = describeOne(operation);
      expectNotUnderstood(summary);
      expect(value(summary, 'Type')).toBe(type);
    });

    it.each([[undefined], [null], [[]], ['transfer'], [{}]])(
      'operations of %j are not understood',
      (operations) => {
        expect(understandsAll(operations, 'alice')).toBe(false);
        expectNotUnderstood(describeOperations(operations, 'alice')[0]);
      },
    );

    it('one unreadable operation among good ones is still reported, in order', () => {
      const good = ['vote', { voter: 'alice', author: 'bobby', permlink: 'p', weight: 100 }];
      const summaries = describeOperations([good, ['mystery', {}], good], 'alice');
      expect(summaries.map((summary) => summary.understood)).toEqual([true, false, true]);
      expect(understandsAll([good, ['mystery', {}]], 'alice')).toBe(false);
      expect(understandsAll([good, good], 'alice')).toBe(true);
    });
  });

  // Real shapes, checked byte for byte against the node by `npm run check:chain`.
  describe('every operation the wallet can serialize', () => {
    const NOT_DESCRIBED = [
      'change_recovery_account',
      'custom',
      'custom_binary',
      'decline_voting_rights',
      'escrow_approve',
      'escrow_dispute',
      'escrow_release',
      'escrow_transfer',
      'limit_order_create2',
      'pow',
      'pow2',
      'recover_account',
      'request_account_recovery',
      'reset_account',
      'set_reset_account',
      'witness_set_properties',
    ];
    const operations = Object.values(fixture).map(
      ({ operation }) => operation as unknown as [string, unknown],
    );

    it('covers every operation in the fixture', () => {
      expect(operations.length).toBeGreaterThan(40);
    });

    it.each(operations.map((operation) => [operation[0], operation] as const))(
      '%s',
      (name, operation) => {
        const summary = describeOne(operation, 'somebody-else');
        expect(summary.title).not.toContain('missing message');
        expect(JSON.stringify(summary)).not.toContain('missing message');
        if (NOT_DESCRIBED.includes(name)) expectNotUnderstood(summary);
        else if (name !== 'custom_json') expect(summary.understood).toBe(true);
      },
    );
  });

  it('every message used is in the English file, and none is unused', () => {
    const source = readFileSync(
      'src/dialog/utils/operation-summary.utils.ts',
      'utf8',
    );
    const used = new Set(source.match(/dialog_op_[a-z_]+/g));
    const component = readFileSync(
      'src/dialog/components/operation-summary/operation-summary.tsx',
      'utf8',
    );
    (component.match(/dialog_op_[a-z_]+/g) ?? []).forEach((key) => used.add(key));
    used.forEach((key) => expect(messages[key]).toBeDefined());
    Object.keys(messages)
      .filter((key) => key.startsWith('dialog_op_'))
      .forEach((key) => expect(used.has(key)).toBe(true));
  });
});
