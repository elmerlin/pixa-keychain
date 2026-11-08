import AccountModule from '@background/account';
import AutolockModule from '@background/autolock.module';
import ClaimModule from '@background/claim.module';
import LocalStorageModule from '@background/local-storage.module';
import init from '@background/requests/init';
import { noteApproval } from '@background/requests/dialog-lifecycle';
import sendErrors from '@background/requests/errors';
import { performOperation } from '@background/requests/operations';
import { RequestsHandler } from '@background/requests/request-handler';
import { RequestTracker } from '@background/requests/request-tracker';
import RPCModule from '@background/rpc.module';
import SettingsModule from '@background/settings.module';
import getMessage from '@background/utils/i18n.utils';
import VaultModule from '@background/vault.module';
import {
  KeychainRequest,
  KeychainRequestWrapper,
} from '@interfaces/keychain.interface';
import { BackgroundCommand } from '@reference-data/background-message-key.enum';
import { DialogCommand } from '@reference-data/dialog-message-key.enum';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { VaultCommand } from '@reference-data/vault-message-key.enum';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import Logger from 'src/utils/logger.utils';
import { BackgroundMessage } from './background-message.interface';
import MkModule from './mk.module';

Object.assign(global, { contextType: 'service_worker' });

/* istanbul ignore next */
(async () => {
  if (!process.env.IS_FIREFOX) {
    Logger.log('Initializing vault');
    VaultModule.init();
  }
  await RPCModule.init();
  LocalStorageUtils.removeFromLocalStorage(LocalStorageKeyEnum.__MK);
  Logger.info('Initializing background tasks');
  await LocalStorageModule.checkAndUpdateLocalStorage();
  ClaimModule.start();

  AutolockModule.start();
  AutolockModule.set(
    await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.AUTOLOCK,
    ),
  );
})();

