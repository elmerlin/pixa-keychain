import { ConversionUtils } from '@hiveapp/utils/conversion.utils';
import { TransactionResult } from '@interfaces/hive-tx.interface';
import { Screen } from '@reference-data/screen.enum';
import '@testing-library/jest-dom';
import { act, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import dataTestIdButton from 'src/__tests__/utils-for-testing/data-testid/data-testid-button';
import dataTestIdDropdown from 'src/__tests__/utils-for-testing/data-testid/data-testid-dropdown';
import dataTestIdInput from 'src/__tests__/utils-for-testing/data-testid/data-testid-input';
import accounts from 'src/__tests__/utils-for-testing/data/accounts';
import initialStates from 'src/__tests__/utils-for-testing/data/initial-states';
import reactTestingLibrary from 'src/__tests__/utils-for-testing/react-testing-library-render/react-testing-library-render-functions';
import { Icons } from 'src/common-ui/icons.enum';
import { HiveAppComponent } from 'src/popup/hive/hive-app.component';
import FormatUtils from 'src/utils/format.utils';

describe('conversion.component tests:\n', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    cleanup();
  });
  beforeEach(async () => {
    await reactTestingLibrary.renderWithConfiguration(
      <HiveAppComponent />,
      initialStates.iniStateAs.defaultExistent,
    );
  });
  describe('PIXA to PXS:\n', () => {
    beforeEach(async () => {
      await act(async () => {
        await userEvent.click(
          screen.getByTestId(dataTestIdDropdown.arrow.hive),
        );
        await userEvent.click(
          screen.getByTestId(dataTestIdDropdown.itemPreFix + Icons.CONVERT),
        );
      });
    });

    it('Must show conversions page & show PIXA intro', async () => {
      expect(
        await screen.findByTestId(`${Screen.CONVERSION_PAGE}-page`),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(
          chrome.i18n.getMessage('popup_html_convert_hive_intro'),
        ),
      ).toBeInTheDocument();
    });

    it('Must convert PIXA to PXS, with max value & show message', async () => {
      ConversionUtils.sendConvert = jest.fn().mockResolvedValue({
        tx_id: 'tx_id',
        id: 'id',
        confirmed: true,
      } as TransactionResult);
      await act(async () => {
        await userEvent.clear(screen.getByTestId(dataTestIdInput.amount));
        await userEvent.type(
          screen.getByTestId(dataTestIdInput.amount),
          parseFloat(
            accounts.extended.balance.toString().split(' ')[0],
          ).toString(),
        );
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.submit),
        );
      });
      expect(
        await screen.findByText(
          `${FormatUtils.formatCurrencyValue(
            parseFloat(accounts.extended.balance.toString().split(' ')[0]),
          )} PIXA`,
        ),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(
          chrome.i18n.getMessage('popup_html_confirm_hive_to_hbd_conversion'),
        ),
      ).toBeInTheDocument();
      await act(async () => {
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.dialog.confirm),
        );
      });
      expect(
        await screen.findByText(
          chrome.i18n.getMessage('popup_html_hive_to_hbd_conversion_success'),
        ),
      ).toBeInTheDocument();
    });

    it('Must show error if PIXA convertion fails', async () => {
      ConversionUtils.sendConvert = jest.fn().mockResolvedValue(null);
      await act(async () => {
        await userEvent.clear(screen.getByTestId(dataTestIdInput.amount));
        await userEvent.type(
          screen.getByTestId(dataTestIdInput.amount),
          parseFloat(
            accounts.extended.balance.toString().split(' ')[0],
          ).toString(),
        );
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.submit),
        );
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.dialog.confirm),
        );
      });
      expect(
        await screen.findByText(
          chrome.i18n.getMessage('popup_html_hive_to_hbd_conversion_fail'),
        ),
      ).toBeInTheDocument();
    });

    it('Must catch error and show message', async () => {
      ConversionUtils.sendConvert = jest
        .fn()
        .mockRejectedValue(new Error('Error PIXA to PXS'));
      await act(async () => {
        await userEvent.clear(screen.getByTestId(dataTestIdInput.amount));
        await userEvent.type(
          screen.getByTestId(dataTestIdInput.amount),
          parseFloat(
            accounts.extended.balance.toString().split(' ')[0],
          ).toString(),
        );
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.submit),
        );
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.dialog.confirm),
        );
      });
      expect(await screen.findByText('Error PIXA to PXS')).toBeInTheDocument();
    });
  });

  describe('PXS to PIXA:\n', () => {
    beforeEach(async () => {
      await act(async () => {
        await userEvent.click(screen.getByTestId(dataTestIdDropdown.arrow.hbd));
        await userEvent.click(
          screen.getByTestId(dataTestIdDropdown.itemPreFix + Icons.CONVERT),
        );
      });
    });

    it('Must show conversions page & show PXS intro', async () => {
      expect(
        await screen.findByTestId(`${Screen.CONVERSION_PAGE}-page`),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(
          chrome.i18n.getMessage('popup_html_convert_hbd_intro'),
        ),
      ).toBeInTheDocument();
    });

    it('Must convert PXS to PIXA, with max value & show message', async () => {
      ConversionUtils.sendConvert = jest.fn().mockResolvedValue({
        tx_id: 'tx_id',
        id: 'id',
        confirmed: true,
      } as TransactionResult);
      await act(async () => {
        await userEvent.clear(screen.getByTestId(dataTestIdInput.amount));
        await userEvent.type(
          screen.getByTestId(dataTestIdInput.amount),
          parseFloat(
            accounts.extended.pxs_balance.toString().split(' ')[0],
          ).toString(),
        );
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.submit),
        );
      });
      expect(
        await screen.findByText(
          `${FormatUtils.formatCurrencyValue(
            parseFloat(accounts.extended.pxs_balance.toString().split(' ')[0]),
          )} PXS`,
        ),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(
          chrome.i18n.getMessage('popup_html_confirm_hbd_to_hive_conversion'),
        ),
      ).toBeInTheDocument();
      await act(async () => {
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.dialog.confirm),
        );
      });
      expect(
        await screen.findByText(
          chrome.i18n.getMessage('popup_html_hbd_to_hive_conversion_success'),
        ),
      ).toBeInTheDocument();
    });

    it('Must show error if PXS convertion fails', async () => {
      ConversionUtils.sendConvert = jest.fn().mockResolvedValue(null);
      await act(async () => {
        await userEvent.clear(screen.getByTestId(dataTestIdInput.amount));
        await userEvent.type(
          screen.getByTestId(dataTestIdInput.amount),
          parseFloat(
            accounts.extended.pxs_balance.toString().split(' ')[0],
          ).toString(),
        );
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.submit),
        );
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.dialog.confirm),
        );
      });
      expect(
        await screen.findByText(
          chrome.i18n.getMessage('popup_html_hbd_to_hive_conversion_fail'),
        ),
      ).toBeInTheDocument();
    });

    it('Must catch error and show message', async () => {
      ConversionUtils.sendConvert = jest
        .fn()
        .mockRejectedValue(new Error('Error PXS to PIXA'));
      await act(async () => {
        await userEvent.clear(screen.getByTestId(dataTestIdInput.amount));
        await userEvent.type(
          screen.getByTestId(dataTestIdInput.amount),
          parseFloat(
            accounts.extended.pxs_balance.toString().split(' ')[0],
          ).toString(),
        );
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.submit),
        );
        await userEvent.click(
          await screen.findByTestId(dataTestIdButton.dialog.confirm),
        );
      });
      expect(await screen.findByText('Error PXS to PIXA')).toBeInTheDocument();
    });
  });
});
