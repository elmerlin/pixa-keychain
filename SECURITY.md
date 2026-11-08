# Security

PIXA Keychain holds the keys to people's money. If you find a problem, please tell us privately before anyone else.

## Report a problem

Use [Report a vulnerability](https://github.com/elmerlin/pixa-keychain/security/advisories/new). Please don't open a
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
- **While unlocked:** the password is held in memory (in Chrome, in an offscreen document apart from what websites can talk
  to; in Firefox, in the extension's background), and it
  goes when the wallet locks. It stays unlocked until the person locks it or closes every browser window, unless they
  choose to have it lock after some idle minutes or when the device locks.
- **Sites:** a page talks to the wallet through `window.pixa_keychain`, and each request opens a window of the extension's
  own. Sign and broadcast requests are described from the operations themselves, and anything that can't be read exactly
  is reported as not understood and shows the raw transaction. A message a site wants decrypted is shown first. An answer
  goes only to the document that asked.
- **"Don't ask again":** one kind of request, from one site, for one account, with the posting key. A transaction's approval
  covers only the kinds of operation it held. Nothing with the active or memo key can be approved in advance, nor anything
  that can't be read, except a custom_json whose ID the wallet doesn't know, which is approved for that one ID. A like, a
  downvote and taking a vote back are approved apart. A post's reward settings can be approved only as the chain's
  defaults with exactly the shares that were approved, each paired with its own post in the same transaction, and only
  once the person's node says that post isn't out yet: any other split, a post that's already out, or a node that can't
  say in time, asks again. That's as far as a wallet can check. A node a few seconds behind, or a site that keeps a
  signature until a post exists, could still put exactly the approved shares on a post that has no shares or likes yet,
  and change its text to what was signed.
- **Keys:** posting, active and memo keys only. Owner keys are always refused, and a master password is used to derive
  the other three.
- **Automatic claims:** rewards, savings interest and account tickets, only if turned on, only while unlocked, and signed
  without asking each time. They can't do anything else.
- **Authority changes:** the whole result is built before the review, shown with weights and the threshold, and signed
  exactly as shown. Only the role asked about is in the operation, and a change that would leave nobody able to use it is
  refused.
- **Network:** only the Pixa node the person chose. If it stops answering, the wallet asks before trying another, unless the
  person has turned on automatic switching. There are no analytics and no servers of ours.
- **Reference prices:** the one exception, for showing what things are worth. The wallet reads the US Big Mac price that
  Pixa's feed sets 1 PXS to from The Economist's data on GitHub, at most once a week. If the person picks a currency other
  than US dollars, it also asks `api.frankfurter.dev` for the day's rates, at most twice a day. Neither request says anything
  about them or their accounts. These only change a number shown for information, and nothing that gets signed ever comes
  from one.

## What it can't protect against

- A machine that's already compromised, or a malicious extension with access to the same pages.
- Someone else at the computer while the wallet is unlocked. Approving a request doesn't ask for the password, so a
  shared computer needs an auto-lock.
- A weak wallet password, if someone gets hold of the encrypted data or an exported file.
- A site that's approved with "Don't ask again" and later turns hostile, within what was approved.
- A node that lies. It can show the wrong balances and history, and an authority change starts from what it says the
  account looks like, which is why the review shows the whole result. Only choose a node you trust.
- A site that's convincing. The wallet shows what a request does, but the person still decides.
- A fake copy of this wallet. Install from the links in this repo.

## Audit status

It hasn't had an outside security audit. It's built on Hive Keychain, and the signing code stays close to upstream on
purpose, but everything specific to Pixa is new. Treat it as early software, and start with small amounts.
