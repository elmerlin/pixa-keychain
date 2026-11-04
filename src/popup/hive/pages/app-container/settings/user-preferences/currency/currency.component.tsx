import { FIAT_CURRENCIES, FiatUtils } from '@popup/hive/utils/fiat.utils';
import { setErrorMessage } from '@popup/multichain/actions/message.actions';
import { goBack } from '@popup/multichain/actions/navigation.actions';
import { setTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import { Screen } from '@reference-data/screen.enum';
import React, { useEffect, useMemo, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { InputType } from 'src/common-ui/input/input-type.enum';
import InputComponent from 'src/common-ui/input/input.component';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';

const Currency = ({
  setTitleContainerProperties,
  setErrorMessage,
  goBack,
}: PropsFromRedux) => {
  const [selected, setSelected] = useState('USD');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setTitleContainerProperties({
      title: 'popup_html_currency',
      isBackButtonEnabled: true,
    });
    FiatUtils.getSelectedCode().then(setSelected);
  }, []);

  const currencies = useMemo(
    () =>
      FIAT_CURRENCIES.map((code) => ({
        code,
        name: FiatUtils.getName(code),
      })).filter(
        ({ code, name }) =>
          !filter ||
          `${code} ${name}`.toLowerCase().includes(filter.toLowerCase()),
      ),
    [filter],
  );

  const choose = async (code: string) => {
    setSelected(code);
    await FiatUtils.select(code);
    const { unavailable } = await FiatUtils.getFiat();
    if (unavailable) setErrorMessage('popup_html_currency_unavailable');
    goBack();
  };

  return (
    <div
      data-testid={`${Screen.SETTINGS_CURRENCY}-page`}
      className="currency-page">
      <div className="caption">
        {chrome.i18n.getMessage('popup_html_currency_intro')}
      </div>
      <InputComponent
        dataTestId="input-filter-currency"
        type={InputType.TEXT}
        placeholder="popup_html_search"
        logo={SVGIcons.INPUT_SEARCH}
        logoPosition="right"
        value={filter}
        onChange={setFilter}
      />
      <div className="currency-list">
        {currencies.map(({ code, name }) => (
          <button
            type="button"
            key={code}
            data-testid={`currency-${code}`}
            className={`currency-row ${code === selected ? 'selected' : ''}`}
            aria-pressed={code === selected}
            onClick={() => choose(code)}>
            <span className="code">{code}</span>
            <span className="name">{name}</span>
            {code === selected && (
              <SVGIcon icon={SVGIcons.CHECKBOX_CHECKED} className="check" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const connector = connect(null, {
  setTitleContainerProperties,
  setErrorMessage,
  goBack,
});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const CurrencyComponent = connector(Currency);
