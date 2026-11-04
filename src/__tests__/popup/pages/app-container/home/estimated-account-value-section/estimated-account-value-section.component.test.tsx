import { Screen } from '@reference-data/screen.enum';
import '@testing-library/jest-dom';
import { act, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import dataTestIdDiv from 'src/__tests__/utils-for-testing/data-testid/data-testid-div';
import dataTestIdToolTip from 'src/__tests__/utils-for-testing/data-testid/data-testid-tool-tip';
import currencies from 'src/__tests__/utils-for-testing/data/currencies';
import initialStates from 'src/__tests__/utils-for-testing/data/initial-states';
import reactTestingLibrary from 'src/__tests__/utils-for-testing/react-testing-library-render/react-testing-library-render-functions';
import { HiveAppComponent } from 'src/popup/hive/hive-app.component';

describe('estimated-account-value-section.component tests:\n', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    cleanup();
  });
  describe('with valid response from hive', () => {
    const accountValue = '999.99';
    const value = () =>
      screen.findByTestId(dataTestIdDiv.estimatedAccountValue);
    const next = async () => {
      await act(async () => {
        await userEvent.click(await value());
      });
    };
    beforeEach(async () => {
      await reactTestingLibrary.renderWithConfiguration(
        <HiveAppComponent />,
        initialStates.iniStateAs.defaultExistent,
        {
          app: {
            currencyPrices: { getPrices: currencies.prices.data },
            accountsRelated: {
              AccountUtils: {
                getAccountValue: accountValue,
              },
            },
          },
        },
      );
    });
    it('Must display the rough value in dollars, with its PXS beside it', async () => {
      expect(await value()).toHaveAccessibleName(
        expect.stringContaining('≈ $'),
      );
      expect(
        await screen.findByText(`${accountValue} PXS`),
      ).toBeInTheDocument();
    });

    it('Must step through PXS, PIXA and hidden, and back', async () => {
      await next();
      expect(await value()).toHaveAccessibleName(
        expect.stringContaining(`PXS ${accountValue}`),
      );
      await next();
      expect(await value()).toHaveAccessibleName(
        expect.stringContaining(`PIXA ${accountValue}`),
      );
      await next();
      expect(await value()).toHaveAccessibleName(
        chrome.i18n.getMessage('popup_html_estimation'),
      );
      expect(screen.queryByText(`${accountValue} PXS`)).toBeNull();
      await next();
      expect(await value()).toHaveAccessibleName(
        expect.stringContaining('≈ $'),
      );
    });

    it('Must open the list of currencies', async () => {
      await act(async () => {
        await userEvent.click(await screen.findByTestId('button-currency'));
      });
      expect(
        await screen.findByTestId(`${Screen.SETTINGS_CURRENCY}-page`),
      ).toBeInTheDocument();
    });

    it('Must display custom tooltip on mouse enter', async () => {
      await act(async () => {
        await userEvent.hover(
          await screen.findByTestId(
            dataTestIdToolTip.custom.estimatedValueSection,
          ),
        );
      });
      expect(
        (await screen.findByTestId(dataTestIdToolTip.content)).innerHTML,
      ).toEqual(chrome.i18n.getMessage('popup_html_estimation_info_text'));
    });
  });

  describe('with no response from hive', () => {
    beforeEach(async () => {
      await reactTestingLibrary.renderWithConfiguration(
        <HiveAppComponent />,
        initialStates.iniStateAs.defaultExistent,
      );
    });
    it('Must display ... when the prices have not arrived', async () => {
      expect(
        await screen.findByTestId(dataTestIdDiv.estimatedAccountValue),
      ).toHaveAccessibleName(expect.stringContaining('...'));
    });
  });
});
