import { removeWindow } from '@background/requests/dialog-lifecycle';
import init from '@background/requests/init';
import { Key, Keys } from '@interfaces/keys.interface';
import { LocalAccount } from '@interfaces/local-account.interface';
import { NoConfirm } from '@interfaces/no-confirm.interface';
import { Rpc } from '@interfaces/rpc.interface';
import AccountUtils from '@popup/hive/utils/account.utils';
import EncryptUtils from '@popup/hive/utils/encrypt.utils';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { VaultKey } from '@reference-data/vault-message-key.enum';
import { config } from 'hive-tx';
import {
  KeychainKeyTypesLC,
  KeychainRequest,
  KeychainRequestTypes,
  KeychainRequestWrapper,
} from 'src/interfaces/keychain.interface';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import { getRequiredWifType } from 'src/utils/requests.utils';
import VaultUtils from 'src/utils/vault.utils';

if (!process.env.IS_FIREFOX && !global.window) {
  //@ts-ignore
  global.window = { crypto };
}

export type ReplyTo = {
  replyTo?: { frameId?: number; documentId?: string; documentToken?: string };
};

type RequestData = {
  tab?: number;
  frameId?: number;
  documentId?: string;
  documentToken?: string;
  request?: KeychainRequest;
  request_id?: number;
  confirmed: boolean;
  accounts?: LocalAccount[];
  rpc?: Rpc | null;
  preferences?: NoConfirm;
  key?: Key;
  publicKey?: Key;
  windowId?: number;
  isWaitingForConfirmation: boolean;
};
export class RequestsHandler {
  data: RequestData;
  defaultRpcConfig: any;

  constructor() {
    this.data = { confirmed: false, isWaitingForConfirmation: false };
    this.defaultRpcConfig = config;
  }

  async initFromLocalStorage(
    data: RequestData,
    accounts: LocalAccount[],
    defaultRpcConfig: any,
  ) {
    this.data = data;
    this.data.accounts = accounts;
    this.defaultRpcConfig = defaultRpcConfig;
  }

  async setIsWaitingForConfirmation(isWaitingForConfirmation: boolean) {
    this.data.isWaitingForConfirmation = isWaitingForConfirmation;
    this.saveInLocalStorage();
  }

  async initializeParameters(
    accounts: LocalAccount[],
    rpc: Rpc,
    preferences: NoConfirm,
  ) {
    this.data.accounts = accounts;
    this.data.rpc = rpc;
    this.data.preferences = preferences;

    config.node = rpc.uri;
  }

  closeWindow() {
    if (this.data.windowId) {
      removeWindow(this.data.windowId);
    }
  }

  reset(resetWinId: boolean) {
    if (resetWinId) {
      config.node = this.defaultRpcConfig.node;
      RequestsHandler.clearLocalStorage();
    } else {
      const { documentToken, request_id } = this.data;
      this.data = {
        confirmed: this.data.confirmed,
        windowId: this.data.windowId,
        isWaitingForConfirmation: false,
      };
      // Another page may have asked something while this was being sent. Its record stays.
      LocalStorageUtils.getValueFromLocalStorage(
        LocalStorageKeyEnum.__REQUEST_HANDLER,
      ).then((saved) => {
        const latest = saved?.data;
        if (
          !latest?.request ||
          (latest.documentToken === documentToken &&
            latest.request_id === request_id)
        ) {
          this.saveInLocalStorage();
        }
      });
    }
  }

  setConfirmed(confirmed: boolean) {
    this.data.confirmed = confirmed;
  }

  setWindowId(windowId?: number) {
    this.data.windowId = windowId;
  }

  setKeys(key: string, publicKey: string) {
    this.data.key = key;
    this.data.publicKey = publicKey;
  }

  sendRequest(
    sender: chrome.runtime.MessageSender,
    msg: KeychainRequestWrapper & { documentToken?: string },
  ) {
    this.data.tab = sender.tab!.id;
    this.data.frameId = sender.frameId;
    this.data.documentId = (sender as { documentId?: string }).documentId;
    this.data.documentToken = msg.documentToken;
    // Travels with the request, through the dialog and back, so the answer goes to whoever asked
    // this, not whoever asked last.
    (msg.request as ReplyTo).replyTo = {
      frameId: this.data.frameId,
      documentId: this.data.documentId,
      documentToken: this.data.documentToken,
    };
    this.data.request = msg.request;
    this.data.request_id = msg.request_id;
    init(msg.request, this.data.tab, msg.domain, this);
  }

  /** Only the document that asked hears the answer. Other frames in the tab can belong to anyone. */
  answer(tab: number, message: object) {
    const { frameId, documentId, documentToken } = this.data;
    RequestsHandler.answerTo(tab, { frameId, documentId, documentToken }, message);
  }

