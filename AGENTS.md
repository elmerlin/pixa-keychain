# PIXA Keychain: agent guide

PIXA Keychain is a wallet browser extension for the **Pixa** blockchain, a Hive fork. It is
a fork of [hive-keychain-extension](https://github.com/hive-keychain/hive-keychain-extension) (MIT;
the `upstream` remote, push disabled). Sites reach it through `window.pixa_keychain`. It must be
able to run next to the real Hive Keychain in one browser, so nothing it exposes to a page shares a
name with Hive Keychain's.

## The chain

| | |
| --- | --- |
| Chain ID | `706978616772616d000000000000000000000000000000000000000000000000` |
| Public key prefix | `PIX` |
| Liquid / dollar / vesting | `PIXA` / `PXS` / `VESTS` (3, 3, 6 decimals) |
| RPC | `https://api.pixagram.com` |
| Protocol | hived 1.30.x, Hive's operation numbers |

How it differs from Hive, which is where bugs come from:

- **Assets go on the wire literally.** `PIXA` and `PXS` are serialized as those letters, unlike
  Hive's `STEEM`/`SBD` aliases.
- **Fields are renamed.** `hbd` becomes `pxs` and `hive` becomes `pixa`: `pxs_balance`,
  `savings_pxs_balance`, `reward_pxs_balance`, `reward_pixa_balance`, `reward_vesting_pixa`,
  `total_vesting_fund_pixa`, `pxs_interest_rate`, and on operations `percent_pxs`, `reward_pixa`,
  `reward_pxs`. The exceptions are real too: `get_ticker` still answers `hive_volume`/`hbd_volume`,
  and `get_config` keeps its `HIVE_*` keys.
- **Keys derive as on Hive:** `sha256(account + role + password)`, WIF, `PIX` public keys.
- **RC amounts are far smaller than Hive's,** so never fix one in code: read the price
  (`getAccountTicketCost`). A ticket is claimed each time RC reaches 100% (`claim.module.ts`).
- **The node has no `transaction_status_api`,** so `confirmTransaction` reads
  `condenser_api.get_transaction`.
- **No Hive Engine, swaps, multisig backend, Ledger app, HiveAuth or `api.hive-keychain.com`.**
  Nothing here may call a Hive service.

`condenser_api.get_transaction_hex` is read-only and returns the node's own serialization of a
transaction. It is the test oracle for anything that serializes.

## Rules

- **Never broadcast from tests or scripts.** Read-only RPC only.
- **Owner keys are always refused.** Posting, active and memo keys only; a master password derives
  those three. Keys never leave the device, and stay in the encrypted store and the service worker.
- **The dialog shows what gets signed.** Never add a signing path that skips the review a person
  sees, beyond what they have opted into under authorized operations. Sign and broadcast requests
  say it in words (`src/dialog/utils/operation-summary.utils.ts`) and that code treats every request
  as hostile: what it can't read exactly is reported as not understood, opens the raw transaction and
  drops "Don't ask again". Never guess, and never put what a site wrote into a title.
- **Don't ask again stays narrow.** `approvalFor` in `src/utils/preferences.utils.ts` says what a saved approval covers: one
  kind of request or set of operations, with the posting key, and nothing unreadable in a transaction (a `custom` request
  with an ID the wallet doesn't read is approved for that ID, as upstream does). Likes, downvotes and taking a vote back
  are separate kinds. Reward settings only as `rewardShares` allows: the chain's defaults with the exact shares in the
  approval, paired one to one with posts in the same transaction, and `postsAreNew` has the node confirm each post isn't out
  before one is signed without asking (then `init.ts` checks it's still unlocked and approved). A `custom` request with an ID
  the wallet reads is approved only when its JSON reads. The checkbox and
  Settings say what an approval covers in words (`approvalWords`), so a new kind needs its words too.
- **Authority changes sign what the review built** (`getAuthorityChangeOperation`, `useAuthorityChange`), and read nothing
  again. Only the role asked about goes in. Every byte comes from a site or a node, so the serializer refuses what it can't
  write exactly instead of rounding or wrapping it.
- Answers to a site go through `requestHandler.answer`, to the document that asked. Never to a whole tab.
- **One request at a time, from any page.** `RequestTracker` keeps it in memory with how to answer its page (`isCurrent`), so a
  replaced request from another page is told it was cancelled even if nothing was saved for it. A replaced request never
  saves its handler, signs, or opens or fills a window. Windows hear their request by a message every window gets, so
  `createPopup` opens one at a time and closes stray ones first, and everything sent to a window goes through `toDialog`.
  Only a window the person closes cancels: ones the wallet closes itself (`removeWindow`) don't. Once a request's page has
  its answer, nothing more starts for it (`isOpen`). The content script sets aside only requests older than the one accepted.
- Internal names stay as upstream has them (`HiveUtils`, `src/popup/hive`, `hive-tx`), so merging
  upstream stays cheap. Everything a person can see says Pixa, PIXA, PXS, PIXA Keychain.
- Copy says Pixa for the chain and its accounts, and PIXA and PXS for its tokens. Pixagram is only
  the app Pixa's founders launched first. Code and `api.pixagram.com` keep their names.
- **Fiat is for looking at** (`src/popup/hive/utils/fiat.utils.ts`). Pixa's feed sets 1 PXS to one US Big Mac and quotes PIXA
  against it, so a value is its PXS times the latest US Big Mac, times an exchange rate. PXS is never a dollar. The price is The
  Economist's, read at most once a week, with `BUILT_IN_BIG_MAC` until then: bring that up to date in a release after each
  January and July edition. Rates come from `api.frankfurter.dev`, only once someone picks another currency, saved for 12 hours
  and checked when they arrive. These are the only requests that don't go to the person's node: send them nothing about the
  person, never let one near an amount that gets signed, and keep `SECURITY.md`, the README, the store guide, and Pixtopia's
  `app/keychain/privacy.tsx` and `public/keychain/index.html` true to them.
- `src/popup/hive/utils/hive-tx.utils.ts` and `vendor/hive-tx` are the signing path. Keep changes to
  them small and covered by `npm test`.

## Look and feel

The Pixtopia design system: dark-first monochrome, charcoal tonal
steps, 1px hairlines, Geist and Geist Mono. The one accent is `spark`. The Prism (`#FF4F8B`,
`#FFB547`, `#3EE0A1`, `#4CA8FF`) appears in the logo, empty states and the home screen's holdings bar, never in chrome. Light and
dark must both work, and state never relies on color alone. Tokens live in
`src/common-style/theme.scss`; components never hardcode colors. Copy is short, human and
task-first, with no developer copy.

How that looks in this extension, screen by screen, is in `DESIGN.md`.

Glyphs live in `public/assets/images`. New ones are drawn to the same 24px grid.

## Commands

```bash
npm run build:chromium   # dist-prod, load unpacked from chrome://extensions
npm run build:firefox
npm run dev:chromium
npm test
npm run typecheck
npm run check:chain      # serialization compared with the node, read-only
npm run package:chromium # the zip for a release or the store, with third-party licenses
npm run doc              # docs/api.md, from the comments in public/pixa_keychain.js
node scripts/e2e.mjs --account pixa.team --theme both   # every screen in Chrome, needs a build
```
