import {
  createPopup,
  noteApproval,
  removeWindow,
  toDialog,
} from '@background/requests/dialog-lifecycle';
import { RequestsHandler } from '@background/requests/request-handler';
import { RequestTracker } from '@background/requests/request-tracker';
import * as DialogLifeCycle from 'src/background/requests/dialog-lifecycle';
import LocalStorageUtils from 'src/utils/localStorage.utils';

// Chrome's window calls, answering as Chrome does, numbering new windows from 10.
const opening = () => {
  let next = 10;
  jest.spyOn(chrome.windows, 'getCurrent').mockImplementation(((callback: any) =>
    callback({ width: 1200, left: 0, top: 0 })) as any);
  jest.spyOn(chrome.windows, 'create').mockImplementation(((_: any, callback: any) =>
    callback({ id: next++ })) as any);
  jest.spyOn(chrome.windows, 'update').mockImplementation(((_: any, __: any, callback: any) =>
    callback()) as any);
  jest.spyOn(chrome.windows, 'getAll').mockImplementation((() => undefined) as any);
  jest.spyOn(LocalStorageUtils, 'saveValueInLocalStorage').mockResolvedValue(undefined as any);
  // Closing a window tells the listeners, as Chrome does.
  return jest.spyOn(chrome.windows, 'remove').mockImplementation(((id: number) => {
    chrome.windows.onRemoved.callListeners(id);
    return Promise.resolve();
  }) as any);
};


