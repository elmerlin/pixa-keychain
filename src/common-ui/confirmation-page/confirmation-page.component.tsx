import { TransactionOptions } from '@interfaces/keys.interface';
import { goBack } from '@popup/multichain/actions/navigation.actions';
import { setTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import { RootState } from '@popup/multichain/store';
import { Screen } from '@reference-data/screen.enum';
import { KeychainKeyTypes } from 'hive-keychain-commons';
import React, { BaseSyntheticEvent, useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import AmountWithLogo from 'src/common-ui/amount-with-logo/amount-with-logo';
import ButtonComponent, {
  ButtonType,
} from 'src/common-ui/button/button.component';
import {
  ConfirmationPageFields,
  ConfirmationPageFieldType,
} from 'src/common-ui/confirmation-page/confirmation-field.interface';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { Separator } from 'src/common-ui/separator/separator.component';
import UsernameWithAvatar from 'src/common-ui/username-with-avatar/username-with-avatar';
import { HtmlUtils } from 'src/utils/html.utils';

export interface ConfirmationPageParams {
  fields: ConfirmationPageFields[];
  message: string;
  warningMessage?: string;
  warningParams?: string[];
  skipWarningTranslation?: boolean;
  title: string;
  skipTitleTranslation?: boolean;
  afterConfirmAction: (options?: TransactionOptions) => {};
  afterCancelAction?: () => {};
  formParams?: any;
  method: KeychainKeyTypes | null;
}

const ConfirmationPage = ({
  fields,
  message,
  afterConfirmAction,
  afterCancelAction,
  warningMessage,
  warningParams,
  skipWarningTranslation,
  title,
  skipTitleTranslation,
  goBack,
  setTitleContainerProperties,
}: PropsType) => {
  const [hasField] = useState(fields && fields.length !== 0);

  useEffect(() => {
    setTitleContainerProperties({
      title: title ?? 'popup_html_confirm',
      skipTitleTranslation,
      isBackButtonEnabled: true,
      onBackAdditional: () => {
        if (afterCancelAction) afterCancelAction();
      },
      onCloseAdditional: () => {
        if (afterCancelAction) afterCancelAction();
      },
    });
  }, []);

  const handleClickOnConfirm = () => {
    afterConfirmAction();
  };

  const handleClickOnCancel = async () => {
    if (afterCancelAction) {
      afterCancelAction();
    }
    goBack();
  };
  const getIcon = (field: ConfirmationPageFields) => {
    switch (field.tokenSymbol) {
      case 'HIVE':
        return SVGIcons.WALLET_HIVE_LOGO;
      case 'HBD':
        return SVGIcons.WALLET_HBD_LOGO;
      case 'HP':
        return SVGIcons.WALLET_HP_LOGO;
      default:
        return undefined;
    }
  };
  const getFieldComponent = (field: ConfirmationPageFields) => {
    switch (field.tag) {
      case ConfirmationPageFieldType.USERNAME:
        return (
          <div className={`value ${field.valueClassName ?? ''}`}>
            <UsernameWithAvatar username={field.value} />
          </div>
        );
      case ConfirmationPageFieldType.AMOUNT:
        return (
          <div className={`value ${field.valueClassName ?? ''}`}>
            <AmountWithLogo
              amount={field.value}
              symbol={field.tokenSymbol}
              icon={getIcon(field)}
            />
          </div>
        );
      default:
        return (
          <div className={`value ${field.valueClassName ?? ''}`}>
            {field.value}
          </div>
        );
    }
  };

  const renderFields = () => {
    return (
      <div className="fields">
        {fields.map((field, index) => (
          <React.Fragment key={field.label}>
            <div className="field">
              <div
                className="label"
                style={{ display: 'flex', alignItems: 'center' }}>
                {chrome.i18n.getMessage(field.label)}
              </div>
              {getFieldComponent(field)}
            </div>
            {index !== fields.length - 1 && (
              <Separator
                key={` separator-${field.label}`}
                type={'horizontal'}
                fullSize
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div
      className="confirmation-page"
      data-testid={`${Screen.CONFIRMATION_PAGE}-page`}>
      <div className="confirmation-top">
        <div
          className="introduction"
          dangerouslySetInnerHTML={{
            __html: HtmlUtils.sanitizeHtml(message),
          }}></div>

        {warningMessage && (
          <div data-testid="warning-message" className="warning-message">
            {skipWarningTranslation
              ? warningMessage
              : chrome.i18n.getMessage(warningMessage, warningParams)}
          </div>
        )}

        {hasField && renderFields()}
      </div>

      <div className="bottom-panel">
        <ButtonComponent
          dataTestId="dialog_cancel-button"
          label={'dialog_cancel'}
          onClick={handleClickOnCancel}
          type={ButtonType.ALTERNATIVE}></ButtonComponent>
        <ButtonComponent
          dataTestId="dialog_confirm-button"
          label={'popup_html_confirm'}
          onClick={($event: BaseSyntheticEvent) => {
            $event.target.disabled = true;
            handleClickOnConfirm();
          }}
          type={ButtonType.IMPORTANT}></ButtonComponent>
      </div>
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    message: state.navigation.stack[0].params.message as string,
    fields: state.navigation.stack[0].params.fields as ConfirmationPageFields[],
    warningMessage: state.navigation.stack[0].params.warningMessage as string,
    warningParams: state.navigation.stack[0].params.warningParams,
    skipWarningTranslation:
      state.navigation.stack[0].params.skipWarningTranslation,
    afterConfirmAction: state.navigation.stack[0].params.afterConfirmAction,
    afterCancelAction: state.navigation.stack[0].params.afterCancelAction,
    title: state.navigation.stack[0].params.title,
    skipTitleTranslation: state.navigation.stack[0].params.skipTitleTranslation,
  };
};

const connector = connect(mapStateToProps, {
  goBack,
  setTitleContainerProperties,
});
type PropsType = ConnectedProps<typeof connector> & ConfirmationPageParams;

export const ConfirmationPageComponent = connector(ConfirmationPage);
