#!/usr/bin/env bash
# Builds the extension and zips it for the Chrome Web Store: manifest.json at the root, no source maps.
# Each upload needs a higher "version" in manifests/chromium/manifest.json than the one before.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build:chromium
VERSION="$(node -p "require('./dist-prod/manifest.json').version")"
OUT="$PWD/pixtopia-keychain-$VERSION-chromium.zip"
rm -f "$OUT"
(cd dist-prod && zip -q -r -X "$OUT" . -x '*.map')
LISTING="$(unzip -Z1 "$OUT")"
if grep -q '\.map$' <<<"$LISTING"; then echo "Source maps got into the zip" >&2; exit 1; fi
grep -qx 'manifest.json' <<<"$LISTING" || { echo "manifest.json isn't at the root" >&2; exit 1; }
du -h "$OUT"
