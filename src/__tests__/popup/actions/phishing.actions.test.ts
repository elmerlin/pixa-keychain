import { KeychainApi } from '@api/keychain';
import { getFakeStore } from 'src/__tests__/utils-for-testing/fake-store';
import { initialEmptyStateStore } from 'src/__tests__/utils-for-testing/initial-states';
import { fetchPhishingAccounts } from 'src/popup/hive/actions/phishing.actions';
import PhishingUtils from 'src/utils/phishing.utils';

describe('local phishing lists', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns empty lists without fetching remote data', async () => {
    const api = jest.spyOn(KeychainApi, 'get');
    const store = getFakeStore(initialEmptyStateStore);
    await store.dispatch<any>(fetchPhishingAccounts());
    expect(store.getState().hive.phishing).toEqual([]);
    expect(await PhishingUtils.getBlacklistedDomains()).toEqual([]);
    expect(api).not.toHaveBeenCalled();
  });
});
