import { DialogCommand } from '@reference-data/dialog-message-key.enum';

/* istanbul ignore next */
export const waitUntilDialogIsReady = async (
  ms: number,
  command: DialogCommand,
  callback: () => void,
  nb = 0,
  wanted: () => boolean = () => true,
) => {
  nb++;
  if (!wanted()) return;
  if (await askIfReady(ms, command)) {
    if (wanted()) callback();
  } else {
    waitUntilDialogIsReady(ms, command, callback, nb, wanted);
  }
};
/* istanbul ignore next */
const askIfReady = (ms: number, command: DialogCommand) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(false);
    }, ms);
    chrome.runtime.sendMessage(
      {
        command,
      },
      (resp) => {
        // Nothing is listening until the dialog has loaded, which is why this asks again.
        void chrome.runtime.lastError;
        if (resp) resolve(resp);
      },
    );
  });
};