/* istanbul ignore next */
//@ts-ignore
chrome.i18n.getMessage = getMessage;
/* istanbul ignore next */
const chromeMessageHandler = async (
  backgroundMessage: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResp: (response?: any) => void,
) => {
  // Logger.log('Background message', backgroundMessage);
  switch (backgroundMessage.command) {
    case BackgroundCommand.GET_MK:
      MkModule.sendBackMk();
      break;
    case BackgroundCommand.SAVE_MK:
      MkModule.saveMk(backgroundMessage.value);
      break;
    case BackgroundCommand.IMPORT_ACCOUNTS:
      AccountModule.sendBackImportedAccounts(backgroundMessage.value);
      break;
    case BackgroundCommand.SAVE_RPC:
      RPCModule.setActiveRpc(backgroundMessage.value);
      break;
    case BackgroundCommand.SEND_REQUEST: {
      const { request, request_id, documentToken } =
        backgroundMessage as KeychainRequestWrapper & {
          documentToken?: string;
        };
      const replyTo = {
        frameId: sender.frameId,
        documentId: (sender as { documentId?: string }).documentId,
        documentToken,
      };
      await RequestTracker.restored();
      if (RequestTracker.isSending(documentToken)) {
        RequestsHandler.answerTo(sender.tab!.id!, replyTo, {
          command: DialogCommand.ANSWER_REQUEST,
          msg: {
            success: false,
            error: 'busy',
            result: null,
            data: request,
            message: await chrome.i18n.getMessage('bgd_ops_busy'),
            request_id,
          },
        });
        break;
      }
      const replaced = RequestTracker.accept(documentToken, request_id!, {
        tab: sender.tab!.id!,
        replyTo,
        request,
      });
      RequestsHandler.answerTo(sender.tab!.id!, replyTo, {
        command: DialogCommand.REQUEST_ACCEPTED,
        request_id,
      });
      // One from another page is replaced too, unless it's being sent or has had its answer. Its own page
      // learns of a replacement from REQUEST_ACCEPTED; another page hears it was cancelled.
      if (
        replaced &&
        replaced.tab !== undefined &&
        replaced.token !== documentToken &&
        !replaced.answered &&
        !RequestTracker.isSending(replaced.token)
      ) {
        RequestsHandler.answerTo(replaced.tab, replaced.replyTo, {
          command: DialogCommand.ANSWER_REQUEST,
          msg: {
            success: false,
            error: 'user_cancel',
            result: null,
            data: replaced.request,
            message: await chrome.i18n.getMessage(
              'bgd_lifecycle_request_canceled',
            ),
            request_id: replaced.requestId,
          },
        });
      }
      const requestHandler = await RequestsHandler.getFromLocalStorage();
      // Another request may have come during those waits, and its window is its own.
      if (!RequestTracker.isCurrent(documentToken, request_id)) break;
      if (requestHandler) {
        requestHandler.closeWindow();
      }
      new RequestsHandler().sendRequest(
        sender,
        backgroundMessage as KeychainRequestWrapper,
      );
      break;
    }
    case BackgroundCommand.UNLOCK_FROM_DIALOG: {
      const { mk, domain, data, tab } = backgroundMessage.value;
      const asked = data?.msg?.data;
      const login = await MkModule.login(mk);
      // Checked after the password: the window may have closed, or another request come, meanwhile.
      if (!RequestTracker.isOpen(asked?.replyTo?.documentToken, asked?.request_id)) {
        break;
      }
      if (login) {
        MkModule.saveMk(mk);
        init(
          data.msg.data,
          tab,
          domain,
          await RequestsHandler.getFromLocalStorage(),
        );
      } else {
        chrome.runtime.sendMessage({
          ...data,
          command: DialogCommand.WRONG_MK,
        });
      }
      break;
    }
    case BackgroundCommand.REGISTER_FROM_DIALOG: {
      const { mk, domain, data, tab } = backgroundMessage.value;
      const stillOpen = () =>
        RequestTracker.isOpen(data?.replyTo?.documentToken, data?.request_id);
      // A wallet may have been set up elsewhere while this window sat open. A second password
      // mustn't replace the first, or what's saved under it could be lost.
      if (
        await LocalStorageUtils.getValueFromLocalStorage(
          LocalStorageKeyEnum.ACCOUNTS,
        )
      ) {
        const alreadySetUp = await chrome.i18n.getMessage(
          'bgd_auth_already_set_up',
        );
        if (!stillOpen()) break;
        sendErrors(
          await RequestsHandler.getFromLocalStorage(),
          tab,
          'already_set_up',
          alreadySetUp,
          alreadySetUp,
          data,
        );
        break;
      }
      if (!stillOpen()) break;
      MkModule.saveMk(mk);
      init(data, tab, domain, await RequestsHandler.getFromLocalStorage());
      break;
    }
    case BackgroundCommand.ACCEPT_TRANSACTION:
      const { keep, data, tab, domain, options } = backgroundMessage.value;
      const token = data.replyTo?.documentToken;
      await RequestTracker.restored();
      // The site's already been told this one was replaced or cancelled: it mustn't go out now.
      if (
        !RequestTracker.isLatest(token, data.request_id) ||
        !RequestTracker.isOpen(token, data.request_id)
      ) {
        break;
      }
      noteApproval();
      RequestTracker.startSending(token);
      const approvedHandler = await RequestsHandler.getFromLocalStorage();
      approvedHandler.useApproved(data);
      // From here it runs to the end. Closing the window no longer means cancelled, and saying so
      // could get a transfer that's going through sent twice.
      approvedHandler.setConfirmed(true);
      await approvedHandler.saveInLocalStorage();
      performOperation(
        approvedHandler,
        data,
        tab,
        domain,
        keep,
        options,
      );
      break;
    case BackgroundCommand.UPDATE_AUTOLOCK:
      AutolockModule.set(backgroundMessage.value);
      break;
    case BackgroundCommand.SEND_BACK_SETTINGS:
      SettingsModule.sendBackImportedFileContent(
        JSON.parse(backgroundMessage.value),
      );
      break;

    case BackgroundCommand.PING:
      Logger.log('ping');
      break;

    // Replace vault by persistent data storage for Firefox
    case VaultCommand.GET_VALUE:
      if (!process.env.IS_FIREFOX) return;
      return MkModule.getMk();
    case VaultCommand.SET_VALUE:
      if (!process.env.IS_FIREFOX) return;
      MkModule.saveMk(backgroundMessage.value);
      return true;
    case VaultCommand.REMOVE_VALUE:
      if (!process.env.IS_FIREFOX) return;
      MkModule.lock();
      return true;
  }
  return true;
};

// The wallet locks when the last browser window closes, in every browser: Firefox has no offscreen document.
chrome.windows.onRemoved.addListener(() => {
  chrome.windows.getAll((windows) => {
    if (windows.length === 0) MkModule.lock();
  });
});

export const performOperationFromIndex = async (
  requestHandler: RequestsHandler,
  tab: number,
  request: KeychainRequest,
) => {
  // A later request from this document replaced this one while it was getting ready.
  if (
    !RequestTracker.isLatest(requestHandler.data.documentToken, request.request_id!) ||
    !RequestTracker.isOpen(requestHandler.data.documentToken, request.request_id!)
  ) {
    return;
  }
  performOperation(requestHandler, request, tab!, request.domain, false);
};

chrome.runtime.onMessage.addListener(chromeMessageHandler);
