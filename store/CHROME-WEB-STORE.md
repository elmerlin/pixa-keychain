# Chrome Web Store submission

Everything to paste or upload, in the order the dashboard asks for it. Rebuild the package with
`npm run package:chromium`. Each upload needs a higher `version` in `manifests/chromium/manifest.json`.
The name and summary come from the manifest and can't be changed in the dashboard.

## Before submitting

- [ ] A real like and a real small transfer have worked through the extension.
- [ ] https://pixtopia.net/keychain/privacy is live.
- [ ] There's a test account for the reviewer (see Test instructions). Never give them a real key.

## Account

Register at https://chrome.google.com/webstore/devconsole and pay the one-time fee.

- **Email:** it can't be changed later, and Google suggests a dedicated address that you check often.
- **Publisher name:** Pixtopia. It shows under "Offered by".
- Verify the contact email, or you can't publish.

## Package

Upload `pixtopia-keychain-0.1.0-chromium.zip`.

## Store listing

**Title (from the manifest):** Pixtopia Keychain

**Summary (from the manifest):** A wallet for Pixa. Your keys stay on your device, and you see what you're signing in plain words.

**Description:**

```text
Pixtopia Keychain is a wallet for the Pixa blockchain. Your keys stay on your device, encrypted with your password, and sites never see them. When a site asks you to sign something, the wallet says what it does in plain words before you decide.

What you can do:
• Send PIXA and PXS, keep them in savings, and convert between them
• Power up and down, and delegate Pixa Power
• Vote for witnesses and proposals
• Sign in to Pixa sites and approve likes, posts and transfers without typing a key
• Keep several accounts, and see each one's history
• Choose your own Pixa node, in dark or light

Made to be careful:
• Every request shows the account, the key it needs and what it does, with the exact transaction a tap away
• A request the wallet can't read says so, shows the raw transaction and can't be approved in advance
• Changes to who controls an account come with a warning
• Owner keys are always refused, and the wallet locks itself when you step away

You'll need a Pixa account. You can make one at pixagram.com, and add it here with a key or your master password.

No ads, no analytics, and nothing is sent to us. Built on the open-source Hive Keychain, under the MIT license.
```

**Category:** the one for tools or productivity, whichever the dashboard offers.

**Language:** English

**Graphics:**

| Field | File |
| --- | --- |
| Store icon | `public/assets/images/icon-128.png` |
| Screenshots, in order | `store/assets/screenshot-1.png` to `screenshot-5.png` |
| Small promo tile | `store/assets/promo-small.png` |
| Marquee promo tile | `store/assets/promo-marquee.png` |

**Homepage URL:** https://pixtopia.net

**Support URL:** leave empty and use the store's built-in support hub.

**Mature content:** off

## Privacy

**Single purpose:**

```text
Keep the keys to Pixa blockchain accounts on the user's device, and let the user review and sign what websites ask them to sign.
```

**Permission justifications:**

`storage`

```text
Saves the user's accounts, encrypted with their password, and their settings on their device.
```

`idle`

```text
Locks the wallet automatically after the idle time the user chooses, so an unattended computer can't sign anything.
```

`alarms`

```text
Runs the automatic claims the user can turn on (rewards, account tickets and savings interest) on a schedule, while the wallet is unlocked.
```

`offscreen`

```text
Holds the unlocked wallet in memory in a separate document, apart from the pages websites can talk to. Without it the wallet would have to ask for the password on every request.
```

Host permission (`https://*/*`):

```text
The user can choose any Pixa node by its address, so the wallet can't list node addresses in advance. It makes requests only to the node the user has chosen.
```

Content script on all `https://` sites, plus `localhost` and `127.0.0.1` for development:

```text
Any website can be a Pixa app, so there's no fixed list of sites. One script adds an object sites use to ask for a signature, and the other passes those requests to the wallet. They read nothing from the page, and each request opens a window where the user reviews it. Plain http sites are excluded, apart from local development.
```

**Remote code:** No, I am not using remote code.

**Data usage.** Keys and settings stay on the device, but Google says handling data locally still counts, so disclose these:

| Category | Why |
| --- | --- |
| Personally identifiable information | Account names |
| Financial and payment information | Balances, and the transfers the user signs |
| Authentication information | Private keys and the wallet password |
| Web browsing activity | Only the sites the user tells it not to ask again about |
| Website content | What a site asks the user to sign |

Leave the others unticked. Then tick all the certifications, which are true: the data isn't sold or transferred, isn't used for anything but the single purpose, and isn't used for creditworthiness or lending.

**Privacy policy URL:** https://pixtopia.net/keychain/privacy

## Distribution

- **Payment:** free
- **Regions:** all, unless you have a legal reason to exclude some
- **Visibility:** Public. Choose Unlisted to get a working link first, without it showing up in search.
- **Publishing:** choose to publish yourself after review, so you control when it goes live. You then have 30 days.

## Test instructions

Make a separate Pixa account for this, with no funds that matter, and fill in its name and posting key. Never use a key from a real account.

```text
The wallet needs a Pixa account before it opens. Use this test account:
Account: REPLACE_WITH_TEST_ACCOUNT
Posting key: REPLACE_WITH_TEST_POSTING_KEY

1. Open the extension, create a password, accept the Terms and press Continue.
2. Choose "Use a key or password", enter the account and key above, and press Continue.
3. Go to https://pixtopia.net/sign-in and choose "Use Pixtopia Keychain". Confirm in the window that opens.
4. Open any post and press the heart, then choose "Like at". The extension opens a window saying "Like at" and naming the post. Confirm or Cancel: both are fine.

The test account holds no funds, so wallet actions that spend money will be refused by the chain.
```
