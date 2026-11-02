import {
  KeychainRequestTypes,
  RequestTransfer,
} from '@interfaces/keychain.interface';
import { DefaultRpcs } from '@reference-data/default-rpc.list';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { useTransferCheck } from 'src/dialog/hooks/transfer-check';
import PhishingUtils from 'src/utils/phishing.utils';
import TransferUtils from 'src/popup/hive/utils/transfer.utils';

const data = {
  type: KeychainRequestTypes.transfer,
  username: 'alice',
  to: 'bob',
  amount: '10.000',
  memo: '',
  currency: 'PIXA',
} as RequestTransfer;
const Check = () => (
  <output data-testid="warning">
    {useTransferCheck(data, DefaultRpcs[0]) ?? ''}
  </output>
);

describe('useTransferCheck', () => {
  afterEach(() => jest.restoreAllMocks());

  it('checks PIXA transfer warnings with the empty local phishing list', async () => {
    const list = jest.spyOn(PhishingUtils, 'getPhishingAccounts');
    const warning = jest
      .spyOn(TransferUtils, 'getTransferWarningLabel')
      .mockReturnValue(null);
    render(<Check />);
    await waitFor(() =>
      expect(warning).toHaveBeenCalledWith('bob', 'PIXA', '', []),
    );
    expect(list).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('warning').textContent).toBe('');
  });

  it('shows a transfer warning returned by the transfer checks', async () => {
    jest
      .spyOn(TransferUtils, 'getTransferWarningLabel')
      .mockReturnValue('A memo is required');
    render(<Check />);
    await waitFor(() =>
      expect(screen.getByTestId('warning').textContent).toBe(
        'A memo is required',
      ),
    );
  });

  it('shows a phishing warning if a local list contains the recipient', async () => {
    jest.spyOn(PhishingUtils, 'getPhishingAccounts').mockResolvedValue(['bob']);
    jest
      .spyOn(chrome.i18n, 'getMessage')
      .mockReturnValue('Suspicious recipient: bob');
    render(<Check />);
    await waitFor(() =>
      expect(screen.getByTestId('warning').textContent).toBe(
        'Suspicious recipient: bob',
      ),
    );
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith(
      'popup_warning_phishing',
      ['bob'],
    );
  });
});
