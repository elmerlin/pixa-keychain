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

    it.each([['constructor'], ['toString'], ['__proto__']])(
      'a portal action named %s, an object’s built-in name, is not understood',
      (action) => {
        expectNotUnderstood(
          describeOne([
            'custom_json',
            {
              required_auths: [],
              required_posting_auths: ['alice'],
              id: 'community',
              json: JSON.stringify([
                action,
                { community: 'portal-1', account: 'bobby', permlink: 'p' },
              ]),
            },
          ]),
        );
      },
    );

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

  // As Pixtopia sends them: `gameOperation` in its `src/lib/game/moves.ts`, actions from its Pixholm screens.
  describe('Pixholm moves', () => {
    const move = (
      actions: unknown,
      changes: Record<string, unknown> = {},
      json = JSON.stringify({ v: 1, do: actions }),
    ) => [
      'custom_json',
      {
        required_auths: [],
        required_posting_auths: ['alice'],
        id: 'pixtopia.game',
        json,
        ...changes,
      },
    ];

    it('founding an island says so, and names the game', () => {
      const summary = describeOne(move([['found', {}]]));
      expect(summary.understood).toBe(true);
      expect(summary.title).toBe('Found your island');
      expect(value(summary, 'Game')).toBe('Pixholm');
      expect(summary.warning).toBeUndefined();
      expect(summary.actor).toBe('alice');
      expect(understandsAll([move([['found', {}]])], 'alice')).toBe(true);
    });

    it.each([
      [['found', { look: 2 }], 'Found your island'],
      [['build', { kind: 'lantern', x: 4, y: 7 }], 'Build a lantern'],
      [['build', { kind: 'flower', x: 0, y: 13 }], 'Plant a flower bed'],
      [['build', { kind: 'hut', x: 5, y: 5 }], "Build a builder's hut"],
      [['build', { kind: 'pavilion', x: 9, y: 2 }], 'Build a pavilion'],
      [['upgrade', { id: 0 }], 'Upgrade something on your island'],
      [['cancel', { id: 4 }], 'Stop work on your island'],
      [['remove', { id: 4 }], 'Remove something from your island'],
      [['move', { id: 4, x: 3, y: 8 }], 'Move something on your island'],
      [['hurry', { id: 4, hourglasses: 1 }], 'Use an hourglass'],
      [['hurry', { id: 4, hourglasses: 3 }], 'Use 3 hourglasses'],
      [['hurry', { id: 4, minutes: 1 }], 'Use a minute of sand'],
      [['hurry', { id: 4, minutes: 60001 }], 'Use 60,001 minutes of sand'],
      [['hurry', { id: 4, minutes: 1250 }], 'Use 1,250 minutes of sand'],
      [['build', { kind: 'lantern', x: 4, y: 7, facing: 'ne' }], 'Build a lantern'],
      [['turn', { id: 4, facing: 'sw' }], 'Turn something on your island'],
      [['name', { name: '' }], "Take your island's name off"],
      [['look', { slot: 'roofs', id: 'roofs-red' }], 'Change how your island looks'],
      [['look', { slot: 'garage', id: '' }], 'Change how your island looks'],
      [['sprite.rest', { id: 9, rest: 1 }], 'Rest a sprite'],
      [['sprite.rest', { id: 9, rest: 0 }], 'Bring a sprite back from rest'],
      [['sprite.swap', { a: 9, b: 12 }], 'Have two sprites trade crafts'],
      [['sprite.kind', { id: 9, kind: 'fox' }], 'Change what kind a sprite is'],
      [['sprite.kind', { id: 9, kind: '' }], 'Change what kind a sprite is'],
      [['research', { topic: 'roots' }], 'Study Deep roots'],
      [['scout', { target: 0 }], 'Send a paper crane to scout Driftwood Camp'],
      [['recall', { trip: 2 }], 'Call raiders home'],
      [['crew.invite', { account: 'bobby' }], 'Invite @bobby to your crew'],
      [['crew.leave', {}], 'Leave your crew'],
      [['crew.remove', { account: 'bobby' }], 'Remove @bobby from your crew'],
      [['crew.hand', { account: 'bobby' }], "Make @bobby your crew's founder"],
      [['crew.give', { glow: 12500 }], "Pour 12,500 glow into your crew's lighthouse"],
      [['crew.banner', { colour: 7, mark: 0 }], "Change your crew's banner"],
      [['crew.name', { name: 'Storm Petrels' }], "Change your crew's name"],
      [['front', { floor: 7, glider: 12, from: 'nw', waves: { glider: 1 }, pick: 'old' }], 'Send a raid to the Storm Front, floor 7'],
      [['front', { floor: 20, kite: 4 }], 'Send a raid to the Storm Front, floor 20'],
      [['front.buy', { item: 'trails-storm' }], 'Buy something with sky shards'],
      [['look', { slot: 'sails', id: 'sails-storm' }], 'Change how your island looks'],
      [['emblem', { field: 1, pattern: 0, second: 2, mark: 46, ink: 3, coats: 0 }], 'Change your emblem'],
      [['emblem', { field: 2, pattern: 3, second: 9, mark: 19, ink: 9, coats: 1 }], 'Change your emblem'],
      [['emblem', { field: 11, pattern: 5, second: 0, mark: 29, ink: 11, coats: 0 }], 'Change your emblem'],
      [['sprite.name', { id: 9, name: '' }], 'Give a sprite back its own name'],
      [['fight', { trip: 3, home: 1 }], 'Call your raiders home from the fight'],
      [['fight', { trip: 3, plan: 1 }], 'Fight by your plan'],
      [['move', { id: 4, x: 0, y: 5, garden: 1 }], 'Move something to your sky garden'],
      [['look', { slot: 'houses', id: 'houses-fox' }], 'Change how your island looks'],
      [['look', { slot: 'houses', id: '' }], 'Change how your island looks'],
      [['look', { slot: 'houses', id: 'houses-owl', thing: 12 }], 'Change how one thing on your island looks'],
      [['look', { slot: 'roofs', id: 'roofs-red', thing: 12 }], 'Change how one thing on your island looks'],
      [['look', { slot: 'roofs', id: 'plain', thing: 12 }], 'Change how one thing on your island looks'],
      [['look', { slot: 'crystal', id: '', thing: 1 }], 'Change how one thing on your island looks'],
      [['quest', { friend: '' }], 'Drop your friend quest'],
      [['fish', {}], 'Cast a fishing line'],
      [['find', { n: 0 }], 'Pick up a lost thing'],
      [['find', { n: 2 }], 'Pick up a lost thing'],
      [['water', { account: 'bobby' }], "Water @bobby's flowers"],
      [['chart', {}], "Chart the night's stars"],
      [['cloud', { pick: 2 }], 'Open a lucky cloud'],
      [['seed.catch', {}], 'Catch a sky seed'],
      [['plant.remove', { id: 40 }], 'Pull up a plant'],
      [['plant.pick', { id: 40 }], 'Pick a grown plant'],
      [['renown.buy', { item: 'garden' }], 'Grow your sky garden with Renown'],
    ])('%j', (action, title) => {
      const summary = describeOne(move([action]));
      expect(summary.understood).toBe(true);
      expect(summary.title).toBe(title);
    });

    it('training says who and how many', () => {
      const summary = describeOne(
        move([['train', { dock: 12, kind: 'kite', count: 3 }]]),
      );
      expect(summary.title).toBe('Train raiders');
      expect(value(summary, 'Kites')).toBe('3');
    });

    it('a raid on a camp or a person says where and who goes', () => {
      const camp = describeOne(
        move([
          [
            'raid',
            { target: 4, kite: 3, balloon: 1, from: 'nw', waves: { kite: 1, balloon: 2 } },
          ],
        ]),
      );
      expect(camp.title).toBe('Send a raid on Pirate Keep');
      expect(value(camp, 'Kites')).toBe('3');
      expect(value(camp, 'Balloons')).toBe('1');
      expect(camp.rows.map((row) => row.label)).toEqual(['Game', 'Kites', 'Balloons']);
      expect(
        describeOne(move([['raid', { target: 'bobby', glider: 2 }]])).title,
      ).toBe('Send a raid on @bobby');
      const help = describeOne(
        move([['help', { target: 'bobby', airship: 1, mender: 2 }]]),
      );
      expect(help.title).toBe('Send raiders to help @bobby');
      expect(value(help, 'Airships')).toBe('1');
      expect(value(help, 'Menders')).toBe('2');
    });

    // As the war table sends them: who goes, the plan, which crews, and for the crew's great beast `great`.
    it('a hunt says which beasts and who goes', () => {
      const sky = describeOne(
        move([
          [
            'hunt',
            { kite: 11, glider: 3, from: 'se', waves: { kite: 1, glider: 2 }, pick: 'new' },
          ],
        ]),
      );
      expect(sky.understood).toBe(true);
      expect(sky.title).toBe('Hunt the beasts in your sky');
      expect(sky.rows.map((row) => row.label)).toEqual(['Game', 'Kites', 'Gliders', 'Crews']);
      expect(value(sky, 'Crews')).toBe('Least experienced first');
      expect(value(sky, 'Kites')).toBe('11');
      const great = describeOne(move([['hunt', { airship: 2, great: 1 }]]));
      expect(great.title).toBe("Hunt your crew's great beast");
      expect(value(great, 'Airships')).toBe('2');
      // A raid's crews can be picked the same way.
      expect(describeOne(move([['raid', { target: 1, kite: 2, pick: 'old' }]])).understood).toBe(true);
    });

    // As the fight's screen sends them (Pixtopia's `fight-view.tsx`): craft in, the drops counted by kind.
    it('craft sent into a fight are counted by kind, with any orders to crews of rank', () => {
      const drops = describeOne(
        move([
          [
            'fight',
            {
              trip: 7,
              drops: [
                ['kite', 3, -160, 0],
                ['kite', 2, 32, -160],
                ['balloon', 1, 1792, -1792],
              ],
            },
          ],
        ]),
      );
      expect(drops.title).toBe('Send craft into the fight');
      expect(drops.rows.map((row) => row.label)).toEqual(['Game', 'Kites', 'Balloons']);
      expect(value(drops, 'Kites')).toBe('5');
      const told = describeOne(
        move([['fight', { trip: 7, drops: [['glider', 3, 0, 0]], aim: [['glider', 4]], ace: ['spark'] }]]),
      );
      expect(told.title).toBe('Send craft into the fight');
      expect(value(told, 'Go for it')).toBe('Gliders');
      expect(value(told, 'All out')).toBe('Spark drones');
      const orders = describeOne(
        move([['fight', { trip: 7, aim: [['kite', 0], ['balloon', 255]] }]]),
      );
      expect(orders.title).toBe('Give orders in the fight');
      expect(value(orders, 'Go for it')).toBe('Kites, Balloons');
    });

    // As the place mode sends them (Pixtopia's `pixholm-screen.tsx`): cottages and decor on the sky garden's tiles.
    it('building on the sky garden says where', () => {
      const built = describeOne(move([['build', { kind: 'cottage', x: 5, y: 5, facing: 'ne', garden: 1 }]]));
      expect(built.understood).toBe(true);
      expect(built.title).toBe('Build a cottage');
      expect(value(built, 'Where')).toBe('Your sky garden');
      expect(value(describeOne(move([['build', { kind: 'cottage', x: 5, y: 5 }]])), 'Where')).toBeUndefined();
      const sown = describeOne(move([['seed.plant', { kind: 'glowvine', x: 0, y: 3, garden: 1 }]]));
      expect(sown.title).toBe('Plant a sky seed');
      expect(sown.rows.map((row) => row.label)).toEqual(['Game', 'Seed', 'Where']);
      expect(value(sown, 'Seed')).toBe('Glowvine');
      const onLand = describeOne(move([['seed.plant', { kind: 'moonlily', x: 13, y: 0 }]]));
      expect(onLand.rows.map((row) => row.label)).toEqual(['Game', 'Seed']);
    });

    it.each([
      ['observatory', 'Build an observatory'],
      ['lodge', "Build an explorers' lodge"],
      ['glasshouse', 'Build a glasshouse'],
    ])('names a %s on the land and in the garden', (kind, title) => {
      for (const where of [{}, { garden: 1 }]) {
        const summary = describeOne(move([['build', { kind, x: 2, y: 3, facing: 'ne', ...where }]]));
        expect(summary.title).toBe(title);
        expect(value(summary, 'Where')).toBe('garden' in where ? 'Your sky garden' : undefined);
      }
    });

    it('counts rearranged things, keeping the two grids apart', () => {
      expect(describeOne(move([['arrange', { things: [[4, 5, 5]] }]])).title).toBe('Rearrange one thing on your island');
      expect(describeOne(move([['arrange', { things: [[4, 5, 5], [6, 5, 5, 1]] }]])).title).toBe('Rearrange 2 things on your island');
    });

    it('names the seed planted in a glasshouse pot', () => {
      const sown = describeOne(move([['seed.plant', { kind: 'sunbell', pot: 1 }]]));
      expect(sown.title).toBe('Plant a sky seed in a glasshouse pot');
      expect(value(sown, 'Seed')).toBe('Sunbell');
    });

    it.each([
      ['cancel', {}, 'Stop work on your island'],
      ['hurry', { minutes: 30 }, 'Use 30 minutes of sand'],
      ['hurry', { hourglasses: 1 }, 'Use an hourglass'],
    ])('names the Almanac study for %s', (action, amount, title) => {
      const summary = describeOne(move([[action, { id: 4, topic: 'tailwind', ...amount }]]));
      expect(summary.title).toBe(title);
      expect(value(summary, 'Study')).toBe('Tailwind');
    });

    it.each([
      ['treehouse', 'Treehouse hangar'], ['pirate', 'Pirate dock'], ['cloud', 'Cloud harbour'],
      ['clockwork', 'Clockwork works'], ['crystal', 'Crystal hangar'],
    ])('names the %s garage', (garage, name) => {
      const id = `garage-${garage}`;
      expect(value(describeOne(move([['look', { id, slot: 'garage' }]])), 'Look')).toBe(name);
      const purchase = describeOne(move([['renown.buy', { item: id }]]));
      if (garage === 'crystal') expect(value(purchase, 'Look')).toBe(name);
      else expectNotUnderstood(purchase);
    });

    it.each(['Mistral Shoals', 'Bramble Heights', 'Beacon Wreck', 'Cannon Row', 'Corsair Citadel']
      .map((camp, i) => [camp, 5 + i] as const))('scouts and raids %s', (camp, target) => {
      expect(describeOne(move([['scout', { target, pick: 'old' }]])).title).toBe(`Send a paper crane to scout ${camp}`);
      const raid = describeOne(move([['raid', { target, kite: 2, balloon: 0 }]]));
      expect(raid.title).toBe(`Send a raid on ${camp}`);
      expect(raid.rows.map(({ label }) => label)).toEqual(['Game', 'Kites']);
    });

    it('reads Season 2 emblems and banners and the beasts’ earned marks', () => {
      for (const mark of [30, 33, 34, 45]) {
        expect(describeOne(move([['emblem', { field: 11, pattern: 11, second: 0, mark, ink: 11, coats: 1 }]])).title).toBe('Change your emblem');
      }
      expect(describeOne(move([['crew.banner', { colour: 11, mark: 35 }]])).title).toBe("Change your crew's banner");
      expect(describeOne(move([['help', { target: 'bobby', kite: 1, pick: 'new' }]])).title).toBe('Send raiders to help @bobby');
    });

    it('a friend’s quest names the friend', () => {
      const quest = describeOne(move([['quest', { friend: 'fox' }]]));
      expect(quest.title).toBe("Take a friend's quest");
      expect(value(quest, 'Friend')).toBe('Bracken');
    });

    // As the Today box and the wardrobe send them (`today-box.tsx`, `dressPlan` in Pixtopia's `pixholm/wardrobe.ts`).
    it('what Renown buys is named', () => {
      const wear = describeOne(move([['renown.buy', { item: 'wear-flowers' }]]));
      expect(wear.title).toBe('Buy something for sprites to wear with Renown');
      expect(value(wear, 'Item')).toBe('Flower crown');
      const look = describeOne(move([['renown.buy', { item: 'lanterns-ember' }]]));
      expect(look.title).toBe('Buy a look with Renown');
      expect(value(look, 'Look')).toBe('Ember lantern glow');
    });

    it('dressing a sprite says what each part becomes', () => {
      const dressed = describeOne(
        move([['sprite.dress', { id: 9, coat: 2, head: 'wear-crown', face: '', back: 'wear-wings' }]]),
      );
      expect(dressed.title).toBe('Dress a sprite');
      expect(dressed.rows).toEqual([
        { label: 'Game', value: 'Pixholm' },
        { label: 'Coat', value: 'Mint' },
        { label: 'Head', value: 'Golden crown' },
        { label: 'Face', value: 'Nothing' },
        { label: 'Body', value: 'Fairy wings' },
      ]);
      expect(value(describeOne(move([['sprite.dress', { id: 9, coat: -1 }]])), 'Coat')).toBe('As chance has it');
      expect(value(describeOne(move([['sprite.dress', { id: 9, coat: 14 }]])), 'Coat')).toBe('Brown');
      // Something bought with Renown and worn in the same move, as the wardrobe's Buy & save sends it.
      const bought = describeOne(
        move([
          ['renown.buy', { item: 'wear-cape' }],
          ['sprite.dress', { id: 9, back: 'wear-cape' }],
        ]),
      );
      expect(bought.rows).toEqual([
        { label: 'Move', value: 'Buy something for sprites to wear with Renown' },
        { label: 'Item', value: 'Cape' },
        { label: 'Move', value: 'Dress a sprite' },
        { label: 'Body', value: 'Cape' },
      ]);
    });

    it('a sprite’s name, which a site wrote, is only ever a row', () => {
      const named = describeOne(move([['sprite.name', { id: 9, name: "Mo'lark" }]]));
      expect(named.title).toBe('Name a sprite');
      expect(value(named, 'Name')).toBe("Mo'lark");
    });

    it('an island’s name, which a site wrote, is only ever a row', () => {
      const named = describeOne(move([['name', { name: "Wren's Rest" }]]));
      expect(named.title).toBe('Name your island');
      expect(value(named, 'Name')).toBe("Wren's Rest");
    });

    it('a crew’s name, which a site wrote, is only ever a row', () => {
      const found = describeOne(move([['crew.found', { name: 'Sky Pirates' }]]));
      expect(found.title).toBe('Found a crew');
      expect(value(found, 'Crew')).toBe('Sky Pirates');
      const join = describeOne(move([['crew.join', { crew: "Wren's Lot" }]]));
      expect(join.title).toBe('Join a crew');
      expect(value(join, 'Crew')).toBe("Wren's Lot");
    });

    it('several actions in one move are each listed, in order', () => {
      const summary = describeOne(
        move([
          ['upgrade', { id: 0 }],
          ['hurry', { id: 0, hourglasses: 2 }],
          ['train', { dock: 12, kind: 'crane', count: 1 }],
        ]),
      );
      expect(summary.title).toBe('Make 3 moves in Pixholm');
      expect(summary.rows).toEqual([
        { label: 'Move', value: 'Upgrade something on your island' },
        { label: 'Move', value: 'Use 2 hourglasses' },
        { label: 'Move', value: 'Train raiders' },
        { label: 'Paper cranes', value: '1' },
      ]);
    });

    it('a move made as another account says so', () => {
      const summary = describeOne(
        move([['found', {}]], { required_posting_auths: ['bobby'] }),
        'alice',
      );
      expect(summary.understood).toBe(true);
      expect(value(summary, 'As')).toBe('@bobby');
    });

    it.each([
      ...[
        {}, { things: [] }, { things: Array(401).fill([1, 2, 3]) },
        { things: [[1, 2]] }, { things: [[1, 2, 3, 1, 0]] }, { things: [[1, 2, 3, 0]] },
        { things: [[1.5, 2, 3]] }, { things: [[-1, 2, 3]] }, { things: [[1, 14, 2]] },
        { things: [[1, 1, 6, 1]] }, { things: [[1, 2, 2, true]] }, { things: [[1, 1.5, 2]] },
        { things: [[1, 2, 3], [1, 2, 4]] }, { things: [[1, 2, 3], [2, 2, 3]] },
        { things: [[1, 2, 3]], more: 1 },
      ].map((params) => ['with malformed placings', move([['arrange', params]])]),
      ...[{ x: 1 }, { y: 2 }, { garden: 1 }, { pot: 0 }, { pot: true }, { kind: 'fern' }]
        .map((extra) => ['with a malformed pot', move([['seed.plant', { kind: 'sunbell', pot: 1, ...extra }]])]),
      ['with a founding look the world would replace', move([['found', { look: 3 }]])],
      ['with a sprite swapping with itself', move([['sprite.swap', { a: 4, b: 4 }]])],
      ['with your own island as the raid target', move([['raid', { target: 'alice', kite: 1 }]])],
      ['with your own island as the help target', move([['help', { target: 'alice', kite: 1 }]])],
      ...['crew.hand', 'crew.invite', 'crew.remove'].map((act) => ['with yourself as a crew mate', move([[act, { account: 'alice' }]])]),
      ['with an unknown cancel topic', move([['cancel', { id: 2, topic: 'alchemy' }]])],
      ['with a malformed hurry topic', move([['hurry', { id: 2, minutes: 1, topic: null }]])],
      ['with unsafe minutes for a study', move([['hurry', { id: 2, topic: 'roots', minutes: Number.MAX_SAFE_INTEGER + 1 }]])],
      ['with no hurry amount for a study', move([['hurry', { id: 2, topic: 'roots' }]])],
      ['with a topic on an upgrade', move([['upgrade', { id: 2, topic: 'roots' }]])],
      ['with an unknown garage in the right slot', move([['look', { slot: 'garage', id: 'garage-moon' }]])],
      ['with an unknown roof in the right slot', move([['look', { slot: 'roofs', id: 'roofs-castle', thing: 2 }]])],
      ['with an unknown banner mark', move([['crew.banner', { colour: 0, mark: 36 }]])],
      ['with an unknown emblem pattern', move([['emblem', { field: 0, pattern: 12, second: 0, mark: 0, ink: 0, coats: 0 }]])],
      ['with an unknown emblem mark', move([['emblem', { field: 0, pattern: 0, second: 0, mark: 47, ink: 0, coats: 0 }]])],
      ['with a fractional emblem mark', move([['emblem', { field: 0, pattern: 0, second: 0, mark: 34.5, ink: 0, coats: 0 }]])],
      ['with an unknown scout pick', move([['scout', { target: 1, pick: 'all' }]])],
      ['with an unknown help pick', move([['help', { target: 'bobby', kite: 2, pick: null }]])],
      ['with an eleventh camp to scout', move([['scout', { target: 10 }]])],
      ['with a negative raider count', move([['raid', { target: 1, kite: 2, crane: -1 }]])],
      ['aiming a mender', move([['fight', { trip: 3, aim: [['mender', 0]] }]])],
      ['sending a crane all out', move([['fight', { trip: 3, ace: ['crane'] }]])],
      ['signed with the active key', move([['found', {}]], { required_auths: ['alice'], required_posting_auths: [] })],
      ['signed with both keys', move([['found', {}]], { required_auths: ['alice'] })],
      ['another version', move(null, {}, '{"v":2,"do":[["found",{}]]}')],
      ['no actions', move([])],
      ['more actions than a move takes', move(Array(11).fill(['recall', { trip: 1 }]))],
      ['something else beside the actions', move(null, {}, '{"v":1,"do":[["found",{}]],"also":1}')],
      ['an action nobody knows', move([['burn', {}]])],
      ['an object’s built-in name', move([['constructor', {}]])],
      ['an action with no params', move([['found']])],
      ['an action with params that are a list', move([['found', []]])],
      ['an action with something extra', move([['found', {}, 'more']])],
      ['params with something extra', move([['upgrade', { id: 1, all: true }]])],
      ['building the Beacon', move([['build', { kind: 'beacon', x: 6, y: 6 }]])],
      ['building something the game has no name for', move([['build', { kind: 'toString', x: 1, y: 1 }]])],
      ['building off the island', move([['build', { kind: 'lantern', x: 14, y: 1 }]])],
      ['a tile that is not a whole number', move([['build', { kind: 'lantern', x: 1.5, y: 1 }]])],
      ['no hourglasses', move([['hurry', { id: 1, hourglasses: 0 }]])],
      ['no minutes', move([['hurry', { id: 1, minutes: 0 }]])],
      ['part of a minute', move([['hurry', { id: 1, minutes: 1.5 }]])],
      ['a hurry in hourglasses and minutes', move([['hurry', { id: 1, hourglasses: 1, minutes: 30 }]])],
      ['a hurry in neither', move([['hurry', { id: 1 }]])],
      ['building facing a way nobody knows', move([['build', { kind: 'lantern', x: 1, y: 1, facing: 'up' }]])],
      ['turning to a way nobody knows', move([['turn', { id: 1, facing: 'north' }]])],
      ['an island name the game refuses', move([['name', { name: 'Send 1 PIXA now' }]])],
      ['an island name that is not text', move([['name', { name: 3 }]])],
      ['a look in a slot nobody knows', move([['look', { slot: 'hats', id: 'hat-red' }]])],
      ['a look id the game never writes', move([['look', { slot: 'roofs', id: 'Roofs Red!' }]])],
      ['resting a sprite some other way', move([['sprite.rest', { id: 1, rest: 2 }]])],
      ['a sprite of a kind nobody knows', move([['sprite.kind', { id: 1, kind: 'dragon' }]])],
      ['training too many', move([['train', { dock: 1, kind: 'kite', count: 51 }]])],
      ['training a kind nobody knows', move([['train', { dock: 1, kind: 'dragon', count: 1 }]])],
      ['studying something nobody knows', move([['research', { topic: 'alchemy' }]])],
      ['a raid with nobody in it', move([['raid', { target: 0 }]])],
      ['a raid with nobody of a kind', move([['raid', { target: 0, kite: 0 }]])],
      ['a raid with a kind nobody knows', move([['raid', { target: 0, dragon: 2 }]])],
      ['a raid on a camp that isn’t there', move([['raid', { target: 10, kite: 1 }]])],
      ['a raid on something that isn’t an account', move([['raid', { target: 'Bob Smith', kite: 1 }]])],
      ['a raid from a side nobody knows', move([['raid', { target: 0, kite: 1, from: 'up' }]])],
      ['a raid in a fourth wave', move([['raid', { target: 0, kite: 1, waves: { kite: 4 } }]])],
      ['help for nobody', move([['help', { kite: 1 }]])],
      ['a crew name the game refuses', move([['crew.found', { name: 'Send 1 PIXA\u202e' }]])],
      ['a crew name that is not text', move([['crew.join', { crew: 7 }]])],
      ['leaving a crew with something extra', move([['crew.leave', { crew: 'Sky' }]])],
      ['no glow', move([['crew.give', { glow: 0 }]])],
      ['a banner that isn’t one', move([['crew.banner', { colour: 12, mark: 0 }]])],
      ['a crew name that isn’t one', move([['crew.name', { name: 'x' }]])],
      ['a crew name with something else beside it', move([['crew.name', { name: 'Storm Petrels', colour: 1 }]])],
      ['a floor of the Front there isn’t', move([['front', { floor: 21, kite: 1 }]])],
      ['the Front with nobody going', move([['front', { floor: 3 }]])],
      ['the Front with something else beside it', move([['front', { floor: 3, kite: 1, target: 2 }]])],
      ['something sky shards don’t buy', move([['front.buy', { item: 'garden' }]])],
      ['a hunt with nobody in it', move([['hunt', {}]])],
      ['a hunt with a kind nobody knows', move([['hunt', { dragon: 2 }]])],
      ['a great hunt some other way', move([['hunt', { kite: 1, great: 2 }]])],
      ['a hunt with crews picked some other way', move([['hunt', { kite: 1, pick: 'best' }]])],
      ['a hunt from a side nobody knows', move([['hunt', { kite: 1, from: 'up' }]])],
      ['an order with nothing in it', move([['fight', { trip: 1 }]])],
      ['an order to no fight', move([['fight', { home: 1 }]])],
      ['an order home some other way', move([['fight', { trip: 1, home: 2 }]])],
      ['home and craft in at once', move([['fight', { trip: 1, home: 1, drops: [['kite', 1, 0, 0]] }]])],
      ['the plan and craft in at once', move([['fight', { trip: 1, plan: 1, drops: [['kite', 1, 0, 0]] }]])],
      ['no drops in a list of drops', move([['fight', { trip: 1, drops: [] }]])],
      ['more drops than an order takes', move([['fight', { trip: 1, drops: Array(17).fill(['kite', 1, 0, 0]) }]])],
      ['a drop of nobody', move([['fight', { trip: 1, drops: [['kite', 0, 0, 0]] }]])],
      ['a drop of a kind nobody knows', move([['fight', { trip: 1, drops: [['dragon', 1, 0, 0]] }]])],
      ['a drop far off the field', move([['fight', { trip: 1, drops: [['kite', 1, 1793, 0]] }]])],
      ['a drop with a part missing', move([['fight', { trip: 1, drops: [['kite', 1, 0]] }]])],
      ['a kind told twice what to go for', move([['fight', { trip: 1, aim: [['kite', 1], ['kite', 2]] }]])],
      ['a foe the field has no place for', move([['fight', { trip: 1, aim: [['kite', 256]] }]])],
      ['all out for a kind nobody knows', move([['fight', { trip: 1, ace: ['dragon'] }]])],
      ['an order with something extra', move([['fight', { trip: 1, plan: 1, all: true }]])],
      ['an emblem missing a part', move([['emblem', { field: 2, pattern: 3, second: 9, mark: 19, ink: 9 }]])],
      ['an emblem colour nobody has', move([['emblem', { field: 12, pattern: 3, second: 9, mark: 19, ink: 9, coats: 1 }]])],
      ['a sprite name the game refuses', move([['sprite.name', { id: 1, name: 'Send 1 PIXA now' }]])],
      ['a sprite name that is not text', move([['sprite.name', { id: 1, name: 3 }]])],
      ['building on the sky garden what only stands on the land', move([['build', { kind: 'flower', x: 0, y: 0, garden: 1 }]])],
      ['a builder’s hut on the sky garden', move([['build', { kind: 'hut', x: 0, y: 0, garden: 1 }]])],
      ['building off the sky garden', move([['build', { kind: 'bench', x: 6, y: 0, garden: 1 }]])],
      ['the sky garden asked some other way', move([['build', { kind: 'bench', x: 0, y: 0, garden: true }]])],
      ['the sky garden asked with a 0', move([['build', { kind: 'bench', x: 0, y: 0, garden: 0 }]])],
      ['moving off the sky garden', move([['move', { id: 4, x: 0, y: 6, garden: 1 }]])],
      ['moving to the sky garden some other way', move([['move', { id: 4, x: 0, y: 0, garden: 2 }]])],
      ['a look one thing can’t wear', move([['look', { slot: 'ground', id: 'ground-autumn', thing: 4 }]])],
      ['a look of another slot on one thing', move([['look', { slot: 'roofs', id: 'houses-fox', thing: 4 }]])],
      ['a look of another slot', move([['look', { slot: 'roofs', id: 'flowers-rose' }]])],
      ['plain for the whole island', move([['look', { slot: 'roofs', id: 'plain' }]])],
      ['one thing that is not a number', move([['look', { slot: 'roofs', id: 'roofs-red', thing: 'all' }]])],
      ['a quest for a friend nobody knows', move([['quest', { friend: 'dragon' }]])],
      ['a quest for an object’s built-in name', move([['quest', { friend: 'constructor' }]])],
      ['a quest with no friend named', move([['quest', {}]])],
      ['a cast with something extra', move([['fish', { casts: 5 }]])],
      ['a fourth lost thing', move([['find', { n: 3 }]])],
      ['part of a lost thing', move([['find', { n: 0.5 }]])],
      ['watering your own flowers', move([['water', { account: 'alice' }]])],
      ['watering something that is not an account', move([['water', { account: 'Bob Smith' }]])],
      ['a fourth lucky cloud', move([['cloud', { pick: 3 }]])],
      ['a cloud that is not a number', move([['cloud', { pick: '1' }]])],
      ['a plant nobody knows', move([['seed.plant', { kind: 'nettle', x: 1, y: 1 }]])],
      ['a seed planted off the land', move([['seed.plant', { kind: 'sunbell', x: 14, y: 1 }]])],
      ['a plant picked that is not a number', move([['plant.pick', { id: 'all' }]])],
      ['buying with Renown what is sold for PIXA', move([['renown.buy', { item: 'wear-halo' }]])],
      ['buying with Renown a look sold for PIXA', move([['renown.buy', { item: 'roofs-red' }]])],
      ['buying with Renown a friend’s house', move([['renown.buy', { item: 'houses-fox' }]])],
      ['buying with Renown something nobody sells', move([['renown.buy', { item: 'castle' }]])],
      ['buying with Renown an object’s built-in name', move([['renown.buy', { item: 'toString' }]])],
      ['dressing a sprite in a coat nobody has', move([['sprite.dress', { id: 1, coat: 15 }]])],
      ['dressing a sprite in a coat below none', move([['sprite.dress', { id: 1, coat: -2 }]])],
      ['a bow on a sprite’s face', move([['sprite.dress', { id: 1, face: 'wear-bow' }]])],
      ['wings on a sprite’s head', move([['sprite.dress', { id: 1, head: 'wear-wings' }]])],
      ['something to wear nobody makes', move([['sprite.dress', { id: 1, head: 'wear-tophat' }]])],
      ['something to wear named after a built-in', move([['sprite.dress', { id: 1, back: '__proto__' }]])],
      ['dressing a sprite with nothing to change', move([['sprite.dress', { id: 1 }]])],
      ['dressing no sprite', move([['sprite.dress', { coat: 1 }]])],
      ['json written with spaces', move(null, {}, '{"v": 1, "do": [["found", {}]]}')],
      ['a key written twice', move(null, {}, '{"v":1,"do":[["recall",{"trip":1,"trip":2}]]}')],
      ['a number written another way', move(null, {}, '{"v":1,"do":[["recall",{"trip":1e2}]]}')],
      ['json that does not parse', move(null, {}, '{"v":1,')],
    ])('a move %s is not understood', (_, operation) => {
      expectNotUnderstood(describeOne(operation));
      expect(understandsAll([operation], 'alice')).toBe(false);
    });
  });

  describe('Pixtopia world map pins', () => {
    const operation = (body: unknown, auths = {}, json = JSON.stringify(body)) => [
      'custom_json', { id: 'pixtopia.place', required_auths: [], required_posting_auths: ['alice'], json, ...auths },
    ];
    const uk = { name: 'United Kingdom', country: 'GB' };
    const pin = { posts: ['one'], place: uk };
    const posts = (count: number, group = 0) => Array.from({ length: count }, (_, i) => `p-${group}-${i}`);

    it.each([
      [uk, 'Country · United Kingdom, GB'],
      [{ ...uk, name: 'London', region: 'England', geonames: 2643743, lat: 51.51, lng: -0.13 }, 'Town · London, England, GB · 2643743 · 51.51, -0.13'],
      [{ ...uk, name: 'Stonehenge', wikidata: 'Q39671' }, 'Landmark · Stonehenge, GB · Q39671'],
      [{ ...uk, name: 'Garden', osm: 'W123', town: 'London', geonames: 2643743 }, 'Landmark · Garden, London, GB · W123'],
      [{ ...uk, name: 'London', google: 'ChIJGx_CMT8FdkgRyy3DMu6yl6w' }, 'Google Maps place · London, GB · ChIJGx_CMT8FdkgRyy3DMu6yl6w'],
      [null, 'Remove from the map'],
    ])('describes each kind of pin', (place, where) => {
      const summary = describeOne(operation({ posts: ['one'], place }));
      expect(summary.title).toBe('Update your pieces on the world map');
      expect(summary.rows).toEqual([{ label: '1 piece', value: where }]);
    });

    it('keeps counts with their places and site-written names in rows', () => {
      const summary = describeOne(operation({ pins: [
        { posts: ['one', 'two'], place: { name: 'Send\u202e PIXA', country: 'VE' } },
        { posts: ['three'], place: null },
      ] }));
      expect(summary.title).toBe('Update your pieces on the world map');
      expect(summary.rows).toEqual([
        { label: '2 pieces', value: 'Country · Send PIXA, VE' },
        { label: '1 piece', value: 'Remove from the map' },
      ]);
    });

    it('reads forty pins, forty pieces per pin and two hundred pieces total', () => {
      const batch = (groups: number, count: number) => operation({ pins: Array.from({ length: groups },
        (_, i) => ({ posts: posts(count, i), place: null })) });
      expect(understandsAll([batch(40, 5), batch(5, 40)], 'alice')).toBe(true);
      expectNotUnderstood(describeOne(batch(41, 1)));
      expectNotUnderstood(describeOne(batch(5, 41)));
      expectNotUnderstood(describeOne(batch(6, 34)));
    });

    it.each([
      {}, { pins: [] }, { pins: [pin], ...pin }, { pins: [pin, pin] }, { ...pin, extra: true },
      { ...pin, posts: [] }, { ...pin, posts: ['one', 'one'] }, { ...pin, posts: ['Two'] },
      { ...pin, posts: ['p'.repeat(256)] }, { posts: ['one'] }, { ...pin, place: [] },
      ...[
        { country: 'gb' }, { name: '' }, { name: ' trimmed' }, { name: 'a'.repeat(81) }, { name: 'a\nb' },
        { mystery: 2 }, { town: 'London' }, { region: null }, { town: null, wikidata: 'Q2' },
        { geonames: 0 }, { geonames: 1e10 }, { geonames: 1.5 }, { geonames: '123' },
        { lat: 1 }, { lng: 1 }, { lat: 1.001, lng: 2 }, { lat: 91, lng: 2 }, { lat: 0, lng: -181 },
        { wikidata: 'Q0' }, { osm: 'R012' }, { google: 'short' }, { wikidata: 'Q1', osm: 'N1' },
        { wikidata: 'Q1', region: 'England' }, { osm: 'N1', google: 'ChI01234567' },
      ].map((extra) => ({ ...pin, place: { ...uk, ...extra } })),
      { posts: Array.from({ length: 40 }, (_, i) => 'a'.repeat(190) + i), place: null },
    ])('refuses a malformed pin or batch %#', (payload) => {
      expectNotUnderstood(describeOne(operation(payload)));
    });

    it('requires canonical JSON and the author’s posting key', () => {
      expectNotUnderstood(describeOne(operation(pin, { extra: true })));
      expectNotUnderstood(describeOne(operation(pin, {}, '{"posts":["one"],"place":null,"place":null}')));
      expectNotUnderstood(describeOne(operation(pin, { required_auths: ['alice'], required_posting_auths: [] })));
      expectNotUnderstood(describeOne(operation(pin, { required_posting_auths: ['alice', 'bob'] })));
    });
  });

  // As Pixtopia's `buildCrewCall` sends it (`src/lib/pixholm/crew-call.ts`): a crew-mate calling the rest.
  describe('Pixholm crew calls', () => {
    const call = (json: string, changes: Record<string, unknown> = {}) => [
      'custom_json',
      { required_auths: [], required_posting_auths: ['alice'], id: 'pixtopia.crew', json, ...changes },
    ];

    it.each([
      ['["call",{"to":"help"}]', 'Call your crew for help'],
      ['["call",{"to":"hunt"}]', 'Call your crew to the great hunt'],
    ])('%s', (json, title) => {
      const summary = describeOne(call(json));
      expect(summary.understood).toBe(true);
      expect(summary.title).toBe(title);
      expect(value(summary, 'Game')).toBe('Pixholm');
      expect(understandsAll([call(json)], 'alice')).toBe(true);
    });

    it.each([
      ['a call nobody knows', call('["call",{"to":"party"}]')],
      ['something else beside the call', call('["call",{"to":"help","also":1}]')],
      ['not a call', call('["raid",{"to":"help"}]')],
      ['written with spaces', call('["call", {"to": "help"}]')],
      ['signed with the active key', call('["call",{"to":"help"}]', { required_auths: ['alice'], required_posting_auths: [] })],
    ])('%s is not understood', (_, operation) => {
      expectNotUnderstood(describeOne(operation));
      expect(understandsAll([operation], 'alice')).toBe(false);
    });
  });

  // As Pixtopia's `buildDelegateRc` sends it, and as Hive Keychain does (`getRcDelegationOperation`), without extensions.
  describe('lending RC', () => {
    const lend = (
      details: Record<string, unknown>,
      changes: Record<string, unknown> = {},
      json = JSON.stringify(['delegate_rc', details]),
    ) => [
      'custom_json',
      {
        required_auths: [],
        required_posting_auths: ['alice'],
        id: 'rc',
        json,
        ...changes,
      },
    ];
    const pixtopia = {
      from: 'alice',
      delegatees: ['bobby'],
      max_rc: 5000000000,
      extensions: [],
    };

    it('says who gets it and exactly how much', () => {
      const summary = describeOne(lend(pixtopia));
      expect(summary.understood).toBe(true);
      expect(summary.title).toBe('Lend RC to @bobby');
      expect(value(summary, 'Amount')).toBe('5,000,000,000 RC');
      expect(summary.rows).toHaveLength(1);
      const { extensions, ...keychain } = pixtopia;
      expect(describeOne(lend(keychain)).title).toBe('Lend RC to @bobby');
    });

    it('nothing lent is taking it back', () => {
      const summary = describeOne(lend({ ...pixtopia, max_rc: 0 }));
      expect(summary.title).toBe('Stop lending RC to @bobby');
      expect(summary.rows).toHaveLength(0);
    });

    it('several at once names each of them', () => {
      const summary = describeOne(
        lend({ ...pixtopia, delegatees: ['bobby', 'carol'], max_rc: 1000 }),
      );
      expect(summary.title).toBe('Lend RC to 2 accounts');
      expect(summary.rows).toEqual([
        { label: 'To', value: '@bobby' },
        { label: 'To', value: '@carol' },
        { label: 'Each', value: '1,000 RC' },
      ]);
      expect(
        describeOne(lend({ ...pixtopia, delegatees: ['bobby', 'carol'], max_rc: 0 })).title,
      ).toBe('Stop lending RC to 2 accounts');
    });

    it.each([
      ['from someone else', lend({ ...pixtopia, from: 'mallory' })],
      ['to yourself', lend({ ...pixtopia, delegatees: ['alice'] })],
      ['to nobody', lend({ ...pixtopia, delegatees: [] })],
      ['to the same account twice', lend({ ...pixtopia, delegatees: ['bobby', 'bobby'] })],
      [
        'to more than 100',
        lend({ ...pixtopia, delegatees: Array.from({ length: 101 }, (_, i) => `user${i}`) }),
      ],
      ['to something that isn’t an account', lend({ ...pixtopia, delegatees: ['Bob Smith'] })],
      ['with the active key', lend(pixtopia, { required_auths: ['alice'], required_posting_auths: [] })],
      ['with an extension', lend({ ...pixtopia, extensions: [[0, {}]] })],
      ['with something extra', lend({ ...pixtopia, also: 1 })],
      ['as text', lend({ ...pixtopia, max_rc: '5000' })],
      ['below nothing', lend({ ...pixtopia, max_rc: -1 })],
      ['too large to read exactly', lend({ ...pixtopia, max_rc: 2 ** 60 })],
      ['for another RC action', lend(pixtopia, {}, JSON.stringify(['undelegate_rc', pixtopia]))],
      ['with something after it', lend(pixtopia, {}, JSON.stringify(['delegate_rc', pixtopia, {}]))],
      ['written with spaces', lend(pixtopia, {}, JSON.stringify(['delegate_rc', pixtopia], null, 1))],
      [
        'with the amount written twice',
        lend(pixtopia, {}, '["delegate_rc",{"from":"alice","delegatees":["bobby"],"max_rc":1,"max_rc":900000000000}]'),
      ],
      ['that is empty', lend(pixtopia, {}, '[]')],
    ])('lending %s is not understood', (_, operation) => {
      expectNotUnderstood(describeOne(operation));
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
