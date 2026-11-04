import { Conversion } from '@interfaces/conversion.interface';
import {
  WalletInfoActionsPanelComponent,
  WalletInfoSectionItemComponent,
} from '@popup/hive/pages/app-container/home/wallet-info-section/wallet-info-section-item/wallet-info-section-item.component';
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
  const [delegations, setDelegations] = useState({ lent: 0, received: 0 });
  const [opened, setOpened] = useState<string | null>(null);
  const toggle = (tokenSymbol: string) =>
    setOpened(opened === tokenSymbol ? null : tokenSymbol);

  useEffect(() => {
    if (activeAccount && !ActiveAccountUtils.isEmpty(activeAccount)) {
      fetchConversionRequests(activeAccount.name!);

      setDelegations({
        lent: FormatUtils.toHP(
          activeAccount.account.delegated_vesting_shares.toString(),
          globalProperties.globals,
        ),
        received: FormatUtils.toHP(
          activeAccount.account.received_vesting_shares.toString(),
          globalProperties.globals,
        ),
      });
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
      <div className="wallet-info-section">
        <div className="wallet-columns">
        <WalletInfoSectionItemComponent
          tokenSymbol="PIXA"
          isOpen={opened === 'PIXA'}
          onToggle={() => toggle('PIXA')}
          icon={SVGIcons.WALLET_HIVE_LOGO}
          mainValue={activeAccount.account.balance}
          mainValueLabel={currencyLabels.hive}
          subValues={[
            {
              value: activeAccount.account.savings_balance,
              label: chrome.i18n.getMessage('popup_html_wallet_savings'),
            },
          ]}
        />
        <WalletInfoSectionItemComponent
          tokenSymbol="PXS"
          isOpen={opened === 'PXS'}
          onToggle={() => toggle('PXS')}
          icon={SVGIcons.WALLET_HBD_LOGO}
          mainValue={activeAccount.account.pxs_balance}
          mainValueLabel={currencyLabels.hbd}
          subValues={[
            {
              value: activeAccount.account.savings_pxs_balance,
              label: chrome.i18n.getMessage('popup_html_wallet_savings'),
            },
          ]}
        />
        <WalletInfoSectionItemComponent
          tokenSymbol="PP"
          isOpen={opened === 'PP'}
          onToggle={() => toggle('PP')}
          icon={SVGIcons.WALLET_HP_LOGO}
          mainValue={FormatUtils.toHP(
            activeAccount.account.vesting_shares as string,
            globalProperties.globals,
          )}
          mainValueLabel={currencyLabels.hp}
          subValues={[
            {
              value: -delegations.lent,
              label: chrome.i18n.getMessage('popup_html_wallet_lent'),
            },
            {
              value: delegations.received,
              label: chrome.i18n.getMessage('popup_html_wallet_received'),
            },
          ]}
        />
        </div>
        {opened && <WalletInfoActionsPanelComponent tokenSymbol={opened} />}
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
