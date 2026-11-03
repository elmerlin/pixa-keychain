# Security

Pixtopia Keychain holds the keys to people's money. If you find a problem, please tell us privately before anyone else.

## Report a problem

Use [Report a vulnerability](https://github.com/elmerlin/pixtopia-keychain/security/advisories/new). Please don't open a
public issue for it.

Tell us what an attacker could do, and how to reproduce it on the latest release. Never send anyone a real private key or
password, including us. Use a throwaway account.

We fix the latest release only. We don't run a bug bounty.

Worth reporting first:

- Signing or broadcasting something the person didn't see and approve.
- A site or another extension reaching a key, the password or another site's response.
- The review showing something other than what gets signed.
- A key leaving the device, or being stored unencrypted.

## How it works

- **At rest:** accounts are encrypted with AES-GCM, using a key derived from the password with PBKDF2-HMAC-SHA256 and
  600,000 rounds, and stored in the extension's local storage. Data saved by an older format is upgraded on unlock.
- **While unlocked:** the password is held in memory, in an offscreen document apart from what websites can talk to, and it
  goes when the wallet locks.
- **Sites:** a page talks to the wallet through `window.pixa_keychain`, and each request opens a window of the extension's
  own. Sign and broadcast requests are described from the operations themselves, and anything that can't be read exactly
  is reported as not understood, shows the raw transaction and can't be approved in advance. A person can choose "Don't
  ask again" for a kind of request on a site.
- **Keys:** posting, active and memo keys only. Owner keys are always refused, and a master password is used to derive
  the other three.
- **Automatic claims:** rewards, savings interest and account tickets, only if turned on, only while unlocked, and signed
  without asking each time. They can't do anything else.
- **Network:** only the Pixa node the person chose. There are no analytics and no servers of ours.

## What it can't protect against

- A machine that's already compromised, or a malicious extension with access to the same pages.
- A weak wallet password, if someone gets hold of the encrypted data or an exported file.
- A site that's approved with "Don't ask again" and later turns hostile, within what was approved.
- A site that's convincing. The wallet shows what a request does, but the person still decides.
- A fake copy of this wallet. Install from the links in this repo.

## Audit status

It hasn't had an outside security audit. It's built on Hive Keychain, and the signing code stays close to upstream on
purpose, but everything specific to Pixa is new. Treat it as early software, and start with small amounts.
