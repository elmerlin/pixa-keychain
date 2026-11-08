import { postsAreNew } from '@background/requests/new-posts';
import { call } from 'hive-tx';

jest.mock('hive-tx', () => ({ ...jest.requireActual('hive-tx'), call: jest.fn() }));

const options = (permlink: string) => ['comment_options', { author: 'alice', permlink }];
const missing = (permlink: string) => ({
  error: { message: `Assert Exception:Post alice/${permlink} does not exist` },
});

describe('postsAreNew', () => {
  beforeEach(() => (call as jest.Mock).mockReset());

  it('asks nothing of the node when there are no reward settings', async () => {
    expect(await postsAreNew([['vote', {}]])).toBe(true);
    expect(await postsAreNew(undefined)).toBe(true);
    expect(call).not.toHaveBeenCalled();
  });

  it('counts a post the node says does not exist as new', async () => {
    (call as jest.Mock).mockResolvedValueOnce(missing('re-p'));
    expect(await postsAreNew([['comment', {}], options('re-p')])).toBe(true);
    expect(call).toHaveBeenCalledWith('condenser_api.get_content', ['alice', 're-p'], 10);
  });

  it('counts an empty answer, as older nodes give, as new', async () => {
    (call as jest.Mock).mockResolvedValueOnce({ result: { author: '', permlink: '' } });
    expect(await postsAreNew([options('re-p')])).toBe(true);
  });

  it.each([
    ['a post that is already out', { result: { author: 'alice', permlink: 're-p' } }],
    ['another error', { error: { message: 'Internal Error' } }],
    ['a missing post under another name', missing('something-else')],
    ['no answer at all', undefined],
  ])('asks for %s', async (_, answer) => {
    (call as jest.Mock).mockResolvedValueOnce(answer);
    expect(await postsAreNew([options('re-p')])).toBe(false);
  });

  it.each([
    ['an answer that says both', { result: { author: '', permlink: '' }, error: { message: 'x' } }],
    ['an empty answer with a permlink', { result: { author: '', permlink: 're-p' } }],
    ['an error that only ends the same way', { error: { message: 'Unable to determine whether Post alice/re-p does not exist' } }],
  ])('asks for %s', async (_, answer) => {
    (call as jest.Mock).mockResolvedValueOnce(answer);
    expect(await postsAreNew([options('re-p')])).toBe(false);
  });

  it('asks when the node starts answering and never finishes', async () => {
    jest.useFakeTimers();
    (call as jest.Mock).mockReturnValueOnce(new Promise(() => undefined));
    const answer = postsAreNew([options('re-p')]);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(await answer).toBe(false);
    jest.useRealTimers();
  });

  it('asks when the node cannot be reached', async () => {
    (call as jest.Mock).mockRejectedValueOnce(new Error('timeout'));
    expect(await postsAreNew([options('re-p')])).toBe(false);
  });

  it('needs every post to be new', async () => {
    (call as jest.Mock)
      .mockResolvedValueOnce(missing('a'))
      .mockResolvedValueOnce({ result: { author: 'alice', permlink: 'b' } });
    expect(await postsAreNew([options('a'), options('b')])).toBe(false);
  });
});
