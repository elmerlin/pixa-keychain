import axios from 'axios';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import { getFakeStore } from 'src/__tests__/utils-for-testing/fake-store';
import { initialEmptyStateStore } from 'src/__tests__/utils-for-testing/initial-states';
import { fetchPhishingAccounts } from 'src/popup/hive/actions/phishing.actions';
import PhishingUtils from 'src/utils/phishing.utils';

describe('local phishing lists', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns empty lists without fetching remote data', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockClear();
    const rpc = jest.spyOn(HiveTxUtils, 'getData');
    const get = jest.spyOn(axios, 'get');
    const post = jest.spyOn(axios, 'post');
    const store = getFakeStore(initialEmptyStateStore);
    await store.dispatch<any>(fetchPhishingAccounts());
    expect(store.getState().hive.phishing).toEqual([]);
    expect(await PhishingUtils.getBlacklistedDomains()).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
});
