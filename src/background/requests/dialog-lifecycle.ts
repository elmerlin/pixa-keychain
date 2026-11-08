import { RequestsHandler } from '@background/requests/request-handler';
import { RequestTracker } from '@background/requests/request-tracker';
import { waitUntilDialogIsReady } from '@background/utils/window.utils';
import { DialogCommand } from '@reference-data/dialog-message-key.enum';

// Set the moment someone approves, before anything that takes time, so a window closed straight
// afterwards can't still be reported as cancelled.
let approved = false;
export const noteApproval = () => {
  approved = true;
};

// A window asks whether it's ready, and gets its request, by a message every window hears. So only the
// current request's window may be open when it does, and only the current request may send it anything.
// Each window the wallet opened, and the request it's for, known from the moment it opens rather than once a
// save lands. Kept in session storage too, so a restarted service worker still knows them.
type Owner = { token?: string; requestId?: number };
const DIALOGS = 'dialogWindows';
const dialogs = new Map<number, Owner>();
const saveDialogs = async () => {
  try {
    await chrome.storage.session.set({ [DIALOGS]: [...dialogs] });
  } catch (e) {}
};
const loadDialogs = async () => {
  try {
    const saved = (await chrome.storage.session.get(DIALOGS))[DIALOGS];
    if (Array.isArray(saved)) {
      saved.forEach(([id, owner]) => {
        if (!dialogs.has(id)) dialogs.set(id, owner);
      });
    }
  } catch (e) {}
};

// Windows the wallet closes itself, on its way to another. Only a window the person closes cancels.
const closing = new Set<number>();

const isCurrent = (requestHandler: RequestsHandler) =>
  RequestTracker.isCurrent(
    requestHandler.data.documentToken,
    requestHandler.data.request_id,
  );

/** Sends a request's window what it shows, if that request is still the one the wallet is on. */
export const toDialog = (requestHandler: RequestsHandler, message: object) => {
  if (!isCurrent(requestHandler)) return;
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
};

// One window opens at a time, so the next one can close it first.
let opening: Promise<unknown> = Promise.resolve();

export const createPopup = (
  callback: () => void,
  requestHandler: RequestsHandler,
  popupHtml = 'dialog.html',
) => {
  const run = opening.then(() =>
    openPopup(callback, requestHandler, popupHtml),
  );
  opening = run.catch(() => undefined);
  return run;
};

const openPopup = async (
  callback: () => void,
  requestHandler: RequestsHandler,
  popupHtml: string,
) => {
  let width = 435;
  let height = 600;
  const { documentToken, request_id } = requestHandler.data;
  const stillCurrent = () => RequestTracker.isOpen(documentToken, request_id);
  // Another request came first: it's that one's turn, and its window stays.
  if (!stillCurrent()) return;
  requestHandler.setConfirmed(false);
  approved = false;
  //Ensuring only one window is opened by the extension at a time.
  if (requestHandler.data.windowId) {
    removeWindow(requestHandler.data.windowId!);
    requestHandler.setWindowId(undefined);
  }
  await loadDialogs();
  const strays = [...dialogs.keys()];
  strays.forEach((id) => closing.add(id));
  await Promise.all(
    strays.map((id) => chrome.windows.remove(id).catch(() => undefined)),
  );
  strays.forEach((id) => dialogs.delete(id));
  await saveDialogs();
  if (!stillCurrent()) return;
  //Create new window on the top right of the screen
  const w = await new Promise<chrome.windows.Window>((resolve) =>
    chrome.windows.getCurrent(resolve),
  );
  const win = await new Promise<chrome.windows.Window | undefined>((resolve) =>
    chrome.windows.create(
      {
        url: chrome.runtime.getURL(popupHtml),
        type: 'popup',
        height: height,
        width: width,
        left: w.width! - width + w.left!,
        top: w.top,
        focused: false,
      },
      resolve,
    ),
  );
  if (!win) return;
  dialogs.set(win.id!, { token: documentToken, requestId: request_id });
  await saveDialogs();
  // Another request came while this window was opening: it's that one's turn.
  if (!stillCurrent()) {
    removeWindow(win.id!);
    return;
  }
  chrome.windows.update(
    win.id!,
    {
      height: height,
      width: width,
      top: w.top,
      left: w.width! - width + w.left!,
    },
    () => {
      requestHandler.setWindowId(win.id);
      requestHandler.saveInLocalStorage();
      waitUntilDialogIsReady(100, DialogCommand.READY, callback, 0, stillCurrent);
    },
  );
};
/* istanbul ignore next */
chrome.windows.onRemoved.addListener(async (id: number) => {
  // A restarted service worker reads back its windows and its request first. Otherwise nothing waits here.
  if (!dialogs.has(id) || !RequestTracker.isRestored()) {
    await loadDialogs();
    await RequestTracker.restored();
  }
  const owner = dialogs.get(id);
  if (dialogs.delete(id)) saveDialogs();
  if (closing.delete(id) || !owner) return;
  // Only closing an open request's own window cancels it: a replaced or answered one's page has its
  // answer, and one being signed, even without a window's Confirm, goes on. Decided before anything
  // waits, and closed at once, so nothing can start for it while the page is told.
  if (
    approved ||
    RequestTracker.isSending(owner.token) ||
    !RequestTracker.isOpen(owner.token, owner.requestId)
  ) {
    return;
  }
  const asked = RequestTracker.asked();
  RequestTracker.answered(owner.token, owner.requestId);
  const message = await chrome.i18n.getMessage('bgd_lifecycle_request_canceled');
  const saved = await RequestsHandler.getFromLocalStorage();
  const savedIsIt =
    saved.data.documentToken === owner.token &&
    saved.data.request_id === owner.requestId;
  // Approved before the service worker restarted: it went on, and its page hears how it ended.
  if (savedIsIt && saved.data.confirmed) return;
  if (asked?.tab !== undefined) {
    RequestsHandler.answerTo(asked.tab, asked.replyTo, {
      command: DialogCommand.ANSWER_REQUEST,
      msg: {
        success: false,
        error: 'user_cancel',
        result: null,
        data: asked.request,
        message,
        request_id: owner.requestId,
      },
    });
  }
  if (savedIsIt) saved.reset(true);
});

// check if win exists before removing it
/* istanbul ignore next */
export const removeWindow = (windowId: number) => {
  closing.add(windowId);
  chrome.windows.getAll((windows) => {
    const hasWin = windows.filter((win) => {
      return win.id == windowId;
    }).length;
    if (hasWin) {
      chrome.windows.remove(windowId);
    } else {
      closing.delete(windowId);
    }
  });
};
