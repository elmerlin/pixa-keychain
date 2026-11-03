/**
 * @jest-environment node
 */
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import { AsyncUtils } from 'src/utils/async.utils';

// Pixa's node has no transaction_status_api. Asking it for that used to throw after a transfer had
// been accepted, so the wallet said it failed, and pressing Confirm again would send the money twice.
describe('After a transaction is accepted', () => {
  const reply = (body: object) => ({
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, ...body }),
  });
  const found = reply({ result: { transaction_id: 'abc', block_num: 1 } });
  const unknown = reply({
    error: {
      code: -32003,
      message: 'Assert Exception:false: Unknown Transaction abc',
    },
  });
  const send = () => HiveTxUtils.sendOperation([] as any, 'key', true);
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest
      .spyOn(HiveTxUtils, 'createSignAndBroadcastTransaction')
      .mockResolvedValue({ tx_id: 'abc', status: 'broadcasted' } as any);
    jest.spyOn(AsyncUtils, 'sleep').mockResolvedValue();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  const methodsAsked = () =>
    fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).method);

  it('is confirmed once the node finds it', async () => {
    fetchMock.mockResolvedValueOnce(unknown).mockResolvedValueOnce(found);
    await expect(send()).resolves.toMatchObject({
      tx_id: 'abc',
      confirmed: true,
    });
    expect(methodsAsked()).toEqual([
      'condenser_api.get_transaction',
      'condenser_api.get_transaction',
    ]);
  });

  it('still counts as sent if the node never finds it', async () => {
    fetchMock.mockResolvedValue(unknown);
    await expect(send()).resolves.toMatchObject({
      tx_id: 'abc',
      confirmed: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('still counts as sent if the node stops answering', async () => {
    fetchMock.mockRejectedValue(new Error('Failed to fetch'));
    await expect(send()).resolves.toMatchObject({
      tx_id: 'abc',
      confirmed: false,
    });
  });

  it("doesn't look anything up when not asked to wait", async () => {
    await expect(
      HiveTxUtils.sendOperation([] as any, 'key', false),
    ).resolves.toMatchObject({ confirmed: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
