import type {
  AccountWitnessVoteOperation,
  WitnessUpdateOperation,
} from '@hiveio/dhive';
import { GlobalProperties } from '@interfaces/global-properties.interface';
import { Key, TransactionOptions } from '@interfaces/keys.interface';
import {
  LastSigningKeys,
  Witness,
  WitnessInfo,
  WitnessParamsForm,
} from '@interfaces/witness.interface';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import moment from 'moment';
import Config from 'src/config';
import { GovernanceUtils } from 'src/popup/hive/utils/governance.utils';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import FormatUtils from 'src/utils/format.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';

export const WITNESS_DISABLED_KEY =
  'PIX1111111111111111111111111111111114T1Anm';

/* istanbul ignore next */
const voteWitness = async (
  witness: Witness,
  voter: string,
  activeKey: Key,
  options?: TransactionOptions,
) => {
  const witnessOperation = WitnessUtils.getWitnessVoteOperation(
    true,
    voter,
    witness.name,
  );

  return WitnessUtils.sendWitnessOperation(
    witnessOperation,
    voter,
    activeKey,
    options,
  );
};
/* istanbul ignore next */
const unvoteWitness = async (
  witness: Witness,
  voter: string,
  activeKey: Key,
  options?: TransactionOptions,
) => {
  const witnessOperation = WitnessUtils.getWitnessVoteOperation(
    false,
    voter,
    witness.name,
  );

  return WitnessUtils.sendWitnessOperation(
    witnessOperation,
    voter,
    activeKey,
    options,
  );
};
/* istanbul ignore next */
const updateWitnessVote = async (
  voter: string,
  witness: Witness,
  approve: boolean,
  activeKey: Key,
  options?: TransactionOptions,
) => {
  const witnessOperation = WitnessUtils.getWitnessVoteOperation(
    approve,
    voter,
    witness.name,
  );

  return WitnessUtils.sendWitnessOperation(
    witnessOperation,
    voter,
    activeKey,
    options,
  );
};
/* istanbul ignore next */
const sendWitnessOperation = async (
  witnessOperation: AccountWitnessVoteOperation,
  username: string,
  activeKey: Key,
  options?: TransactionOptions,
) => {
  GovernanceUtils.removeFromIgnoreRenewal(username);

  return await HiveTxUtils.sendOperation(
    [witnessOperation],
    activeKey,
    false,
    options,
  );
};
/* istanbul ignore next */
const getWitnessVoteOperation = (
  approve: boolean,
  voter: string,
  witnessName: string,
) => {
  return [
    'account_witness_vote',
    {
      account: voter,
      approve: approve,
      witness: witnessName,
    },
  ] as AccountWitnessVoteOperation;
};
/* istanbul ignore next */
const getUpdateWitnessTransaction = (
  voter: string,
  witness: Witness,
  approve: boolean,
) => {
  return HiveTxUtils.createTransaction([
    WitnessUtils.getWitnessVoteOperation(approve, voter, witness.name),
  ]);
};

const getWitnessAccountUpdateOperation = (
  witnessAccountName: string,
  witnessParamsForm: WitnessParamsForm,
) => {
  return [
    'witness_update',
    {
      owner: witnessAccountName,
      url: witnessParamsForm.url,
      block_signing_key: witnessParamsForm.signingKey,
      props: {
        account_creation_fee: `${Number(
          witnessParamsForm.accountCreationFee,
        ).toFixed(3)} PIXA`,
        maximum_block_size: Number(witnessParamsForm.maximumBlockSize),
        // Rounded: 1.13 * 100 is 112.99999999999999 in floating point.
        pxs_interest_rate: Math.round(
          Number(witnessParamsForm.hbdInterestRate) * 100,
        ),
      },
      fee: '0.000 PIXA',
    },
  ] as WitnessUpdateOperation;
};

const updateWitnessParameters = async (
  witnessAccountName: string,
  witnessParamsForm: WitnessParamsForm,
  activeKey: Key,
  options?: TransactionOptions,
) => {
  const witnessAccountUpdateOperation = getWitnessAccountUpdateOperation(
    witnessAccountName,
    witnessParamsForm,
  );
  return await HiveTxUtils.sendOperation(
    [witnessAccountUpdateOperation],
    activeKey,
    true,
    options,
  );
};

