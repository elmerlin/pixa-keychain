import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import RequestBalance from 'src/dialog/components/request-balance/request-balance';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import CurrencyUtils, {
  BaseCurrencies,
} from 'src/popup/hive/utils/currency.utils';

const rpc = { uri: 'https://api.pixagram.com', testnet: false };

describe('RequestBalance', () => {
  beforeEach(() => {
    jest.spyOn(AccountUtils, 'getExtendedAccount').mockResolvedValue({
      balance: '12.345 PIXA',
      pxs_balance: '67.890 PXS',
    } as never);
  });
  afterEach(() => jest.restoreAllMocks());

  // This screen is what someone reads before approving a transfer.
  it.each([
    ['PIXA', '12.345 PIXA'],
    ['PXS', '67.890 PXS'],
  ])('shows the %s balance for a %s transfer', async (currency, expected) => {
    render(
      <RequestBalance
        username="pixtopia"
        rpc={rpc}
        amount={1}
        currency={currency}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(new RegExp(expected))).toBeTruthy();
    });
  });
});

describe('CurrencyUtils', () => {
  it.each([
    ['PIXA', 'PIXA'],
    ['pixa', 'PIXA'],
    ['PXS', 'PXS'],
    ['PP', 'PP'],
    [BaseCurrencies.PIXA, 'PIXA'],
    [BaseCurrencies.PXS, 'PXS'],
    // The wallet's internal keys, kept from upstream.
    ['hive', 'PIXA'],
    ['hbd', 'PXS'],
    ['hp', 'PP'],
  ])('labels %s as %s', (currency, label) => {
    expect(CurrencyUtils.getCurrencyLabel(currency, false)).toBe(label);
  });
});
