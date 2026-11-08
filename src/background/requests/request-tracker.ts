// Which request each document is on, and whether it's being sent. Only the wallet can know, so it
// decides what a page is told: a request replaced before anyone approved it was never sent, and once
// one is being sent, the next has to wait. Telling a site otherwise could get a transfer sent twice.
// In memory, as what it describes goes when the service worker does.
// The latest is kept after it's sent, so a request it replaced can never become the latest again.
const latest = new Map<string, number>();
const sending = new Set<string>();

/** A request, and how to answer the page that sent it. */
export type Asked = {
  token?: string;
  requestId?: number;
  tab?: number;
  replyTo?: { frameId?: number; documentId?: string; documentToken?: string };
  request?: unknown;
  answered?: boolean;
};

// The one request the wallet is on, from whichever page: there's one window at a time, so a request from
// anywhere replaces it. Nothing left over from a replaced request may change what's saved or shown for this
// one. Kept here rather than in storage, so a page can be answered even if nothing was saved for it yet.
let current: Asked | null = null;

// Kept in session storage too, without a site's keys, so a restarted service worker still knows it and can answer
// its page. Memory-only storage that pages can't reach, and gone when the browser closes.
const SESSION_KEY = 'currentRequest';
const persist = async () => {
  try {
    const saved = current && {
      ...current,
      request:
        current.request && typeof current.request === 'object'
          ? { ...(current.request as object), keys: undefined }
          : current.request,
    };
    await chrome.storage.session.set({ [SESSION_KEY]: saved });
  } catch (e) {}
};
let restored = false;
const restoring: Promise<void> = (async () => {
  try {
    const saved = (await chrome.storage.session.get(SESSION_KEY))[SESSION_KEY];
    if (saved && !current) current = saved;
  } catch (e) {}
  restored = true;
})();

export const RequestTracker = {
  /** The request the wallet is on, and how to answer its page. */
  asked: (): Readonly<Asked> | null => current,
  /** Waits for what a restarted service worker remembers. */
  restored: () => restoring,
  isRestored: () => restored,
  isSending: (token?: string) => !!token && sending.has(token),
  /** Makes this the request the wallet is on, and returns the one it replaced, if any. */
  accept: (
    token: string | undefined,
    requestId: number,
    asked: Omit<Asked, 'token' | 'requestId'> = {},
  ) => {
    const replaced = current;
    current = { ...asked, token, requestId };
    if (token) latest.set(token, requestId);
    persist();
    return replaced;
  },
  isCurrent: (token?: string, requestId?: number) =>
    !current || (current.token === token && current.requestId === requestId),
  /** Current, and its page hasn't had an answer: cancelled or done, nothing more may start for it. */
  isOpen: (token?: string, requestId?: number) =>
    !current ||
    (current.token === token && current.requestId === requestId && !current.answered),
  /** Its page has its answer, so replacing it later tells that page nothing more. */
  answered: (token?: string, requestId?: number) => {
    if (current && current.token === token && current.requestId === requestId) {
      current.answered = true;
      persist();
    }
  },
  isLatest: (token: string | undefined, requestId: number) =>
    !token || !latest.has(token) || latest.get(token) === requestId,
  startSending: (token?: string) => {
    if (token) sending.add(token);
  },
  finishSending: (token?: string) => {
    if (!token) return;
    sending.delete(token);
  },
  /** Forgets everything, as a restarted service worker does. */
  clear: () => {
    latest.clear();
    sending.clear();
    current = null;
  },
};
