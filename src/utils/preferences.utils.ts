import {
  KeychainKeyTypesLC,
  KeychainRequestTypes,
  KeychainRequest,
} from '@interfaces/keychain.interface';
import { NoConfirm } from '@interfaces/no-confirm.interface';
import { Rpc } from '@interfaces/rpc.interface';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { describeOperations } from 'src/dialog/utils/operation-summary.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import { getRequiredWifType } from 'src/utils/requests.utils';

const POSTING_OPERATIONS = ['vote', 'comment', 'delete_comment', 'claim_reward_balance'];
// The custom_json IDs the wallet reads, and has words for.
const READABLE_IDS = ['follow', 'community', 'pixtopia.game', 'rc'];
const ACCOUNT = /^[a-z][a-z0-9.-]{2,15}$/;
const REWARD_OPTIONS = [
  'allow_curation_rewards',
  'allow_votes',
  'author',
  'extensions',
  'max_accepted_payout',
  'percent_pxs',
  'permlink',
].join();
const hasOnly = (value: any, keys: string) =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join() === keys;

// Reward settings can send a post's rewards to someone else, so they're covered only as the chain's
// defaults with exactly the shares that were approved, and only for a post made in the same
// transaction, never one that's already out. The shares are part of the approval: any other split asks.
const rewardShares = (
  options: any,
  operations: [string, any][],
  username: string,
): string | null => {
  if (
    !hasOnly(options, REWARD_OPTIONS) ||
    options.author !== username ||
    options.max_accepted_payout !== '1000000.000 PXS' ||
    options.percent_pxs !== 10000 ||
    options.allow_votes !== true ||
    options.allow_curation_rewards !== true ||
    !operations.some(
      ([name, post]) =>
        name === 'comment' &&
        post?.author === options.author &&
        post?.permlink === options.permlink,
    ) ||
    !Array.isArray(options.extensions) ||
    options.extensions.length !== 1
  ) {
    return null;
  }
  const [extension] = options.extensions;
  if (!Array.isArray(extension) || extension.length !== 2 || extension[0] !== 0) {
    return null;
  }
  const shares = hasOnly(extension[1], 'beneficiaries')
    ? extension[1].beneficiaries
    : null;
  if (!Array.isArray(shares) || !shares.length) return null;
  const named = shares.map((share) =>
    hasOnly(share, 'account,weight') &&
    ACCOUNT.test(share.account) &&
    Number.isInteger(share.weight) &&
    share.weight >= 1 &&
    share.weight <= 10000
      ? `${share.account}=${share.weight}`
      : null,
  );
  return named.includes(null) ? null : `comment_options/${named.join(',')}`;
};

// A like, a downvote and taking a vote back are three things, approved apart.
const voteKind = (weight: unknown) =>
  typeof weight === 'number' && Number.isInteger(weight)
    ? weight > 0
      ? 'vote'
      : weight < 0
      ? 'vote/down'
      : 'vote/remove'
    : null;

// Reward settings come one to one with the posts they're for: every post in the transaction has its own, and
// nothing else rides along, like an edit to a post that's already out.
const paired = (operations: [string, any][]) => {
  const target = ([, op]: [string, any]) => `${op?.author}/${op?.permlink}`;
  const posts = operations.filter(([name]) => name === 'comment').map(target);
  const options = operations.filter(([name]) => name === 'comment_options').map(target);
  return (
    !options.length ||
    (posts.length === options.length &&
      new Set(posts).size === posts.length &&
      posts.every((post) => options.includes(post)))
  );
};

// What a saved approval covers. Approving one thing never approves another: a transaction's approval
// is for the kinds of operation it held, and a custom_json's for that one kind. Nothing with the
// active or memo key can be approved in advance, nor anything that can't be read, nor reward settings
// beyond the shares above. Returns nothing for those.
export const approvalFor = (data: KeychainRequest): string | null => {
  try {
    if (getRequiredWifType(data) !== KeychainKeyTypesLC.posting) return null;
    switch (data.type) {
      case KeychainRequestTypes.post:
        return data.comment_options ? null : data.type;
      case KeychainRequestTypes.custom: {
        // An ID the wallet can read is approved only when this one reads, since the approval is named for what it does.
        if (READABLE_IDS.includes(data.id)) {
          const operation = [
            'custom_json',
            {
              id: data.id,
              json: typeof data.json === 'string' ? data.json : JSON.stringify(data.json),
              required_auths: [],
              required_posting_auths: [data.username],
            },
          ];
          const [summary] = describeOperations([operation], data.username);
          if (!summary.understood || summary.actor !== data.username) return null;
        }
        return `${data.type}:${data.id}`;
      }
      case KeychainRequestTypes.vote:
        return voteKind(Number(data.weight));
      case KeychainRequestTypes.broadcast:
      case KeychainRequestTypes.signTx: {
        const operations =
          data.type === KeychainRequestTypes.signTx
            ? data.tx?.operations
            : data.operations;
        // Every operation has to be understood, and acting as this account: the key may hold
        // authority over others, and approving one account isn't approving them.
        const summaries = describeOperations(operations, data.username);
        if (
          !summaries.every(
            ({ understood, actor }) => understood && actor === data.username,
          )
        ) {
          return null;
        }
        const list = operations as unknown as [string, any][];
        // The site only says it's using the posting key, and that key may well hold more on this
        // account. So only operations the chain would accept with nothing else can go unreviewed.
        if (!paired(list)) return null;
        const kinds = list.map(([name, details]) =>
          name === 'vote'
            ? voteKind(details.weight)
            : POSTING_OPERATIONS.includes(name)
            ? name
            : name === 'custom_json' && !details.required_auths?.length
            ? `${name}/${details.id}`
            : name === 'comment_options'
            ? rewardShares(details, list, data.username!)
            : null,
        );
        if (kinds.includes(null)) return null;
        const distinct = [...new Set(kinds)].sort();
        // One split per approval, so its words can say exactly what it is.
        if (distinct.filter((kind) => kind!.startsWith('comment_options/')).length > 1) return null;
        return `${data.type}:${distinct.join('+')}`;
      }
      default:
        return data.type;
    }
  } catch (e) {
    return null;
  }
};

