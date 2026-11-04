import {
  KeychainKeyTypesLC,
  KeychainRequestTypes,
  KeychainRequest,
} from '@interfaces/keychain.interface';
import { NoConfirm } from '@interfaces/no-confirm.interface';
import { Rpc } from '@interfaces/rpc.interface';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { understandsAll } from 'src/dialog/utils/operation-summary.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import { getRequiredWifType } from 'src/utils/requests.utils';

const POSTING_OPERATIONS = ['vote', 'comment', 'delete_comment', 'claim_reward_balance'];
const needsOnlyPosting = ([name, details]: [string, any]) =>
  POSTING_OPERATIONS.includes(name) ||
  (name === 'custom_json' && !details.required_auths?.length);

// What a saved approval covers. Approving one thing never approves another: a transaction's approval
// is for the kinds of operation it held, and a custom_json's for that one kind. Nothing with the
// active or memo key can be approved in advance, nor anything that can't be read, nor where a post's
// rewards go. Returns nothing for those.
export const approvalFor = (data: KeychainRequest): string | null => {
  try {
    if (getRequiredWifType(data) !== KeychainKeyTypesLC.posting) return null;
    switch (data.type) {
      case KeychainRequestTypes.post:
        return data.comment_options ? null : data.type;
      case KeychainRequestTypes.custom:
        return `${data.type}:${data.id}`;
      case KeychainRequestTypes.broadcast:
      case KeychainRequestTypes.signTx: {
        const operations =
          data.type === KeychainRequestTypes.signTx
            ? data.tx?.operations
            : data.operations;
        if (!understandsAll(operations, data.username)) return null;
        const list = operations as unknown as [string, any][];
        // The site only says it's using the posting key, and that key may well hold more on this
        // account. So only operations the chain would accept with nothing else can go unreviewed.
        if (!list.every(needsOnlyPosting)) return null;
        const kinds = list.map(([name, details]) =>
          name === 'custom_json' ? `${name}/${details.id}` : name,
        );
        return `${data.type}:${[...new Set(kinds)].sort().join('+')}`;
      }
      default:
        return data.type;
    }
  } catch (e) {
    return null;
  }
};

export const approvalLabel = (approval: string) => {
  const [type, kinds] = approval.split(':');
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
