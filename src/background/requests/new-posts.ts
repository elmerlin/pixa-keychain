import { call } from 'hive-tx';

const ANSWER_MS = 10_000;

// Only the two plain shapes of "there's no such post" count, from the node's own words.
const isMissing = (response: any, author: string, permlink: string) => {
  if (!response || typeof response !== 'object' || ('result' in response && 'error' in response)) {
    return false;
  }
  if ('result' in response) {
    const { result } = response;
    return (
      typeof result === 'object' && result !== null && result.author === '' && result.permlink === ''
    );
  }
  return response.error?.message === `Assert Exception:Post ${author}/${permlink} does not exist`;
};

/**
 * A saved approval covers reward settings only on a post being made, never one that's already out, and a
 * transaction can't say which it is. So before one is signed without asking, the person's own node is asked
 * about each post. Only a plain "doesn't exist" counts: anything else, no answer in time included, means asking.
 * A node a few seconds behind can still miss a post made moments ago.
 */
export const postsAreNew = async (operations: unknown): Promise<boolean> => {
  if (!Array.isArray(operations)) return true;
  const posts = operations
    .filter((operation) => Array.isArray(operation) && operation[0] === 'comment_options')
    .map(([, options]) => options);
  const deadline = Date.now() + ANSWER_MS;
  for (const { author, permlink } of posts) {
    try {
      // The call's own timeout stops once headers arrive, so the whole answer has a deadline here.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const response = await Promise.race([
        call('condenser_api.get_content', [author, permlink], ANSWER_MS / 1000),
        new Promise((resolve) => {
          timer = setTimeout(resolve, Math.max(0, deadline - Date.now()));
        }),
      ]).finally(() => clearTimeout(timer));
      if (!isMissing(response, author, permlink)) return false;
    } catch (e) {
      return false;
    }
  }
  return true;
};
