import CurrencyUtils from '@hiveapp/utils/currency.utils';
import { Asset } from '@hiveio/dhive';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import React from 'react';
import accounts from 'src/__tests__/utils-for-testing/data/accounts';
import dynamic from 'src/__tests__/utils-for-testing/data/dynamic.hive';
import initialStates from 'src/__tests__/utils-for-testing/data/initial-states';
import reactTestingLibrary from 'src/__tests__/utils-for-testing/react-testing-library-render/react-testing-library-render-functions';
import { HiveAppComponent } from 'src/popup/hive/hive-app.component';
import FormatUtils from 'src/utils/format.utils';
describe('wallet-info-section.component tests:\n', () => {
  describe('Regular Data:\n', () => {
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
    it('Must show 3 info section rows with specific text content', async () => {
      const hiveBalanceFormatted = FormatUtils.formatCurrencyValue(
        accounts.asArray.extended[0].balance,
      );
      const hiveSavingsBalanceFormatted = FormatUtils.formatCurrencyValue(
        accounts.asArray.extended[0].savings_balance,
      );
      const hbdBalanceFormatted = FormatUtils.formatCurrencyValue(
        accounts.asArray.extended[0].pxs_balance,
      );
      const hbdSavingsBalanceFormatted = FormatUtils.formatCurrencyValue(
        accounts.asArray.extended[0].savings_pxs_balance,
      );
      const delegationsMainValueFormatted = FormatUtils.formatCurrencyValue(
        FormatUtils.toHP(
          accounts.asArray.extended[0].vesting_shares as string,
          dynamic.globalProperties,
        ),
      );
      const toPP = (vests: unknown) =>
        FormatUtils.formatCurrencyValue(
          FormatUtils.toHP(`${vests}`, dynamic.globalProperties),
        );
      const lent = toPP(accounts.asArray.extended[0].delegated_vesting_shares);
      const received = toPP(
        accounts.asArray.extended[0].received_vesting_shares,
      );
      const infoSectionRowListHTMLElements = await screen.findAllByTestId(
        /^dropdown-arrow-/,
      );
      expect(infoSectionRowListHTMLElements).toHaveLength(3);
      const savingsLabel = chrome.i18n.getMessage('popup_html_wallet_savings');
      expect(infoSectionRowListHTMLElements[0].textContent).toBe(
        `${CurrencyUtils.getCurrencyLabels(false).hive}${hiveBalanceFormatted}+${hiveSavingsBalanceFormatted} ${savingsLabel}`,
      );
      expect(infoSectionRowListHTMLElements[1].textContent).toBe(
        `${CurrencyUtils.getCurrencyLabels(false).hbd}${hbdBalanceFormatted}+${hbdSavingsBalanceFormatted} ${savingsLabel}`,
      );
      expect(infoSectionRowListHTMLElements[2].textContent).toBe(
        `${CurrencyUtils.getCurrencyLabels(false).hp}${delegationsMainValueFormatted}-${lent} ${chrome.i18n.getMessage(
          'popup_html_wallet_lent',
        )}+${received} ${chrome.i18n.getMessage('popup_html_wallet_received')}`,
      );
    });
  });

  describe('Delegations:\n', () => {
    const render = (delegated: string, received: string) =>
      reactTestingLibrary.renderWithConfiguration(
        <HiveAppComponent />,
        initialStates.iniStateAs.defaultExistent,
        {
          app: {
            accountsRelated: {
              AccountUtils: {
                getExtendedAccount: {
                  ...accounts.extended,
                  delegated_vesting_shares: delegated,
                  received_vesting_shares: received,
                },
              },
            },
          },
        },
      );
    const subValues = async () =>
      [
        ...(await screen.findByTestId('dropdown-arrow-pp')).querySelectorAll(
          '.sub-value',
        ),
      ].map((element) => element.textContent);
    const lentLabel = () => chrome.i18n.getMessage('popup_html_wallet_lent');
    const receivedLabel = () =>
      chrome.i18n.getMessage('popup_html_wallet_received');

    it('Must show what is lent and what is received apart, not their difference', async () => {
      await render('150.000000 VESTS', '100.000000 VESTS');
      const pp = (vests: string) =>
        FormatUtils.formatCurrencyValue(
          FormatUtils.toHP(vests, dynamic.globalProperties),
        );
      expect(await subValues()).toEqual([
        `-${pp('150')} ${lentLabel()}`,
        `+${pp('100')} ${receivedLabel()}`,
      ]);
    });
    it('Must leave out what is zero', async () => {
      await render('0.000000 VESTS', '100.000000 VESTS');
      expect(await subValues()).toHaveLength(1);
      expect((await subValues())[0]).toContain(receivedLabel());
    });
    it('Must show both even when they cancel out', async () => {
      await render('100.000000 VESTS', '100.000000 VESTS');
      expect(await subValues()).toHaveLength(2);
    });
  });

  describe('Irregular Data:\n', () => {
    describe('0 as balances', () => {
      beforeEach(async () => {
        await reactTestingLibrary.renderWithConfiguration(
          <HiveAppComponent />,
          initialStates.iniStateAs.defaultExistent,
          {
            app: {
              accountsRelated: {
                AccountUtils: {
                  getExtendedAccount: {
                    ...accounts.extended,
                    delegated_vesting_shares: new Asset(0, 'VESTS'),
                    received_vesting_shares: new Asset(0, 'VESTS'),
                    balance: new Asset(0, 'PIXA'),
                    savings_balance: new Asset(0, 'PXS'),
                    pxs_balance: new Asset(0, 'PXS'),
                    savings_pxs_balance: new Asset(0, 'PXS'),
                    vesting_shares: new Asset(0, 'VESTS'),
                  },
                },
              },
            },
          },
        );
      });
      it('Must show 3 info section rows with zero values', async () => {
        const infoSectionRowListHTMLElements = await screen.findAllByTestId(
          /^dropdown-arrow-/,
        );
        expect(infoSectionRowListHTMLElements).toHaveLength(3);
        expect(infoSectionRowListHTMLElements[0].textContent).toBe(
          `${CurrencyUtils.getCurrencyLabels(false).hive}0.000`,
        );
        expect(infoSectionRowListHTMLElements[1].textContent).toBe(
          `${CurrencyUtils.getCurrencyLabels(false).hbd}0.000`,
        );
        expect(infoSectionRowListHTMLElements[2].textContent).toBe(
          `${CurrencyUtils.getCurrencyLabels(false).hp}0.000`,
        );
      });
    });
  });
});
