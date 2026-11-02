#!/usr/bin/env node
// Drives the built extension in Chrome for Testing and saves screenshots to .e2e/. The browser can
// reach only a local proxy, which forwards reads to Pixagram and refuses every broadcast, so nothing
// here can reach the chain. The account shown is real public data, wearing throwaway keys generated
// on each run, so no real key is ever involved.
//
//   npm run build:chromium && node scripts/e2e.mjs [--dist dist-prod] [--theme dark|light|both] [--only name,...]
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const require = createRequire(import.meta.url);
const { PrivateKey } = require('hive-tx');

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : fallback;
};
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.resolve(ROOT, arg('dist', 'dist-prod'));
const OUT = path.resolve(ROOT, arg('out', '.e2e'));
const THEMES = arg('theme', 'both') === 'both' ? ['dark', 'light'] : [arg('theme')];
const ONLY = arg('only', '')?.split(',').filter(Boolean);
const NODE = 'https://api.pixagram.com';
const PORT = 8799;
const PROXY = `http://127.0.0.1:${PORT}`;
const ACCOUNT = arg('account', 'pixtopia');
const PASSWORD = `e2e-${Math.random().toString(36).slice(2)}-Aa1!`;
const POPUP = { width: 435, height: 600 };

const seed = `e2e-${Date.now()}`;
const keys = Object.fromEntries(
  ['posting', 'active', 'memo', 'owner'].map((role) => {
    const key = PrivateKey.fromLogin(ACCOUNT, seed, role);
    return [role, { wif: key.toString(), pub: key.createPublic().toString() }];
  }),
);

const messages = JSON.parse(readFileSync(path.join(ROOT, 'public/_locales/en/messages.json'), 'utf8'));
const problems = [];
const broadcasts = [];
const requests = [];

const authority = (pub) => ({ weight_threshold: 1, account_auths: [], key_auths: [[pub, 1]] });

// The account answers with our throwaway keys, so the wallet treats them as the right ones.
const wearKeys = (account) => {
  if (account?.name !== ACCOUNT) return account;
  return { ...account, owner: authority(keys.owner.pub), active: authority(keys.active.pub), posting: authority(keys.posting.pub), memo_key: keys.memo.pub };
};

const DAPP = `<!doctype html><meta charset="utf-8"><title>dApp</title><body>dApp</body>`;

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(DAPP);
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString();
  let call;
  try { call = JSON.parse(body); } catch { return res.writeHead(400).end(); }
  res.setHeader('Content-Type', 'application/json');
  if (/broadcast/i.test(call.method ?? '') || call.method === 'call') {
    broadcasts.push(call.method);
    return res.end(JSON.stringify({ jsonrpc: '2.0', id: call.id, error: { code: -1, message: 'The test proxy refuses broadcasts.' } }));
  }
  requests.push(call.method);
  try {
    const answer = await (await fetch(NODE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })).json();
    if (call.method === 'condenser_api.get_accounts' && Array.isArray(answer.result)) answer.result = answer.result.map(wearKeys);
    res.end(JSON.stringify(answer));
  } catch (error) {
    res.end(JSON.stringify({ jsonrpc: '2.0', id: call.id, error: { code: -2, message: String(error) } }));
  }
});

