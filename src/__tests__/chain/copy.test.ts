/**
 * @jest-environment node
 */
import { readdirSync, readFileSync } from 'fs';

// Renames left these behind in the translations before, including a link to Hive's sign-up.
describe('What a person reads', () => {
  it.each(readdirSync('public/_locales'))('%s says Pixa', (locale) => {
    const messages: Record<string, { message: string }> = JSON.parse(
      readFileSync(`public/_locales/${locale}/messages.json`, 'utf8'),
    );
    const wrong = Object.keys(messages).filter((key) =>
      /pixagram|\b(hive|hbd|steem)\b/i.test(messages[key].message),
    );
    expect(wrong).toEqual([]);
  });
});
