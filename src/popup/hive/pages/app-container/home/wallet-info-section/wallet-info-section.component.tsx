import { Conversion } from '@interfaces/conversion.interface';
import { WalletInfoSectionItemComponent } from '@popup/hive/pages/app-container/home/wallet-info-section/wallet-info-section-item/wallet-info-section-item.component';
import { RootState } from '@popup/multichain/store';
import { Asset } from 'hive-keychain-commons';
import React, { useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { fetchConversionRequests } from 'src/popup/hive/actions/conversion.actions';
import ActiveAccountUtils from 'src/popup/hive/utils/active-account.utils';
import CurrencyUtils from 'src/popup/hive/utils/currency.utils';
import FormatUtils from 'src/utils/format.utils';

const WalletInfoSection = ({
  activeAccount,
  currencyLabels,
  globalProperties,
  conversions,
  fetchConversionRequests,
}: PropsFromRedux) => {
  const [delegationAmount, setDelegationAmount] = useState<string | number>(
    '...',
  );

  useEffect(() => {
    if (activeAccount && !ActiveAccountUtils.isEmpty(activeAccount)) {
      fetchConversionRequests(activeAccount.name!);

      const delegatedVestingShares = parseFloat(
        activeAccount.account.delegated_vesting_shares
          .toString()
          .replace(' VESTS', ''),
      );
      const receivedVestingShares = parseFloat(
        activeAccount.account.received_vesting_shares
          .toString()
          .replace(' VESTS', ''),
      );
      const delegationVestingShares = (
        receivedVestingShares - delegatedVestingShares
      ).toFixed(3);

      const delegation = FormatUtils.toHP(
        delegationVestingShares,
        globalProperties.globals,
      );
      setDelegationAmount(delegation);
    }
    /** Re-run when chain account data arrives (name alone is stable while `account` is still loading). */
  }, [
    activeAccount.name,
    activeAccount.account?.delegated_vesting_shares,
    activeAccount.account?.received_vesting_shares,
    globalProperties.globals,
  ]);

  useEffect(() => {
    const pendingHbdConversions = conversions.filter((conv: Conversion) => {
      return Asset.fromString(conv.amount).symbol === 'PXS';
    });
    if (pendingHbdConversions.length > 0) {
      // setHbdRowInfoContent(
      //   chrome.i18n.getMessage('popup_html_pending_conversions', [
      //     pendingHbdConversions.length.toString(),
      //     'PIXA',
      //   ]),
      // );
    }

    const pendingHiveConversions = conversions.filter((conv: Conversion) => {
      return Asset.fromString(conv.amount).symbol === 'PIXA';
    });

    if (pendingHiveConversions.length > 0) {
      // setHiveRowInfoContent(
      //   chrome.i18n.getMessage('popup_html_pending_conversions', [
      //     pendingHiveConversions.length.toString(),
      //     'PIXA',
      //   ]),
      // );
    }
  }, [conversions]);

  return (
    <div className="wallet-info-wrapper">
      <div className="wallet-background" />
      <div className="wallet-info-section">
        <WalletInfoSectionItemComponent
          tokenSymbol="PIXA"
          icon={SVGIcons.WALLET_HIVE_LOGO}
          mainValue={activeAccount.account.balance}
          mainValueLabel={currencyLabels.hive}
          subValue={activeAccount.account.savings_balance}
          subValueLabel={chrome.i18n.getMessage('popup_html_wallet_savings')}
        />
        <WalletInfoSectionItemComponent
          tokenSymbol="PXS"
          icon={SVGIcons.WALLET_HBD_LOGO}
          mainValue={activeAccount.account.pxs_balance}
          mainValueLabel={currencyLabels.hbd}
          subValue={activeAccount.account.savings_pxs_balance}
          subValueLabel={chrome.i18n.getMessage('popup_html_wallet_savings')}
        />
        <WalletInfoSectionItemComponent
          tokenSymbol="PP"
          icon={SVGIcons.WALLET_HP_LOGO}
          mainValue={FormatUtils.toHP(
            activeAccount.account.vesting_shares as string,
            globalProperties.globals,
          )}
          mainValueLabel={currencyLabels.hp}
          subValue={delegationAmount}
          subValueLabel={
            chrome.i18n.getMessage('popup_html_delegations').length <= 5
              ? chrome.i18n.getMessage('popup_html_delegations')
              : chrome.i18n.getMessage('popup_html_delegations').slice(0, 5) +
                '.'
          }
        />
      </div>
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    activeAccount: state.hive.activeAccount,
    currencyLabels: CurrencyUtils.getCurrencyLabels(
      state.hive.activeRpc?.testnet!,
    ),
    globalProperties: state.hive.globalProperties,
    delegations: state.hive.delegations,
    conversions: state.hive.conversions,
  };
};

const connector = connect(mapStateToProps, {
  fetchConversionRequests,
});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const WalletInfoSectionComponent = connector(WalletInfoSection);