const chromePath = () => {
  const base = path.join(homedir(), '.cache/puppeteer/chrome');
  const versions = readdirSync(base).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const version = versions[versions.length - 1];
  return path.join(base, version, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const watchNetwork = async (target) => {
  if (!['page', 'service_worker', 'other'].includes(target.type())) return;
  try {
    const session = await target.createCDPSession();
    await session.send('Network.enable');
    session.on('Network.requestWillBeSent', ({ request }) => {
      if (/^https?:/.test(request.url) && !request.url.startsWith(PROXY)) {
        problems.push(`outside request: ${request.url.slice(0, 120)}`);
      }
    });
  } catch {}
};

const clickTest = async (page, id) => {
  const handle = await page.waitForSelector(`[data-testid="${id}"]`, { timeout: 15000 });
  // Styled checkboxes hide their input, so a real click may have nowhere to land.
  await handle.click().catch(() => handle.evaluate((el) => el.click()));
};
const typeTest = async (page, id, text) => {
  const handle = await page.waitForSelector(`[data-testid="${id}"]`, { timeout: 15000 });
  await handle.type(text);
};
// The element whose own text is exactly this, which survives restyling.
const clickText = async (page, text) => {
  const handle = await page.evaluateHandle((wanted) => {
    const all = [...document.querySelectorAll('button, a, [role="button"], div, span')];
    const matches = all.filter((el) => el.innerText?.trim() === wanted && el.offsetParent !== null);
    return matches[matches.length - 1] ?? null;
  }, text);
  const element = handle.asElement();
  if (!element) throw new Error(`Nothing says "${text}"`);
  await element.click();
};

const run = async () => {
  if (!existsSync(path.join(DIST, 'manifest.json'))) throw new Error(`Build first: ${DIST} has no manifest.`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  const profile = path.join(tmpdir(), `pixtopia-keychain-e2e-${Date.now()}`);
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    pipe: true,
    enableExtensions: [DIST],
    userDataDir: profile,
    defaultViewport: POPUP,
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--no-first-run'],
  });
  browser.on('targetcreated', watchNetwork);
  const worker = await browser.waitForTarget((t) => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'), { timeout: 20000 });
  await watchNetwork(worker);
  const extensionId = new URL(worker.url()).host;
  const url = (file) => `chrome-extension://${extensionId}/${file}`;

  // Before any page loads, so nothing starts on the default node.
  const serviceWorker = await worker.worker();
  await serviceWorker.evaluate(
    (proxy) => chrome.storage.local.set({ current_rpc: { uri: proxy, testnet: false } }),
    PROXY,
  );

  const page = await browser.newPage();
  page.on('pageerror', (error) => problems.push(`page error: ${error.message.slice(0, 200)}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/ERR_NAME_NOT_RESOLVED/.test(message.text())) problems.push(`console: ${message.text().slice(0, 200)}`);
  });

  let index = 0;
  let theme = THEMES[0];
  const shot = async (name, target = page) => {
    if (ONLY?.length && !ONLY.includes(name)) return;
    index += 1;
    await sleep(900);
    await target.screenshot({ path: path.join(OUT, `${theme}-${String(index).padStart(2, '0')}-${name}.png`) });
  };
  const home = async () => {
    await page.goto(url('popup.html'));
    await page.waitForSelector('[data-testid="clickable-settings"]', { timeout: 20000 });
    await sleep(700);
  };

  // First run: password, then an account by key.
  await page.goto(url('popup.html'));
  await page.waitForSelector('[data-testid="password-input"]', { timeout: 20000 });
  await shot('signup');
  await typeTest(page, 'password-input', PASSWORD);
  await typeTest(page, 'password-input-confirmation', PASSWORD);
  await clickTest(page, 'accept-terms-and-condition');
  await clickTest(page, 'signup-button');
  await sleep(1500);
  await shot('add-account');
  await clickTest(page, 'add-by-keys-button').catch(async () => clickText(page, 'Use keys/pwd'));
  await page.waitForSelector('[data-testid="input-username"]', { timeout: 15000 });
  await typeTest(page, 'input-username', ACCOUNT);
  await typeTest(page, 'input-private-key', keys.owner.wif);
  await clickTest(page, 'submit-button');
  await sleep(1500);
  const ownerRefused = await page.evaluate(() => document.body.innerText.includes('owner key'));
  if (!ownerRefused) problems.push('owner key was not refused on the add account screen');
  await shot('owner-key-refused');
  await page.goto(url('popup.html'));
  await sleep(1500);
  const needsAdd = await page.$('[data-testid="clickable-settings"]');
  if (!needsAdd) {
    await clickTest(page, 'add-by-keys-button').catch(async () => clickText(page, 'Use keys/pwd'));
    await page.waitForSelector('[data-testid="input-username"]', { timeout: 15000 });
  }
  await typeTest(page, 'input-username', ACCOUNT);
  await typeTest(page, 'input-private-key', keys.posting.wif);
  await clickTest(page, 'submit-button');
  await sleep(1500);
  // One matching key skips straight to the wallet. Several ask which to keep.
  await page.waitForSelector('[data-testid="button-save"], [data-testid="clickable-settings"]', { timeout: 20000 });
  if (await page.$('[data-testid="button-save"]')) {
    await shot('select-keys');
    await clickTest(page, 'button-save');
  }
  await page.waitForSelector('[data-testid="clickable-settings"]', { timeout: 20000 });

  const screens = [
    ['home', []],
    ['transfer', ['action-button-popup_html_send_transfer']],
    ['settings', ['clickable-settings']],
  ];
  const menus = [
    ['accounts-menu', ['popup_html_accounts']],
    ['preferences-menu', ['popup_html_user_preferences']],
    ['advanced-menu', ['popup_html_advanced_settings']],
    ['rpc-nodes', ['popup_html_advanced_settings', 'popup_html_rpc_node']],
    ['governance-witnesses', ['popup_html_governance']],
  ];

  for (theme of THEMES) {
    index = 0;
    await page.evaluate((value) => chrome.storage.local.set({ ACTIVE_THEME: value }), theme);
    for (const [name, clicks] of screens) {
      await home();
      for (const id of clicks) await clickTest(page, id).catch((e) => problems.push(`${name}: ${e.message}`));
      await shot(name);
    }
    for (const [name, clicks] of menus) {
      await home();
      await clickTest(page, 'clickable-settings');
      await sleep(500);
      for (const key of clicks) {
        await clickText(page, messages[key].message).catch((e) => problems.push(`${name}: ${e.message}`));
        await sleep(500);
      }
      await shot(name);
    }
  }
  theme = THEMES[0];

  // A page sees our provider, and never Hive Keychain's name.
  const dapp = await browser.newPage();
  await dapp.goto(`${PROXY}/dapp.html`);
  await dapp.waitForFunction(() => window.pixa_keychain, { timeout: 10000 });
  if (await dapp.evaluate(() => typeof window.hive_keychain !== 'undefined')) problems.push('a page can see window.hive_keychain');
  const handshake = await dapp.evaluate(() => new Promise((resolve) => {
    window.pixa_keychain.requestHandshake(() => resolve(true));
    setTimeout(() => resolve(false), 5000);
  }));
  if (!handshake) problems.push('handshake got no answer');

  const dialogFor = async (request) => {
    const opened = new Promise((resolve) => {
      const onTarget = (target) => {
        if (target.url().includes('dialog.html')) { browser.off('targetcreated', onTarget); resolve(target); }
      };
      browser.on('targetcreated', onTarget);
    });
    await dapp.evaluate(request);
    const target = await Promise.race([opened, sleep(10000).then(() => null)]);
    if (!target) throw new Error('no dialog opened');
    const dialog = await target.page();
    await dialog.setViewport(POPUP);
    await sleep(1800);
    return dialog;
  };
  const closeDialog = async (dialog) => {
    if (!dialog.isClosed()) await dialog.close();
    await sleep(400);
  };

  // A signature is local, so it can be approved. It must verify against the posting key.
  const message = `pixtopia-keychain-e2e-${Date.now()}`;
  await dapp.evaluate((m) => {
    window.__signed = new Promise((resolve) => {
      window.__resolveSigned = resolve;
    });
  }, message);
  const signDialog = await dialogFor(`window.pixa_keychain.requestSignBuffer('${ACCOUNT}', '${message}', 'Posting', (r) => window.__resolveSigned(r))`);
  await shot('dialog-sign-buffer', signDialog);
  await clickTest(signDialog, 'dialog_confirm-button').catch(() => clickText(signDialog, 'Confirm'));
  const signed = await Promise.race([dapp.evaluate(() => window.__signed), sleep(8000).then(() => null)]);
  if (!signed?.success) problems.push(`sign buffer failed: ${JSON.stringify(signed)?.slice(0, 200)}`);
  else {
    const recovered = require('@hiveio/hive-js/lib/auth/ecc').Signature.fromHex(signed.result).recoverPublicKeyFromBuffer(Buffer.from(message)).toString();
    if (recovered !== keys.posting.pub) problems.push(`signature recovered ${recovered}, wanted ${keys.posting.pub}`);
    else console.log('ok    sign buffer recovers the posting key');
  }
  await closeDialog(signDialog);

  // Requests that would broadcast are looked at and cancelled.
  for (const [name, request] of [
    ['dialog-vote', `window.pixa_keychain.requestVote('${ACCOUNT}', 'p-1', 'pixa.team', 5000, () => {})`],
    ['dialog-transfer', `window.pixa_keychain.requestTransfer('${ACCOUNT}', 'pixa.team', '1.000', 'memo', 'PIXA', () => {})`],
    ['dialog-custom-json', `window.pixa_keychain.requestCustomJson('${ACCOUNT}', 'follow', 'Posting', JSON.stringify(['follow',{follower:'${ACCOUNT}',following:'pixa.team',what:['blog']}]), 'Follow pixa.team', () => {})`],
    ['dialog-broadcast', `window.pixa_keychain.requestBroadcast('${ACCOUNT}', [['vote',{voter:'${ACCOUNT}',author:'pixa.team',permlink:'p-1',weight:10000}]], 'Posting', () => {})`],
  ]) {
    try {
      const dialog = await dialogFor(request);
      await shot(name, dialog);
      await closeDialog(dialog);
    } catch (error) {
      problems.push(`${name}: ${error.message}`);
    }
  }
  // A request naming Hive's currency is an error, never quietly mapped.
  const refused = await dapp.evaluate(() => new Promise((resolve) => {
    window.pixa_keychain.requestTransfer('x', 'y', '1.000', '', 'HIVE', (r) => resolve(r));
    setTimeout(() => resolve(null), 4000);
  }));
  if (refused?.success !== false) problems.push(`a HIVE transfer was not refused: ${JSON.stringify(refused)?.slice(0, 120)}`);
  else console.log('ok    a request in HIVE is refused');

  await browser.close();
  server.close();
  rmSync(profile, { recursive: true, force: true });

  console.log(`${readdirSync(OUT).length} screenshots in ${path.relative(ROOT, OUT)}`);
  console.log(`read calls ${requests.length}: ${[...new Set(requests)].join(', ')}`);
  if (broadcasts.length) problems.push(`broadcast attempts: ${broadcasts.join(', ')}`);
  const unique = [...new Set(problems)];
  for (const problem of unique) console.log(`PROBLEM ${problem}`);
  console.log(unique.length ? `${unique.length} problems` : 'no problems');
  process.exit(unique.length ? 1 : 0);
};

run().catch((error) => {
  console.error(error);
  process.exit(2);
});
