# Changelog

## 0.1.1

The first public release. Everything here came from a review before opening the source.

### Security

- A site could hide a transaction inside a request to sign a message. Messages are now signed as the text you read, and
  text that could be signed into a transaction is refused.
- A site could ask for an authority with a weight of 0, and approving it granted full control. Weights are now checked,
  and what you approve is what's signed.
- A post's request could send its rewards to someone else without showing it. They're now in the review, and a post that
  changes them can't be approved in advance.
- Answers went to every frame in a tab, so an embedded site could read them. They now go only to the page that asked.
- A number too big for its type, or a key left empty, could be signed as something other than what the review showed.
  Those are now refused, or treated as left out.
- A site could choose which of your saved nodes answered a request. It can't any more, and an authority change now only
  touches the role you approved. On a node you chose, the default node has to agree about the account first.
- A master password could bring in a key that's also the account's owner key. That's refused, as it is for a key.
- Savings memos marked as encrypted went out as plain text. They're now encrypted.

### Fixed

- Closing the window after approving a transfer no longer tells the site it was cancelled while it's going through.
- Adding a second key to an authority no longer fails on key order.
- `requestEncodeWithKeys` uses the key it asked for.

### Added

- Each release's zip lists the licenses of everything bundled into it, and can be checked against its source.

## 0.1.0

The first version, submitted to the Chrome Web Store. A port of Hive Keychain to Pixa, with Pixtopia's look, sign requests
in plain words, and automatic account tickets.