// What an approval lets a site do, in the person's words: "likes", "Pixholm moves". Nothing for what has no
// words of its own, which keeps the request's name.
const KIND_WORDS: Record<string, string> = {
  vote: 'approval_likes',
  'vote/down': 'approval_downvotes',
  'vote/remove': 'approval_unvotes',
  comment: 'approval_posts',
  delete_comment: 'approval_deletes',
  claim_reward_balance: 'approval_claims',
  'custom_json/follow': 'approval_follows',
  'custom_json/community': 'approval_portals',
  'custom_json/pixtopia.game': 'approval_pixholm',
  'custom_json/rc': 'approval_rc',
};
const TYPE_WORDS: Record<string, string> = {
  vote: 'approval_likes',
  'vote/down': 'approval_downvotes',
  'vote/remove': 'approval_unvotes',
  post: 'approval_posts',
  signBuffer: 'approval_sign_buffer',
  decode: 'approval_decode',
  encode: 'approval_encode',
  encodeWithKeys: 'approval_encode',
};
// Saved approvals can come from an imported file, so a key like "constructor" mustn't find anything.
const wordsFor = (table: Record<string, string>, key: string) =>
  Object.prototype.hasOwnProperty.call(table, key)
    ? chrome.i18n.getMessage(table[key]) || null
    : null;
// Only the first colon separates: a custom_json's ID can hold one.
const partsOf = (approval: string) => {
  const at = approval.indexOf(':');
  return at < 0 ? [approval] : [approval.slice(0, at), approval.slice(at + 1)];
};
const language = () => chrome.i18n.getUILanguage?.() || 'en';
const listOf = (items: string[]) => {
  try {
    // Every browser the wallet runs in has it, though this TypeScript's lib doesn't know it yet.
    const { ListFormat } = Intl as any;
    return new ListFormat(language(), { type: 'conjunction' }).format(items);
  } catch (e) {
    return items.join(', ');
  }
};
const sharesOf = (kind: string) =>
  listOf(
    kind
      .slice('comment_options/'.length)
      .split(',')
      .map((share) => {
        const [account, weight] = share.split('=');
        const percent = new Intl.NumberFormat(language(), {
          style: 'percent',
          maximumFractionDigits: 2,
        }).format(+weight / 10000);
        return chrome.i18n.getMessage('approval_share', [percent, `@${account}`]);
      }),
  );

export const approvalWords = (approval: string): string | null => {
  const [type, kinds] = partsOf(approval);
  if (kinds === undefined) return wordsFor(TYPE_WORDS, type);
  if (type === 'custom') return wordsFor(KIND_WORDS, `custom_json/${kinds}`);
  const parts = kinds.split('+');
  const shares = parts.filter((kind) => kind.startsWith('comment_options/'));
  // Shares only ever come with their post.
  if (shares.length > 1 || (shares.length && !parts.includes('comment'))) return null;
  const said = parts
    .filter((kind) => !shares.includes(kind))
    .map((kind) =>
      kind === 'comment' && shares.length
        ? chrome.i18n.getMessage('approval_posts_sharing', [sharesOf(shares[0])])
        : wordsFor(KIND_WORDS, kind) ?? '',
    );
  return said.every(Boolean) ? listOf(said) : null;
};

export const approvalLabel = (approval: string) => {
  const words = approvalWords(approval);
  if (words) return words.charAt(0).toLocaleUpperCase() + words.slice(1);
  const [type, kinds] = partsOf(approval);
  const name = chrome.i18n.getMessage(
    `popup_${type
      .split(/(?=[A-Z])/)
      .join('_')
      .toLowerCase()}`,
  );
  return kinds
    ? `${name}: ${kinds.replace(/\+/g, ', ').replace(/_/g, ' ')}`
    : name;
};

export const isWhitelisted = (
  arr: NoConfirm,
  data: KeychainRequest,
  domain: string,
  current_rpc: Rpc,
) => {
  try {
    const approval = approvalFor(data);
    if (!approval || !arr || !data.username || current_rpc.testnet) {
      return false;
    }
    return arr[data.username][domain][approval] === true;
  } catch (e) {
    return false;
  }
};

export const addToWhitelist = async (
  username: string,
  domain: string,
  type: string,
) => {
  const noConfirm = await LocalStorageUtils.getValueFromLocalStorage(
    LocalStorageKeyEnum.NO_CONFIRM,
  );
  let keep = !noConfirm ? {} : noConfirm;
  if (!keep[username]) {
    keep[username] = {};
  }
  if (!keep[username][domain]) {
    keep[username][domain] = {};
  }
  keep[username][domain][type] = true;
  await LocalStorageUtils.saveValueInLocalStorage(
    LocalStorageKeyEnum.NO_CONFIRM,
    keep,
  );
};

export const removeFromWhitelist = (
  noConfirm: NoConfirm,
  username: string,
  domain: string,
  operation: string,
) => {
  delete noConfirm[username][domain][operation];
  if (!Object.keys(noConfirm[username][domain]).length) {
    delete noConfirm[username][domain];
  }
  LocalStorageUtils.saveValueInLocalStorage(
    LocalStorageKeyEnum.NO_CONFIRM,
    noConfirm,
  );
  return noConfirm;
};
