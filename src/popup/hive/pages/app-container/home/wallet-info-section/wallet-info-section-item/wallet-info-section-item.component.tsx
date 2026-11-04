import {
  ActionButton,
  WalletInfoSectionActions,
} from '@popup/hive/pages/app-container/home/wallet-info-section/wallet-info-section-actions';
import { WalletInfoSectionItemButton } from '@popup/hive/pages/app-container/home/wallet-info-section/wallet-info-section-item/wallet-info-section-item-button/wallet-info-section-item-button.component';
import { navigateToWithParams } from '@popup/multichain/actions/navigation.actions';
import { RootState } from '@popup/multichain/store';
import { Screen } from '@reference-data/screen.enum';
import React, { BaseSyntheticEvent, useEffect, useRef } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';
import FormatUtils from 'src/utils/format.utils';

/**
 * Stable `data-testid` for wallet row actions.
 * Matches `src/__tests__/utils-for-testing/data-testid/data-testid-dropdown.ts`.
 */
const walletInfoSectionActionButtonTestId = (
  tokenSymbol: string,
  label: string,
): string | undefined => {
  switch (label) {
    case 'popup_html_send':
      return `dropdown-menu-item-${SVGIcons.WALLET_SEND}`;
    case 'popup_html_convert':
      return `dropdown-menu-item-${SVGIcons.WALLET_CONVERT}`;
    case 'popup_html_savings':
      return 'dropdown-menu-item-savings';
    case 'popup_html_pu':
      return 'dropdown-menu-item-arrow_upward';
    case 'popup_html_delegate_short':
      return `dropdown-menu-item-${SVGIcons.WALLET_HP_DELEGATIONS}`;
    case 'popup_html_delegate_rc_short':
      return `dropdown-menu-item-${SVGIcons.WALLET_RC_DELEGATIONS}`;
    case 'dialog_title_powerdown':
      return 'dropdown-menu-item-arrow_downward';
    default:
      return undefined;
  }
};

// A balance as the chain or a calculation has it.
type Amount = string | number | { toString(): string };

interface WalletSectionInfoItemProps {
  tokenSymbol: string;
  icon: SVGIcons;
  addBackground?: boolean;
  mainValue: Amount;
  mainValueLabel: string;
  subValues?: { value: Amount; label: string }[];
  isOpen: boolean;
  onToggle: () => void;
}

const walletInfoSectionItem = ({
  tokenSymbol,
  icon,
  addBackground,
  mainValue,
  mainValueLabel,
  subValues = [],
  isOpen,
  onToggle,
}: WalletSectionInfoItemProps) => {
  const formattedValue = FormatUtils.formatCurrencyValue(mainValue as string);
  // Set smaller rather than broken in two, up to the billions.
  const valueSize =
    formattedValue.length > 14
      ? 'smaller'
      : formattedValue.length > 12
      ? 'small'
      : '';
  return (
    <button
      type="button"
      className={`wallet-info-row ${isOpen ? 'opened' : ''}`}
      data-testid={`dropdown-arrow-${tokenSymbol.toLowerCase()}`}
      aria-expanded={isOpen}
      onClick={onToggle}>
      <SVGIcon
        icon={icon}
        className={`currency-icon ${addBackground ? 'add-background' : ''}`}
      />
      <span className="main-value-label">{mainValueLabel}</span>
      <span className={`main-value ${valueSize}`}>{formattedValue}</span>
      {subValues
        .filter(
          ({ value }) =>
            parseFloat(FormatUtils.formatCurrencyValue(value as string)) !== 0,
        )
        .map(({ value, label }) => (
          <span key={label} className="sub-value">
            {parseFloat(value.toString()) > 0 ? '+' : ''}
            {FormatUtils.formatCurrencyValue(value as string)} {label}
          </span>
        ))}
    </button>
  );
};

/** What can be done with a token, opened under all three columns. */
const WalletInfoActionsPanel = ({
  tokenSymbol,
  navigateToWithParams,
}: { tokenSymbol: string } & ConnectedProps<typeof connector>) => {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!process.env.IS_FIREFOX) {
      panel.current?.scrollIntoView?.({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'nearest',
      });
    }
  }, [tokenSymbol]);

  const handleClick = (
    event: BaseSyntheticEvent,
    actionButton: ActionButton,
  ) => {
    event.stopPropagation();
    navigateToWithParams(
      actionButton.nextScreen,
      actionButton.nextScreenParams,
    );
  };

  return (
    <div className="wallet-actions" ref={panel}>
      <div className="actions-panel">
        {WalletInfoSectionActions(tokenSymbol).map((ab, index) => (
          <WalletInfoSectionItemButton
            key={`action-${ab.label}-${index}`}
            actionButton={ab}
            handleClick={handleClick}
            dataTestId={walletInfoSectionActionButtonTestId(
              tokenSymbol,
              ab.label,
            )}
          />
        ))}
      </div>
      <SVGIcon
        icon={SVGIcons.WALLET_HISTORY_BUTTON}
        className="history-icon"
        dataTestId={`icon-token-history-${tokenSymbol}`}
        onClick={() => navigateToWithParams(Screen.WALLET_HISTORY_PAGE, [])}
        hoverable
      />
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {};
};

const connector = connect(mapStateToProps, {
  navigateToWithParams,
});

export const WalletInfoSectionItemComponent = walletInfoSectionItem;
export const WalletInfoActionsPanelComponent = connector(WalletInfoActionsPanel);
