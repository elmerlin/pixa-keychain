# hive-tx for Pixagram

Vendored from `hive-keychain/hive-tx-js` (MIT, see LICENSE), version 4.3.1, and changed only where
Pixagram differs from Hive:

- `config.js`: Pixagram node, chain ID and the `PIX` key prefix.
- `helpers/asset.js`: `PIXA`, `PXS` and `VESTS` only, serialized literally. There are no `STEEM`/`SBD` aliases.
- `helpers/serializer.js`: renamed operation fields, checked against `condenser_api.get_transaction_hex`.
