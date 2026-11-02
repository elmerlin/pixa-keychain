import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import {
  avatarFromMetadata,
  identicon,
  loadAvatar,
} from 'src/utils/avatar.utils';

jest.mock('src/popup/hive/utils/hive-tx.utils', () => ({
  HiveTxUtils: { getData: jest.fn() },
}));

const raster = 'data:image/png;base64,aGVsbG8=';
const metadata = (profile_image: unknown) =>
  JSON.stringify({ profile: { profile_image } });

describe('on-chain avatars', () => {
  it('accepts only embedded raster images', () => {
    expect(avatarFromMetadata(metadata(` ${raster} `))).toBe(raster);
    for (const image of [
      'https://example.com/avatar.png',
      'data:image/svg+xml;base64,PHN2Zz4=',
      'javascript:alert(1)',
      'data:text/html;base64,aGVsbG8=',
      'data:image/png;base64,<script>',
      123,
      null,
    ]) {
      expect(avatarFromMetadata(metadata(image))).toBeNull();
    }
    for (const raw of ['{', '{}', 'null', undefined])
      expect(avatarFromMetadata(raw)).toBeNull();
  });

  it('batches simultaneous names, deduplicates them, and caches missing avatars', async () => {
    jest.useFakeTimers();
    const rpc = HiveTxUtils.getData as jest.Mock;
    rpc.mockResolvedValue([
      { name: 'alice', posting_json_metadata: metadata(raster) },
    ]);
    const first = loadAvatar('alice');
    const duplicate = loadAvatar('alice');
    const missing = loadAvatar('bob');
    jest.runOnlyPendingTimers();
    await expect(first).resolves.toBe(raster);
    await expect(duplicate).resolves.toBe(raster);
    await expect(missing).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith('condenser_api.get_accounts', [
      ['alice', 'bob'],
    ]);
    await loadAvatar('bob');
    expect(rpc).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('renders deterministic, mirrored 5 by 5 fallback cells', () => {
    const icon = identicon('pixa.team');
    expect(icon).toEqual(identicon('pixa.team'));
    expect(icon).not.toEqual(identicon('pixtopia'));
    for (const [x, y] of icon.cells) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(5);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(5);
      expect(icon.cells).toContainEqual([4 - x, y]);
    }
  });
});
