// A sign or broadcast request in words, for the person about to approve it. Any site can send one, so
// this is read as hostile: every value is checked strictly, and an operation that doesn't match exactly
// what's expected is reported as not understood, never guessed at. What a site wrote (titles, memos) only
// ever appears as a row's value, stripped of invisible characters, so it can't pass for the wallet speaking.

export type SummaryRow = { label: string; value: string };
export type OperationSummary = {
  title: string;
  rows: SummaryRow[];
  warning?: string;
  understood: boolean;
  actor?: string;
};
type ToPower = (vests: string) => string;
type Described = {
  actor: string;
  title: string;
  rows?: SummaryRow[];
  warning?: string;
};
type Fields = Record<string, unknown>;

class Unreadable extends Error {}

const say = (key: string, ...substitutions: string[]) =>
  chrome.i18n.getMessage(key, substitutions);

const ACCOUNT = /^[a-z][a-z0-9.-]{2,15}$/;
const LIQUID = /^\d+\.\d{3} (PIXA|PXS)$/;
const VESTS = /^\d+\.\d{6} VESTS$/;
const PUBLIC_KEY = /^PIX[1-9A-HJ-NP-Za-km-z]{40,60}$/;
const NULL_SIGNING_KEY = /^PIX1111111111111111111111111111111114T1Anm$/;
const OPERATION_NAME = /^[a-z0-9_]{1,64}$/;
const PICTURE = /data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+/g;
const INVISIBLE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu;
const BODY_PREVIEW = 280;
const LONGEST_MEMO = 2048;
const FULL_STRENGTH = 10000;
const DEFAULT_MAX_PAYOUT = '1000000.000 PXS';

const fields = (value: unknown): Fields => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Unreadable();
  return value as Fields;
};
const list = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) throw new Unreadable();
  return value;
};
const string = (value: unknown) => {
  if (typeof value !== 'string') throw new Unreadable();
  return value;
};
const whole = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Unreadable();
  }
  if (value < min || value > max) throw new Unreadable();
  return value;
};
const flag = (value: unknown) => {
  if (typeof value !== 'boolean') throw new Unreadable();
  return value;
};
const account = (value: unknown) => {
  if (typeof value !== 'string' || !ACCOUNT.test(value)) throw new Unreadable();
  return value;
};
const handle = (value: unknown) => `@${account(value)}`;
const matching = (pattern: RegExp, value: unknown) => {
  if (typeof value !== 'string' || !pattern.test(value)) throw new Unreadable();
  return value;
};
const liquid = (value: unknown) => matching(LIQUID, value);
const vests = (value: unknown) => matching(VESTS, value);
const anyAsset = (value: unknown) =>
  typeof value === 'string' && VESTS.test(value) ? value : liquid(value);
const isZero = (amount: string) => /^0+\.0+ /.test(amount);
const none = (value: unknown) => {
  if (list(value).length) throw new Unreadable();
};
const hasOwn = (table: object, key: string) =>
  Object.prototype.hasOwnProperty.call(table, key);
// A name from a fixed table, never one of an object's built-in properties.
const oneOf = <T>(table: Record<string, T>, value: unknown): T => {
  if (typeof value !== 'string' || !hasOwn(table, value)) throw new Unreadable();
  return table[value];
};

const clean = (value: string) =>
  value.replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim();
const shown = (value: unknown, longest?: number) => {
  const text = clean(string(value));
  return longest && text.length > longest
    ? `${text.slice(0, longest)}…`
    : text;
};
const postOf = (author: unknown, permlink: unknown) =>
  `${handle(author)}/${shown(permlink)}`;
const percent = (weight: number) => `${weight / 100}%`;

const row = (labelKey: string, value: string): SummaryRow => ({
  label: chrome.i18n.getMessage(labelKey),
  value,
});
const memoRow = (memo: unknown) => {
  const text = shown(memo, LONGEST_MEMO);
  return text ? [row('dialog_memo', text)] : [];
};
const toRow = (from: string, to: string) =>
  to && to !== from ? [row('dialog_to', handle(to))] : [];

const signedAuthor = (actor: string, value: unknown) => {
  if (account(value) !== actor) throw new Unreadable();
};

const follow = (actor: string, payload: unknown): Described => {
  const [kind, details] = list(payload);
  const v = fields(details);
  if (kind === 'follow') {
    signedAuthor(actor, v.follower);
    const what = JSON.stringify(list(v.what));
    const key =
      what === '["blog"]'
        ? 'dialog_op_follow'
        : what === '["ignore"]'
        ? 'dialog_op_mute'
        : what === '[]'
        ? 'dialog_op_unfollow'
        : null;
    if (!key) throw new Unreadable();
    return { actor, title: say(key, handle(v.following)) };
  }
  if (kind === 'reblog') {
    signedAuthor(actor, v.account);
    return {
      actor,
      title: say(v.delete ? 'dialog_op_unreblog' : 'dialog_op_reblog'),
      rows: [row('dialog_op_post', postOf(v.author, v.permlink))],
    };
  }
  throw new Unreadable();
};

