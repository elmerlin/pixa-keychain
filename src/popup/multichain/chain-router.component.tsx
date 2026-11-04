import { BackgroundMessage } from '@background/background-message.interface';
import { ActionButton } from '@interfaces/action-button.interface';
import { HiveAppComponent } from '@popup/hive/hive-app.component';
import { setHasFinishedSignup } from '@popup/multichain/actions/has-finished-signup.actions';
import { resetMessage } from '@popup/multichain/actions/message.actions';
import { setMk } from '@popup/multichain/actions/mk.actions';
import { ModalProperties } from '@popup/multichain/interfaces/modal.interface';
import { Chain } from '@popup/multichain/multichain.context';
import { SignInRouterComponent } from '@popup/multichain/pages/sign-in/sign-in-router.component';
import { SignUpComponent } from '@popup/multichain/pages/sign-up/sign-up.component';
import { SignUpScreen } from '@popup/multichain/sign-up.context';
import { RootState } from '@popup/multichain/store';
import { BackgroundCommand } from '@reference-data/background-message-key.enum';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { VaultKey } from '@reference-data/vault-message-key.enum';
import React, { useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { MessageContainerComponent } from 'src/common-ui/message-container/message-container.component';
import { ModalComponent } from 'src/common-ui/modal/modal.component';
import { SplashscreenComponent } from 'src/common-ui/splashscreen/splashscreen.component';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import PopupUtils from 'src/utils/popup.utils';
import VaultUtils from 'src/utils/vault.utils';

type Props = { screen: SignUpScreen; selectedChain?: Chain };

const ChainRouter = ({
  screen,
  selectedChain,
  message,
  mk,
  setMk,
  hasFinishedSignup,
  setHasFinishedSignup,
  currentPage,
  resetMessage,
  modal,
}: Props & PropsFromRedux) => {
  useEffect(() => {
    PopupUtils.fixPopupOnMacOs();
    checkIfHasFinishedSignup();
    initMk();
  }, []);

  const initMk = async () => {
    const mkFromStorage = await VaultUtils.getValueFromVault(VaultKey.__MK);
    if (mkFromStorage) {
      setMk(mkFromStorage, false);
    }
  };
  const checkIfHasFinishedSignup = async () => {
    let hasFinishedSignup: boolean =
      (await LocalStorageUtils.getValueFromLocalStorage(
        LocalStorageKeyEnum.HAS_FINISHED_SIGNUP,
      )) || false;
    setTimeout(() => {
      setHasFinishedSignup(hasFinishedSignup);
    }, 500);
  };

  // Whatever the setting, and for as long as it's open: the wallet can lock itself at any time.
  useEffect(() => {
    const onReceivedAutolockCmd = (message: BackgroundMessage) => {
      if (message.command === BackgroundCommand.LOCK_APP) {
        setMk('', false);
      }
    };
    chrome.runtime.onMessage.addListener(onReceivedAutolockCmd);
    return () => chrome.runtime.onMessage.removeListener(onReceivedAutolockCmd);
  }, []);

  const renderChain = () => {
    if (!mk || mk.length === 0) {
      if (!hasFinishedSignup) {
        return <SignUpComponent />;
      } else {
        return <SignInRouterComponent />;
      }
    } else {
      return <HiveAppComponent />;
    }
  };

  return (
    <>
      {renderChain()}
      {message?.key && (
        <MessageContainerComponent
          message={message}
          onResetMessage={resetMessage}
        />
      )}
      {modal && <ModalComponent {...modal} />}
      {hasFinishedSignup === null && !currentPage && <SplashscreenComponent />}
    </>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    message: state.message,
    mk: state.mk,
    hasFinishedSignup: state.hasFinishedSignup,
    currentPage: state.navigation.stack[0],
    modal: state.modal as ModalProperties,
  };
};

const connector = connect(mapStateToProps, {
  setMk,
  setHasFinishedSignup,
  resetMessage,
});
type PropsFromRedux = ConnectedProps<typeof connector> & ActionButton;

export default connector(ChainRouter);
