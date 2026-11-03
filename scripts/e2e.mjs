#!/usr/bin/env node
// Drives the built extension in Chrome for Testing and saves screenshots to .e2e/. The browser can
// reach only a local proxy, which forwards reads to Pixagram and refuses every broadcast, so nothing
// here can reach the chain. The account shown is real public data, wearing throwaway keys generated
// on each run, so no real key is ever involved.
//
//   npm run build:chromium && node scripts/e2e.mjs [--dist dist-prod] [--theme dark|light|both] [--only name,...]
import { createServer } from 'node:http';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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
const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
);
const DIST = path.resolve(ROOT, arg('dist', 'dist-prod'));
const OUT = path.resolve(ROOT, arg('out', '.e2e'));
const THEMES =
  arg('theme', 'both') === 'both' ? ['dark', 'light'] : [arg('theme')];
const ONLY = arg('only', '')?.split(',').filter(Boolean);
const NODE = 'https://api.pixagram.com';
const PORT = 8799;
const PROXY = `http://127.0.0.1:${PORT}`;
const ACCOUNT = arg('account', 'pixtopia');
const PASSWORD = `e2e-${Math.random().toString(36).slice(2)}-Aa1!`;
const POPUP = { width: 435, height: 600 };

// A master key that looks like a private key, the hardest shape to tell apart.
const seed = PrivateKey.fromSeed(`e2e-${Date.now()}`).toString();
const keys = Object.fromEntries(
  ['posting', 'active', 'memo', 'owner'].map((role) => {
    const key = PrivateKey.fromLogin(ACCOUNT, seed, role);
    return [role, { wif: key.toString(), pub: key.createPublic().toString() }];
  }),
);

const messages = JSON.parse(
  readFileSync(path.join(ROOT, 'public/_locales/en/messages.json'), 'utf8'),
);
const problems = [];
let failurePage;
const broadcasts = [];
const requests = [];
const readCache = new Map();
const fixtureDate = new Date(Date.now() + 3 * 86400000)
  .toISOString()
  .slice(0, 19);
// Presentation fixtures expose conditional pages without sending any operation.
// Account balances and keys are already synthetic; these pending records are too.
const readNode = async (call) => {
  const body = JSON.stringify(call);
  const cacheKey = JSON.stringify([call.method, call.params]);
  // One real read per method/parameter set keeps a visual run consistent and avoids rate limits.
  if (readCache.has(cacheKey))
    return { jsonrpc: '2.0', id: call.id, result: readCache.get(cacheKey) };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const answer = await (
        await fetch(NODE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
      ).json();
      if (answer.result !== undefined) readCache.set(cacheKey, answer.result);
      return answer;
    } catch (error) {
      if (attempt === 2) {
        if (readCache.has(cacheKey))
          return {
            jsonrpc: '2.0',
            id: call.id,
            result: readCache.get(cacheKey),
          };
        throw error;
      }
    }
  }
};

const authority = (pub) => ({
  weight_threshold: 1,
  account_auths: [],
  key_auths: [[pub, 1]],
});

// Raised for the one flow that needs an account able to pay the chain's account creation fee.
let pixaBalance = '12.345 PIXA';

// The account answers with our throwaway keys, so the wallet treats them as the right ones.
const wearKeys = (account) => {
  if (account?.name !== ACCOUNT) return account;
  return {
    ...account,
    owner: authority(keys.owner.pub),
    active: authority(keys.active.pub),
    posting: authority(keys.posting.pub),
    memo_key: keys.memo.pub,
    // Different numbers, so a screen showing the wrong currency's balance can't pass by accident.
    balance: pixaBalance,
    pxs_balance: '67.890 PXS',
    pending_claimed_accounts: 0,
    savings_pxs_balance: '5.000 PXS',
    savings_withdraw_requests: 1,
  };
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
  try {
    call = JSON.parse(body);
  } catch {
    return res.writeHead(400).end();
  }
  res.setHeader('Content-Type', 'application/json');
  if (/broadcast/i.test(call.method ?? '') || call.method === 'call') {
    broadcasts.push(call.method);
    return res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        id: call.id,
        error: { code: -1, message: 'The test proxy refuses broadcasts.' },
      }),
    );
  }
  requests.push(call.method);
  try {
    const answer = await readNode(call);
    if (
      call.method === 'condenser_api.get_accounts' &&
      Array.isArray(answer.result)
    )
      answer.result = answer.result.map(wearKeys);
    if (
      call.method === 'database_api.find_recurrent_transfers' &&
      !answer.result?.recurrent_transfers?.length
    )
      answer.result = {
        recurrent_transfers: [
          {
            from: ACCOUNT,
            to: 'pixtopia',
            amount: { amount: '1000', precision: 3, nai: '@@000000021' },
            memo: 'Harness preview',
            recurrence: 24,
            remaining_executions: 3,
            trigger_date: fixtureDate,
            pair_id: 0,
          },
        ],
      };
    if (
      call.method === 'condenser_api.get_conversion_requests' &&
      !answer.result?.length
    )
      answer.result = [
        {
          id: 1,
          owner: ACCOUNT,
          requestid: 1,
          amount: '1.000 PXS',
          conversion_date: fixtureDate,
        },
      ];
    if (
      call.method === 'condenser_api.get_savings_withdraw_from' &&
      !answer.result?.length
    )
      answer.result = [
        {
          id: 1,
          from: ACCOUNT,
          to: ACCOUNT,
          request_id: 1,
          amount: '1.000 PXS',
          memo: 'Harness preview',
          complete: fixtureDate,
        },
      ];
    if (
      call.method === 'condenser_api.get_witnesses_by_vote' &&
      answer.result?.length &&
      !answer.result.some((w) => w.owner === ACCOUNT)
    )
      answer.result.push({ ...answer.result[0], owner: ACCOUNT });
    if (
      call.method === 'database_api.find_witnesses' &&
      !answer.result?.witnesses?.length
    ) {
      const ranking = [...readCache.entries()].find(([key]) =>
        key.includes('condenser_api.get_witnesses_by_vote'),
      )?.[1];
      if (ranking?.[0]) {
        const witness = await readNode({
          jsonrpc: '2.0',
          id: call.id,
          method: call.method,
          params: { owners: [ranking[0].owner] },
        });
        answer.result = {
          witnesses: [{ ...witness.result.witnesses[0], owner: ACCOUNT }],
        };
      }
    }
    res.end(JSON.stringify(answer));
  } catch (error) {
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        id: call.id,
        error: { code: -2, message: String(error) },
      }),
    );
  }
});

