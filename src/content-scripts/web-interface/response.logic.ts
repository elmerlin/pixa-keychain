import Joi from 'joi';
import {
  KeychainRequest,
  RequestResponse,
} from 'src/interfaces/keychain.interface';

export const cancelPreviousRequest = (prevReq: KeychainRequest) => {
  const response = {
    success: false,
    error: 'ignored',
    result: null,
    message: 'User ignored this transaction',
    data: prevReq,
    request_id: prevReq.request_id,
  };
  sendResponse(response);
};

export const sendRequestToBackground = (
  req: KeychainRequest,
  documentToken: string,
  chrome: typeof globalThis.chrome,
) => {
  chrome.runtime.sendMessage({
    command: 'sendRequest',
    request: req,
    domain: window.location.hostname,
    request_id: req.request_id,
    documentToken,
  });
};

export const sendBusyResponse = (value: KeychainRequest) => {
  sendResponse({
    success: false,
    error: 'busy',
    result: null,
    message: 'The last request is still being sent. Wait for its answer.',
    data: value,
    request_id: value.request_id,
  });
};

export const sendIncompleteDataResponse = (
  value: KeychainRequest,
  error: string | Joi.ValidationError,
) => {
  let message = typeof error === 'string' ? error : error.stack!;
  var response = {
    success: false,
    error: 'incomplete',
    result: null,
    message,
    data: value,
    request_id: value.request_id,
  };
  sendResponse(response);
};
/* istanbul ignore next */
export const sendResponse = (response: RequestResponse) => {
  window.postMessage(
    {
      type: 'pixa_keychain_response',
      response,
    },
    window.location.origin,
  );
};