  static answerTo(tab: number, replyTo: ReplyTo['replyTo'], message: any) {
    const { documentId, frameId, documentToken } = replyTo ?? {};
    // A page has no use for how its answers find it.
    if (message?.msg?.data?.replyTo) {
      const { replyTo: _, ...data } = message.msg.data;
      message = { ...message, msg: { ...message.msg, data } };
    }
    chrome.tabs.sendMessage(
      tab,
      { documentToken, message },
      documentId ? { documentId } : { frameId: frameId ?? 0 },
      () => void chrome.runtime.lastError,
    );
  }

  /** The approved request says whose keys sign and who hears the answer, not whichever was saved last. */
  useApproved(data: KeychainRequest) {
    const { replyTo } = data as ReplyTo;
    this.data.frameId = replyTo?.frameId;
    this.data.documentId = replyTo?.documentId;
    this.data.documentToken = replyTo?.documentToken;
    this.data.request = data;
    this.data.request_id = data.request_id;
    const account = this.data.accounts?.find((e) => e.name === data.username);
    const role = account ? getRequiredWifType(data) : undefined;
    this.data.key = role ? account!.keys[role] : undefined;
    this.data.publicKey = role
      ? (account!.keys[`${role}Pubkey` as keyof Keys] as Key)
      : undefined;
  }

  getUserKeyPair(username: string, keyType: KeychainKeyTypesLC) {
    const pubKey: string = `${keyType}Pubkey`;
    return [
      this.data.accounts?.find((e) => e.name === username)?.keys[keyType],
      //@ts-ignore
      this.data.accounts?.find((e) => e.name === username)?.keys[pubKey!],
    ];
  }

  getUserPrivateKey(username: string, keyType: KeychainKeyTypesLC) {
    return this.data.accounts?.find((e) => e.name === username)?.keys[keyType];
  }

  static async getFromLocalStorage() {
    const params = await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.__REQUEST_HANDLER,
    );

    const mk = await VaultUtils.getValueFromVault(VaultKey.__MK);
    const accounts = mk
      ? await AccountUtils.getAccountsFromLocalStorage(mk)
      : undefined;

    const handler = new RequestsHandler();
    // What was asked, and by whom, is kept while locked too: closing the unlock window still has
    // to answer the site. Only the keys wait for the password.
    if (params) {
      if (
        accounts &&
        params.data.request &&
        params.data.request.type === KeychainRequestTypes.addAccount &&
        params.data.request.encryptedKeys
      ) {
        params.data.request = {
          ...params.data.request,
          keys: (
            await EncryptUtils.decryptToJson(
              params.data.request.encryptedKeys,
              mk!,
            )
          )?.keys,
        };
      }
      await handler.initFromLocalStorage(
        params.data,
        accounts as LocalAccount[],
        params.defaultRpcConfig,
      );

      const username = params.data?.request?.username;
      if (accounts && username) {
        const selectedAccount = accounts.find((acc) => acc.name === username);
        if (selectedAccount) {
          let typeWif = getRequiredWifType(params.data.request);
          const publicKey: Key = selectedAccount.keys[`${typeWif}Pubkey`]!;
          const key = selectedAccount.keys[typeWif];

          handler.setKeys(key!, publicKey!);
        }
      }
    }
    return handler;
  }

  async saveInLocalStorage() {
    const dataToSave = {
      defaultRpcConfig: this.defaultRpcConfig,
      data: {
        tab: this.data.tab,
        frameId: this.data.frameId,
        documentId: this.data.documentId,
        documentToken: this.data.documentToken,
        request: this.data.request,
        request_id: this.data.request_id,
        confirmed: this.data.confirmed,
        rpc: this.data.rpc,
        preferences: this.data.preferences,
        windowId: this.data.windowId,
        isWaitingForConfirmation: this.data.isWaitingForConfirmation,
      } as RequestData,
    };

    if (
      dataToSave.data.request &&
      this.data.request?.type === KeychainRequestTypes.addAccount
    ) {
      // A site's keys are only ever saved under the wallet's password. While it's locked they stay
      // with the window that's asking for it.
      const mk = await VaultUtils.getValueFromVault(VaultKey.__MK);
      dataToSave.data.request = {
        request_id: this.data.request_id,
        type: this.data.request.type,
        username: this.data.request.username,
        ...(mk
          ? {
              encryptedKeys: await EncryptUtils.encryptJson(
                { keys: this.data.request.keys },
                mk,
              ),
            }
          : {}),
      } as any;
    }
    await LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.__REQUEST_HANDLER,
      dataToSave,
    );
  }

  static async clearLocalStorage() {
    await LocalStorageUtils.removeFromLocalStorage(
      LocalStorageKeyEnum.__REQUEST_HANDLER,
    );
  }
}
