import { FavoriteUserUtils } from '@hiveapp/utils/favorite-user.utils';
import { SavingsUtils } from '@hiveapp/utils/savings.utils';
import { TransactionResult } from '@interfaces/hive-tx.interface';
import '@testing-library/jest-dom';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import dataTestIdButton from 'src/__tests__/utils-for-testing/data-testid/data-testid-button';
import dataTestIdDropdown from 'src/__tests__/utils-for-testing/data-testid/data-testid-dropdown';
import dataTestIdInput from 'src/__tests__/utils-for-testing/data-testid/data-testid-input';
import accounts from 'src/__tests__/utils-for-testing/data/accounts';
import initialStates from 'src/__tests__/utils-for-testing/data/initial-states';
import reactTestingLibrary from 'src/__tests__/utils-for-testing/react-testing-library-render/react-testing-library-render-functions';
import { HiveAppComponent } from 'src/popup/hive/hive-app.component';
import { Screen } from 'src/reference-data/screen.enum';
import FormatUtils from 'src/utils/format.utils';

describe('savings.component tests:\n', () => {
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
  describe('PIXA:\n', () => {
    describe('withdraw:\n', () => {
      const hiveSavingsBalance = parseFloat(
        accounts.extended.savings_balance.toString().split(' PIXA')[0],
      );
      beforeEach(async () => {
        await act(async () => {
          await userEvent.click(
            await screen.findByTestId(dataTestIdDropdown.arrow.hive),
          );
          await userEvent.click(
            await screen.findByTestId(dataTestIdDropdown.span.savings),
          );
          fireEvent.click(
            await screen.findByTestId(
              dataTestIdDropdown.select.savings.operation.selector,
            ),
          );
          await userEvent.click(
            await screen.findByTestId(
              dataTestIdDropdown.select.savings.operation.withdraw,
            ),
          );
        });
      });

      it('Must show withdraw message', async () => {
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_withdraw_text'),
            { exact: true },
          ),
        ).toBeInTheDocument();
      });

      it('Must set input to max & load PIXA withdraw confirmation text', async () => {
        await waitFor(() => {
          expect(
            screen.getByTestId(`${Screen.SAVINGS_PAGE}-page`),
          ).not.toHaveTextContent('...');
        });
        await act(async () => {
          await userEvent.click(screen.getByTestId(dataTestIdButton.setToMax));
        });
        await waitFor(() => {
          const amountInput = screen.getByTestId(
            dataTestIdInput.amount,
          ) as HTMLInputElement;
          expect(parseFloat(amountInput.value)).toBeCloseTo(
            hiveSavingsBalance,
            2,
          );
        });
        await act(async () => {
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_confirm_savings_withdraw', [
              'PIXA',
            ]),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error if not enough balance', async () => {
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            String(hiveSavingsBalance + 1),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('validation_error_less_or_equal_value'),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error if operation fails', async () => {
        SavingsUtils.withdraw = jest.fn().mockResolvedValue(null);
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_withdraw_fail', ['PIXA']),
          ),
        ).toBeInTheDocument();
      });

      it('Must show success message in PIXA', async () => {
        SavingsUtils.withdraw = jest.fn().mockResolvedValue({
          tx_id: 'tx_id',
          id: 'id',
          confirmed: true,
        } as TransactionResult);
        FavoriteUserUtils.saveFavoriteUser = jest.fn();
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_withdraw_success', [
              `${FormatUtils.formatCurrencyValue(10)} PIXA`,
            ]),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error in PIXA withdraw', async () => {
        SavingsUtils.withdraw = jest
          .fn()
          .mockRejectedValue(new Error('Error withdraw'));
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(await screen.findByText('Error withdraw')).toBeInTheDocument();
      });
    });

    describe('deposit:\n', () => {
      const hiveBalance = parseFloat(
        accounts.extended.balance.toString().split(' PIXA')[0],
      );
      beforeEach(async () => {
        await act(async () => {
          await userEvent.click(
            await screen.findByTestId(dataTestIdDropdown.arrow.hive),
          );
          await userEvent.click(
            await screen.findByTestId(dataTestIdDropdown.span.savings),
          );
          fireEvent.click(
            await screen.findByTestId(
              dataTestIdDropdown.select.savings.operation.selector,
            ),
          );
          await userEvent.click(
            await screen.findByTestId(
              dataTestIdDropdown.select.savings.operation.deposit,
            ),
          );
        });
      });

      it('Must show deposit PIXA button', async () => {
        expect(
          await screen.findByTestId(dataTestIdButton.operation.savings.submit),
        ).toHaveTextContent('Deposit PIXA');
      });

      it('Must set input to max & load PIXA deposit confirmation text', async () => {
        await waitFor(() => {
          expect(
            screen.getByTestId(`${Screen.SAVINGS_PAGE}-page`),
          ).not.toHaveTextContent('...');
        });
        await act(async () => {
          await userEvent.click(screen.getByTestId(dataTestIdButton.setToMax));
        });
        await waitFor(() => {
          const el = screen.getByTestId(
            dataTestIdInput.amount,
          ) as HTMLInputElement;
          expect(parseFloat(el.value)).toBeCloseTo(hiveBalance, 2);
        });
        await act(async () => {
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_confirm_savings_deposit', [
              'PIXA',
            ]),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error if not enough balance', async () => {
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            String(hiveBalance + 1),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('validation_error_less_or_equal_value'),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error if operation fails', async () => {
        SavingsUtils.deposit = jest.fn().mockResolvedValue(null);
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_deposit_fail', ['PIXA']),
          ),
        ).toBeInTheDocument();
      });

      it('Must show success message in PIXA deposit', async () => {
        SavingsUtils.deposit = jest.fn().mockResolvedValue({
          tx_id: 'tx_id',
          id: 'id',
          confirmed: true,
        } as TransactionResult);
        FavoriteUserUtils.saveFavoriteUser = jest.fn();
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_deposit_success', [
              `${FormatUtils.formatCurrencyValue(10)} PIXA`,
            ]),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error in PIXA desposit', async () => {
        SavingsUtils.deposit = jest
          .fn()
          .mockRejectedValue(new Error('Error deposit'));
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(await screen.findByText('Error deposit')).toBeInTheDocument();
      });
    });
  });

  describe('PXS:\n', () => {
    describe('withdraw:\n', () => {
      const hbdSavingsBalance = parseFloat(
        accounts.extended.savings_pxs_balance.toString().split(' PXS')[0],
      );
      beforeEach(async () => {
        await act(async () => {
          await userEvent.click(
            await screen.findByTestId(dataTestIdDropdown.arrow.hbd),
          );
          await userEvent.click(
            await screen.findByTestId(dataTestIdDropdown.span.savings),
          );
          fireEvent.click(
            await screen.findByTestId(
              dataTestIdDropdown.select.savings.operation.selector,
            ),
          );
          await userEvent.click(
            await screen.findByTestId(
              dataTestIdDropdown.select.savings.operation.withdraw,
            ),
          );
        });
      });

      it('Must show withdraw message', async () => {
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_withdraw_text'),
            { exact: true },
          ),
        ).toBeInTheDocument();
      });

      it('Must set input to max & load PXS withdraw confirmation text', async () => {
        await waitFor(() => {
          expect(
            screen.getByTestId(`${Screen.SAVINGS_PAGE}-page`),
          ).not.toHaveTextContent('...');
        });
        await act(async () => {
          await userEvent.click(screen.getByTestId(dataTestIdButton.setToMax));
        });
        await waitFor(() => {
          const el = screen.getByTestId(
            dataTestIdInput.amount,
          ) as HTMLInputElement;
          expect(parseFloat(el.value)).toBeCloseTo(hbdSavingsBalance, 2);
        });
        await act(async () => {
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_confirm_savings_withdraw', [
              'PXS',
            ]),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error if not enough balance', async () => {
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            String(hbdSavingsBalance + 1),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('validation_error_less_or_equal_value'),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error if operation fails', async () => {
        SavingsUtils.withdraw = jest.fn().mockResolvedValue(null);
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_withdraw_fail', ['PXS']),
          ),
        ).toBeInTheDocument();
      });

      it('Must show success message in PXS', async () => {
        SavingsUtils.withdraw = jest.fn().mockResolvedValue({
          tx_id: 'tx_id',
          id: 'id',
          confirmed: true,
        } as TransactionResult);
        FavoriteUserUtils.saveFavoriteUser = jest.fn();
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_withdraw_success', [
              `${FormatUtils.formatCurrencyValue(10)} PXS`,
            ]),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error in PXS withdraw', async () => {
        SavingsUtils.withdraw = jest
          .fn()
          .mockRejectedValue(new Error('Error withdraw PXS'));
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(
          await screen.findByText('Error withdraw PXS'),
        ).toBeInTheDocument();
      });
    });

    describe('deposit:\n', () => {
      const hbdBalance = parseFloat(
        accounts.extended.pxs_balance.toString().split(' PXS')[0],
      );
      beforeEach(async () => {
        await act(async () => {
          await userEvent.click(
            await screen.findByTestId(dataTestIdDropdown.arrow.hbd),
          );
          await userEvent.click(
            await screen.findByTestId(dataTestIdDropdown.span.savings),
          );
          fireEvent.click(
            await screen.findByTestId(
              dataTestIdDropdown.select.savings.operation.selector,
            ),
          );
          await userEvent.click(
            await screen.findByTestId(
              dataTestIdDropdown.select.savings.operation.deposit,
            ),
          );
        });
      });

      it('Must show deposit PXS button', async () => {
        expect(
          await screen.findByTestId(dataTestIdButton.operation.savings.submit),
        ).toHaveTextContent('Deposit PXS');
      });

      it('Must set input to max & load PXS deposit confirmation text', async () => {
        await waitFor(() => {
          expect(
            screen.getByTestId(`${Screen.SAVINGS_PAGE}-page`),
          ).not.toHaveTextContent('...');
        });
        await act(async () => {
          await userEvent.click(screen.getByTestId(dataTestIdButton.setToMax));
        });
        await waitFor(() => {
          const el = screen.getByTestId(
            dataTestIdInput.amount,
          ) as HTMLInputElement;
          expect(parseFloat(el.value)).toBeCloseTo(hbdBalance, 2);
        });
        await act(async () => {
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_confirm_savings_deposit', [
              'PXS',
            ]),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error if not enough PXS balance', async () => {
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            String(hbdBalance + 1),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('validation_error_less_or_equal_value'),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error if PXS operation fails', async () => {
        SavingsUtils.deposit = jest.fn().mockResolvedValue(null);
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_deposit_fail', ['PXS']),
          ),
        ).toBeInTheDocument();
      });

      it('Must show success message in PXS deposit', async () => {
        SavingsUtils.deposit = jest.fn().mockResolvedValue({
          tx_id: 'tx_id',
          id: 'id',
          confirmed: true,
        } as TransactionResult);
        FavoriteUserUtils.saveFavoriteUser = jest.fn();
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(
          await screen.findByText(
            chrome.i18n.getMessage('popup_html_deposit_success', [
              `${FormatUtils.formatCurrencyValue(10)} PXS`,
            ]),
          ),
        ).toBeInTheDocument();
      });

      it('Must show error in PXS desposit', async () => {
        SavingsUtils.deposit = jest
          .fn()
          .mockRejectedValue(new Error('Error deposit PXS'));
        await act(async () => {
          await userEvent.type(
            screen.getByTestId(dataTestIdInput.amount),
            '10',
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.operation.savings.submit),
          );
          await userEvent.click(
            screen.getByTestId(dataTestIdButton.dialog.confirm),
          );
        });
        expect(
          await screen.findByText('Error deposit PXS'),
        ).toBeInTheDocument();
      });
    });
  });
});
