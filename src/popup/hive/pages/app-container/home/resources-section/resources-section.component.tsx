import { RootState } from '@popup/multichain/store';
import React from 'react';
import { ConnectedProps, connect } from 'react-redux';
import { EnergyMeter } from 'src/popup/hive/pages/app-container/home/resources-section/energy-meter/energy-meter.component';
import HiveUtils from 'src/popup/hive/utils/hive.utils';

const ResourcesSection = ({
  activeAccount,
  globalProperties,
}: PropsFromRedux) => {
  const loaded =
    activeAccount?.account?.voting_manabar?.current_mana !== undefined &&
    activeAccount.rc?.percentage !== undefined;
  const hasMana =
    loaded && activeAccount.account.voting_manabar.current_mana !== 0;
  const mana = hasMana
    ? HiveUtils.getVP(activeAccount.account) ?? undefined
    : undefined;
  const rc = loaded ? activeAccount.rc.percentage : undefined;

  const manaTooltip = () => {
    if (!loaded) return undefined;
    if (!hasMana) return chrome.i18n.getMessage('html_popup_voting_no_hp');
    const fullVote = parseFloat(
      HiveUtils.getVotingDollarsPerAccount(
        100,
        globalProperties,
        activeAccount.account,
        false,
      ) as string,
    ).toFixed(2);
    return `${HiveUtils.getTimeBeforeFull(mana!)} ${chrome.i18n.getMessage(
      'popup_html_vm_full_vote_value',
      [fullVote],
    )}`;
  };

  return (
    <div className="resources-section">
      <EnergyMeter
        dataTestId="resource-item-voting-mana"
        label={chrome.i18n.getMessage('popup_html_vm')}
        percent={mana}
        tooltip={manaTooltip()}
      />
      <EnergyMeter
        dataTestId="resource-item-resource-credits"
        label={chrome.i18n.getMessage('popup_html_rc')}
        percent={rc}
        tooltip={loaded ? HiveUtils.getTimeBeforeFull(rc!) : undefined}
      />
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    activeAccount: state.hive.activeAccount,
    globalProperties: state.hive.globalProperties,
  };
};

const connector = connect(mapStateToProps, {});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const ResourcesSectionComponent = connector(ResourcesSection);
