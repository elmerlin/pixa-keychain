import { HiveInternalMarketLockedInOrders } from '@interfaces/hive-market.interface';
import { useFiat } from '@popup/hive/hooks/use-fiat';
import { FiatUtils } from '@popup/hive/utils/fiat.utils';
import { HiveInternalMarketUtils } from '@popup/hive/utils/hive-internal-market.utils';
import { navigateTo } from '@popup/multichain/actions/navigation.actions';
import { RootState } from '@popup/multichain/store';
import { AccountValueType } from '@reference-data/account-value-type.enum';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { Screen } from '@reference-data/screen.enum';
import React, { useEffect, useMemo, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { CustomTooltip } from 'src/common-ui/custom-tooltip/custom-tooltip.component';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { PixelNumber } from 'src/common-ui/pixel-number/pixel-number.component';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';
import { HoldingsBar } from 'src/popup/hive/pages/app-container/home/estimated-account-value-section/holdings-bar/holdings-bar.component';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';

const POPUP_WIDTH = 435;
const MARGINS = 32;
// The unit is set in 15px Geist Mono, about 9px a character, beside the number.
const unitWidth = (unit: string) => unit.length * 9 + 8;
const NEXT_TYPE: Record<AccountValueType, AccountValueType> = {
  [AccountValueType.FIAT]: AccountValueType.PXS,
  [AccountValueType.PXS]: AccountValueType.PIXA,
  [AccountValueType.PIXA]: AccountValueType.HIDDEN,
  [AccountValueType.HIDDEN]: AccountValueType.FIAT,
};

const EstimatedAccountValueSection = ({
  activeAccount,
  currencyPrices,
  globalProperties,
  navigateTo,
}: PropsFromRedux) => {
  const fiat = useFiat();
  const [accountValueType, setAccountValueType] = useState<AccountValueType>(
    AccountValueType.FIAT,
  );

  const [
    hiveMarketLockedOpenOrdersValues,
    setHiveMarketLockedOpenOrdersValues,
  ] = useState<HiveInternalMarketLockedInOrders>({ hive: 0, hbd: 0 });

  useEffect(() => {
    initAccountValueType();
  }, []);

  const initAccountValueType = async () => {
    setAccountValueType(
      (await LocalStorageUtils.getValueFromLocalStorage(
        LocalStorageKeyEnum.ACCOUNT_VALUE_TYPE,
      )) || AccountValueType.FIAT,
    );
  };

  const loadHiveInternalMarketOrders = async (username: string) => {
    setHiveMarketLockedOpenOrdersValues(
      await HiveInternalMarketUtils.getHiveInternalMarketOrders(username),
    );
  };

  useEffect(() => {
    if (activeAccount.name) {
      loadHiveInternalMarketOrders(activeAccount.name);
    }
  }, [activeAccount]);

  const holdings = useMemo(() => {
    if (
      !activeAccount?.account?.balance ||
      !currencyPrices?.hive?.usd ||
      !globalProperties?.globals
    ) {
      return undefined;
    }
    return AccountUtils.getHoldings(
      activeAccount.account,
      currencyPrices,
      globalProperties.globals,
      hiveMarketLockedOpenOrdersValues,
    );
  }, [
    activeAccount,
    currencyPrices,
    globalProperties,
    hiveMarketLockedOpenOrdersValues,
  ]);

  const total = holdings ? holdings.pixa + holdings.pxs + holdings.pp : 0;
  const inFiat = holdings ? FiatUtils.getParts(total, fiat) : undefined;

  const display = () => {
    if (accountValueType === AccountValueType.HIDDEN) {
      return { unit: '', number: '***', equivalent: '' };
    }
    if (!holdings || !inFiat) return { unit: '', number: '...', equivalent: '' };
    if (accountValueType === AccountValueType.FIAT) {
      return {
        unit: `≈ ${inFiat.unit}`,
        number: inFiat.number,
        equivalent: `${AccountUtils.getAccountValue(
          activeAccount.account,
          currencyPrices,
          globalProperties.globals!,
          AccountValueType.PXS,
          hiveMarketLockedOpenOrdersValues,
        )} PXS`,
      };
    }
    return {
      unit: accountValueType,
      number: `${AccountUtils.getAccountValue(
        activeAccount.account,
        currencyPrices,
        globalProperties.globals!,
        accountValueType,
        hiveMarketLockedOpenOrdersValues,
      )}`,
      equivalent: `≈ ${inFiat.text}`,
    };
  };
  const { unit, number, equivalent } = display();
  const available =
    Math.min(window.innerWidth || POPUP_WIDTH, POPUP_WIDTH) -
    MARGINS -
    unitWidth(unit);

  const percentOf = (part: number) =>
    total > 0 ? `${Math.round((part / total) * 100)}%` : '0%';

  const onClickEstimatedValue = () => {
    const newAccountValueType = NEXT_TYPE[accountValueType];
    setAccountValueType(newAccountValueType);
    LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.ACCOUNT_VALUE_TYPE,
      newAccountValueType,
    );
  };

  return (
    <div className="estimated-account-value-section">
      <div className="value-row">
        <CustomTooltip
          dataTestId="custom-tool-tip-estimated-value-section"
          message="popup_html_estimation_info_text"
          delayShow={500}
          position="bottom">
          <button
            type="button"
            data-testid="estimated-account-div-value"
            className="value"
            aria-label={
              accountValueType === AccountValueType.HIDDEN
                ? chrome.i18n.getMessage('popup_html_estimation')
                : `${chrome.i18n.getMessage(
                    'popup_html_estimation',
                  )}: ${unit} ${number}`
            }
            onClick={onClickEstimatedValue}>
            {unit && <span className="unit">{unit}</span>}
            <PixelNumber value={number} available={available} />
          </button>
        </CustomTooltip>
      </div>
      <div className="value-details">
        <span className="equivalent">{equivalent}</span>
        <button
          type="button"
          data-testid="button-currency"
          className="currency-button"
          title={
            fiat.unavailable
              ? chrome.i18n.getMessage('popup_html_currency_unavailable')
              : chrome.i18n.getMessage('popup_html_currency')
          }
          onClick={() => navigateTo(Screen.SETTINGS_CURRENCY)}>
          {fiat.code}
          <SVGIcon icon={SVGIcons.SELECT_ARROW_DOWN} className="arrow" />
        </button>
      </div>
      <HoldingsBar
        holdings={holdings}
        label={chrome.i18n.getMessage('popup_html_holdings', [
          percentOf(holdings?.pixa ?? 0),
          percentOf(holdings?.pxs ?? 0),
          percentOf(holdings?.pp ?? 0),
        ])}
      />
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    activeAccount: state.hive.activeAccount,
    currencyPrices: state.hive.currencyPrices,
    globalProperties: state.hive.globalProperties,
  };
};

const connector = connect(mapStateToProps, { navigateTo });
type PropsFromRedux = ConnectedProps<typeof connector>;

export const EstimatedAccountValueSectionComponent = connector(
  EstimatedAccountValueSection,
);