const PORTAL_POST_ACTIONS: Record<string, string> = {
  pinPost: 'dialog_op_portal_pin',
  unpinPost: 'dialog_op_portal_unpin',
  mutePost: 'dialog_op_portal_mute',
  unmutePost: 'dialog_op_portal_unmute',
  flagPost: 'dialog_op_portal_flag',
};

const portal = (actor: string, payload: unknown): Described => {
  const [action, details] = list(payload);
  const v = fields(details);
  const where = row('dialog_op_portal', shown(v.community));
  switch (action) {
    case 'subscribe':
      return { actor, title: say('dialog_op_portal_join'), rows: [where] };
    case 'unsubscribe':
      return { actor, title: say('dialog_op_portal_leave'), rows: [where] };
    case 'setRole':
      return {
        actor,
        title: say('dialog_op_portal_role'),
        rows: [
          where,
          row('dialog_account', handle(v.account)),
          row('dialog_op_role', shown(v.role)),
        ],
      };
    case 'setUserTitle':
      return {
        actor,
        title: say('dialog_op_portal_title'),
        rows: [
          where,
          row('dialog_account', handle(v.account)),
          row('dialog_title', shown(v.title)),
        ],
      };
    case 'updateProps': {
      const props = fields(v.props);
      return {
        actor,
        title: say('dialog_op_portal_update'),
        rows: [
          where,
          ...(props.title ? [row('dialog_title', shown(props.title))] : []),
        ],
      };
    }
  }
  const key = oneOf(PORTAL_POST_ACTIONS, action);
  return {
    actor,
    title: say(key),
    rows: [
      where,
      row('dialog_op_post', postOf(v.account, v.permlink)),
      ...(v.notes ? [row('dialog_op_notes', shown(v.notes))] : []),
    ],
  };
};

// An object with exactly these keys, and maybe these others, so nothing rides along unread.
const exactly = (
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
) => {
  const v = fields(value);
  const keys = Object.keys(v);
  if (
    !required.every((key) => keys.includes(key)) ||
    !keys.every((key) => required.includes(key) || optional.includes(key))
  ) {
    throw new Unreadable();
  }
  return v;
};
// JSON exactly as JSON.stringify writes it: a repeated key, or a number written another way, could read
// one way here and another on chain.
const canonical = (json: unknown) => {
  const text = string(json);
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Unreadable();
  }
  if (JSON.stringify(payload) !== text) throw new Unreadable();
  return payload;
};
const counted = (value: number) =>
  String(value).replace(/\B(?=(\d{3})+$)/g, ',');

// Lending resource credits, as Pixa's node reads it: one account lending its own, to up to 100 others.
// The amount is what each of them ends up with from this account, not something added to it.
const MOST_RC_DELEGATEES = 100;
const lendRc = (actor: string, payload: unknown): Described => {
  const parts = list(payload);
  if (parts.length !== 2 || parts[0] !== 'delegate_rc') throw new Unreadable();
  const v = exactly(parts[1], ['from', 'delegatees', 'max_rc'], ['extensions']);
  signedAuthor(actor, v.from);
  if (v.extensions !== undefined) none(v.extensions);
  const to = list(v.delegatees).map(account);
  if (
    !to.length ||
    to.length > MOST_RC_DELEGATEES ||
    new Set(to).size !== to.length ||
    to.includes(actor)
  ) {
    throw new Unreadable();
  }
  const amount = whole(v.max_rc);
  const one = to.length === 1;
  const whom = one ? handle(to[0]) : String(to.length);
  return {
    actor,
    title: amount
      ? say(one ? 'dialog_op_rc_lend' : 'dialog_op_rc_lend_many', whom)
      : say(one ? 'dialog_op_rc_stop' : 'dialog_op_rc_stop_many', whom),
    rows: [
      ...(one ? [] : to.map((name) => row('dialog_to', handle(name)))),
      ...(amount
        ? [
            row(
              one ? 'dialog_amount' : 'dialog_op_rc_each',
              say('dialog_op_rc_amount', counted(amount)),
            ),
          ]
        : []),
    ],
  };
};

