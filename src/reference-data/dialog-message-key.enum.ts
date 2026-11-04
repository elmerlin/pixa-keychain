export enum DialogCommand {
  UNLOCK = 'UNLOCK',
  SEND_DIALOG_CONFIRM = 'sendDialogConfirm',
  SEND_DIALOG_ERROR = 'sendDialogError',
  REGISTER = 'register',
  BROADCASTING_WITHOUT_CONFIRMATION = 'broadcastingNoConfirm',
  WRONG_MK = 'WRONG_MK',
  ANSWER_REQUEST = 'answerRequest',
  REQUEST_ACCEPTED = 'requestAccepted',
  READY = 'broadcastReady',

  RETURN_SIGNATURE = 'RETURN_SIGNATURE',
  RETURN_ERROR_SIGNING_TRANSACTION = 'RETURN_ERROR_SIGNING_TRANSACTION',

  ADD_ACCOUNT = 'ADD_ACCOUNT',
  PING = 'PING',
}
