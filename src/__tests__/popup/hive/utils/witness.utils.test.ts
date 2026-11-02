import moment from 'moment';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import { WITNESS_DISABLED_KEY } from 'src/popup/hive/utils/witness.utils';
import { GlobalProperties } from '@interfaces/global-properties.interface';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import WitnessUtils from 'src/popup/hive/utils/witness.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';

describe('witness.utils', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('chain witness data', () => {
    beforeEach(() => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.parse('2026-01-02T00:00:00Z'));
    });
    const globals = {
      globals: {
        total_vesting_fund_pixa: '500.000 PIXA',
        total_vesting_shares: '1000.000000 VESTS',
      },
    } as GlobalProperties;
    const witness = {
      owner: 'alice',
      votes: '4000000000',
      total_missed: 3,
      last_confirmed_block_num: 42,
      last_pxs_exchange_update: '2026-01-01T00:00:00',
      pxs_exchange_rate: {
        base: { amount: '750', precision: 3, nai: '@@000000013' },
      },
      signing_key: 'PIXsigning',
      url: 'https://alice.example',
      running_version: '1.30.0',
      props: {
        account_creation_fee: {
          amount: '3000',
          precision: 3,
          nai: '@@000000021',
        },
        maximum_block_size: 65536,
        pxs_interest_rate: 1250,
      },
    };

    it('ranks every witness by votes and only signing witnesses by active rank', async () => {
      const rows = [
        {
          owner: 'alice',
          votes: '30',
          signing_key: 'PIXalice',
          url: 'https://alice.example',
        },
        {
          owner: 'disabled',
          votes: '20',
          signing_key: WITNESS_DISABLED_KEY,
          url: '',
        },
        {
          owner: 'bob',
          votes: '10',
          signing_key: 'PIXbob',
          url: 'https://bob.example',
        },
      ];
      const getData = jest
        .spyOn(HiveTxUtils, 'getData')
        .mockResolvedValue(rows);
      await expect(WitnessUtils.getWitnessRanking()).resolves.toEqual([
        {
          name: 'alice',
          rank: '1',
          active_rank: '1',
          votes: '30',
          signing_key: 'PIXalice',
          url: 'https://alice.example',
        },
        {
          name: 'disabled',
          rank: '2',
          active_rank: undefined,
          votes: '20',
          signing_key: WITNESS_DISABLED_KEY,
          url: '',
        },
        {
          name: 'bob',
          rank: '3',
          active_rank: '2',
          votes: '10',
          signing_key: 'PIXbob',
          url: 'https://bob.example',
        },
      ]);
      expect(getData).toHaveBeenCalledWith(
        'condenser_api.get_witnesses_by_vote',
        [null, 1000],
      );
    });

    it('returns no ranking when the chain has no witnesses', async () => {
      jest.spyOn(HiveTxUtils, 'getData').mockResolvedValue([]);
      await expect(WitnessUtils.getWitnessRanking()).resolves.toEqual([]);
    });

    it('reads witness info and pages voters without double-counting the inclusive boundary', async () => {
      const page = Array.from({ length: 1000 }, (_, i) => ({
        witness: 'alice',
        account: `voter-${i}`,
      }));
      const getData = jest
        .spyOn(HiveTxUtils, 'getData')
        .mockImplementation(async (method, params: any) => {
          if (method === 'database_api.find_witnesses')
            return { witnesses: [witness] };
          if (method === 'database_api.list_witness_votes')
            return {
              votes:
                params.start[1] === ''
                  ? page
                  : [
                      page[999],
                      { witness: 'alice', account: 'last-voter' },
                      { witness: 'bob', account: 'other-voter' },
                    ],
            };
          throw new Error(`Unexpected RPC method: ${method}`);
        });
      const info = await WitnessUtils.getWitnessInfo('alice', globals);
      expect(info).toEqual({
        username: 'alice',
        votesCount: 1001,
        voteValueInHP: '2k',
        blockMissed: 3,
        lastBlock: 42,
        lastBlockUrl: 'https://pixtopia.net/chain/block/42',
        priceFeed: '0.750 PXS',
        priceFeedUpdatedAt: moment('2026-01-01T00:00:00Z'),
        priceFeedUpdatedAtWarning: true,
        signingKey: 'PIXsigning',
        url: 'https://alice.example',
        version: '1.30.0',
        isDisabled: false,
        params: {
          accountCreationFee: 3,
          accountCreationFeeFormatted: '3.000 PIXA',
          maximumBlockSize: 65536,
          hbdInterestRate: 12.5,
        },
      });
      expect(info).not.toHaveProperty('rewards');
      expect(getData).toHaveBeenCalledWith('database_api.find_witnesses', {
        owners: ['alice'],
      });
      expect(
        getData.mock.calls.filter(
          ([method]) => method === 'database_api.list_witness_votes',
        ),
      ).toEqual([
        [
          'database_api.list_witness_votes',
          { start: ['alice', ''], limit: 1000, order: 'by_witness_account' },
        ],
        [
          'database_api.list_witness_votes',
          {
            start: ['alice', 'voter-999'],
            limit: 1000,
            order: 'by_witness_account',
          },
        ],
      ]);
    });

    it('stops at the next witness even on a full page, and identifies a disabled witness', async () => {
      const getData = jest
        .spyOn(HiveTxUtils, 'getData')
        .mockImplementation(async (method) => {
          if (method === 'database_api.find_witnesses')
            return {
              witnesses: [{ ...witness, signing_key: WITNESS_DISABLED_KEY }],
            };
          return {
            votes: Array.from({ length: 1000 }, (_, i) => ({
              witness: i === 0 ? 'alice' : 'bob',
              account: `voter-${i}`,
            })),
          };
        });
      const info = await WitnessUtils.getWitnessInfo('alice', globals);
      expect(info.votesCount).toBe(1);
      expect(info.isDisabled).toBe(true);
      expect(getData).toHaveBeenCalledTimes(2);
    });

    it('counts zero votes for an empty page', async () => {
      jest
        .spyOn(HiveTxUtils, 'getData')
        .mockImplementation(async (method) =>
          method === 'database_api.find_witnesses'
            ? { witnesses: [witness] }
            : { votes: [] },
        );
      expect(
        (await WitnessUtils.getWitnessInfo('alice', globals)).votesCount,
      ).toBe(0);
    });

    it('propagates RPC failures to the governance screen', async () => {
      jest
        .spyOn(HiveTxUtils, 'getData')
        .mockRejectedValue(new Error('RPC unavailable'));
      await expect(WitnessUtils.getWitnessRanking()).rejects.toThrow(
        'RPC unavailable',
      );
      await expect(
        WitnessUtils.getWitnessInfo('alice', globals),
      ).rejects.toThrow('RPC unavailable');
    });
  });

  describe('getWitnessVoteOperation', () => {
    it('returns account_witness_vote with approve flag', () => {
      expect(
        WitnessUtils.getWitnessVoteOperation(true, 'voter1', 'wit'),
      ).toEqual([
        'account_witness_vote',
        { account: 'voter1', approve: true, witness: 'wit' },
      ]);
      expect(
        WitnessUtils.getWitnessVoteOperation(false, 'voter1', 'wit'),
      ).toEqual([
        'account_witness_vote',
        { account: 'voter1', approve: false, witness: 'wit' },
      ]);
    });
  });

  describe('getLastSigningKeyForWitness / saveLastSigningKeyForWitness', () => {
    it('returns null when no witness signing keys are stored', async () => {
      jest
        .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
        .mockResolvedValue(null);
      await expect(
        WitnessUtils.getLastSigningKeyForWitness('alice'),
      ).resolves.toBeNull();
    });

    it('returns stored key for username', async () => {
      jest
        .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
        .mockResolvedValue({
          alice: 'PIXabc',
        });
      await expect(
        WitnessUtils.getLastSigningKeyForWitness('alice'),
      ).resolves.toBe('PIXabc');
    });

    it('merges new key into existing storage map', async () => {
      jest
        .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
        .mockResolvedValueOnce({ bob: 'PIXold' });
      const save = jest
        .spyOn(LocalStorageUtils, 'saveValueInLocalStorage')
        .mockResolvedValue(undefined);

      await WitnessUtils.saveLastSigningKeyForWitness('alice', 'PIXnew');

      expect(save).toHaveBeenCalledWith(
        LocalStorageKeyEnum.WITNESS_LAST_SIGNING_KEY,
        {
          bob: 'PIXold',
          alice: 'PIXnew',
        },
      );
    });

    it('creates storage map when none exists', async () => {
      jest
        .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
        .mockResolvedValueOnce(null);
      const save = jest
        .spyOn(LocalStorageUtils, 'saveValueInLocalStorage')
        .mockResolvedValue(undefined);

      await WitnessUtils.saveLastSigningKeyForWitness('carol', 'PIXx');

      expect(save).toHaveBeenCalledWith(
        LocalStorageKeyEnum.WITNESS_LAST_SIGNING_KEY,
        {
          carol: 'PIXx',
        },
      );
    });
  });

  describe('wasUpdatedAfterThreshold', () => {
    it('returns true when the feed is older than the configured warning window', () => {
      const limitHours = 5;
      const stale = moment.utc().subtract(limitHours + 2, 'hours');
      expect(WitnessUtils.wasUpdatedAfterThreshold(stale)).toBe(true);
    });

    it('returns false when the feed is recent enough', () => {
      const fresh = moment.utc().subtract(1, 'hours');
      expect(WitnessUtils.wasUpdatedAfterThreshold(fresh)).toBe(false);
    });
  });
});