// Everyone ranked by votes. Only witnesses that are still signing count towards the active rank.
const getWitnessRanking = async (): Promise<Witness[]> => {
  const witnesses = await HiveTxUtils.getData(
    'condenser_api.get_witnesses_by_vote',
    [null, 1000],
  );
  let activeRank = 0;
  return witnesses.map((witness: any, index: number) => ({
    name: witness.owner,
    rank: `${index + 1}`,
    active_rank:
      witness.signing_key === WITNESS_DISABLED_KEY
        ? undefined
        : `${++activeRank}`,
    votes: witness.votes,
    signing_key: witness.signing_key,
    url: witness.url,
  }));
};

const getWitnessVotesCount = async (username: string) => {
  const LIMIT = 1000;
  const voters = new Set<string>();
  let start = [username, ''];
  for (;;) {
    const { votes } = await HiveTxUtils.getData(
      'database_api.list_witness_votes',
      { start, limit: LIMIT, order: 'by_witness_account' },
    );
    const forWitness = votes.filter((vote: any) => vote.witness === username);
    forWitness.forEach((vote: any) => voters.add(vote.account));
    if (votes.length < LIMIT || forWitness.length < votes.length) break;
    const last = votes[votes.length - 1];
    start = [last.witness, last.account];
  }
  return voters.size;
};

const getWitnessInfo = async (
  username: string,
  globalProperties: GlobalProperties,
): Promise<WitnessInfo> => {
  const [votesCount, witnesses] = await Promise.all([
    getWitnessVotesCount(username),
    HiveTxUtils.getData('database_api.find_witnesses', {
      owners: [username],
    }),
  ]);
  const resultFromBlockchain = witnesses.witnesses[0];

  const lastFeedUpdate = `${resultFromBlockchain.last_pxs_exchange_update}Z`;

  const witnessInfo: WitnessInfo = {
    username: resultFromBlockchain.owner,
    votesCount,
    voteValueInHP: FormatUtils.nFormatter(
      FormatUtils.toHP(
        (Number(resultFromBlockchain.votes) / 1000000).toString(),
        globalProperties.globals,
      ),
      3,
    ),
    blockMissed: resultFromBlockchain.total_missed,
    lastBlock: resultFromBlockchain.last_confirmed_block_num,
    lastBlockUrl: `${Config.explorer.baseURL}/block/${resultFromBlockchain.last_confirmed_block_num}`,
    priceFeed: FormatUtils.fromNaiAndSymbol(
      resultFromBlockchain.pxs_exchange_rate.base,
    ),
    priceFeedUpdatedAt: moment(lastFeedUpdate),
    priceFeedUpdatedAtWarning: wasUpdatedAfterThreshold(moment(lastFeedUpdate)),
    signingKey: resultFromBlockchain.signing_key,
    url: resultFromBlockchain.url,
    version: resultFromBlockchain.running_version,
    isDisabled: resultFromBlockchain.signing_key === WITNESS_DISABLED_KEY,
    params: {
      accountCreationFee: FormatUtils.getAmountFromNai(
        resultFromBlockchain.props.account_creation_fee,
      ),
      accountCreationFeeFormatted: FormatUtils.fromNaiAndSymbol(
        resultFromBlockchain.props.account_creation_fee,
      ),
      maximumBlockSize: resultFromBlockchain.props.maximum_block_size,
      hbdInterestRate: resultFromBlockchain.props.pxs_interest_rate / 100,
    },
  };
  return witnessInfo;
};
const wasUpdatedAfterThreshold = (updatedAt: moment.Moment) => {
  const now = moment.utc();
  var duration = moment.duration(now.diff(updatedAt.utc()));
  var hours = duration.asHours();

  return hours > Config.witnesses.feedWarningLimitInHours;
};

const getLastSigningKeyForWitness = async (username: string) => {
  const result: LastSigningKeys =
    await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.WITNESS_LAST_SIGNING_KEY,
    );
  return result ? result[username] : null;
};

const saveLastSigningKeyForWitness = async (username: string, key: string) => {
  let result: LastSigningKeys =
    await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.WITNESS_LAST_SIGNING_KEY,
    );
  if (!result) {
    result = {};
  }
  result[username] = key;
  LocalStorageUtils.saveValueInLocalStorage(
    LocalStorageKeyEnum.WITNESS_LAST_SIGNING_KEY,
    result,
  );
};

const WitnessUtils = {
  getWitnessRanking,
  unvoteWitness,
  voteWitness,
  getWitnessVoteOperation,
  sendWitnessOperation,
  updateWitnessVote,
  getUpdateWitnessTransaction,
  updateWitnessParameters,
  getWitnessInfo,
  wasUpdatedAfterThreshold,
  getLastSigningKeyForWitness,
  saveLastSigningKeyForWitness,
};

export default WitnessUtils;
