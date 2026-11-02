import TransferUtils from '@hiveapp/utils/transfer.utils';
import userData from 'src/__tests__/utils-for-testing/data/user-data';

describe('transfer memo review', () => {
  beforeEach(() => {
    chrome.i18n.getMessage = jest.fn((key) => key);
  });

  it.each(['', '#'])('warns about private keys in %s memos', (prefix) => {
    expect(
      TransferUtils.getTransferWarningLabel(
        'recipient',
        'HIVE',
        prefix + userData.one.nonEncryptKeys.active,
        [],
      ),
    ).toBe('popup_warning_private_key_in_memo');
  });

  it('allows ordinary memos without a remote account list', () => {
    expect(
      TransferUtils.getTransferWarningLabel(
        'recipient',
        'HIVE',
        'Payment for lunch',
        [],
        true,
      ),
    ).toBeUndefined();
  });

  it('retains warnings for an explicitly supplied phishing account', () => {
    expect(
      TransferUtils.getTransferWarningLabel('recipient', 'HIVE', '', [
        'recipient',
      ]),
    ).toBe('popup_warning_phishing');
  });
});
