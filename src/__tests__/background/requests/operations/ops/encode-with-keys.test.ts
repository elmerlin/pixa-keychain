/** @jest-environment node */
// jsdom has its own Uint8Array, which the key libraries don't recognise.
import { encodeWithKeys } from '@background/requests/operations/ops/encode-with-keys';
import * as MemoEncode from '@hiveio/hive-js/lib/auth/memo';

describe('encodeWithKeys', () => {
  beforeEach(() => {
    jest.spyOn(chrome.i18n, 'getMessage').mockImplementation((k) => String(k));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('encodes the message for each public key using the request key', async () => {
    const encodeSpy = jest
      .spyOn(MemoEncode, 'encode')
      .mockReturnValueOnce('enc-a')
      .mockReturnValueOnce('enc-b');

    const requestHandler = {
      data: { key: 'privWif' },
    } as any;

    const msg = await encodeWithKeys(requestHandler, {
      publicKeys: ['PIX8RrW2Q65qHr3NULhsbmYArGUK1JnDpxzfao99JXbXjxbER5aEo', 'PIX89L4B5EgYwhGv3794kEgq7bteLMgWj1vXefEyBrr7vrXrYeSKB'],
      message: 'secret',
      request_id: 99,
    } as any);

    expect(encodeSpy).toHaveBeenNthCalledWith(1, 'privWif', 'PIX8RrW2Q65qHr3NULhsbmYArGUK1JnDpxzfao99JXbXjxbER5aEo', 'secret');
    expect(encodeSpy).toHaveBeenNthCalledWith(2, 'privWif', 'PIX89L4B5EgYwhGv3794kEgq7bteLMgWj1vXefEyBrr7vrXrYeSKB', 'secret');
    expect(msg.msg?.success).toBe(true);
    expect(msg.msg?.result).toEqual({
      PIX8RrW2Q65qHr3NULhsbmYArGUK1JnDpxzfao99JXbXjxbER5aEo: 'enc-a',
      PIX89L4B5EgYwhGv3794kEgq7bteLMgWj1vXefEyBrr7vrXrYeSKB: 'enc-b',
    });
  });

  it('returns createMessage with error when encode throws', async () => {
    jest.spyOn(MemoEncode, 'encode').mockImplementation(() => {
      throw new Error('bad_memo');
    });

    const requestHandler = { data: { key: 'k' } } as any;

    const msg = await encodeWithKeys(requestHandler, {
      publicKeys: ['PIXx'],
      message: 'm',
      request_id: 1,
    } as any);

    expect(msg.msg?.success).toBe(false);
    expect(msg.msg?.error).toEqual(expect.any(Error));
  });
});