// Pixholm, Pixtopia's island game. A move is up to ten actions, read as the game reads them and no
// further. The dialog can't see the island, so it says what each action asks for, never whether it'll
// work. The numbers here are the game's rules (Pixtopia's `src/lib/game`).
const GAME_ID = 'pixtopia.game';
const MOST_GAME_ACTIONS = 10;
const ISLAND_SIDE = 14;
const MOST_TRAINED = 50;
const WAVES = 3;
const BANNER_CHOICES = 8;
const SIDES = ['nw', 'ne', 'se', 'sw'];
// As Pixtopia's rules have them (`src/lib/game/rules.ts`, `looks.ts`).
const MOST_SAND_MINUTES = 60 * 1000;
const FACINGS = ['sw', 'se', 'ne', 'nw'];
const ISLAND_NAME = /^[A-Za-z](?:[A-Za-z]|[ '-](?=[A-Za-z])){1,22}[A-Za-z]$/;
const LOOK_SLOTS = ['flowers', 'crystal', 'lanterns', 'roofs', 'ground', 'garage', 'sails', 'trails', 'shots', 'flourish'];
const LOOK_ID = /^[a-z][a-z0-9-]{1,39}$/;
const FRIEND_KINDS = ['fluff', 'bear', 'fox', 'owl', 'lamb', 'mouse', 'frog', 'fawn'];
const CREW_NAME = /^[A-Za-z0-9][A-Za-z0-9 '-]{1,18}[A-Za-z0-9]$/;
const BUILDS: Record<string, string> = {
  flower: 'dialog_op_game_build_flower',
  lantern: 'dialog_op_game_build_lantern',
  cottage: 'dialog_op_game_build_cottage',
  hut: 'dialog_op_game_build_hut',
  dock: 'dialog_op_game_build_dock',
  almanac: 'dialog_op_game_build_almanac',
  vault: 'dialog_op_game_build_vault',
  net: 'dialog_op_game_build_net',
  cactus: 'dialog_op_game_build_cactus',
  windmill: 'dialog_op_game_build_windmill',
  bell: 'dialog_op_game_build_bell',
  searchlight: 'dialog_op_game_build_searchlight',
  hedge: 'dialog_op_game_build_hedge',
  cannon: 'dialog_op_game_build_cannon',
  path: 'dialog_op_game_build_path',
  bench: 'dialog_op_game_build_bench',
  lamp: 'dialog_op_game_build_lamp',
  arch: 'dialog_op_game_build_arch',
  fountain: 'dialog_op_game_build_fountain',
  statue: 'dialog_op_game_build_statue',
  pavilion: 'dialog_op_game_build_pavilion',
};
const RAIDERS: Record<string, string> = {
  crane: 'dialog_op_game_cranes',
  kite: 'dialog_op_game_kites',
  balloon: 'dialog_op_game_balloons',
  glider: 'dialog_op_game_gliders',
  airship: 'dialog_op_game_airships',
  spark: 'dialog_op_game_sparks',
  mender: 'dialog_op_game_menders',
  cloudship: 'dialog_op_game_cloudships',
};
const TOPICS: Record<string, string> = {
  crane: 'dialog_op_game_topic_crane',
  kite: 'dialog_op_game_topic_kite',
  balloon: 'dialog_op_game_topic_balloon',
  glider: 'dialog_op_game_topic_glider',
  airship: 'dialog_op_game_topic_airship',
  spark: 'dialog_op_game_topic_spark',
  mender: 'dialog_op_game_topic_mender',
  cloudship: 'dialog_op_game_topic_cloudship',
  roots: 'dialog_op_game_topic_roots',
  tailwind: 'dialog_op_game_topic_tailwind',
};
const CAMPS = [
  'dialog_op_game_camp_driftwood',
  'dialog_op_game_camp_thistle',
  'dialog_op_game_camp_gull',
  'dialog_op_game_camp_reef',
  'dialog_op_game_camp_keep',
];

type Step = { says: string; rows?: SummaryRow[] };
const tile = (value: unknown) => whole(value, 0, ISLAND_SIDE - 1);
const camp = (value: unknown) => say(CAMPS[whole(value, 0, CAMPS.length - 1)]);
const crewName = (value: unknown) =>
  row('dialog_op_game_crew', matching(CREW_NAME, string(value).trim()));
// Who goes, a row for each kind, in the game's order. At least one, and nothing else among them.
const raidersIn = (v: Fields, others: readonly string[]) => {
  Object.keys(v)
    .filter((key) => !others.includes(key))
    .forEach((kind) => oneOf(RAIDERS, kind));
  const rows = Object.keys(RAIDERS)
    .filter((kind) => hasOwn(v, kind))
    .map((kind) => row(RAIDERS[kind], String(whole(v[kind], 1))));
  if (!rows.length) throw new Unreadable();
  return rows;
};
const onIsland = (key: string) => (params: unknown): Step => {
  whole(exactly(params, ['id']).id);
  return { says: say(key) };
};
const toCrewMate = (key: string) => (params: unknown): Step => ({
  says: say(key, handle(exactly(params, ['account']).account)),
});

const GAME_ACTIONS: Record<string, (params: unknown) => Step> = {
  found: (params) => {
    const v = exactly(params, [], ['look']);
    if (v.look !== undefined) whole(v.look);
    return { says: say('dialog_op_game_found') };
  },
  build: (params) => {
    const v = exactly(params, ['kind', 'x', 'y'], ['facing']);
    if (v.facing !== undefined && !FACINGS.includes(string(v.facing))) {
      throw new Unreadable();
    }
    tile(v.x);
    tile(v.y);
    return { says: say(oneOf(BUILDS, v.kind)) };
  },
  upgrade: onIsland('dialog_op_game_upgrade'),
  cancel: onIsland('dialog_op_game_cancel'),
  remove: onIsland('dialog_op_game_remove'),
  move: (params) => {
    const v = exactly(params, ['id', 'x', 'y']);
    whole(v.id);
    tile(v.x);
    tile(v.y);
    return { says: say('dialog_op_game_move_thing') };
  },
  // In hourglasses, or under the sand rules in minutes (an hourglass is 60), one or the other.
  hurry: (params) => {
    const v = exactly(params, ['id'], ['hourglasses', 'minutes']);
    whole(v.id);
    if ((v.hourglasses === undefined) === (v.minutes === undefined)) {
      throw new Unreadable();
    }
    if (v.minutes !== undefined) {
      const minutes = whole(v.minutes, 1, MOST_SAND_MINUTES);
      return {
        says:
          minutes === 1
            ? say('dialog_op_game_sand_one')
            : say('dialog_op_game_sand', counted(minutes)),
      };
    }
    const count = whole(v.hourglasses, 1);
    return {
      says:
        count === 1
          ? say('dialog_op_game_hurry_one')
          : say('dialog_op_game_hurry', String(count)),
    };
  },
  turn: (params) => {
    const v = exactly(params, ['id', 'facing']);
    whole(v.id);
    if (!FACINGS.includes(string(v.facing))) throw new Unreadable();
    return { says: say('dialog_op_game_turn') };
  },
  name: (params) => {
    const name = string(exactly(params, ['name']).name);
    if (name === '') return { says: say('dialog_op_game_name_none') };
    return {
      says: say('dialog_op_game_name'),
      rows: [row('dialog_op_game_island', matching(ISLAND_NAME, name))],
    };
  },
  look: (params) => {
    const v = exactly(params, ['slot', 'id']);
    if (!LOOK_SLOTS.includes(string(v.slot))) throw new Unreadable();
    const id = string(v.id);
    if (id !== '') matching(LOOK_ID, id);
    return { says: say('dialog_op_game_look') };
  },
  'sprite.rest': (params) => {
    const v = exactly(params, ['id', 'rest']);
    whole(v.id);
    return {
      says: say(
        whole(v.rest, 0, 1) === 1
          ? 'dialog_op_game_sprite_rest'
          : 'dialog_op_game_sprite_back',
      ),
    };
  },
  'sprite.swap': (params) => {
    const v = exactly(params, ['a', 'b']);
    whole(v.a);
    whole(v.b);
    return { says: say('dialog_op_game_sprite_swap') };
  },
  'sprite.kind': (params) => {
    const v = exactly(params, ['id', 'kind']);
    whole(v.id);
    const kind = string(v.kind);
    if (kind !== '' && !FRIEND_KINDS.includes(kind)) throw new Unreadable();
    return { says: say('dialog_op_game_sprite_kind') };
  },
  train: (params) => {
    const v = exactly(params, ['dock', 'kind', 'count']);
    whole(v.dock);
    return {
      says: say('dialog_op_game_train'),
      rows: [
        row(oneOf(RAIDERS, v.kind), String(whole(v.count, 1, MOST_TRAINED))),
      ],
    };
  },
  research: (params) => ({
    says: say(
      'dialog_op_game_research',
      say(oneOf(TOPICS, exactly(params, ['topic']).topic)),
    ),
  }),
  raid: (params) => {
    const plan = ['target', 'from', 'waves'];
    const v = fields(params);
    const rows = raidersIn(v, plan);
    if (v.from !== undefined && !SIDES.includes(string(v.from))) {
      throw new Unreadable();
    }
    if (v.waves !== undefined) {
      Object.entries(fields(v.waves)).forEach(([kind, wave]) => {
        oneOf(RAIDERS, kind);
        whole(wave, 1, WAVES);
      });
    }
    const target =
      typeof v.target === 'string' ? handle(v.target) : camp(v.target);
    return { says: say('dialog_op_game_raid', target), rows };
  },
  scout: (params) => ({
    says: say('dialog_op_game_scout', camp(exactly(params, ['target']).target)),
  }),
  help: (params) => {
    const v = fields(params);
    const rows = raidersIn(v, ['target']);
    return { says: say('dialog_op_game_help', handle(v.target)), rows };
  },
  recall: (params) => {
    whole(exactly(params, ['trip']).trip);
    return { says: say('dialog_op_game_recall') };
  },
  'crew.found': (params) => ({
    says: say('dialog_op_game_crew_found'),
    rows: [crewName(exactly(params, ['name']).name)],
  }),
  'crew.invite': toCrewMate('dialog_op_game_crew_invite'),
  'crew.join': (params) => ({
    says: say('dialog_op_game_crew_join'),
    rows: [crewName(exactly(params, ['crew']).crew)],
  }),
  'crew.leave': (params) => {
    exactly(params, []);
    return { says: say('dialog_op_game_crew_leave') };
  },
  'crew.remove': toCrewMate('dialog_op_game_crew_remove'),
  'crew.hand': toCrewMate('dialog_op_game_crew_hand'),
  'crew.give': (params) => ({
    says: say(
      'dialog_op_game_crew_give',
      counted(whole(exactly(params, ['glow']).glow, 1)),
    ),
  }),
  'crew.banner': (params) => {
    const v = exactly(params, ['colour', 'mark']);
    whole(v.colour, 0, BANNER_CHOICES - 1);
    whole(v.mark, 0, BANNER_CHOICES - 1);
    return { says: say('dialog_op_game_crew_banner') };
  },
};

const gameMove = (actor: string, payload: unknown): Described => {
  const move = exactly(payload, ['v', 'do']);
  if (move.v !== 1) throw new Unreadable();
  const actions = list(move.do);
  if (!actions.length || actions.length > MOST_GAME_ACTIONS) {
    throw new Unreadable();
  }
  const steps = actions.map((action) => {
    const parts = list(action);
    if (parts.length !== 2) throw new Unreadable();
    return oneOf(GAME_ACTIONS, parts[0])(parts[1]);
  });
  if (steps.length === 1) {
    const [{ says, rows = [] }] = steps;
    return {
      actor,
      title: says,
      rows: [row('dialog_op_game', say('dialog_op_game_pixholm')), ...rows],
    };
  }
  return {
    actor,
    title: say('dialog_op_game_moves', String(steps.length)),
    rows: steps.flatMap(({ says, rows = [] }) => [
      row('dialog_op_game_move', says),
      ...rows,
    ]),
  };
};

const customJson = (v: Fields): Described => {
  const auths = [...list(v.required_auths), ...list(v.required_posting_auths)];
  if (auths.length !== 1) throw new Unreadable();
  const actor = account(auths[0]);
  // These two are only ever signed with the posting key, and read only as their apps write them.
  if (v.id === GAME_ID || v.id === 'rc') {
    if (list(v.required_auths).length) throw new Unreadable();
    const payload = canonical(v.json);
    return v.id === GAME_ID ? gameMove(actor, payload) : lendRc(actor, payload);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(string(v.json));
  } catch {
    throw new Unreadable();
  }
  if (v.id === 'follow') return follow(actor, payload);
  if (v.id === 'community') return portal(actor, payload);
  throw new Unreadable();
};

// Who holds it isn't enough: weights decide who can act alone. So they're shown with what's needed,
// and a change that leaves it out of reach isn't read as something ordinary.
export const authorityText = (value: unknown) => {
  const v = fields(value);
  const threshold = whole(v.weight_threshold, 1, 0xffffffff);
  const holder = (name: string, auth: unknown) => {
    const weight = whole(list(auth)[1], 1, 0xffff);
    return { weight, text: `${name} (${weight})` };
  };
  const holders = [
    ...list(v.account_auths).map((auth) =>
      holder(handle(list(auth)[0]), auth),
    ),
    ...list(v.key_auths).map((auth) =>
      holder(matching(PUBLIC_KEY, list(auth)[0]), auth),
    ),
  ];
  if (!holders.length) return say('dialog_op_nobody');
  if (holders.reduce((sum, { weight }) => sum + weight, 0) < threshold) {
    throw new Unreadable();
  }
  return say(
    'dialog_op_holders',
    String(threshold),
    holders.map(({ text }) => text).join(', '),
  );
};

const accountUpdate = (v: Fields): Described => {
  const actor = account(v.account);
  const changes = (
    [
      ['owner', 'dialog_op_owner'],
      ['active', 'dialog_op_active'],
      ['posting', 'dialog_op_posting'],
    ] as const
  ).flatMap(([field, label]) =>
    v[field] ? [row(label, authorityText(v[field]))] : [],
  );
  const memo = v.memo_key
    ? [row('dialog_op_memo_key', matching(PUBLIC_KEY, v.memo_key))]
    : [];
  if (changes.length) {
    return {
      actor,
      title: say('dialog_op_change_control'),
      warning: say('dialog_op_change_control_warning'),
      rows: [...changes, ...memo],
    };
  }
  return {
    actor,
    title: say(memo.length ? 'dialog_op_update_account' : 'dialog_op_profile'),
    rows: memo,
  };
};

const createAccount = (v: Fields, fee?: string): Described => {
  if (v.extensions !== undefined) none(v.extensions);
  return {
    actor: account(v.creator),
    title: say('dialog_op_create_account', handle(v.new_account_name)),
    rows: [
      ...(fee ? [row('dialog_op_fee', fee)] : []),
      row('dialog_op_owner', authorityText(v.owner)),
      row('dialog_op_active', authorityText(v.active)),
      row('dialog_op_posting', authorityText(v.posting)),
      row('dialog_op_memo_key', matching(PUBLIC_KEY, v.memo_key)),
    ],
  };
};

// What each operation does, by the name the chain gives it. Anything else isn't understood.
const describers = (
  toPower?: ToPower,
): Record<string, (v: Fields) => Described> => {
  const power = (value: unknown) => {
    const amount = vests(value);
    return toPower ? `${amount} (≈ ${toPower(amount)})` : amount;
  };
  return {
    vote: (v) => {
      const weight = whole(v.weight, -FULL_STRENGTH, FULL_STRENGTH);
      const strength = percent(Math.abs(weight));
      return {
        actor: account(v.voter),
        title:
          weight > 0
            ? say('dialog_op_like', strength)
            : weight < 0
            ? say('dialog_op_downvote', strength)
            : say('dialog_op_unvote'),
        rows: [row('dialog_op_post', postOf(v.author, v.permlink))],
      };
    },
    comment: (v) => {
      const isReply = string(v.parent_author) !== '';
      const body = shown(
        string(v.body).replace(PICTURE, say('dialog_op_picture')),
        BODY_PREVIEW,
      );
      const where = shown(v.parent_permlink);
      return {
        actor: account(v.author),
        title: say(isReply ? 'dialog_op_reply' : 'dialog_op_publish'),
        rows: [
          ...(isReply
            ? [row('dialog_op_reply_to', postOf(v.parent_author, where))]
            : where.startsWith('portal-')
            ? [row('dialog_op_portal', where)]
            : []),
          ...(string(v.title) ? [row('dialog_title', shown(v.title))] : []),
          ...(body ? [row('dialog_op_text', body)] : []),
          row('dialog_op_address', shown(v.permlink)),
        ],
      };
    },
    comment_options: (v) => {
      const payout = liquid(v.max_accepted_payout);
      const pxsShare = whole(v.percent_pxs, 0, FULL_STRENGTH);
      const shares = list(v.extensions).flatMap((extension) => {
        const [kind, details] = list(extension);
        if (kind !== 0) throw new Unreadable();
        return list(fields(details).beneficiaries).map((beneficiary) => {
          const b = fields(beneficiary);
          return row(
            'dialog_op_shares',
            say(
              'dialog_op_share',
              percent(whole(b.weight, 1, FULL_STRENGTH)),
              handle(b.account),
            ),
          );
        });
      });
      return {
        actor: account(v.author),
        title: say('dialog_op_rewards'),
        rows: [
          row('dialog_op_post', postOf(v.author, v.permlink)),
          ...shares,
          ...(isZero(payout)
            ? [row('dialog_op_payout', say('dialog_op_payout_declined'))]
            : payout !== DEFAULT_MAX_PAYOUT
            ? [row('dialog_op_payout', payout)]
            : []),
          ...(pxsShare !== FULL_STRENGTH
            ? [row('dialog_op_pxs_share', percent(pxsShare))]
            : []),
          ...(flag(v.allow_votes)
            ? []
            : [row('dialog_op_likes', say('dialog_op_off'))]),
          ...(flag(v.allow_curation_rewards)
            ? []
            : [row('dialog_op_curation', say('dialog_op_off'))]),
        ],
      };
    },
    delete_comment: (v) => ({
      actor: account(v.author),
      title: say('dialog_op_delete_post'),
      rows: [row('dialog_op_post', postOf(v.author, v.permlink))],
    }),
    custom_json: customJson,
    transfer: (v) => ({
      actor: account(v.from),
      title: say('dialog_op_send', anyAsset(v.amount)),
      rows: [row('dialog_to', handle(v.to)), ...memoRow(v.memo)],
    }),
    recurrent_transfer: (v) => {
      const amount = liquid(v.amount);
      none(v.extensions);
      const rows = [row('dialog_to', handle(v.to))];
      if (isZero(amount)) {
        return {
          actor: account(v.from),
          title: say('dialog_op_recurring_cancel'),
          rows,
        };
      }
      return {
        actor: account(v.from),
        title: say('dialog_op_send', amount),
        rows: [
          ...rows,
          row(
            'dialog_op_repeats',
            say(
              'dialog_op_repeats_value',
              String(whole(v.recurrence, 1)),
              String(whole(v.executions, 1)),
            ),
          ),
          ...memoRow(v.memo),
        ],
      };
    },
    transfer_to_vesting: (v) => ({
      actor: account(v.from),
      title: say('dialog_op_power_up', liquid(v.amount)),
      rows: v.to === '' ? [] : toRow(account(v.from), account(v.to)),
    }),
    withdraw_vesting: (v) => {
      const amount = vests(v.vesting_shares);
      return {
        actor: account(v.account),
        title: say(
          isZero(amount) ? 'dialog_op_stop_power_down' : 'dialog_op_power_down',
        ),
        rows: isZero(amount) ? [] : [row('dialog_amount', power(amount))],
      };
    },
    delegate_vesting_shares: (v) => {
      const amount = vests(v.vesting_shares);
      return {
        actor: account(v.delegator),
        title: say(
          isZero(amount) ? 'dialog_op_undelegate' : 'dialog_op_delegate',
        ),
        rows: [
          row('dialog_to', handle(v.delegatee)),
          ...(isZero(amount) ? [] : [row('dialog_amount', power(amount))]),
        ],
      };
    },
    set_withdraw_vesting_route: (v) => {
      const share = whole(v.percent, 0, FULL_STRENGTH);
      return {
        actor: account(v.from_account),
        title: say(share ? 'dialog_op_route' : 'dialog_op_route_stop'),
        rows: [
          row('dialog_to', handle(v.to_account)),
          ...(share ? [row('dialog_op_power_downs', percent(share))] : []),
          ...(share && flag(v.auto_vest)
            ? [row('dialog_op_arrives_as', say('dialog_op_arrives_as_power'))]
            : []),
        ],
        ...(share ? { warning: say('dialog_op_route_warning') } : {}),
      };
    },
    transfer_to_savings: (v) => ({
      actor: account(v.from),
      title: say('dialog_op_to_savings', liquid(v.amount)),
      rows: [...toRow(account(v.from), account(v.to)), ...memoRow(v.memo)],
    }),
    transfer_from_savings: (v) => ({
      actor: account(v.from),
      title: say('dialog_op_from_savings', liquid(v.amount)),
      rows: [...toRow(account(v.from), account(v.to)), ...memoRow(v.memo)],
    }),
    cancel_transfer_from_savings: (v) => ({
      actor: account(v.from),
      title: say('dialog_op_cancel_savings'),
      rows: [row('dialog_op_request', String(whole(v.request_id)))],
    }),
    convert: (v) => ({
      actor: account(v.owner),
      title: say('dialog_op_convert', liquid(v.amount)),
    }),
    collateralized_convert: (v) => ({
      actor: account(v.owner),
      title: say('dialog_op_convert_collateral', liquid(v.amount)),
    }),
    limit_order_create: (v) => ({
      actor: account(v.owner),
      title: say('dialog_op_offer', liquid(v.amount_to_sell)),
      rows: [
        row('dialog_op_at_least', liquid(v.min_to_receive)),
        row('dialog_op_expires', shown(v.expiration)),
      ],
    }),
    limit_order_cancel: (v) => ({
      actor: account(v.owner),
      title: say('dialog_op_cancel_order', String(whole(v.orderid))),
    }),
    claim_reward_balance: (v) => ({
      actor: account(v.account),
      title: say('dialog_op_claim_rewards'),
      rows: [
        row('dialog_op_rewards_pixa', liquid(v.reward_pixa)),
        row('dialog_op_rewards_pxs', liquid(v.reward_pxs)),
        row('dialog_op_rewards_power', power(v.reward_vests)),
      ],
    }),
    account_witness_vote: (v) => ({
      actor: account(v.account),
      title: say(
        flag(v.approve) ? 'dialog_op_witness_vote' : 'dialog_op_witness_unvote',
        handle(v.witness),
      ),
    }),
    account_witness_proxy: (v) => ({
      actor: account(v.account),
      title:
        string(v.proxy) === ''
          ? say('dialog_op_proxy_clear')
          : say('dialog_op_proxy', handle(v.proxy)),
    }),
    update_proposal_votes: (v) => {
      none(v.extensions);
      const ids = list(v.proposal_ids).map((id) => String(whole(id)));
      if (!ids.length) throw new Unreadable();
      return {
        actor: account(v.voter),
        title: say(
          flag(v.approve)
            ? 'dialog_op_proposal_vote'
            : 'dialog_op_proposal_unvote',
          ids.join(', '),
        ),
      };
    },
    create_proposal: (v) => {
      none(v.extensions);
      return {
        actor: account(v.creator),
        title: say('dialog_op_proposal_create'),
        rows: [
          row('dialog_op_subject', shown(v.subject)),
          row('dialog_op_pays', handle(v.receiver)),
          row('dialog_op_per_day', liquid(v.daily_pay)),
          row('dialog_op_starts', shown(v.start_date)),
          row('dialog_op_ends', shown(v.end_date)),
          row('dialog_op_address', shown(v.permlink)),
        ],
      };
    },
    update_proposal: (v) => {
      // The one thing an update can carry besides these is a new end date.
      const ends = list(v.extensions).map((extension) => {
        const [kind, details] = list(extension);
        if (kind !== 1) throw new Unreadable();
        return row('dialog_op_ends', shown(fields(details).end_date));
      });
      return {
        actor: account(v.creator),
        title: say('dialog_op_proposal_update', String(whole(v.proposal_id))),
        rows: [
          row('dialog_op_subject', shown(v.subject)),
          row('dialog_op_per_day', liquid(v.daily_pay)),
          row('dialog_op_address', shown(v.permlink)),
          ...ends,
        ],
      };
    },
    remove_proposal: (v) => {
      none(v.extensions);
      const ids = list(v.proposal_ids).map((id) => String(whole(id)));
      if (!ids.length) throw new Unreadable();
      return {
        actor: account(v.proposal_owner),
        title: say('dialog_op_proposal_remove', ids.join(', ')),
      };
    },
    claim_account: (v) => {
      none(v.extensions);
      return {
        actor: account(v.creator),
        title: say('dialog_op_claim_ticket'),
        rows: [row('dialog_op_fee', liquid(v.fee))],
      };
    },
    create_claimed_account: (v) => createAccount(v),
    account_create: (v) => createAccount(v, liquid(v.fee)),
    account_update: accountUpdate,
    account_update2: accountUpdate,
    witness_update: (v) => {
      const key = string(v.block_signing_key);
      const props = fields(v.props);
      const paid = [
        row('dialog_op_fee', liquid(v.fee)),
        row('dialog_op_account_fee', liquid(props.account_creation_fee)),
        row('dialog_op_block_size', String(whole(props.maximum_block_size))),
        row('dialog_op_interest', percent(whole(props.pxs_interest_rate))),
      ];
      if (NULL_SIGNING_KEY.test(key)) {
        return {
          actor: account(v.owner),
          title: say('dialog_op_witness_stop'),
          rows: paid,
        };
      }
      return {
        actor: account(v.owner),
        title: say('dialog_op_witness_update'),
        rows: [
          row('dialog_op_signing_key', matching(PUBLIC_KEY, key)),
          row('dialog_op_url', shown(v.url)),
          ...paid,
        ],
      };
    },
    feed_publish: (v) => {
      const rate = fields(v.exchange_rate);
      return {
        actor: account(v.publisher),
        title: say('dialog_op_feed'),
        rows: [
          row(
            'dialog_op_rate',
            `${liquid(rate.base)} = ${liquid(rate.quote)}`,
          ),
        ],
      };
    },
  };
};

const notUnderstood = (name: unknown): OperationSummary => ({
  title: say('dialog_op_unknown'),
  rows:
    typeof name === 'string' && OPERATION_NAME.test(name)
      ? [row('dialog_op_type', name)]
      : [],
  warning: say('dialog_op_unknown_warning'),
  understood: false,
});

const describeOperation = (
  operation: unknown,
  table: Record<string, (v: Fields) => Described>,
  signer?: string,
): OperationSummary => {
  const name = Array.isArray(operation) ? operation[0] : undefined;
  try {
    const [, value] = list(operation);
    if (
      typeof name !== 'string' ||
      !Object.prototype.hasOwnProperty.call(table, name)
    )
      throw new Unreadable();
    const { actor, title, rows = [], warning } = table[name](fields(value));
    return {
      title,
      // A request made as one account can act for another, as a portal's controller does.
      rows: [
        ...(signer && actor !== signer ? [row('dialog_op_as', `@${actor}`)] : []),
        ...rows,
      ],
      ...(warning ? { warning } : {}),
      understood: true,
      actor,
    };
  } catch (error) {
    if (error instanceof Unreadable) return notUnderstood(name);
    throw error;
  }
};

/** One summary per operation, in order. A request with no readable operations is one not-understood summary. */
export const describeOperations = (
  operations: unknown,
  signer?: string,
  toPower?: ToPower,
): OperationSummary[] => {
  if (!Array.isArray(operations) || !operations.length) {
    return [notUnderstood(undefined)];
  }
  const table = describers(toPower);
  return operations.map((operation) =>
    describeOperation(operation, table, signer),
  );
};

export const understandsAll = (operations: unknown, signer?: string) =>
  describeOperations(operations, signer).every(
    (summary) => summary.understood,
  );
