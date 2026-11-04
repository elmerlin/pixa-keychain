# Changelog

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
- A master password could bring in a key that's also the account's owner key. That's refused, as it is for a key.
- Savings memos marked as encrypted went out as plain text. They're now encrypted.
- A site's keys could be saved under an empty password if the wallet was locked when it asked to add them. They now wait
  for the password.
- The wallet now locks after 10 idle minutes unless you choose otherwise. It used to stay unlocked until the browser closed.

### Fixed

- Closing the window after approving a transfer, or a page asking for something else while it's being sent, no longer
  reports it as cancelled while it goes through. Trying again could have sent it twice.
- Pressing Confirm twice can no longer send a transfer twice.
- Putting back withdrawal routes takes old ones away first, and says so if it fails instead of reporting success.
- Closing the unlock window now tells the site.
- Adding a second key to an authority no longer fails on key order.
- `requestEncodeWithKeys` uses the key it asked for.
- Your balance counts what's still locked in market orders, not the orders' original size.

### Added

- Each release's zip lists the licenses of everything bundled into it, and can be checked against its source.

## 0.1.0

The first version, submitted to the Chrome Web Store. A port of Hive Keychain to Pixa, with Pixtopia's look, sign requests
in plain words, and automatic account tickets.