const chromePath = () => {
  const base = path.join(homedir(), '.cache/puppeteer/chrome');
  const versions = readdirSync(base).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const version = versions[versions.length - 1];
  return path.join(
    base,
    version,
    'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  );
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
  const handle = await page.waitForSelector(`[data-testid="${id}"]`, {
    timeout: 15000,
  });
  // Styled checkboxes hide their input, so a real click may have nowhere to land.
  await handle.evaluate((el) =>
    el.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  await sleep(150);
  await handle.click().catch(() => handle.evaluate((el) => el.click()));
};
const typeTest = async (page, id, text) => {
  const handle = await page.waitForSelector(`[data-testid="${id}"]`, {
    timeout: 15000,
  });
  await handle.type(text);
};
// The element whose own text is exactly this, which survives restyling.
const clickText = async (page, text) => {
  await page.waitForFunction(
    (wanted) =>
      [
        ...document.querySelectorAll(
          'button, a, label, [role="button"], div, span',
        ),
      ].some(
        (el) =>
          el.innerText?.trim().toLowerCase() === wanted.toLowerCase() &&
          el.getClientRects().length > 0,
      ),
    { timeout: 10000 },
    text,
  );
  const handle = await page.evaluateHandle((wanted) => {
    const all = [
      ...document.querySelectorAll(
        'button, a, label, [role="button"], div, span',
      ),
    ];
    // innerText follows text-transform, so compare without case.
    const matches = all.filter(
      (el) =>
        el.innerText?.trim().toLowerCase() === wanted.toLowerCase() &&
        el.getClientRects().length > 0,
    );
    return matches[matches.length - 1] ?? null;
  }, text);
  const element = handle.asElement();
  if (!element) throw new Error(`Nothing says "${text}"`);
  await element.evaluate((el) =>
    el.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  await sleep(150);
  await element.click();
};

const run = async () => {
  if (!existsSync(path.join(DIST, 'manifest.json')))
    throw new Error(`Build first: ${DIST} has no manifest.`);
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
    args: [
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
      '--no-first-run',
    ],
  });
  browser.on('targetcreated', watchNetwork);
  const worker = await browser.waitForTarget(
    (t) =>
      t.type() === 'service_worker' &&
      t.url().startsWith('chrome-extension://'),
    { timeout: 20000 },
  );
  await watchNetwork(worker);
  const extensionId = new URL(worker.url()).host;
  const url = (file) => `chrome-extension://${extensionId}/${file}`;

  const watchedPages = new WeakSet();
  const observePage = (target) => {
    if (!target || watchedPages.has(target)) return;
    watchedPages.add(target);
    target.on('requestfailed', (request) => {
      if (request.failure()?.errorText === 'net::ERR_FILE_NOT_FOUND')
        problems.push(`missing asset: ${request.url()}`);
    });
    target.on('pageerror', (error) =>
      problems.push(`page error: ${error.message.slice(0, 200)}`),
    );
    target.on('console', (message) => {
      if (
        message.type() === 'error' &&
        !/ERR_NAME_NOT_RESOLVED/.test(message.text())
      )
        problems.push(`console: ${message.text().slice(0, 200)}`);
    });
  };
  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page')
      observePage(await target.page().catch(() => null));
  });
  const page = await browser.newPage();
  observePage(page);
  failurePage = page;

  // From an inert page, so the popup never starts on the default node.
  await page.goto(url('LICENSE.txt'));
  await page.evaluate(
    (proxy) =>
      chrome.storage.local.set({ current_rpc: { uri: proxy, testnet: false } }),
    PROXY,
  );
  await page.evaluate(
    (value) => chrome.storage.local.set({ ACTIVE_THEME: value }),
    THEMES[0],
  );

  let index = 0;
  let theme = THEMES[0];
  const shot = async (name, target = page, waitForReady = true) => {
    if (waitForReady) await settle(target);
    else await sleep(350);
    await target.evaluate(() => document.fonts.ready);
    if (ONLY?.length && !ONLY.includes(name)) return;
    index += 1;
    const overflow = await target.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    if (overflow) problems.push(`${theme}/${name}: horizontal page overflow`);
    const clippedActions = await target.evaluate(() =>
      [
        ...document.querySelectorAll(
          '.operation-buttons button, .bottom-panel button',
        ),
      ]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.width &&
            (r.left < 0 || r.right > innerWidth || r.bottom > innerHeight)
          );
        })
        .map((el) => el.textContent.trim()),
    );
    if (clippedActions.length)
      problems.push(
        `${theme}/${name}: clipped actions ${clippedActions.join(', ')}`,
      );
    console.log(`shot  ${theme}/${name}`);
    await target.screenshot({
      path: path.join(
        OUT,
        `${theme}-${String(index).padStart(2, '0')}-${name}.png`,
      ),
    });
  };
  // Leaving a page mid-request reads as an RPC failure, and the loader swallows early clicks.
  const settle = async (target = page) => {
    await target
      .waitForNetworkIdle({ idleTime: 300, timeout: 15000 })
      .catch(() => {});
    await target.waitForFunction(
      () =>
        ![
          ...document.querySelectorAll(
            '.splashscreen, .loading-container:not(.hide)',
          ),
        ].some((el) => el.getClientRects().length > 0),
      { timeout: 20000 },
    );
    await sleep(350);
  };
  const home = async () => {
    await settle();
    if (
      page.url() === url('popup.html') &&
      !(await page.$('.error-page, [data-testid="sign-in-page"]'))
    ) {
      // Remount the existing route without restarting the service worker or splash screen.
      await previewDispatch({
        type: 'NAVIGATE_TO',
        payload: { nextPage: 'UNDEFINED', resetStack: true },
      });
      await previewDispatch({
        type: 'NAVIGATE_TO',
        payload: { nextPage: 'HOME_PAGE', resetStack: true },
      });
    } else await page.goto(url('popup.html'));
    await page.waitForSelector('[data-testid="clickable-settings"]', {
      timeout: 20000,
    });
    await settle();
  };

  const shotBottom = async (name, target = page) => {
    const changed = await target.evaluate(() => {
      const areas = [
        ...document.querySelectorAll(
          '.form-fields, .create-account-step-two, .automated-tasks-page, .page-content',
        ),
      ].filter(
        (el) => el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 20,
      );
      for (const area of areas) area.scrollTop = area.scrollHeight;
      return areas.length > 0;
    });
    if (changed) await shot(`${name}-bottom`, target);
  };

  const shotBoth = async (name) => {
    const original = theme;
    for (const variant of THEMES) {
      theme = variant;
      await page.evaluate((t) => {
        document.querySelectorAll('.theme').forEach((el) => {
          el.classList.remove('dark', 'light');
          el.classList.add(t);
        });
      }, variant);
      await shot(name);
    }
    theme = original;
    await page.evaluate(
      (t) =>
        document.querySelectorAll('.theme').forEach((el) => {
          el.classList.remove('dark', 'light');
          el.classList.add(t);
        }),
      original,
    );
  };
  const step = async (value) => {
    if (value.startsWith('css:')) {
      await page.waitForSelector(value.slice(4));
      await page.$eval(value.slice(4), (el) =>
        el.scrollIntoView({ block: 'center', behavior: 'instant' }),
      );
      await sleep(150);
      await page.click(value.slice(4));
    } else if (value.startsWith('text:')) await clickText(page, value.slice(5));
    else if (messages[value]) await clickText(page, messages[value].message);
    else await clickTest(page, value);
    await sleep(200);
  };

  const previewDispatch = async (action) => {
    await page.evaluate((action) => {
      const root = document.getElementById('root');
      const container = root._reactRootContainer?._internalRoot?.current;
      const fiber =
        container ||
        root[
          Object.keys(root).find((key) => key.startsWith('__reactContainer$'))
        ];
      const queue = [fiber];
      while (queue.length) {
        const node = queue.shift();
        if (!node) continue;
        const store = node.memoizedProps?.store;
        if (store?.dispatch && store?.getState) {
          store.dispatch(action);
          return;
        }
        queue.push(node.child, node.sibling);
      }
      throw new Error('Preview navigation store not found');
    }, action);
  };
  const previewRoute = async (screen, params) => {
    await previewDispatch({
      type: 'NAVIGATE_TO_WITH_PARAMS',
      payload: { nextPage: screen, params, resetStack: false },
    });
    await settle();
  };

  const previewError = async () => {
    await page.evaluate(() => {
      const root = document.getElementById('root');
      const queue = [
        root._reactRootContainer?._internalRoot?.current ||
          root[
            Object.keys(root).find((key) => key.startsWith('__reactContainer$'))
          ],
      ];
      while (queue.length) {
        const node = queue.shift();
        if (!node) continue;
        if (node.stateNode?.resetErrorBoundary) {
          node.stateNode.setState({
            didCatch: true,
            error: new Error('Preview: this screen could not be loaded.'),
          });
          return;
        }
        queue.push(node.child, node.sibling);
      }
      throw new Error('Preview error boundary not found');
    });
    await page.waitForSelector('.error-page');
    await shot('error-fallback');
    if (!ONLY?.length || ONLY.includes('error-fallback-details')) {
      await page.click('.error-page summary');
      await shot('error-fallback-details');
    }
  };

  const finish = async () => {
    await browser.close();
    server.close();
    rmSync(profile, { recursive: true, force: true });

    writeFileSync(
      path.join(OUT, 'coverage.json'),
      JSON.stringify(
        {
          screenshots: readdirSync(OUT).filter((f) => f.endsWith('.png')),
          problems: [...new Set(problems)],
        },
        null,
        2,
      ),
    );
    console.log(
      `${
        readdirSync(OUT).filter((f) => f.endsWith('.png')).length
      } screenshots in ${path.relative(ROOT, OUT)}`,
    );
    console.log(
      `read calls ${requests.length}: ${[...new Set(requests)].join(', ')}`,
    );
    if (broadcasts.length)
      problems.push(`broadcast attempts: ${broadcasts.join(', ')}`);
    const unique = [...new Set(problems)];
    for (const problem of unique) console.log(`PROBLEM ${problem}`);
    console.log(unique.length ? `${unique.length} problems` : 'no problems');
    process.exit(unique.length ? 1 : 0);
  };

  // First run: password, then an account by key.
  await page.goto(url('popup.html'));
  await page.waitForSelector('[data-testid="password-input"]', {
    timeout: 20000,
  });
  await shotBoth('signup');
  await typeTest(page, 'password-input', PASSWORD);
  await typeTest(page, 'password-input-confirmation', PASSWORD);
  await clickTest(page, 'accept-terms-and-condition');
  await clickTest(page, 'signup-button');
  await settle();
  await shotBoth('add-account');
  // Nothing is saved yet, so back returns to choosing a password.
  await clickTest(page, 'arrow-back-icon');
  await page.waitForSelector('[data-testid="password-input"]', {
    timeout: 15000,
  });
  await settle();
  await shot('signup-after-back');
  await typeTest(page, 'password-input', PASSWORD);
  await typeTest(page, 'password-input-confirmation', PASSWORD);
  await clickTest(page, 'accept-terms-and-condition');
  await clickTest(page, 'signup-button');
  await settle();
  await clickTest(page, 'add-by-keys-button').catch(async () =>
    clickText(page, 'Use keys/pwd'),
  );
  await page.waitForSelector('[data-testid="input-username"]', {
    timeout: 15000,
  });
  await typeTest(page, 'input-username', ACCOUNT);
  await typeTest(page, 'input-private-key', keys.owner.wif);
  await clickTest(page, 'submit-button');
  await sleep(1500);
  const ownerRefused = await page.evaluate(() =>
    document.body.innerText.includes('owner key'),
  );
  if (!ownerRefused)
    problems.push('owner key was not refused on the add account screen');
  await shotBoth('owner-key-refused');
  await page.goto(url('popup.html'));
  await sleep(1500);
  const needsAdd = await page.$('[data-testid="clickable-settings"]');
  if (!needsAdd) {
    await clickTest(page, 'add-by-keys-button').catch(async () =>
      clickText(page, 'Use keys/pwd'),
    );
    await page.waitForSelector('[data-testid="input-username"]', {
      timeout: 15000,
    });
  }
  await typeTest(page, 'input-username', ACCOUNT);
  // The seed is this run's master password, so all three keys derive from it.
  await typeTest(page, 'input-private-key', seed);
  await clickTest(page, 'submit-button');
  await sleep(1500);
  // One matching key skips straight to the wallet. Several ask which to keep.
  await page.waitForSelector(
    '[data-testid="button-save"], [data-testid="clickable-settings"]',
    { timeout: 20000 },
  );
  if (await page.$('[data-testid="button-save"]')) {
    await shotBoth('select-keys');
    await clickTest(page, 'button-save');
  }
  await page.waitForSelector('[data-testid="clickable-settings"]', {
    timeout: 20000,
  });

  // Seed optional preference collections for their populated/empty visual states.
  // The existing Favorites screen dereferences a missing transfer_to entry on a fresh wallet.
  await page.evaluate(
    (account) =>
      chrome.storage.local.set({
        transfer_to: { [account]: [] },
        no_confirm: { [account]: {} },
      }),
    ACCOUNT,
  );

  // Add more here as [name, [data-testids to click, in order]].
  const screens = [
    ['home', []],
    ['estimated-value', ['estimated-account-div-value']],
    ['account-selector', ['css:.selected-account-panel']],
    ['pixa-actions', ['dropdown-arrow-pixa']],
    ['pxs-actions', ['dropdown-arrow-pxs']],
    ['pp-actions', ['dropdown-arrow-pp']],
    ['transfer', ['action-button-popup_html_send_transfer']],
    [
      'recurrent-transfers',
      [
        'action-button-popup_html_send_transfer',
        'css:.pending-recurrent-transfer-panel',
      ],
    ],
    [
      'recurrent-transfer-details',
      [
        'action-button-popup_html_send_transfer',
        'css:.pending-recurrent-transfer-panel',
        'css:.recurrent-transfer-row .item',
      ],
    ],
    [
      'recurrent-transfer-form',
      ['action-button-popup_html_send_transfer', 'checkbox-transfer-recurrent'],
    ],
    ['power-up', ['dropdown-arrow-pixa', 'dropdown-menu-item-arrow_upward']],
    ['power-down', ['dropdown-arrow-pp', 'dropdown-menu-item-arrow_downward']],
    ['savings', ['dropdown-arrow-pxs', 'dropdown-menu-item-savings']],
    [
      'savings-withdraw',
      [
        'dropdown-arrow-pxs',
        'dropdown-menu-item-savings',
        'css:.custom-select-container .custom-select',
        'custom-select-item-popup_html_withdraw',
      ],
    ],
    [
      'pending-savings',
      [
        'dropdown-arrow-pxs',
        'dropdown-menu-item-savings',
        'css:.pending-savings-panel',
      ],
    ],
    [
      'pending-conversion',
      [
        'dropdown-arrow-pxs',
        'dropdown-menu-item-wallet/common/convert',
        'css:.pending-conversion-panel',
      ],
    ],
    [
      'conversion',
      ['dropdown-arrow-pxs', 'dropdown-menu-item-wallet/common/convert'],
    ],
    [
      'delegations',
      ['dropdown-arrow-pp', 'dropdown-menu-item-wallet/hp/hp-delegations'],
    ],
    [
      'delegations-incoming',
      [
        'dropdown-arrow-pp',
        'dropdown-menu-item-wallet/hp/hp-delegations',
        'css:.resource-item:first-child',
      ],
    ],
    [
      'delegations-outgoing',
      [
        'dropdown-arrow-pp',
        'dropdown-menu-item-wallet/hp/hp-delegations',
        'css:.tooltip-container:last-child .resource-item',
      ],
    ],
    [
      'rc-delegations',
      ['dropdown-arrow-pp', 'dropdown-menu-item-wallet/hp/rc-delegations'],
    ],
    [
      'rc-delegations-outgoing',
      [
        'dropdown-arrow-pp',
        'dropdown-menu-item-wallet/hp/rc-delegations',
        'css:.resource-item.clickable',
      ],
    ],
    ['wallet-history', ['dropdown-arrow-pixa', 'icon-token-history-PIXA']],
    [
      'history-filters',
      [
        'dropdown-arrow-pixa',
        'icon-token-history-PIXA',
        'css:.wallet-filter-button',
      ],
    ],
    ['settings', ['clickable-settings']],
  ];
  const accountsMenu = ['popup_html_accounts'];
  const preferencesMenu = ['popup_html_user_preferences'];
  const advancedMenu = ['popup_html_advanced_settings'];
  const menus = [
    ['accounts-menu', accountsMenu],
    ['add-account-options', [...accountsMenu, 'popup_html_add_account']],
    [
      'add-by-key',
      [...accountsMenu, 'popup_html_add_account', 'add-by-keys-button'],
    ],
    [
      'add-by-authority',
      [...accountsMenu, 'popup_html_add_account', 'add-by-auth-button'],
    ],
    ['create-account', [...accountsMenu, 'popup_html_create_account']],
    ['manage-account', [...accountsMenu, 'popup_html_manage_accounts']],
    [
      'manage-authorities',
      [...accountsMenu, 'popup_html_manage_accounts_authorities'],
    ],
    ['export-accounts', [...accountsMenu, 'popup_html_export']],
    ['preferences-menu', preferencesMenu],
    ['authorized-operations', [...preferencesMenu, 'popup_html_operations']],
    ['automated-tasks', [...preferencesMenu, 'popup_html_automated_tasks']],
    ['favorite-accounts', [...preferencesMenu, 'popup_html_favorite_accounts']],
    [
      'export-transactions',
      [...preferencesMenu, 'popup_html_export_transactions'],
    ],
    ['advanced-menu', advancedMenu],
    ['rpc-nodes', [...advancedMenu, 'popup_html_rpc_node']],
    [
      'rpc-add-node',
      [...advancedMenu, 'popup_html_rpc_node', 'button-add-rpc'],
    ],
    ['auto-lock', [...advancedMenu, 'popup_html_autolock']],
    ['shortcuts', [...advancedMenu, 'popup_html_shortcuts']],
    [
      'add-shortcut',
      [
        ...advancedMenu,
        'popup_html_shortcuts',
        'popup_html_shortcuts_add_button',
      ],
    ],
    ['change-password', [...advancedMenu, 'popup_html_change_password']],
    [
      'import-export-settings',
      [...advancedMenu, 'popup_html_import_export_settings'],
    ],
    ['clear-wallet', [...advancedMenu, 'popup_html_clear']],
    ['governance-witnesses', ['popup_html_governance']],
    ['governance-proxy', ['popup_html_governance', 'popup_html_proxy']],
    ['governance-proposals', ['popup_html_governance', 'popup_html_proposal']],
    ['my-witness', ['popup_html_governance', 'popup_html_my_witness_page']],
    [
      'my-witness-parameters',
      [
        'popup_html_governance',
        'popup_html_my_witness_page',
        'html_popup_witness_information_params_label',
      ],
    ],
    [
      'edit-my-witness',
      [
        'popup_html_governance',
        'popup_html_my_witness_page',
        'html_popup_witness_information_params_label',
        'html_popup_button_edit_label',
      ],
    ],
  ];

  // Focused visual reruns use the same routes, fixtures and network guards as the full sweep.
  const routeNames = [...screens, ...menus].map(([name]) => name);
  const focusedNames = new Set([
    ...routeNames,
    ...routeNames.map((name) => `${name}-bottom`),
    'error-fallback',
    'error-fallback-details',
  ]);
  if (ONLY?.length && ONLY.every((name) => focusedNames.has(name))) {
    for (theme of THEMES) {
      await settle();
      await page.evaluate(
        (value) => chrome.storage.local.set({ ACTIVE_THEME: value }),
        theme,
      );
      await page.goto(url('popup.html'));
      await page.waitForSelector('[data-testid="clickable-settings"]');
      await settle();
      for (const [isMenu, routes] of [
        [false, screens],
        [true, menus],
      ]) {
        for (const [name, clicks] of routes) {
          if (!ONLY.includes(name) && !ONLY.includes(`${name}-bottom`))
            continue;
          await home();
          if (isMenu) await clickTest(page, 'clickable-settings');
          for (const id of clicks) await step(id);
          await shot(name);
          await shotBottom(name);
        }
      }
      if (ONLY.some((name) => name.startsWith('error-fallback'))) {
        await home();
        await previewError();
      }
    }
    await finish();
    return;
  }

  for (theme of THEMES) {
    await settle();
    index = 0;
    await page.evaluate(
      (value) => chrome.storage.local.set({ ACTIVE_THEME: value }),
      theme,
    );
    await page.goto(url('popup.html'));
    await page.waitForSelector('[data-testid="clickable-settings"]', {
      timeout: 20000,
    });
    await settle();
    for (const [name, clicks] of screens) {
      await home();
      for (const id of clicks)
        await step(id).catch((e) => {
          problems.push(`${name}: ${e.message}`);
          console.log(`PROBLEM ${name}: ${e.message}`);
        });
      await shot(name);
      await shotBottom(name);
    }
    // Stress only the rendered text; no account state or transaction value is changed.
    await home();
    await page.evaluate(() => {
      document.querySelectorAll('.selected-account-name').forEach((el) => {
        el.textContent = 'long.accountname';
      });
      document.querySelector(
        '.estimated-account-value-section .value',
      ).textContent = '999,999,999,999.999 PXS';
      document
        .querySelectorAll('.wallet-info-row .main-value')
        .forEach((el) => {
          el.textContent = '999,999,999,999.999';
        });
    });
    await shot('home-long-content');
    await home();
    await page.keyboard.press('Tab');
    await shot('keyboard-focus');
    // Render the actual loading component through its presentation state only.
    await previewDispatch({
      type: 'ADD_TO_LOADING_LIST',
      payload: { operation: 'popup_html_loading', hideDots: true },
    });
    await page.waitForSelector('.loading-container');
    await shot('loading', page, false);
    await page.emulateMediaFeatures([
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ]);
    await shot('loading-reduced-motion', page, false);
    if (
      await page.$eval('.rotating-logo', (el) =>
        el
          .getAnimations({ subtree: true })
          .some((animation) => animation.playState === 'running'),
      )
    )
      problems.push(`${theme}: loader animates with reduced motion`);
    await previewDispatch({
      type: 'REMOVE_FROM_LOADING_LIST',
      payload: { operation: 'popup_html_loading' },
    });
    await page.emulateMediaFeatures([]);
    for (const [name, clicks] of menus) {
      await home();
      await clickTest(page, 'clickable-settings');
      await sleep(500);
      for (const key of clicks) {
        await step(key).catch((e) => {
          problems.push(`${name}: ${e.message}`);
          console.log(`PROBLEM ${name}: ${e.message}`);
        });
        await sleep(500);
      }
      await shot(name);
      await shotBottom(name);
    }
    for (const [name, route, params] of [
      ['add-key', 'SETTINGS_ADD_KEY', 'ACTIVE'],
      ['legacy-import-route', 'ACCOUNT_PAGE_IMPORT_KEYS'],
      ['operation-popup-settings', 'SETTINGS_OPERATION_POPUP'],
    ]) {
      await home();
      await previewRoute(route, params);
      await shot(name);
    }
    await home();
    await clickTest(page, 'clickable-settings');
    for (const key of [...accountsMenu, 'popup_html_create_account'])
      await step(key);
    await page.type('.create-account-step-one input', 'pixel-harness');
    // The price is what the chain charges, and an account that can't pay it goes no further.
    const { result: chainProperties } = await readNode({
      jsonrpc: '2.0',
      id: 1,
      method: 'condenser_api.get_chain_properties',
      params: [],
    });
    const fee = `${parseFloat(chainProperties.account_creation_fee)} PIXA`;
    const priceShown = await page
      .waitForFunction(
        () =>
          document
            .querySelector('.create-account-step-one .price')
            ?.innerText.trim(),
        { timeout: 15000 },
      )
      .then((handle) => handle.jsonValue());
    if (priceShown !== fee)
      problems.push(`create account shows ${priceShown}, the chain charges ${fee}`);
    await step('html_popup_next');
    await page
      .waitForFunction(
        (text) => document.body.innerText.includes(text),
        { timeout: 15000 },
        messages.html_popup_account_creation_not_enough_found.message,
      )
      .catch(() =>
        problems.push('create account went on without enough PIXA for the fee'),
      );
    await shot('create-account-not-enough');
    await step('message_container_close_button');
    pixaBalance = '500.000 PIXA';
    await home();
    await clickTest(page, 'clickable-settings');
    for (const key of [...accountsMenu, 'popup_html_create_account'])
      await step(key);
    await page.type('.create-account-step-one input', 'pixel-harness');
    await step('html_popup_next');
    await shot('create-account-keys');
    await shotBottom('create-account-keys');
    pixaBalance = '12.345 PIXA';
    await home();
    await clickTest(page, 'action-button-popup_html_send_transfer');
    await typeTest(page, 'input-username', 'pixtopia');
    await typeTest(page, 'amount-input', '1.000');
    await clickTest(page, 'send-transfer');
    await shot('transfer-confirmation');
    for (const file of [
      'import-accounts.html',
      'import-preferences.html',
      'vault.html',
    ]) {
      await page.goto(url(file));
      await shot(file.replace('.html', ''));
      if (file.startsWith('import-')) {
        const fixture = path.join(
          profile,
          file === 'import-preferences.html'
            ? 'visual-preview.kc.json'
            : 'visual-preview.kc',
        );
        writeFileSync(fixture, 'Preview only. Never submitted.');
        await (await page.$('input[type="file"]')).uploadFile(fixture);
        await shot(`${file.replace('.html', '')}-selected`);
      }
    }
    await home();
    await previewError();
    await home();
    await clickTest(page, 'clickable-settings');
    await step('popup_html_logout');
    await shot('sign-in');
    await clickTest(page, 'reset-password-link');
    await shot('reset-password');
    await page.goto(url('popup.html'));
    await settle();
    await typeTest(page, 'password-input', PASSWORD);
    await clickTest(page, 'login-button');
    await settle();
  }
  theme = THEMES[0];
  await page.evaluate(
    (value) => chrome.storage.local.set({ ACTIVE_THEME: value }),
    theme,
  );

  // A page sees our provider, and never Hive Keychain's name.
  const dapp = await browser.newPage();
  await dapp.goto(`${PROXY}/dapp.html`);
  await dapp.waitForFunction(() => window.pixa_keychain, { timeout: 10000 });
  if (await dapp.evaluate(() => typeof window.hive_keychain !== 'undefined'))
    problems.push('a page can see window.hive_keychain');
  const handshake = await dapp.evaluate(
    () =>
      new Promise((resolve) => {
        window.pixa_keychain.requestHandshake(() => resolve(true));
        setTimeout(() => resolve(false), 5000);
      }),
  );
  if (!handshake) problems.push('handshake got no answer');

  const dialogFor = async (request) => {
    const opened = new Promise((resolve) => {
      const onTarget = (target) => {
        if (target.url().includes('dialog.html')) {
          browser.off('targetcreated', onTarget);
          resolve(target);
        }
      };
      browser.on('targetcreated', onTarget);
    });
    await dapp.evaluate(request);
    const target = await Promise.race([opened, sleep(10000).then(() => null)]);
    if (!target) throw new Error('no dialog opened');
    const dialog = await target.page();
    await dialog.setViewport(POPUP);
    await settle(dialog);
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
  const signDialog = await dialogFor(
    `window.pixa_keychain.requestSignBuffer('${ACCOUNT}', '${message}', 'Posting', (r) => window.__resolveSigned(r))`,
  );
  await shot('dialog-sign-buffer', signDialog);
  await clickText(signDialog, messages.dialog_confirm.message);
  const signed = await Promise.race([
    dapp.evaluate(() => window.__signed),
    sleep(8000).then(() => null),
  ]);
  if (!signed?.success)
    problems.push(
      `sign buffer failed: ${JSON.stringify(signed)?.slice(0, 200)}`,
    );
  else {
    const recovered = require('@hiveio/hive-js/lib/auth/ecc')
      .Signature.fromHex(signed.result)
      .recoverPublicKeyFromBuffer(Buffer.from(message))
      .toString();
    if (recovered !== keys.posting.pub)
      problems.push(
        `signature recovered ${recovered}, wanted ${keys.posting.pub}`,
      );
    else console.log('ok    sign buffer recovers the posting key');
  }
  await closeDialog(signDialog);

  // So is encrypting a memo. It must decrypt with the matching key.
  await dapp.evaluate(() => {
    window.__encoded = new Promise((resolve) => {
      window.__resolveEncoded = resolve;
    });
  });
  const memoDialog = await dialogFor(
    `window.pixa_keychain.requestEncodeMessage('${ACCOUNT}', '${ACCOUNT}', '#a memo', 'Memo', (r) => window.__resolveEncoded(r))`,
  );
  await shot('dialog-encode-memo', memoDialog);
  await clickText(memoDialog, messages.dialog_confirm.message);
  const encoded = await Promise.race([
    dapp.evaluate(() => window.__encoded),
    sleep(8000).then(() => null),
  ]);
  if (!encoded?.success)
    problems.push(
      `memo encoding failed: ${JSON.stringify(encoded)?.slice(0, 200)}`,
    );
  else if (
    require('@hiveio/hive-js/lib/auth/memo').decode(
      keys.memo.wif,
      encoded.result,
    ) !== '#a memo'
  )
    problems.push('memo did not decrypt');
  else console.log('ok    a memo encrypts with PIX keys and decrypts');
  await closeDialog(memoDialog);

  const signTx = (operations, key = 'Posting') =>
    `window.pixa_keychain.requestSignTx('${ACCOUNT}', ${JSON.stringify({
      ref_block_num: 1,
      ref_block_prefix: 1,
      expiration: '2030-01-01T00:00:00',
      operations,
      extensions: [],
    })}, '${key}', () => {})`;

  // Requests that would broadcast are looked at and cancelled.
  for (theme of THEMES) {
    await page.evaluate(
      (value) => chrome.storage.local.set({ ACTIVE_THEME: value }),
      theme,
    );
    for (const [name, request, expected] of [
      [
        'dialog-vote',
        `window.pixa_keychain.requestVote('${ACCOUNT}', 'p-1', 'pixa.team', 5000, () => {})`,
      ],
      [
        'dialog-transfer',
        `window.pixa_keychain.requestTransfer('${ACCOUNT}', 'pixa.team', '1.000', 'memo', 'PIXA', () => {})`,
        '12.345 PIXA',
      ],
      [
        'dialog-transfer-pxs',
        `window.pixa_keychain.requestTransfer('${ACCOUNT}', 'pixa.team', '1.000', 'memo', 'PXS', () => {})`,
        '67.890 PXS',
      ],
      [
        'dialog-custom-json',
        `window.pixa_keychain.requestCustomJson('${ACCOUNT}', 'follow', 'Posting', JSON.stringify(['follow',{follower:'${ACCOUNT}',following:'pixa.team',what:['blog']}]), 'Follow pixa.team', () => {})`,
      ],
      [
        'dialog-broadcast',
        `window.pixa_keychain.requestBroadcast('${ACCOUNT}', [['vote',{voter:'${ACCOUNT}',author:'pixa.team',permlink:'p-1',weight:10000}]], 'Posting', () => {})`,
        'Like at 100%',
      ],
      [
        'dialog-sign-tx',
        signTx([
          [
            'vote',
            { voter: ACCOUNT, author: 'pixa.team', permlink: 'p-1', weight: 5000 },
          ],
        ]),
        'Like at 50%',
      ],
      [
        'dialog-sign-tx-transfer',
        signTx(
          [
            [
              'transfer',
              {
                from: ACCOUNT,
                to: 'pixtopia',
                amount: '1.500 PIXA',
                memo: 'For the art fund',
              },
            ],
          ],
          'Active',
        ),
        'Send 1.500 PIXA',
      ],
      [
        'dialog-sign-tx-post',
        signTx([
          [
            'comment',
            {
              parent_author: '',
              parent_permlink: 'portal-169096',
              author: ACCOUNT,
              permlink: 'a-pixel-study-6c2ce113',
              title: 'A pixel study',
              body: `data:image/webp;base64,${'UklGRiIAAABXRUJQ'.repeat(4000)}`,
              json_metadata: '{}',
            },
          ],
          [
            'comment_options',
            {
              author: ACCOUNT,
              permlink: 'a-pixel-study-6c2ce113',
              max_accepted_payout: '1000000.000 PXS',
              percent_pxs: 10000,
              allow_votes: true,
              allow_curation_rewards: true,
              extensions: [
                [0, { beneficiaries: [{ account: 'pixtopia', weight: 500 }] }],
              ],
            },
          ],
        ]),
        '5% to @pixtopia',
      ],
      [
        'dialog-sign-tx-control',
        signTx(
          [
            [
              'account_update',
              {
                account: ACCOUNT,
                active: authority(keys.posting.pub),
                memo_key: keys.memo.pub,
                json_metadata: '',
              },
            ],
          ],
          'Active',
        ),
        'Change who controls this account',
      ],
      [
        'dialog-sign-tx-unknown',
        signTx([['mystery_operation', { to: 'pixtopia', take: 'everything' }]]),
        "Can't describe this action",
      ],
      [
        'dialog-power-up',
        `window.pixa_keychain.requestPowerUp('${ACCOUNT}', '${ACCOUNT}', '1.000', () => {})`,
      ],
      [
        'dialog-power-down',
        `window.pixa_keychain.requestPowerDown('${ACCOUNT}', '1.000', () => {})`,
      ],
      [
        'dialog-delegation',
        `window.pixa_keychain.requestDelegation('${ACCOUNT}', 'pixtopia', '1.000', 'PP', () => {})`,
      ],
      [
        'dialog-savings',
        `window.pixa_keychain.requestSavingsOperation('${ACCOUNT}', '${ACCOUNT}', '1.000', 'PXS', 'deposit', 'Savings', () => {})`,
      ],
      [
        'dialog-conversion',
        `window.pixa_keychain.requestConversion('${ACCOUNT}', '1.000', false, () => {})`,
      ],
      [
        'dialog-recurrent-transfer',
        `window.pixa_keychain.requestRecurrentTransfer('${ACCOUNT}', 'pixtopia', '1.000', 'PIXA', 'Monthly art fund', 720, 3, () => {})`,
      ],
      [
        'dialog-proxy',
        `window.pixa_keychain.requestProxy('${ACCOUNT}', 'pixtopia', () => {})`,
      ],
      [
        'dialog-witness-vote',
        `window.pixa_keychain.requestWitnessVote('${ACCOUNT}', 'pixa.team', true, () => {})`,
      ],
      [
        'dialog-post',
        `window.pixa_keychain.requestPost('${ACCOUNT}', 'A pixel study', 'A sample post for review.', 'art', '', '{}', 'pixel-study', '', () => {})`,
      ],
      [
        'dialog-add-account-authority',
        `window.pixa_keychain.requestAddAccountAuthority('${ACCOUNT}', 'pixtopia', 'Posting', 1, () => {})`,
      ],
      [
        'dialog-remove-account-authority',
        `window.pixa_keychain.requestRemoveAccountAuthority('${ACCOUNT}', 'pixtopia', 'Posting', () => {})`,
      ],
      [
        'dialog-add-key-authority',
        `window.pixa_keychain.requestAddKeyAuthority('${ACCOUNT}', '${keys.posting.pub}', 'Posting', 1, () => {})`,
      ],
      [
        'dialog-remove-key-authority',
        `window.pixa_keychain.requestRemoveKeyAuthority('${ACCOUNT}', '${keys.posting.pub}', 'Posting', () => {})`,
      ],
      [
        'dialog-create-proposal',
        `window.pixa_keychain.requestCreateProposal('${ACCOUNT}', '${ACCOUNT}', 'Pixel gallery', 'pixel-gallery', '1.000 PXS', '2030-01-01T00:00:00', '2030-02-01T00:00:00', '[]', () => {})`,
      ],
      [
        'dialog-remove-proposal',
        `window.pixa_keychain.requestRemoveProposal('${ACCOUNT}', '[1]', '[]', () => {})`,
      ],
      [
        'dialog-proposal-vote',
        `window.pixa_keychain.requestUpdateProposalVote('${ACCOUNT}', '[1]', true, '[]', () => {})`,
      ],
      [
        'dialog-create-account',
        `window.pixa_keychain.requestCreateClaimedAccount('${ACCOUNT}', 'pixel-harness', '${JSON.stringify(
          authority(keys.owner.pub),
        )}', '${JSON.stringify(authority(keys.active.pub))}', '${JSON.stringify(
          authority(keys.posting.pub),
        )}', '${keys.memo.pub}', () => {})`,
      ],
      [
        'dialog-encode-keys',
        `window.pixa_keychain.requestEncodeWithKeys('${ACCOUNT}', ['${keys.memo.pub}'], '#A private memo', 'Memo', () => {})`,
      ],
      [
        'dialog-decode-memo',
        `window.pixa_keychain.requestVerifyKey('${ACCOUNT}', '${encoded.result}', 'Memo', () => {})`,
      ],
      [
        'dialog-add-account',
        `window.pixa_keychain.requestAddAccount('pixel-harness', {posting:'${keys.posting.wif}',active:'${keys.active.wif}',memo:'${keys.memo.wif}'}, () => {})`,
      ],
      [
        'dialog-sign-buffer-review',
        `window.pixa_keychain.requestSignBuffer('${ACCOUNT}', 'A message to sign', 'Posting', () => {})`,
      ],
      [
        'dialog-encode-memo-review',
        `window.pixa_keychain.requestEncodeMessage('${ACCOUNT}', '${ACCOUNT}', '#a memo', 'Memo', () => {})`,
      ],
    ]) {
      try {
        const dialog = await dialogFor(request);
        await shot(name, dialog);
        if (name === 'dialog-sign-tx-unknown') {
          const state = await dialog.evaluate(() => ({
            rawOpen: [...document.querySelectorAll('pre')].some(
              (el) => el.getClientRects().length > 0,
            ),
            allowsSkipping: document.body.innerText.includes("Don't ask again"),
          }));
          if (!state.rawOpen)
            problems.push('an unknown operation should open the transaction');
          if (state.allowsSkipping)
            problems.push("an unknown operation shouldn't offer Don't ask again");
        }
        if (await dialog.$('.collapsible-title')) {
          for (const title of await dialog.$$('.collapsible-title'))
            await title.click();
          await shot(`${name}-details`, dialog);
        }
        const scrolls = await dialog.$('.operation > .scrollable');
        if (
          scrolls &&
          (await scrolls.evaluate(
            (el) => el.scrollHeight > el.clientHeight + 20,
          ))
        ) {
          await scrolls.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          await shot(`${name}-bottom`, dialog);
        }
        if (
          expected &&
          !(await dialog.evaluate(
            (text) => document.body.innerText.includes(text),
            expected,
          ))
        )
          problems.push(`${name} should show ${expected}`);
        await closeDialog(dialog);
      } catch (error) {
        problems.push(`${name}: ${error.message}`);
      }
    }
  }
  for (theme of THEMES) {
    await page.evaluate(
      (value) => chrome.storage.local.set({ ACTIVE_THEME: value }),
      theme,
    );
    for (const [name, command, msg] of [
      ['dialog-unlock', 'UNLOCK', { data: { request_id: 1 } }],
      ['dialog-wrong-password', 'WRONG_MK', { data: { request_id: 1 } }],
      ['dialog-register', 'register', { data: { request_id: 1 } }],
      [
        'dialog-error',
        'sendDialogError',
        { display_msg: 'This account needs an active key to continue.' },
      ],
      [
        'dialog-result-error',
        'answerRequest',
        { success: false, message: 'The request was cancelled.' },
      ],
      [
        'dialog-result-success',
        'answerRequest',
        { success: true, message: 'Message signed.' },
      ],
    ]) {
      const preview = await browser.newPage();
      await preview.goto(url('dialog.html'));
      await preview.waitForSelector('.dialog');
      await sleep(200);
      await page.evaluate(
        (message) => chrome.runtime.sendMessage(message).catch(() => {}),
        { command, msg, domain: '127.0.0.1', tab: 0 },
      );
      await shot(name, preview);
      await closeDialog(preview);
    }
  }

  // A request naming Hive's currency is an error, never quietly mapped.
  const refused = await dapp.evaluate(
    () =>
      new Promise((resolve) => {
        window.pixa_keychain.requestTransfer(
          'x',
          'y',
          '1.000',
          '',
          'HIVE',
          (r) => resolve(r),
        );
        setTimeout(() => resolve(null), 4000);
      }),
  );
  if (refused?.success !== false)
    problems.push(
      `a HIVE transfer was not refused: ${JSON.stringify(refused)?.slice(
        0,
        120,
      )}`,
    );
  else console.log('ok    a request in HIVE is refused');

  await finish();
};

run().catch(async (error) => {
  if (failurePage && !failurePage.isClosed())
    await failurePage
      .screenshot({ path: path.join(OUT, 'fatal.png') })
      .catch(() => {});
  for (const problem of [...new Set(problems)])
    console.log(`PROBLEM ${problem}`);
  console.error(error);
  process.exit(2);
});
