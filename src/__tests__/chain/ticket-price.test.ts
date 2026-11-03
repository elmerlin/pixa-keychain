/**
 * @jest-environment node
 */
import AccountUtils from 'src/popup/hive/utils/account.utils';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import price from './ticket-price.fixture.json';

// Prices read from the chain on 2026-11-03. Pixtopia's rcCost gave 310185364 for them.
const PIXTOPIA_COST = 310185364;

describe('What an account ticket costs', () => {
  const answers: Record<string, unknown> = {
    'rc_api.get_resource_params': price.params,
    'rc_api.get_resource_pool': price.pools,
    'rc_api.get_rc_stats': price.stats,
    'condenser_api.get_dynamic_global_properties': price.globals,
  };

  beforeEach(() => {
    jest
      .spyOn(HiveTxUtils, 'getData')
      .mockImplementation(async (method: string) => answers[method]);
  });

  afterEach(() => jest.restoreAllMocks());

  it('agrees with what Pixtopia works out', async () => {
    const cost = await AccountUtils.getAccountTicketCost();
    expect(Math.abs(cost - PIXTOPIA_COST) / PIXTOPIA_COST).toBeLessThan(0.0001);
  });

  it('goes up as the pool of new accounts empties', async () => {
    const cost = await AccountUtils.getAccountTicketCost();
    answers['rc_api.get_resource_pool'] = {
      resource_pool: {
        ...price.pools.resource_pool,
        resource_new_accounts: {
          pool: price.pools.resource_pool.resource_new_accounts.pool / 2,
        },
      },
    };
    expect(await AccountUtils.getAccountTicketCost()).toBeGreaterThan(cost);
    answers['rc_api.get_resource_pool'] = price.pools;
  });
});
