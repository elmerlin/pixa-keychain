# Changelog

## 0.1.5

- **It stays unlocked until you lock it.** The wallet now stays unlocked until you lock it or close every browser window.
  It used to lock after 10 idle minutes, which asked for your password again and again. Approving a request doesn't ask
  for the password, so if anyone else uses your computer, choose a timer under Settings, then Advanced settings, then Auto
  lock. The descriptions there now say what each does: idle means your whole computer, and it locks when the screen does.
- **Pixholm moves and lending RC say what they are.** A move in Pixtopia's island game reads as "Build a lantern" or
  "Send a raid on Driftwood Camp", and lending RC names who and how much. They used to show a warning and the raw
  transaction, and couldn't be approved in advance.
- **"Don't ask again" says what it covers.** It now reads "Don't ask again for likes from @you on pixtopia.net". It used
  to say "sign transaction requests", which sounded like everything, though it only ever covered the one kind you saw.
- **Replies can be approved in advance.** A post or reply that shares its rewards can be, but only with exactly the
  shares you approved, and only when your node says it's being posted. Any other split asks again, and so does a post your
  node says is already out.
- **Likes and downvotes are approved apart.** Approving likes no longer covers downvotes or taking a vote back. Each asks
  until you approve it on its own.
- **A site asking again works.** If a site sent a new request while a window was open, the new window couldn't sign, and
  the one after it was blank. The newest request now signs, and one replaced from another tab is told it was cancelled. A
  page that asked twice at once heard that both were set aside, though the newer one could still be approved; now only
  the older is. And a request that's been cancelled can't be approved afterwards.
- Closing every browser window locks the wallet in Firefox too. It only did in Chrome.
- A portal action named after one of JavaScript's built-in properties broke the window. It now shows a warning.

## 0.1.4

- **Values were about six times too low.** The wallet counted 1 PXS as 1 US dollar. Pixa's price feed sets 1 PXS to one US
  Big Mac, by The Economist's index, which is $6.22 right now, so your value and PIXA's price now start from that. These
  numbers are only ever shown: nothing that gets signed comes from them, and your balances haven't changed.
- **One more request, for everyone.** To keep that price current, the wallet reads it from The Economist's data on GitHub, at
  most once a week. GitHub sees your IP address and nothing else. Until it has read one, or if it can't, the wallet uses the
  price it shipped with.

## 0.1.3

- **Lent and received, apart.** The home screen's Pixa Power column now shows what you've lent and what you've received on
  their own lines. It used to show one number, the difference between them, which looked like the amount you'd delegated.
- **Nothing gets squashed.** When the home screen runs out of room, it now scrolls instead of flattening what's on it.

## 0.1.2

Pixtopia Keychain is now PIXA Keychain. It's the same wallet: your accounts, settings and `window.pixa_keychain` are
unchanged.

- **Your value in your currency.** Choose from 30 currencies under Settings, then Preferences, then Currency. US dollars need
  nothing from anyone. For any other currency the wallet gets exchange rates from frankfurter.dev, which sees your IP address
  and nothing else. These are rough: 1 PXS is taken as 1 US dollar, as the chain's own price feed does.
- **PIXA's price.** The home screen shows what the price feed says 1 PIXA is worth, in your currency.
- **A new home screen.** Your value drawn in pixels, a bar showing what your account is made of, your three balances side by
  side, and Send on its own. A full vote's worth moved to the Voting mana tooltip.

## 0.1.1

The first public release. Everything here came from a review before opening the source.

### Security

- A site could hide a transaction inside a request to sign a message. Messages are now signed as the text you read, and
  text that could be signed into a transaction is refused.
- A site could ask for an authority with a weight of 0, and approving it granted full control. Weights are now checked.
- Authority changes now show the whole result, with weights and the threshold, and sign exactly that. Only the role you
  approved is touched, and a change that would leave nobody able to use it is refused.
- "Don't ask again" was too wide: approving one transaction approved any other from that site, unreadable ones included,
  and approving the posting key let a site read memos. It now covers one kind of request or set of operations, with the
  posting key only.
- A post's request could send its rewards to someone else without showing it. They're now in the review, every time.
- Answers went to every frame in a tab, so an embedded site could read them. They now go only to the document that asked.
- A number too big for its type, a date that doesn't exist or a key left empty could be signed as something other than
  what the review showed. Those are now refused, or treated as left out.
- A site could choose which of your saved nodes answered a request. It can't any more.
- Approvals went by hostname, so one site's on `localhost:3000` also covered `localhost:8000`. They now include the port.
- A setup window left open could replace a wallet set up elsewhere, and accounts that couldn't be read were treated as none,
  so saving could lose them. Both are refused now.
- The wallet could contact the default node when yours stopped answering, even with automatic switching off. It now asks
  first, and automatic switching is off unless you turn it on.
- A site asking to verify a key could have the wallet decrypt a private memo copied from the chain, without showing it. The
  message is now shown before you agree to share it.
- A public key longer than a key could spill into the fields after it, so a signature could cover something else. Keys are
  now checked fully. Reviews of new accounts also show who gets active and posting control, not just the owner.
- A site could ask the wallet to encrypt to, or read a message from, something that isn't a real key, which can leak a
  private key a little at a time. Memos now check every key first.
- Reviews now show a new account's and a witness's full settings, a proposal's new end date, and that a power down route
  arrives as power.
- If two sites asked at once, approving one could answer the other. The approved request now decides whose keys sign and who
  hears back.
- A master password or a backup file could bring in a key that's also the account's owner key. A master password is now
  refused, as a key is, and a backup is added without it.
- Savings memos marked as encrypted went out as plain text. They're now encrypted.
- A site's keys could be saved under an empty password if the wallet was locked when it asked to add them. They now wait
  for the password.
- The wallet now locks after 10 idle minutes unless you choose otherwise. It used to stay unlocked until the browser closed.

### Fixed

- Closing the window after approving a transfer, or a page asking for something else while it's being sent, no longer
  reports it as cancelled while it goes through. Trying again could have sent it twice. A new request now gets `busy` until
  the last one has finished.
- Pressing Confirm twice can no longer send a transfer twice.
- Changing your password saves your accounts under it first. Closing the popup straight afterwards could have locked you out.
- Putting back withdrawal routes takes old ones away first, and says so if it fails instead of reporting success.
- Closing the unlock window now tells the site.
- Adding a second key to an authority no longer fails on key order.
- `requestEncodeWithKeys` uses the key it asked for.
- Your balance counts what's still locked in market orders, not the orders' original size.
- Wallet windows left open now pick up what others save. An old window could have saved its list over newer keys. Logging out
  in one window locks them all. Deleting an account works from what's saved at that moment, and deleting the last one really
  removes its keys.
- `requestAddAccount` checks a memo key against the account.
- Every request a site makes now gets an answer, even if something goes wrong unexpectedly.
- An incoming delegation no longer offers Edit and Delete, which acted on your own outgoing one instead.
- Proposal IDs, authorities and who a custom_json needs can be listed in any order. A small power down still shows, with its cancel button.

### Added

- Each release's zip lists the licenses of everything bundled into it, and can be checked against its source.

## 0.1.0

The first version, submitted to the Chrome Web Store. A port of Hive Keychain to Pixa, with Pixtopia's look, sign requests
in plain words, and automatic account tickets.
