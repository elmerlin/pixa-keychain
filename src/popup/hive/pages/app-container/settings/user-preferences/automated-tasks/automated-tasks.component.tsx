import { UsernameAvatar } from 'src/common-ui/username-with-avatar/username-with-avatar';
import { LocalAccountListItem } from '@interfaces/list-item.interface';
import { LocalAccount } from '@interfaces/local-account.interface';
import { setTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import { RootState } from '@popup/multichain/store';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { Screen } from '@reference-data/screen.enum';
import React, { useEffect, useState } from 'react';
import { SelectItemRenderer, SelectRenderer } from 'react-dropdown-select';
import { connect, ConnectedProps } from 'react-redux';
import { CheckboxPanelComponent } from 'src/common-ui/checkbox/checkbox-panel/checkbox-panel.component';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { SelectAccountSectionComponent } from 'src/common-ui/select-account-section/select-account-section.component';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';
import Config from 'src/config';
import { loadActiveAccount } from 'src/popup/hive/actions/active-account.actions';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import AutomatedTasksUtils from 'src/utils/automatedTasks.utils';

const AutomatedTasks = ({
  accounts,
  activeAccount,
  loadActiveAccount,
  setTitleContainerProperties,
}: PropsFromRedux) => {
  const defaultOptions: LocalAccountListItem[] = [];
  const [options, setOptions] = useState(defaultOptions);
  const [claimRewards, setClaimRewards] = useState(false);
  const [claimAccounts, setClaimAccounts] = useState(false);
  const [claimSavings, setClaimSavings] = useState(false);
  const [ticketCost, setTicketCost] = useState<number>();

  const [selectedLocalAccount, setSelectedLocalAccount] = useState(
    accounts[0].name,
  );
  const [isHiveSectionExpanded, setIsHiveSectionExpanded] = useState(true);

  const claimSavingsErrorMessage =
    AutomatedTasksUtils.canClaimSavingsErrorMessage(activeAccount);
  const claimAccountErrorMessage =
    AutomatedTasksUtils.canClaimAccountErrorMessage(activeAccount, ticketCost);
  const claimRewardsErrorMessage =
    AutomatedTasksUtils.canClaimRewardsErrorMessage(activeAccount);

  useEffect(() => {
    setTitleContainerProperties({
      title: 'popup_html_automated_tasks',
      isBackButtonEnabled: true,
    });
    AccountUtils.getAccountTicketCost()
      .then(setTicketCost)
      .catch(() => setTicketCost(undefined));
  }, []);

  useEffect(() => {
    init();
    setOptions(
      accounts.map((account: LocalAccount) => {
        return { label: account.name, value: account.name };
      }),
    );
    setSelectedLocalAccount(activeAccount.name!);
  }, [accounts, activeAccount]);

  const saveClaims = async (
    claimRewards: boolean,
    claimAccounts: boolean,
    claimSavings: boolean,
  ) => {
    setClaimAccounts(claimAccounts);
    setClaimRewards(claimRewards);
    setClaimSavings(claimSavings);

    await AutomatedTasksUtils.saveClaims(
      claimRewards,
      claimAccounts,
      claimSavings,
      activeAccount.name!,
    );
  };

  const init = async () => {
    const values = await AutomatedTasksUtils.getClaims(activeAccount.name!);
    setClaimRewards(values[LocalStorageKeyEnum.CLAIM_REWARDS] ?? false);
    setClaimAccounts(values[LocalStorageKeyEnum.CLAIM_ACCOUNTS] ?? false);
    setClaimSavings(values[LocalStorageKeyEnum.CLAIM_SAVINGS] ?? false);
  };

  const handleItemClicked = (accountName: string) => {
    const itemClicked = accounts.find(
      (account: LocalAccount) => account.name === accountName,
    );
    loadActiveAccount(itemClicked!);
  };

  const customLabelRender = (
    selectProps: SelectRenderer<LocalAccountListItem>,
  ) => {
    return (
      <div
        className="selected-account-panel"
        onClick={() => {
          selectProps.methods.dropDown('close');
        }}
      >
        <UsernameAvatar username={selectedLocalAccount} />
        <div className="selected-account-name">{selectedLocalAccount}</div>
      </div>
    );
  };
  const customItemRender = (
    selectProps: SelectItemRenderer<LocalAccountListItem>,
  ) => {
    return (
      <div
        data-testid={`select-account-item-${selectProps.item.label}`}
        className={`select-account-item ${
          selectedLocalAccount === selectProps.item.value ? 'selected' : ''
        }`}
        onClick={() => {
          handleItemClicked(selectProps.item.value);
          selectProps.methods.dropDown('close');
        }}
      >
        <UsernameAvatar username={selectProps.item.value} />
        <div className="account-name">{selectProps.item.label}</div>
      </div>
    );
  };

  return (
    <div
      data-testid={`${Screen.SETTINGS_AUTOMATED_TASKS}-page`}
      className="automated-tasks-page"
    >
      <div className="intro">
        {chrome.i18n.getMessage('popup_html_automated_intro')}
      </div>

      <SelectAccountSectionComponent fullSize background="white" />

      <div className="section">
        <div
          className="section-expander"
          onClick={() => setIsHiveSectionExpanded(!isHiveSectionExpanded)}
        >
          <div className="section-title-logo">
            <div className="section-title">
              {chrome.i18n.getMessage(
                'popup_html_automated_hive_section_title',
              )}
            </div>
          </div>
          <SVGIcon
            className="custom-select-handle"
            icon={
              isHiveSectionExpanded
                ? SVGIcons.SELECT_ARROW_UP
                : SVGIcons.SELECT_ARROW_DOWN
            }
          />
        </div>
        {isHiveSectionExpanded && (
          <div className="tasks">
            <CheckboxPanelComponent
              dataTestId="checkbox-autoclaim-rewards"
              title="popup_html_enable_autoclaim_rewards"
              checked={claimRewards}
              onChange={(value) =>
                saveClaims(value, claimAccounts, claimSavings)
              }
              hint="popup_html_enable_autoclaim_rewards_info"
              tooltipMessage={claimRewardsErrorMessage}
              disabled={!!claimRewardsErrorMessage}
            />
            <CheckboxPanelComponent
              dataTestId="checkbox-autoclaim-accounts"
              title="popup_html_enable_autoclaim_accounts"
              checked={claimAccounts && !claimAccountErrorMessage}
              onChange={(value) =>
                saveClaims(claimRewards, value, claimSavings)
              }
              skipHintTranslation
              hint={chrome.i18n.getMessage(
                'popup_html_enable_autoclaim_accounts_info',
                [Config.claims.freeAccount.MIN_RC_PCT + ''],
              )}
              tooltipMessage={claimAccountErrorMessage}
              disabled={!!claimAccountErrorMessage}
            />
            <CheckboxPanelComponent
              dataTestId="checkbox-autoclaim-savings"
              title="popup_html_enable_autoclaim_savings"
              checked={claimSavings}
              onChange={(value) =>
                saveClaims(claimRewards, claimAccounts, value)
              }
              hint="popup_html_enable_autoclaim_savings_info"
              tooltipMessage={claimSavingsErrorMessage}
              disabled={!!claimSavingsErrorMessage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    accounts: state.hive.accounts,
    activeAccount: state.hive.activeAccount,
  };
};

const connector = connect(mapStateToProps, {
  loadActiveAccount,
  setTitleContainerProperties,
});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const AutomatedTasksComponent = connector(AutomatedTasks);
