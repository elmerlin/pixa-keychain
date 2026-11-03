import { forgetMk } from '@popup/multichain/actions/mk.actions';
import { navigateTo } from '@popup/multichain/actions/navigation.actions';
import { setTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import { RootState } from '@popup/multichain/store';
import React, { useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { BackgroundMessage } from 'src/background/background-message.interface';
import ButtonComponent, {
  ButtonType,
} from 'src/common-ui/button/button.component';
import { setAccounts } from 'src/popup/hive/actions/account.actions';
import { BackgroundCommand } from 'src/reference-data/background-message-key.enum';
import { Screen } from 'src/reference-data/screen.enum';
import { HtmlUtils } from 'src/utils/html.utils';

const AddAccountMain = ({
  navigateTo,
  accounts,
  setAccounts,
  setTitleContainerProperties,
  forgetMk,
  hasFinishedSignup,
}: PropsFromRedux) => {
  const [importWindow, setImportWindow] = useState<number>();

  // During first setup all that's behind this screen is choosing a password, and nothing's saved yet.
  const backToPassword = () => {
    forgetMk();
    navigateTo(Screen.SIGN_UP_PAGE, true);
  };

  useEffect(() => {
    setTitleContainerProperties({
      title: 'popup_html_setup',
      isBackButtonEnabled: true,
      isCloseButtonDisabled: !accounts || !accounts.length,
      ...(hasFinishedSignup ? {} : { onBack: backToPassword }),
    });
  });

  const handleAddByKeys = (): void => {
    navigateTo(Screen.ACCOUNT_PAGE_ADD_BY_KEYS);
  };
  const handleAddByAuth = (): void => {
    navigateTo(Screen.ACCOUNT_PAGE_ADD_BY_AUTH);
  };
  const handleImportKeys = (): void => {
    chrome.windows.getCurrent(async (currentWindow) => {
      const win: chrome.windows.CreateData = {
        url: chrome.runtime.getURL('import-accounts.html'),
        type: 'popup',
        height: 600,
        width: 435,
        left: currentWindow.width! - 350 + currentWindow.left!,
        top: currentWindow.top,
      };
      // Except on Firefox
      //@ts-ignore
      if (typeof InstallTrigger === undefined) win.focused = true;
      const window = await chrome.windows.create(win);
      // setImportWindow(window.id);
      chrome.runtime.onMessage.addListener(onSentBackAccountsListener);
    });
  };

  const onSentBackAccountsListener = (message: BackgroundMessage) => {
    if (message.command === BackgroundCommand.SEND_BACK_IMPORTED_ACCOUNTS) {
      if (
        !(typeof message.value === 'string') &&
        message.value?.accounts.length
      ) {
        setAccounts(message.value.accounts);
      }
      chrome.runtime.onMessage.removeListener(onSentBackAccountsListener);
    }
  };

  return (
    <div
      className="add-account-page"
      data-testid={`${Screen.ACCOUNT_PAGE_INIT_ACCOUNT}-page`}>
      <div
        className="caption"
        dangerouslySetInnerHTML={{
          __html: HtmlUtils.getSafeI18nHtml('popup_html_chose_add_method'),
        }}></div>

      <div className="button-container">
        <ButtonComponent
          dataTestId="add-by-keys-button"
          label={'popup_html_add_by_keys'}
          onClick={handleAddByKeys}
          type={ButtonType.ALTERNATIVE}
        />
        {accounts.length > 0 && (
          <ButtonComponent
            dataTestId="add-by-auth-button"
            label={'popup_html_add_by_auth'}
            onClick={handleAddByAuth}
            type={ButtonType.ALTERNATIVE}
          />
        )}
        <ButtonComponent
          dataTestId="import-keys-button"
          label={'popup_html_import_keys'}
          onClick={handleImportKeys}
          type={ButtonType.ALTERNATIVE}
        />
      </div>
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    accounts: state.hive.accounts,
    hasFinishedSignup: state.hasFinishedSignup,
  };
};

const connector = connect(mapStateToProps, {
  navigateTo,
  setAccounts,
  setTitleContainerProperties,
  forgetMk,
});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const AddAccountMainComponent = connector(AddAccountMain);
