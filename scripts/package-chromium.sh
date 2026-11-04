#!/usr/bin/env bash
# Builds the extension and zips it for a release or the Chrome Web Store: manifest.json at the root, no source maps,
# and the licenses of everything bundled. Each store upload needs a higher "version" in manifests/chromium/manifest.json
# than the one before.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build:chromium
node scripts/third-party-licenses.mjs dist-prod
VERSION="$(node -p "require('./dist-prod/manifest.json').version")"
OUT="$PWD/pixa-keychain-$VERSION-chromium.zip"
rm -f "$OUT"
(
  cd dist-prod
  export LC_ALL=C TZ=UTC
  find . -type f ! -name '*.map' -exec touch -t 202601010000 {} +
  find . -type f ! -name '*.map' | sed 's|^\./||' | sort | zip -q -X "$OUT" -@
)
LISTING="$(unzip -Z1 "$OUT")"
if grep -q '\.map$' <<<"$LISTING"; then echo "Source maps got into the zip" >&2; exit 1; fi
grep -qx 'manifest.json' <<<"$LISTING" || { echo "manifest.json isn't at the root" >&2; exit 1; }
grep -qx 'THIRD-PARTY-LICENSES.txt' <<<"$LISTING" || { echo "The third-party licenses didn't get into the zip" >&2; exit 1; }
du -h "$OUT"
