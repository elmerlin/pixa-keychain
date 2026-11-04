import { TransactionOptions } from '@interfaces/keys.interface';
import {
  addCaptionToLoading,
  addToLoadingList,
  removeFromLoadingList,
} from '@popup/multichain/actions/loading.actions';
import {
  setErrorMessage,
  setSuccessMessage,
} from '@popup/multichain/actions/message.actions';
import { closeModal, openModal } from '@popup/multichain/actions/modal.actions';
import { navigateTo } from '@popup/multichain/actions/navigation.actions';
import { RootState } from '@popup/multichain/store';
import React, { useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { SelectAccountSectionComponent } from 'src/common-ui/select-account-section/select-account-section.component';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';
import { refreshActiveAccount } from 'src/popup/hive/actions/active-account.actions';
import { loadGlobalProperties } from 'src/popup/hive/actions/global-properties.actions';
import ActiveAccountUtils from 'src/popup/hive/utils/active-account.utils';
import { RewardsUtils } from 'src/popup/hive/utils/rewards.utils';
import { Screen } from 'src/reference-data/screen.enum';
import { AsyncUtils } from 'src/utils/async.utils';
import FormatUtils from 'src/utils/format.utils';

const TopBar = ({
  navigateTo,
  refreshActiveAccount,
  activeAccount,
  globalProperties,
  addToLoadingList,
  removeFromLoadingList,
  loadGlobalProperties,
  setErrorMessage,
  setSuccessMessage,
  addCaptionToLoading,
  openModal,
  closeModal,
}: PropsFromRedux) => {
  const [hasRewardToClaim, setHasRewardToClaim] = useState(false);
  const [rotateLogo, setRotateLogo] = useState(false);

  useEffect(() => {
    if (!ActiveAccountUtils.isEmpty(activeAccount)) {
      setHasRewardToClaim(
        RewardsUtils.hasReward(
          activeAccount.account.reward_pxs_balance as string,
          FormatUtils.toHP(
            activeAccount.account.reward_vesting_balance
              .toString()
              .replace('VESTS', ''),
            globalProperties.globals,
          ).toString(),
          activeAccount.account.reward_pixa_balance as string,
        ),
      );
    }
  }, [activeAccount]);

  const refresh = () => {
    setRotateLogo(true);
    refreshActiveAccount();
    loadGlobalProperties();
    setTimeout(() => setRotateLogo(false), 1000);
  };

  const claim = async (options?: TransactionOptions) => {
    try {
      addToLoadingList('popup_html_claiming_rewards');
      const claimResult = await RewardsUtils.claimRewards(
        activeAccount.name!,
        activeAccount.account.reward_pixa_balance,
        activeAccount.account.reward_pxs_balance,
        activeAccount.account.reward_vesting_balance,
        activeAccount.keys.posting!,
        options,
      );
      await AsyncUtils.sleep(3000);
      refreshActiveAccount();
      if (claimResult) {
        const rewardHp =
          FormatUtils.withCommas(
            FormatUtils.toHP(
              activeAccount.account.reward_vesting_balance
                .toString()
                .replace('VESTS', ''),
              globalProperties.globals,
            ).toString(),
          ) + ' PP';
        let claimedResources = [
          activeAccount.account.reward_pixa_balance,
          activeAccount.account.reward_pxs_balance,
          rewardHp,
        ].filter(
          (resource) => parseFloat(resource.toString().split(' ')[0]) !== 0,
        );
        setSuccessMessage('popup_html_claim_success', [
          claimedResources.join(', '),
        ]);
        refresh();
      } else {
        setErrorMessage('popup_html_claim_error');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      removeFromLoadingList('popup_html_claiming_rewards');
    }
  };

  const handleClickOnClaim = async (): Promise<void> => {
    if (!activeAccount.keys.posting) {
      setErrorMessage('popup_accounts_err_claim');
      return;
    }
    claim();
  };

  return (
    <div className="top-bar">
      <SVGIcon
        dataTestId="clickable-settings"
        icon={SVGIcons.MENU_BUTTON}
        onClick={() => navigateTo(Screen.SETTINGS_MAIN_PAGE)}
        className="button settings-button"
      />
      <SVGIcon
        className={`logo ${rotateLogo ? 'rotate' : ''}`}
        icon={SVGIcons.TOP_BAR_KEYCHAIN_LOGO}
        onClick={refresh}
        dataTestId="top-bar-refresh-icon"
      />
      <div className="top-bar-end">
        {hasRewardToClaim && (
          <SVGIcon
            icon={SVGIcons.TOP_BAR_CLAIM_REWARDS_BTN}
            dataTestId="reward-claim-icon"
            className="claim-button"
            onClick={() => handleClickOnClaim()}
            hoverable
          />
        )}
        <SelectAccountSectionComponent isOnMain />
      </div>
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    activeAccount: state.hive.activeAccount,
    globalProperties: state.hive.globalProperties,
  };
};

const connector = connect(mapStateToProps, {
  navigateTo,
  refreshActiveAccount,
  addToLoadingList,
  removeFromLoadingList,
  loadGlobalProperties,
  setErrorMessage,
  setSuccessMessage,
  addCaptionToLoading,
  openModal,
  closeModal,
});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const TopBarComponent = connector(TopBar);
