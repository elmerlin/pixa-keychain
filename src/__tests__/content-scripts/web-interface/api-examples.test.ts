/** @jest-environment node */
import { readFileSync } from 'fs';
import schemas, {
  commonRequestParams,
} from 'src/content-scripts/web-interface/input-validation';

const source = readFileSync('public/pixa_keychain.js', 'utf8');
const examples = [...source.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*?)\*\/\s*(request\w+): function/g)]
  .map(([, comment, name]) => {
    const body = comment
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, ''))
      .join('\n');
    const example = body.match(/@example\n([\s\S]*?)(?:\n@param|$)/)?.[1];
    return [name, example?.replace(/^@example$/gm, '')] as const;
  })
  .filter((entry): entry is readonly [string, string] => !!entry[1])
  // This one fetches from a node to build its transaction.
  .filter(([, example]) => !example.includes('import '));

const provider = () => {
  const sent: any[] = [];
  const window = { addEventListener: () => undefined } as any;
  const pixa_keychain = new Function(
    'window',
    `${source}; return pixa_keychain;`,
  )(window);
  pixa_keychain.dispatchCustomEvent = (_: string, request: object) =>
    sent.push(request);
  window.pixa_keychain = pixa_keychain;
  return { window, sent };
};

describe('the examples in the API docs', () => {
  it('are all here', () => {
    expect(examples.length).toBeGreaterThan(20);
  });

  it.each(examples)('%s passes the wallet\'s own checks', (_, example) => {
    const { window, sent } = provider();
    new Function(
      'window',
      'alert',
      'username',
      'myUsername',
      'pubKey1',
      'pubKey2',
      'encodedMessage',
      'account',
      'publicKey',
      'toUsername',
      example,
    )(
      window,
      () => undefined,
      'alice',
      'bob',
      'PIX8RrW2Q65qHr3NULhsbmYArGUK1JnDpxzfao99JXbXjxbER5aEo',
      'PIX89L4B5EgYwhGv3794kEgq7bteLMgWj1vXefEyBrr7vrXrYeSKB',
      '#encoded',
      'alice',
      'PIX5JdKMoD7p18Bac4FdCBmVyAzL7o7qKvtjM6hskn3wFW2ndEqnC',
      'bob',
    );
    expect(sent.length).toBeGreaterThan(0);
    for (const request of sent) {
      const schema = (schemas as any)[request.type];
      expect(schema).toBeDefined();
      const { error } = schema
        .append(commonRequestParams)
        .validate({ request_id: 1, ...request });
      expect(error?.message).toBeUndefined();
    }
  });
});
