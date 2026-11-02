import { HiveInternalMarketLockedInOrders } from '@interfaces/hive-market.interface';
import { HiveInternalMarketUtils } from '@popup/hive/utils/hive-internal-market.utils';
import { RootState } from '@popup/multichain/store';
import { AccountValueType } from '@reference-data/account-value-type.enum';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import React, { useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { CustomTooltip } from 'src/common-ui/custom-tooltip/custom-tooltip.component';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';

const EstimatedAccountValueSection = ({
  activeAccount,
  currencyPrices,
  globalProperties,
}: PropsFromRedux) => {
  const [accountValue, setAccountValue] = useState<string | number>('...');
  const [accountValueType, setAccountValueType] = useState<AccountValueType>(
    AccountValueType.DOLLARS,
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
      )) || AccountValueType.DOLLARS,
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

  useEffect(() => {
    if (
      activeAccount &&
      currencyPrices &&
      globalProperties?.globals &&
      hiveMarketLockedOpenOrdersValues
    ) {
      setAccountValue(
        AccountUtils.getAccountValue(
          activeAccount.account,
          currencyPrices,
          globalProperties.globals!,
          accountValueType,
          hiveMarketLockedOpenOrdersValues,
        ),
      );
    }
  }, [
    activeAccount,
    currencyPrices,
    globalProperties,
    accountValueType,
    hiveMarketLockedOpenOrdersValues,
  ]);

  const onClickEstimatedValue = () => {
    const newAccountValueType =
      accountValueType === AccountValueType.DOLLARS
        ? AccountValueType.HIVE
        : accountValueType === AccountValueType.HIVE
        ? AccountValueType.HIDDEN
        : AccountValueType.DOLLARS;
    setAccountValueType(newAccountValueType);
    LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.ACCOUNT_VALUE_TYPE,
      newAccountValueType,
    );
  };
  const getPrefix = () => {
    return accountValueType === AccountValueType.DOLLARS ? '$' : '';
  };
  const getSuffix = () => {
    return accountValueType === AccountValueType.HIVE ? 'HIVE' : '';
  };

  return (
    <>
      <div className="estimated-account-value-section">
        <div className="label-panel">
          <CustomTooltip
            dataTestId="custom-tool-tip-estimated-value-section"
            message="popup_html_estimation_info_text"
            delayShow={500}
            position="bottom">
            <div className="label">
              {chrome.i18n.getMessage('popup_html_estimation')}
            </div>
          </CustomTooltip>
        </div>
        <div className="estimated-value-button-container">
          {' '}
          <div
            data-testid="estimated-account-div-value"
            className={`value ${
              accountValueType === AccountValueType.HIDDEN ? 'with-margin' : ''
            }`}
            onClick={onClickEstimatedValue}>
            {accountValue
              ? `${getPrefix()} ${accountValue} ${getSuffix()}`
              : '...'}
          </div>
        </div>
      </div>
    </>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    activeAccount: state.hive.activeAccount,
    currencyPrices: state.hive.currencyPrices,
    globalProperties: state.hive.globalProperties,
  };
};

const connector = connect(mapStateToProps, {});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const EstimatedAccountValueSectionComponent = connector(
  EstimatedAccountValueSection,
);
