// Content script interfacing the website and the extension
/* istanbul ignore file */
import { DialogCommand } from '@reference-data/dialog-message-key.enum';
import schemas, {
  commonRequestParams,
} from 'src/content-scripts/web-interface/input-validation';
import {
  cancelPreviousRequest,
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

// Everything still waiting for an answer. The wallet says which of them it's on.
const pending = new Map<number, KeychainRequest>();

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
    Logger.error('PIXA Keychain injection failed.', e);
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
    return;
  }
  pending.set(incoming.request_id, incoming);
  sendRequestToBackground(value, documentToken, chrome);
});

// Get notification from the background upon request completion and pass it back to the dApp.
chrome.runtime.onMessage.addListener(function (obj, sender, sendResp) {
  // Only what's meant for this document. A page that's taken over the frame has its own token.
  if (obj.documentToken !== documentToken) return;
  const { message } = obj;
  if (message?.command === DialogCommand.REQUEST_ACCEPTED) {
    // The wallet's moved on to this one, so anything before it was never sent.
    pending.forEach((earlier, id) => {
      if (id !== message.request_id) {
        cancelPreviousRequest(earlier);
        pending.delete(id);
      }
    });
  } else if (
    message?.command === DialogCommand.ANSWER_REQUEST &&
    pending.has(message.msg?.request_id)
  ) {
    sendResponse(message.msg);
    pending.delete(message.msg.request_id);
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
