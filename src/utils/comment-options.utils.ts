import { KeychainError } from 'src/keychain-error';

/**
 * A post's reward settings as a site sent them. They can send a post's rewards to someone else, so
 * they have to be readable, and about this post. Returns nothing when there are none.
 */
export const readCommentOptions = (
  raw: string | undefined,
  author: string,
  permlink: string,
) => {
  if (!raw) return undefined;
  let options: Record<string, unknown> | null;
  try {
    options = JSON.parse(raw);
  } catch (e) {
    throw new KeychainError('dialog_post_options_invalid');
  }
  if (
    options === null ||
    typeof options !== 'object' ||
    options.author !== author ||
    options.permlink !== permlink
  ) {
    throw new KeychainError('dialog_post_options_invalid');
  }
  return options;
};
