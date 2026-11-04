import {
  broadcastAddAccountAuthority,
  broadcastAddKeyAuthority,
  broadcastRemoveAccountAuthority,
  broadcastRemoveKeyAuthority,
} from '@background/requests/operations/ops/authority';
import { RequestsHandler } from '@background/requests/request-handler';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import mocksImplementation from 'src/__tests__/utils-for-testing/implementations/implementations';

describe('authority tests:\n', () => {
  const username = 'alice';
  const reviewedOperation = [
    'account_update',
    {
      account: username,
      posting: { weight_threshold: 1, account_auths: [['bob', 1]], key_auths: [] },
      memo_key: 'PIXmemo',
      json_metadata: '',
    },
  ];
  const cases = [
    ['add account', broadcastAddAccountAuthority, { authorizedUsername: 'bob', weight: 1 }],
    ['remove account', broadcastRemoveAccountAuthority, { authorizedUsername: 'bob' }],
    ['add key', broadcastAddKeyAuthority, { authorizedKey: 'PIXkey', weight: 1 }],
    ['remove key', broadcastRemoveKeyAuthority, { authorizedKey: 'PIXkey' }],
  ] as const;
  const handler = () => {
    const requestHandler = new RequestsHandler();
    requestHandler.data.key = 'activeWif';
    return requestHandler;
  };

  beforeEach(() => {
    chrome.i18n.getMessage = jest
      .fn()
      .mockImplementation(mocksImplementation.i18nGetMessageCustom);
  });
  afterEach(() => jest.restoreAllMocks());

  describe.each(cases)('%s', (_, broadcast, request) => {
    const data = {
      username,
      role: 'Posting',
      request_id: 1,
      ...request,
    } as never;

    it('Signs exactly what was reviewed, and reads nothing again', async () => {
      const send = jest
        .spyOn(HiveTxUtils, 'sendOperation')
        .mockResolvedValue({ tx_id: 'id', confirmed: true } as never);
      const read = jest.spyOn(AccountUtils, 'getExtendedAccount');
      const result = await broadcast(handler(), {
        ...(data as object),
        reviewedOperation,
      } as never);
      expect(result.msg.success).toBe(true);
      expect(send).toHaveBeenCalledWith(
        [reviewedOperation],
        'activeWif',
        false,
        undefined,
      );
      expect(read).not.toHaveBeenCalled();
    });

    it.each([
      ['nothing was reviewed', undefined],
      ['it is about another account', ['account_update', { account: 'mallory' }]],
      ['it is another kind of operation', ['transfer', { account: username }]],
      [
        'it touches the owner role',
        ['account_update', { account: username, owner: { key_auths: [] } }],
      ],
    ])('Sends nothing when %s', async (__, operation) => {
      const send = jest.spyOn(HiveTxUtils, 'sendOperation');
      const result = await broadcast(handler(), {
        ...(data as object),
        reviewedOperation: operation,
      } as never);
      expect(result.msg.success).toBe(false);
      expect(result.msg.message).toBe(
        chrome.i18n.getMessage('bgd_ops_authority_not_reviewed'),
      );
      expect(send).not.toHaveBeenCalled();
    });

    it('Says why the chain refused', async () => {
      jest
        .spyOn(HiveTxUtils, 'sendOperation')
        .mockRejectedValue(new Error('html_popup_error_while_signing_transaction'));
      const result = await broadcast(handler(), {
        ...(data as object),
        reviewedOperation,
      } as never);
      expect(result.msg.success).toBe(false);
      expect(result.msg.message).toBe(
        chrome.i18n.getMessage('html_popup_error_while_signing_transaction'),
      );
    });
  });
});
