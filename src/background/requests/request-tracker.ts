// Which request each document is on, and whether it's being sent. Only the wallet can know, so it
// decides what a page is told: a request replaced before anyone approved it was never sent, and once
// one is being sent, the next has to wait. Telling a site otherwise could get a transfer sent twice.
// In memory, as what it describes goes when the service worker does.
const latest = new Map<string, number>();
const sending = new Set<string>();

export const RequestTracker = {
  isSending: (token?: string) => !!token && sending.has(token),
  accept: (token: string | undefined, requestId: number) => {
    if (token) latest.set(token, requestId);
  },
  isLatest: (token: string | undefined, requestId: number) =>
    !token || !latest.has(token) || latest.get(token) === requestId,
  startSending: (token?: string) => {
    if (token) sending.add(token);
  },
  finishSending: (token?: string) => {
    if (!token) return;
    sending.delete(token);
    latest.delete(token);
  },
};
