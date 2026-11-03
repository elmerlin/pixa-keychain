# Pixtopia Keychain

A wallet browser extension for the Pixa blockchain. Keep your keys in
your browser, and let sites ask you to sign without ever seeing them.

It's a fork of [Hive Keychain](https://github.com/hive-keychain/hive-keychain-extension), ported to
Pixa and restyled for [Pixtopia](https://pixtopia.net).

## Install it

```bash
npm install
npm run build:chromium
```

Then open `chrome://extensions`, turn on Developer mode, choose **Load unpacked** and pick
`dist-prod`. For Firefox, run `npm run build:firefox` and load `dist-prod-firefox/manifest.json`
from `about:debugging`.

It can sit next to Hive Keychain in the same browser. They use different names on the page.

## Use it from a site

The extension puts `window.pixa_keychain` on every page. See [documentation](documentation/README.md)
for every request.

```js
window.pixa_keychain.requestHandshake(() => {
  window.pixa_keychain.requestVote(account, permlink, author, 10000, (response) => {
    console.log(response.success, response.result);
  });
});
```

Amounts are in `PIXA` and `PXS`, and delegations in `PP` or `VESTS`. A request in `HIVE` or `HBD` is
refused.

A site built for Hive Keychain needs its one global renamed. Everything else follows the same
shape:

```js
const keychain = window.pixa_keychain;
```

## What's in it

Accounts by key or master password, transfers and recurring transfers, power up and down,
delegations, RC delegations, savings, conversions, rewards and auto-claim, witness and proposal
votes, a proxy, your own witness, account creation and authorities, encrypted export and import, and
the dialog sites use to ask for a signature.

Owner keys are refused. Keep yours offline.

Left out because they can't work here: Hive Engine tokens, swaps, buying coins, multisig, HiveAuth,
Ledger and PeakD notifications. Nothing calls a Hive service, and there are no analytics.

## Developing

```bash
npm run dev:chromium     # dist-dev, rebuilds on change
npm test
npx tsc --noEmit
npm run check:chain      # compares every operation's bytes with the node's
node scripts/e2e.mjs     # drives the real extension and saves screenshots to .e2e
```

Neither of the last two can broadcast. `check:chain` only uses read-only calls, and `e2e.mjs` runs
the browser behind a local proxy that refuses broadcasts and blocks everything else.

[AGENTS.md](AGENTS.md) has the chain's differences from Hive and the rules of the codebase.

To take changes from upstream, `git fetch upstream` and merge. Internal names are left as upstream
has them (`HiveUtils`, `src/popup/hive`) to keep that cheap. `vendor/hive-tx` and `patches/` hold what
differs in the signing libraries.

## License

MIT. See [LICENSE](LICENSE). Hive Keychain is copyright Hive Keychain Ltd., and `hive-tx` is
copyright its authors (`vendor/hive-tx/LICENSE`).
