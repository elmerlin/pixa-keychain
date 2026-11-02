import {
  setErrorMessage,
  setSuccessMessage,
} from '@popup/multichain/actions/message.actions';
import { setTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import { RootState } from '@popup/multichain/store';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { Screen } from '@reference-data/screen.enum';
import React, { BaseSyntheticEvent, useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { CheckboxPanelComponent } from 'src/common-ui/checkbox/checkbox-panel/checkbox-panel.component';
import CheckboxComponent from 'src/common-ui/checkbox/checkbox/checkbox.component';
import {
  ComplexeCustomSelect,
  OptionItem,
} from 'src/common-ui/custom-select/custom-select.component';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { InputType } from 'src/common-ui/input/input-type.enum';
import InputComponent from 'src/common-ui/input/input.component';
import { Separator } from 'src/common-ui/separator/separator.component';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';
import { Rpc } from 'src/interfaces/rpc.interface';
import { setActiveRpc } from 'src/popup/hive/actions/active-rpc.actions';
import RpcUtils from 'src/popup/hive/utils/rpc.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import * as ValidUrl from 'valid-url';

interface RpcListItem {
  label: string;
  value: string;
  rpc: Rpc;
  canDelete: boolean;
}

const RpcNodes = ({
  activeRpc,
  setActiveRpc,
  setErrorMessage,
  setSuccessMessage,
  setTitleContainerProperties,
}: PropsFromRedux) => {
  const allRpc = RpcUtils.getFullList();
  let displayedRpcs = allRpc;
  // Hive RPC
  const [customRpcs, setCustomRpcs] = useState([] as Rpc[]);
  const [isAddRpcPanelDisplayed, setIsAddRpcPanelDisplayed] = useState(false);
  const [switchAuto, setSwitchAuto] = useState(true);
  const [addRpcNodeUri, setAddRpcNodeUri] = useState('');
  const [addRpcNodeChainId, setAddRpcNodeChainId] = useState('');
  const [addRpcNodeTestnet, setAddRpcNodeTestnet] = useState(false);
  const [setNewRpcAsActive, setSetNewRpcAsActive] = useState(false);

  const [hiveRpcOptions, setHiveRpcOptions] = useState(
    allRpc.map((rpc) => {
      return {
        label: rpc.uri,
        value: rpc.uri,
        rpc: rpc,
        canDelete: rpc.custom,
      };
    }),
  );

  useEffect(() => {
    displayedRpcs = [...allRpc, ...customRpcs];
    setHiveRpcOptions(
      displayedRpcs.map((rpc) => {
        return {
          label: rpc.uri,
          value: rpc.uri,
          rpc: rpc,
          canDelete: rpc.custom ?? false,
        };
      }),
    );
  }, [customRpcs]);

  useEffect(() => {
    setTitleContainerProperties({
      title: 'popup_html_rpc_node',
      isBackButtonEnabled: true,
    });
    initCustomRpcList();
    initSwitchAuto();
  }, []);

  useEffect(() => {
    LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.SWITCH_RPC_AUTO,
      switchAuto,
    );
  }, [switchAuto]);

  const initSwitchAuto = async () => {
    setSwitchAuto(
      await LocalStorageUtils.getValueFromLocalStorage(
        LocalStorageKeyEnum.SWITCH_RPC_AUTO,
      ),
    );
  };

  const initCustomRpcList = async () => {
    setCustomRpcs(await RpcUtils.getCustomRpcs());
  };

  const deleteCustomHiveRPC = async (
    item: OptionItem,
    event: BaseSyntheticEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const newRpcs = RpcUtils.deleteCustomRpc(customRpcs, (item as any).rpc);
    setCustomRpcs(newRpcs);
    initCustomRpcList();
  };

  const saveNewHiveRpc = () => {
    if (
      !addRpcNodeUri.length ||
      (addRpcNodeTestnet && !addRpcNodeChainId.length)
    ) {
      setErrorMessage('popup_html_rpc_missing_fields');
      return;
    }
    if (!ValidUrl.isWebUri(addRpcNodeUri)) {
      setErrorMessage('html_popup_url_not_valid');
      return;
    }
    if (displayedRpcs.find((rpc) => rpc.uri === addRpcNodeUri)) {
      setErrorMessage('popup_html_rpc_uri_already_existing');
      return;
    }

    const newCustomRpc = {
      uri: addRpcNodeUri,
      testnet: addRpcNodeTestnet,
      chainId: addRpcNodeChainId.length ? addRpcNodeChainId : undefined,
    };
    setIsAddRpcPanelDisplayed(false);
    RpcUtils.addCustomRpc(newCustomRpc);
    setCustomRpcs([...customRpcs, newCustomRpc]);
    if (setNewRpcAsActive) {
      setSwitchAuto(false);
      setActiveRpc(newCustomRpc);
    }
  };

  return (
    <div
      data-testid={`${Screen.SETTINGS_RPC_NODES}-page`}
      className="rpc-nodes-page"
    >
      <div className="introduction">
        {chrome.i18n.getMessage('popup_html_rpc_node_text')}
      </div>

      <div className="rpc-form-container">
        <div className="rpc-section hive-rpc" data-testid="section-hive-rpc">
          <div className="title">Pixagram</div>
          <CheckboxPanelComponent
            dataTestId="checkbox-rpc-nodes-automatic-mode"
            title="popup_html_rpc_automatic_mode"
            hint="popup_html_rpc_automatic_mode_hint"
            checked={switchAuto}
            onChange={setSwitchAuto}
          />
          {activeRpc && !switchAuto && hiveRpcOptions && (
            <div className="select-rpc-panel">
              <ComplexeCustomSelect
                options={hiveRpcOptions as RpcListItem[]}
                selectHandleDataTestId="selected-rpc-node-panel"
                selectedItem={
                  {
                    value: activeRpc.uri,
                    label: activeRpc.uri
                      .replace('http://', '')
                      .replace('https://', '')
                      .split('/')[0],
                    rpc: activeRpc,
                    canDelete: !RpcUtils.isDefault(activeRpc),
                  } as RpcListItem
                }
                setSelectedItem={(item: RpcListItem) => setActiveRpc(item.rpc)}
                background="white"
                onDelete={deleteCustomHiveRPC}
              />
              <button
                type="button"
                aria-label={chrome.i18n.getMessage(
                  isAddRpcPanelDisplayed
                    ? 'message_container_close_button'
                    : 'popup_html_add_rpc_text',
                )}
                className={`round-button ${
                  isAddRpcPanelDisplayed ? 'close-button' : 'add-button'
                }`}
                data-testid="button-add-rpc"
                onClick={() =>
                  setIsAddRpcPanelDisplayed(!isAddRpcPanelDisplayed)
                }
              >
                <SVGIcon
                  icon={
                    isAddRpcPanelDisplayed
                      ? SVGIcons.MENU_RPC_CLOSE_BUTTON
                      : SVGIcons.MENU_RPC_ADD_BUTTON
                  }
                />
              </button>
            </div>
          )}
          {!switchAuto && isAddRpcPanelDisplayed && (
            <div className="add-rpc-panel">
              <div className="add-rpc-caption">
                <span>{chrome.i18n.getMessage('popup_html_add_rpc_text')}</span>
                <SVGIcon
                  dataTestId="button-save"
                  icon={SVGIcons.MENU_RPC_SAVE_BUTTON}
                  onClick={() => saveNewHiveRpc()}
                />
              </div>
              <Separator type="horizontal" />
              <InputComponent
                dataTestId="input-rpc-node-uri"
                type={InputType.TEXT}
                value={addRpcNodeUri}
                onChange={setAddRpcNodeUri}
                placeholder={'popup_html_rpc_node'}
                onEnterPress={saveNewHiveRpc}
              />
              <CheckboxComponent
                dataTestId="checkbox-add-rpc-test-node"
                title="Testnet"
                checked={addRpcNodeTestnet}
                onChange={setAddRpcNodeTestnet}
                skipTranslation={true}
              ></CheckboxComponent>
              {addRpcNodeTestnet && (
                <InputComponent
                  dataTestId="input-node-chain-id"
                  type={InputType.TEXT}
                  value={addRpcNodeChainId}
                  onChange={setAddRpcNodeChainId}
                  placeholder="Chain Id"
                  skipPlaceholderTranslation={true}
                  onEnterPress={saveNewHiveRpc}
                />
              )}

              <CheckboxComponent
                dataTestId="checkbox-set-new-rpc-as-active"
                title="popup_html_set_new_rpc_as_active"
                checked={setNewRpcAsActive}
                onChange={setSetNewRpcAsActive}
              ></CheckboxComponent>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    activeRpc: state.hive.activeRpc,
  };
};

const connector = connect(mapStateToProps, {
  setActiveRpc,
  setErrorMessage,
  setTitleContainerProperties,
  setSuccessMessage,
});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const RpcNodesComponent = connector(RpcNodes);
