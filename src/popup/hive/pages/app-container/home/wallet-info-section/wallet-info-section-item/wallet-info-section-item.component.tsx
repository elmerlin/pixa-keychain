import {
  ActionButton,
  WalletInfoSectionActions,
} from '@popup/hive/pages/app-container/home/wallet-info-section/wallet-info-section-actions';
import { WalletInfoSectionItemButton } from '@popup/hive/pages/app-container/home/wallet-info-section/wallet-info-section-item/wallet-info-section-item-button/wallet-info-section-item-button.component';
import { navigateToWithParams } from '@popup/multichain/actions/navigation.actions';
import { RootState } from '@popup/multichain/store';
import { Screen } from '@reference-data/screen.enum';
import { Asset } from 'hive-keychain-commons';
import React, { BaseSyntheticEvent, useEffect, useRef, useState } from 'react';
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

interface WalletSectionInfoItemProps {
  tokenSymbol: string;
  icon: SVGIcons;
  addBackground?: boolean;
  mainValue: string | Asset | number;
  mainValueLabel: string;
  subValue?: string | Asset | number;
  subValueLabel?: string;
}

const walletInfoSectionItem = ({
  tokenSymbol,
  icon,
  addBackground,
  mainValue,
  mainValueLabel,
  subValue,
  subValueLabel,
  hive,
  navigateToWithParams,
}: PropsFromRedux) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionButtons, setActionButtons] = useState<ActionButton[]>([]);
  const reff = useRef<HTMLDivElement>(null);

  const [hasButtonsInList, setHasButtonInList] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setActionButtons(WalletInfoSectionActions(tokenSymbol));
  };

  const toggleDropdown = () => {
    setIsExpanded(!isExpanded);
  };

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

  const handleHistoryClick = (event: BaseSyntheticEvent) => {
    event.stopPropagation();
    navigateToWithParams(Screen.WALLET_HISTORY_PAGE, []);
  };

  return (
    <div
      className={`wallet-info-row ${isExpanded ? 'opened' : ''}`}
      data-testid={`dropdown-arrow-${tokenSymbol.toLowerCase()}`}
      ref={reff}
      onClick={() => {
        toggleDropdown();
        !process.env.IS_FIREFOX &&
          reff.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'center',
          });
      }}>
      <div className="information-panel">
        <SVGIcon
          icon={icon}
          className={`currency-icon ${addBackground ? 'add-background' : ''}`}
        />

        <div className="main-value-label">{mainValueLabel}</div>
        <div className="value">
          <div className="main-value">
            {FormatUtils.formatCurrencyValue(mainValue)}
          </div>
          {!!subValue &&
            parseFloat(FormatUtils.formatCurrencyValue(subValue)) !== 0 && (
              <div className="sub-value">
                {parseFloat(subValue?.toString()) > 0 ? '+' : ''}
                {FormatUtils.formatCurrencyValue(subValue)} ({subValueLabel})
              </div>
            )}
        </div>
        {isExpanded && (
          <SVGIcon
            icon={SVGIcons.WALLET_HISTORY_BUTTON}
            className={`history-icon`}
            dataTestId={`icon-token-history-${tokenSymbol}`}
            onClick={($event) => handleHistoryClick($event)}
            hoverable
          />
        )}
      </div>
      {isExpanded && (
        <>
          <div className="actions-panel">
            {actionButtons.map((ab, index) => (
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
        </>
      )}
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    globalProperties: state.hive.globalProperties,
    hive: state.hive.currencyPrices.hive,
  };
};

const connector = connect(mapStateToProps, {
  navigateToWithParams,
});
type PropsFromRedux = ConnectedProps<typeof connector> &
  WalletSectionInfoItemProps;

export const WalletInfoSectionItemComponent = connector(walletInfoSectionItem);
