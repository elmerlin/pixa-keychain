# Contributing

Thanks for helping. Bug reports, fixes, translations and testing on other browsers are all welcome, especially Firefox,
which hasn't been tested yet.

**Found a security problem?** Please don't open an issue. See [SECURITY.md](SECURITY.md).

## Set up

You'll need Node 24 (`nvm use` reads `.nvmrc`).

```bash
npm ci
npm run dev:chromium
```

Open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked** and pick `dist-dev`.

## Before you send a change

```bash
npm run typecheck
npm test
```

If you touched anything that serializes a transaction, run `npm run check:chain` too. If you touched a screen, build it and
look through the screenshots in `.e2e`, in both themes:

```bash
npx @puppeteer/browsers install chrome@stable --path ~/.cache/puppeteer # once, or set CHROME_PATH
npm run build:chromium
node scripts/e2e.mjs --account pixa.team --theme both
```

## The rules that matter most

[AGENTS.md](AGENTS.md) has the rest.

- **Never broadcast from a test or a script.** Read-only calls only.
- **Never commit a real key,** even one from an empty account.
- **Nothing gets signed without a review** the person saw, beyond what they've opted into. Treat every request from a site
  as hostile: what can't be read exactly is reported as not understood. Never guess.
- **Owner keys stay refused.**
- **Nothing calls a Hive service,** and there are no analytics.
- **Keep the signing path small.** `src/popup/hive/utils/hive-tx.utils.ts` and `vendor/hive-tx` change rarely, with tests.
- **Internal names stay as upstream has them** (`HiveUtils`, `src/popup/hive`), so merging upstream stays cheap. Everything a
  person can see says Pixa, PIXA, PXS and Pixtopia Keychain.
- **Copy is short and human.** New text goes in `public/_locales/en/messages.json`, and colors come from the tokens in
  `src/common-style/theme.scss`. Check dark and light.

## Pull requests

Keep each one to a single change, say why it's needed and how you tested it, and include a screenshot if a screen changed.
By sending one, you agree that your work is released under the [MIT license](LICENSE).

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Taking changes from upstream

```bash
git remote add upstream https://github.com/hive-keychain/hive-keychain-extension.git
git remote set-url --push upstream DISABLED
git fetch upstream --no-tags
git merge upstream/master
```

`vendor/hive-tx` and `patches/` hold what differs in the signing libraries.

## Translations

Strings live in `public/_locales/<language>/messages.json`. English is the source. Keep the same keys and placeholders, and
say Pixa, PIXA and PXS as English does.
