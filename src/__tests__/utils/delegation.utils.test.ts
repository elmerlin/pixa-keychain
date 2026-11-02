import { DelegationUtils } from '@hiveapp/utils/delegation.utils';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import delegations from 'src/__tests__/utils-for-testing/data/delegations';
import mk from 'src/__tests__/utils-for-testing/data/mk';

describe('delegation.utils.ts tests:/n', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  describe('getDelegators', () => {
    const delegation = (
      delegator: string,
      delegatee: string,
      amount: string,
    ) => ({
      delegator,
      delegatee,
      vesting_shares: { amount, precision: 6, nai: '@@000000037' },
      min_delegation_time: '2026-01-01T00:00:00',
    });

    it('filters the recipient and zero shares, converts VESTS and sorts largest first', async () => {
      const getData = jest
        .spyOn(HiveTxUtils, 'getData')
        .mockResolvedValue({
          delegations: [
            delegation('small', 'alice', '1500000'),
            delegation('other', 'bob', '9000000'),
            delegation('zero', 'alice', '0'),
            delegation('large', 'alice', '2000000'),
          ],
        });
      await expect(DelegationUtils.getDelegators('alice')).resolves.toEqual([
        {
          delegator: 'large',
          vesting_shares: 2,
          delegation_date: '2026-01-01T00:00:00',
        },
        {
          delegator: 'small',
          vesting_shares: 1.5,
          delegation_date: '2026-01-01T00:00:00',
        },
      ]);
      expect(getData).toHaveBeenCalledWith(
        'database_api.list_vesting_delegations',
        {
          start: ['miners', ''],
          limit: 1000,
          order: 'by_delegation',
        },
      );
    });

    it('pages from the last delegation and deduplicates the inclusive boundary', async () => {
      const firstPage = Array.from({ length: 1000 }, (_, i) =>
        delegation(`lender-${i}`, 'alice', '1000000'),
      );
      const getData = jest
        .spyOn(HiveTxUtils, 'getData')
        .mockReset()
        .mockResolvedValueOnce({ delegations: firstPage })
        .mockResolvedValueOnce({
          delegations: [firstPage[999], delegation('last', 'alice', '2500000')],
        });
      const result = await DelegationUtils.getDelegators('alice');
      expect(getData).toHaveBeenCalledTimes(2);
      expect(getData).toHaveBeenNthCalledWith(
        2,
        'database_api.list_vesting_delegations',
        {
          start: ['lender-999', 'alice'],
          limit: 1000,
          order: 'by_delegation',
        },
      );
      expect(result).toHaveLength(1001);
      expect(new Set(result.map((d) => d.delegator)).size).toBe(1001);
      expect(result[0]).toEqual({
        delegator: 'last',
        vesting_shares: 2.5,
        delegation_date: '2026-01-01T00:00:00',
      });
    });

    it('returns an empty list when the chain has no delegations', async () => {
      jest.spyOn(HiveTxUtils, 'getData').mockResolvedValue({ delegations: [] });
      await expect(DelegationUtils.getDelegators('alice')).resolves.toEqual([]);
    });

    it('propagates an RPC failure so the screen can show an error', async () => {
      jest
        .spyOn(HiveTxUtils, 'getData')
        .mockRejectedValue(new Error('RPC unavailable'));
      await expect(DelegationUtils.getDelegators('alice')).rejects.toThrow(
        'RPC unavailable',
      );
    });
  });

  describe('getDelegatees cases:\n', () => {
    const delegateeListFiltered = delegations.delegatees.filter(
      (delegatee) =>
        parseFloat(delegatee.vesting_shares.toString().split(' ')[0]) > 0,
    );
    it('Must return delegatees list filtering 0 vests records', async () => {
      HiveTxUtils.getData = jest.fn().mockResolvedValue(delegations.delegatees);
      expect(await DelegationUtils.getDelegatees(mk.user.one)).toEqual(
        delegateeListFiltered,
      );
    });
  });

  describe('getPendingOutgoingUndelegation cases:\n', () => {
    it('Must return adjusted list', async () => {
      HiveTxUtils.getData = jest
        .fn()
        .mockResolvedValue(delegations.pendingOutgoingUndelegationAsset);
      expect(
        await DelegationUtils.getPendingOutgoingUndelegation(mk.user.one),
      ).toEqual(delegations.pendingOutgoingUndelegationAssetExpected);
    });
  });
});
