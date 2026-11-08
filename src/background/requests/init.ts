import MkModule from '@background/mk.module';
import { postsAreNew } from '@background/requests/new-posts';
import { ReplyTo, RequestsHandler } from '@background/requests/request-handler';
import { RequestTracker } from '@background/requests/request-tracker';
import {
  KeychainRequest,
  KeychainRequestTypes,
  RequestTransfer,
} from '@interfaces/keychain.interface';
import { LocalAccount } from '@interfaces/local-account.interface';
import { NoConfirm } from '@interfaces/no-confirm.interface';
import { Rpc } from '@interfaces/rpc.interface';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import Config from 'src/config';
import EncryptUtils from 'src/popup/hive/utils/encrypt.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import Logger from 'src/utils/logger.utils';
import { isWhitelisted } from 'src/utils/preferences.utils';
import {
  anonymousRequests,
  getRequiredWifType,
} from 'src/utils/requests.utils';
import * as Logic from './logic';

export default async (
  request: KeychainRequest,
  tab: number | undefined,
  domain: string,
  requestHandler: RequestsHandler,
) => {
  if ((request as ReplyTo).replyTo) requestHandler.replyToWhoeverAsked(request);
  // Cancelled, answered or replaced already, as when its window closed while the password was checked.
  if (!RequestTracker.isOpen(requestHandler.data.documentToken, request.request_id)) return;
  const items: {
    accounts: string;
    current_rpc?: Rpc;
    no_confirm: NoConfirm;
  } = await LocalStorageUtils.getMultipleValueFromLocalStorage([
    LocalStorageKeyEnum.ACCOUNTS,
    LocalStorageKeyEnum.NO_CONFIRM,
    LocalStorageKeyEnum.CURRENT_RPC,
  ]);
  // Always the person's own node. A site doesn't get to choose who answers for this request.
  const rpc = items.current_rpc || Config.rpc.DEFAULT;
  const { username, type } = request;
  const mk = await MkModule.getMk();
  Logger.info('Initializing request logic');
  if (!items.accounts && type !== KeychainRequestTypes.addAccount) {
    // Wallet not initialized
    Logic.initializeWallet(requestHandler, tab!, request);
  } else if (!items.accounts && !mk) {
    // Wallet not initialized for adding first account
    Logic.addAccountToEmptyWallet(requestHandler, tab!, request, domain);
  } else if (!mk) {
    // if locked
    Logic.unlockWallet(requestHandler, tab!, request, domain);
  } else {
    const decryptedAccounts = items.accounts
      ? await EncryptUtils.decryptToJson(items.accounts, mk!)
      : null;
    const accounts = (decryptedAccounts?.list as LocalAccount[]) || [];

    if (
      decryptedAccounts &&
      items.accounts &&
      !EncryptUtils.isEncryptedJsonV2(items.accounts)
    ) {
      await LocalStorageUtils.saveValueInLocalStorage(
        LocalStorageKeyEnum.ACCOUNTS,
        await EncryptUtils.encryptJson({ list: accounts }, mk!),
      );
    }

    await requestHandler.initializeParameters(
      accounts,
      rpc,
      items.no_confirm || [],
    );

    let account = accounts.find((e) => e.name === username);
    if (type === KeychainRequestTypes.addAccount) {
      Logic.addAccountRequest(requestHandler, tab!, request, domain, account);
    } else if (type === KeychainRequestTypes.transfer) {
      Logic.transferRequest(
        requestHandler,
        tab!,
        request as RequestTransfer,
        domain,
        accounts,
        rpc,
        account,
      );
    } else if (anonymousRequests.includes(type) && !username) {
      // if no username specified for anonymous requests
      Logic.anonymousRequests(
        requestHandler,
        tab!,
        request,
        domain,
        accounts,
        rpc,
      );
    } else {
      // Default case
      if (!account) {
        Logic.missingUser(requestHandler, tab!, request, username!);
      } else {
        let typeWif = getRequiredWifType(request);
        let req = request;
        req.key = typeWif;

        if (!account.keys[typeWif]) {
          Logic.missingKey(requestHandler, tab!, request, username!, typeWif);
        } else {
          //@ts-ignore
          const publicKey: Key = account.keys[`${typeWif}Pubkey`]!;
          const key = account.keys[typeWif];
          requestHandler.setKeys(key!, publicKey!);

          // Reward settings are only ever covered on a post being made, which only the node can say.
          const operations =
            req.type === KeychainRequestTypes.signTx
              ? req.tx?.operations
              : req.type === KeychainRequestTypes.broadcast
              ? req.operations
              : undefined;
          const whitelisted = isWhitelisted(items.no_confirm, req, domain, rpc);
          const approved = whitelisted && (await postsAreNew(operations));
          // Asking the node can take seconds: the wallet must still be unlocked, the approval still saved,
          // and the page mustn't have asked something else meanwhile.
          const [stillUnlocked, noConfirm] = whitelisted
            ? await Promise.all([
                MkModule.getMk(),
                LocalStorageUtils.getValueFromLocalStorage(
                  LocalStorageKeyEnum.NO_CONFIRM,
                ),
              ])
            : [mk, items.no_confirm];
          if (
            !RequestTracker.isLatest(
              requestHandler.data.documentToken,
              request.request_id!,
            ) ||
            !RequestTracker.isOpen(
              requestHandler.data.documentToken,
              request.request_id!,
            )
          ) {
            return;
          }
          if (!stillUnlocked) {
            Logic.unlockWallet(requestHandler, tab!, request, domain);
          } else if (!approved || !isWhitelisted(noConfirm, req, domain, rpc)) {
            Logic.requestWithConfirmation(
              requestHandler,
              tab!,
              req,
              domain,
              rpc,
            );
          } else {
            Logic.requestWithoutConfirmation(requestHandler, tab!, req);
          }
        }
      }
    }
  }
  requestHandler.saveInLocalStorage();
};