describe('dialog-lifecycle tests:\n', () => {
  afterEach(() => {
    RequestTracker.clear();
    jest.clearAllMocks();
    jest.resetModules();
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  describe('closing the window:\n', () => {
    // Opens the window for a request from page-token, numbered 4 in tab 2, then closes it as the person would.
    const closeWindow = async (
      confirmed: boolean,
      before: () => void = () => undefined,
    ) => {
      opening();
      const handler = new RequestsHandler();
      handler.data = {
        documentToken: 'page-token',
        tab: 2,
        frameId: 3,
        request_id: 4,
        confirmed: false,
        isWaitingForConfirmation: false,
      };
      RequestTracker.accept('page-token', 4, {
        tab: 2,
        replyTo: { frameId: 3, documentToken: 'page-token' },
        request: { type: 'vote' },
      });
      await createPopup(() => {}, handler);
      const windowId = (chrome.windows.create as jest.Mock).mock.results.length
        ? 10
        : -1;
      handler.data.confirmed = confirmed;
      jest
        .spyOn(RequestsHandler, 'getFromLocalStorage')
        .mockResolvedValue(handler);
      jest.spyOn(RequestsHandler, 'clearLocalStorage').mockResolvedValue();
      chrome.i18n.getMessage = jest.fn().mockReturnValue('Cancelled');
      const send = jest
        .spyOn(chrome.tabs, 'sendMessage')
        .mockImplementation();
      before();
      chrome.windows.onRemoved.callListeners(windowId);
      await new Promise((resolve) => setTimeout(resolve));
      return send;
    };

    it('Must report a cancel while waiting for approval', async () => {
      const send = await closeWindow(false);
      expect(send).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          message: expect.objectContaining({
            msg: expect.objectContaining({
              error: 'user_cancel',
              request_id: 4,
            }),
          }),
        }),
        { frameId: 3 },
        expect.any(Function),
      );
    });

    it('Must not report a cancel once approved', async () => {
      const send = await closeWindow(true);
      expect(send).not.toHaveBeenCalled();
    });

    it('Must not report a cancel while it is being signed without a review', async () => {
      // Unlocked, then signed under a saved approval: no Confirm, but it's going out.
      const send = await closeWindow(false, () => RequestTracker.startSending('page-token'));
      expect(send).not.toHaveBeenCalled();
    });

    it('Must not report a cancel for a request another one replaced', async () => {
      // Its page has already been told. The window closing is the newer request making room.
      const send = await closeWindow(false, () => RequestTracker.accept('another-page', 9));
      expect(send).not.toHaveBeenCalled();
    });

    it('Must not report a cancel for a window that was never the wallet\'s', async () => {
      const send = jest.spyOn(chrome.tabs, 'sendMessage').mockImplementation();
      chrome.windows.onRemoved.callListeners(12345);
      await new Promise((resolve) => setTimeout(resolve));
      expect(send).not.toHaveBeenCalled();
    });

    it('Must not report a cancel if closed straight after approving', async () => {
      // Not saved yet: the approval is still on its way to storage.
      const send = await closeWindow(false, () => noteApproval());
      expect(send).not.toHaveBeenCalled();
    });

    it('Must close the request the moment its window closes', async () => {
      // Nothing may start for it, such as signing once a check finishes, while its page is being told.
      let openRightAfter: boolean | undefined;
      await closeWindow(false, () => {
        queueMicrotask(() => (openRightAfter = RequestTracker.isOpen('page-token', 4)));
      });
      expect(openRightAfter).toBe(false);
    });

    it('Must still report a cancel after other windows came and went', async () => {
      const send = await closeWindow(false);
      expect(send).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          message: expect.objectContaining({
            msg: expect.objectContaining({ error: 'user_cancel', request_id: 4 }),
          }),
        }),
        { frameId: 3 },
        expect.any(Function),
      );
    });
  });

  describe('one window at a time:\n', () => {
    const handlerFor = (documentToken: string, request_id: number) => {
      const handler = new RequestsHandler();
      handler.data = { documentToken, request_id, confirmed: false, isWaitingForConfirmation: false };
      return handler;
    };

    it('Must close a window left over from an earlier request before opening one', async () => {
      const remove = opening();
      RequestTracker.accept('page', 1);
      await createPopup(() => {}, handlerFor('page', 1));
      RequestTracker.accept('page', 2);
      await createPopup(() => {}, handlerFor('page', 2));
      expect(remove).toHaveBeenCalledWith(10);
    });

    it('Must not open a window for a request that has been replaced', async () => {
      opening();
      RequestTracker.accept('page', 3);
      const create = jest.spyOn(chrome.windows, 'create');
      await createPopup(() => {}, handlerFor('page', 2));
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('what reaches a window:\n', () => {
    it('Must only send the current request its window', () => {
      const send = jest.spyOn(chrome.runtime, 'sendMessage').mockImplementation();
      const handler = new RequestsHandler();
      handler.data = { documentToken: 'page', request_id: 1, confirmed: false, isWaitingForConfirmation: false };
      RequestTracker.accept('page', 1);
      toDialog(handler, { command: 'x' });
      expect(send).toHaveBeenCalledTimes(1);
      RequestTracker.accept('another-page', 2);
      toDialog(handler, { command: 'x' });
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('Must not cancel when the wallet closes a window itself', async () => {
      jest.spyOn(chrome.windows, 'getAll').mockImplementation(((callback: any) =>
        callback([{ id: 1 }])) as any);
      jest.spyOn(chrome.windows, 'remove').mockImplementation((() => Promise.resolve()) as any);
      const handler = new RequestsHandler();
      handler.data = { windowId: 1, tab: 2, frameId: 3, request_id: 4, confirmed: false, isWaitingForConfirmation: false };
      jest.spyOn(RequestsHandler, 'getFromLocalStorage').mockResolvedValue(handler);
      const clear = jest.spyOn(RequestsHandler, 'clearLocalStorage').mockResolvedValue();
      const send = jest.spyOn(chrome.tabs, 'sendMessage').mockImplementation();
      removeWindow(1);
      chrome.windows.onRemoved.callListeners(1);
      await new Promise((resolve) => setTimeout(resolve));
      expect(send).not.toHaveBeenCalled();
      expect(clear).not.toHaveBeenCalled();
    });

    it('Must open one window at a time, the newest request last', async () => {
      opening();
      const create = jest.spyOn(chrome.windows, 'create');
      const first = new RequestsHandler();
      first.data = { documentToken: 'page', request_id: 1, confirmed: false, isWaitingForConfirmation: false };
      const second = new RequestsHandler();
      second.data = { documentToken: 'page', request_id: 2, confirmed: false, isWaitingForConfirmation: false };
      RequestTracker.accept('page', 1);
      const opened = createPopup(() => {}, first);
      RequestTracker.accept('page', 2);
      await Promise.all([opened, createPopup(() => {}, second)]);
      // The first was replaced before its window opened, so only the second's did.
      expect(create).toHaveBeenCalledTimes(1);
    });
  });

  describe('createPopup cases:\n', () => {
    it('Must createPopup', async () => {
      opening();
      const requestHandler = new RequestsHandler();
      const sSetConfirmed = jest.spyOn(requestHandler, 'setConfirmed');
      const sGetCurrent = jest.spyOn(chrome.windows, 'getCurrent');
      await createPopup(() => {}, requestHandler);
      expect(sSetConfirmed).toHaveBeenCalledWith(false);
      expect(sGetCurrent).toHaveBeenCalledTimes(1);
    });

    it('Must createPopup with windowId as undefined', async () => {
      opening();
      const requestHandler = new RequestsHandler();
      requestHandler.data.windowId = 1;
      const sSetConfirmed = jest.spyOn(requestHandler, 'setConfirmed');
      const sGetCurrent = jest.spyOn(chrome.windows, 'getCurrent');
      const sRemoveWindow = jest.spyOn(DialogLifeCycle, 'removeWindow');
      const sSetWindowId = jest.spyOn(requestHandler, 'setWindowId');
      await createPopup(async () => {}, requestHandler);
      expect(sSetConfirmed).toHaveBeenCalledWith(false);
      expect(sRemoveWindow).toHaveBeenCalledWith(1);
      expect(sSetWindowId).toHaveBeenCalledWith(undefined);
      expect(sGetCurrent).toHaveBeenCalledTimes(1);
    });
  });
});
