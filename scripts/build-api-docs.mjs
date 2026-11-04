#!/usr/bin/env node
// Writes docs/api.md from the comments in public/pixa_keychain.js. Run it with `npm run doc`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'public/pixa_keychain.js'), 'utf8');

const INTRO = `# Add PIXA Keychain to your site

<!-- Written by scripts/build-api-docs.mjs from public/pixa_keychain.js. Change it there, then run npm run doc. -->

The extension adds \`window.pixa_keychain\` to every \`https://\` page, and to \`localhost\` and \`127.0.0.1\` for development. Your
site asks it to sign, the person reviews the request in the wallet's own window, and your callback gets the answer. You
never see a key.

[The developer guide](https://pixtopia.net/keychain/developers) walks through signing people in, with the code for your
server, and lets you try it live.

## Detect it

The object arrives once the page has loaded, so wait for it for a moment before saying it isn't installed:

\`\`\`js
async function findKeychain(ms = 2000) {
  const end = Date.now() + ms;
  while (!window.pixa_keychain && Date.now() < end) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return window.pixa_keychain ?? null;
}
\`\`\`

\`requestHandshake\` also confirms it's there, and calls back without opening a window.

## Answers

Every callback gets one object:

| Field | What it is |
| --- | --- |
| \`success\` | \`true\` if it worked |
| \`result\` | What the request produced, such as a signature or the broadcast's result |
| \`error\` | Why it didn't work: \`user_cancel\` if the person said no, \`incomplete\` if the request wasn't valid, \`ignored\` or \`busy\` as below |
| \`message\` | A sentence you can show |
| \`data\` | The request as the wallet received it |
| \`publicKey\` | The public key that signed, when there is one |
| \`request_id\` | The number of this request |

Check \`success\` before you use \`result\`. If you're relying on a signature, check it yourself: the page can't tell the real
extension from a script pretending to be it.

## Good to know

- **One at a time.** A page has one request at a time. A new one replaces one still waiting for the person (it answers
  \`ignored\`), and is itself refused with \`busy\` if the last one is already being sent. Wait for each answer.
- **Amounts** are strings with three decimals (\`"1.000"\`), in \`PIXA\` and \`PXS\`. Delegations are in \`PP\` or \`VESTS\`. A request
  in \`HIVE\` or \`HBD\` is refused.
- **Don't ask unprompted.** A request opens a window, so make it the result of something the person did.
- **\`rpc\`** is still accepted, but ignored. A site doesn't get to choose the person's node.
- **\`requestSignBuffer\`** signs text, exactly as the person reads it. It won't decode bytes from JSON, and it refuses text
  that starts with Pixa's chain ID, because that could be signed into a transaction.
- **Reward settings** on \`requestPost\` must be about that post, and they're shown in the review every time.
- **Weights** in authority requests must be whole numbers from 1 to 65535.
- **Don't ask again** is the person's choice, and narrow: one kind of request with the posting key. Requests with any other
  key always open a window.

## Coming from Hive Keychain

The requests have the same shape, so most sites only need the global renamed and Pixa's tokens:

\`\`\`js
const keychain = window.pixa_keychain;
\`\`\`

Both extensions can run in one browser, because nothing here shares a name with Hive Keychain's.

## Try it

[\`example/main.html\`](../example/main.html) has a form for every request. Serve it from a local address and open it with the
extension installed:

\`\`\`bash
cd example
python3 -m http.server 1337
\`\`\`

Then go to http://localhost:1337/main.html. Requests from it are real, so use a test account.

## Requests
`;

const cell = (text) => text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

function parseParam(line) {
  const match = line.match(/^@param\s+\{([^}]*)\}\s+(\[[^\]]*\]|\S+)\s*(.*)$/);
  if (!match) throw new Error(`Can't read: ${line}`);
  const [, type, rawName, description] = match;
  const optional = rawName.startsWith('[');
  const [name, fallback] = rawName.replace(/^\[|\]$/g, '').split('=');
  return { type: type === 'requestCallback' ? 'function' : type, name, optional, fallback, description };
}

function parseComment(comment) {
  const lines = comment.split('\n').map((line) => line.replace(/^\s*\*\s?/, ''));
  const description = [];
  const example = [];
  const params = [];
  let section = 'description';
  for (const line of lines) {
    if (line.startsWith('@example')) section = 'example';
    else if (line.startsWith('@param')) {
      section = 'params';
      params.push(parseParam(line));
    } else if (section === 'description') description.push(line);
    else if (section === 'example') example.push(line);
    else if (section === 'params' && line.trim()) params[params.length - 1].description += ` ${line.trim()}`;
  }
  return { description: description.join(' ').replace(/\s+/g, ' ').trim(), example: example.join('\n').trim(), params };
}

function render(name, { description, example, params }) {
  const out = [`### ${name}`, '', description, ''];
  if (params.length) {
    out.push('| Parameter | Type | Description |', '| --- | --- | --- |');
    for (const param of params) {
      const label = param.optional ? `\`${param.name}\` (optional)` : `\`${param.name}\``;
      out.push(`| ${label} | ${cell(param.type)} | ${cell(param.description)} |`);
    }
    out.push('');
  }
  if (example) out.push('```js', example, '```', '');
  return out.join('\n');
}

const requests = [];
for (const [, comment, name] of source.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*?)\*\/\s*(request\w+): function/g)) {
  requests.push({ name, ...parseComment(comment) });
}
if (requests.length < 25) throw new Error(`Only found ${requests.length} requests`);

const contents = requests.map(({ name }) => `- [${name}](#${name.toLowerCase()})`).join('\n');
const body = requests.map((request) => render(request.name, request)).join('\n');
writeFileSync(join(root, 'docs/api.md'), `${INTRO}\n${contents}\n\n${body}`);
console.log(`docs/api.md: ${requests.length} requests`);
