// Content script interfacing the website and the extension
/* istanbul ignore file */
import { DialogCommand } from '@reference-data/dialog-message-key.enum';
import schemas, {
  commonRequestParams,
} from 'src/content-scripts/web-interface/input-validation';
import {
  cancelPreviousRequest,
  sendBusyResponse,
  sendIncompleteDataResponse,
  sendRequestToBackground,
  sendResponse,
} from 'src/content-scripts/web-interface/response.logic';
import { KeychainRequest } from 'src/interfaces/keychain.interface';
import Logger from 'src/utils/logger.utils';
if (window.chrome) {
  //@ts-ignore
  window.chrome.storage = undefined;
}

let req: KeychainRequest | null = null;
// When the wallet started sending it. From then on it can't be called off.
let startedAt = 0;
// A service worker can die without answering, so this doesn't hold a page up forever.
const BUSY_MS = 2 * 60 * 1000;

// Tells this document's answers from anyone else's. A request ID can't: every page picks its own.
const documentToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('');

// Injecting Keychain. Chromium's manifest declares the provider in the page's own world, so only
// Firefox's older manifest needs this script tag.

const setupInjection = () => {
  try {
    var scriptTag = document.createElement('script');
    scriptTag.src = chrome.runtime.getURL('./pixa_keychain.js');
    var container = document.head || document.documentElement;
    container.insertBefore(scriptTag, container.children[0]);
  } catch (e) {
    Logger.error('Pixtopia Keychain injection failed.', e);
  }
};
if (process.env.IS_FIREFOX) setupInjection();
// Answering the handshakes
document.addEventListener('swHandshake_pixa', () => {
  window.postMessage(
    {
      type: 'pixa_keychain_handshake',
    },
    window.location.origin,
  );
});

// Answering the requests
type KeychainRequestWrapper = {
  detail: KeychainRequest;
};
document.addEventListener('swRequest_pixa', (request: object) => {
  const incoming = (request as KeychainRequestWrapper).detail;
  const { error, value } = validateRequest(incoming);
  if (error) {
    sendIncompleteDataResponse(value!, error);
  } else if (req && startedAt && Date.now() - startedAt < BUSY_MS) {
    // Telling a site the one before was ignored, while it goes through, could get it sent twice.
    sendBusyResponse(value);
  } else {
    const prevReq = req;
    req = incoming;
    startedAt = 0;
    sendRequestToBackground(value, documentToken, chrome);
    if (prevReq) {
      cancelPreviousRequest(prevReq);
    }
  }
});

// Get notification from the background upon request completion and pass it back to the dApp.
chrome.runtime.onMessage.addListener(function (obj, sender, sendResp) {
  // Only what's meant for this document. A page that's taken over the frame has its own token.
  if (obj.documentToken !== documentToken || !req) return;
  const { message } = obj;
  if (
    message?.command === DialogCommand.REQUEST_STARTED &&
    message.request_id === req.request_id
  ) {
    startedAt = Date.now();
  } else if (
    message?.command === DialogCommand.ANSWER_REQUEST &&
    message.msg?.request_id === req.request_id
  ) {
    sendResponse(message.msg);
    req = null;
    startedAt = 0;
  }
});

// Request validation
const validateRequest = (req: KeychainRequest) => {
  if (!req) return { value: req, error: 'Missing request.' };
  if (!req.type) return { value: req, error: 'Missing request type.' };
  const schema = schemas[req.type as keyof typeof schemas];
  if (!schema) return { value: req, error: 'Unsupported request type.' };
  return schema.append(commonRequestParams).validate(req);
};
