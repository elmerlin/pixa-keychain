#!/usr/bin/env node
// Writes THIRD-PARTY-LICENSES.txt into a build, with the license of every package bundled into it. The source maps say
// which ones those are, so this needs a build that still has its .map files.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, process.argv[2] ?? 'dist-prod');

// By folder, since two versions of a package can be bundled: node_modules/a/node_modules/b is its own.
const packages = new Set();
for (const file of readdirSync(dist).filter((name) => name.endsWith('.js.map'))) {
  const { sources } = JSON.parse(readFileSync(join(dist, file), 'utf8'));
  for (const source of sources) {
    const relative = source.slice(source.indexOf('node_modules/'));
    if (source.includes('node_modules/')) {
      const parts = relative.match(/node_modules\/(?:@[^/]+\/)?[^/]+/g);
      parts.forEach((_, index) => packages.add(parts.slice(0, index + 1).join('/')));
    }
    if (source.includes('vendor/hive-tx/')) packages.add('vendor/hive-tx');
  }
}

const licenseFile = (dir) =>
  readdirSync(dir).find((name) => /^(licen[sc]e|copying|notice)(\.|-|$)/i.test(name));

// Some packages only state their license at the end of their README, under either kind of heading.
const licenseInReadme = (dir) => {
  const readme = readdirSync(dir).find((name) => /^readme/i.test(name));
  if (!readme) return null;
  const match = readFileSync(join(dir, readme), 'utf8').match(
    /^(?:#+\s*licen[sc]e\b[^\n]*|licen[sc]e[^\n]*\n[-=]{3,}[ \t]*)\n([\s\S]*?)(?=^#|^[^\n]+\n[-=]{3,}[ \t]*$|$(?![\s\S]))/im,
  );
  return match?.[1].trim() || null;
};

// A few ship no notice at all, so we keep the one from their source: scripts/third-party-notices.
const noticeOf = (name) => {
  const path = join(root, 'scripts/third-party-notices', `${name.replace('/', '__')}.txt`);
  return existsSync(path) ? readFileSync(path, 'utf8').trim() : null;
};

const isNotice = (text) => /copyright|permission|public domain/i.test(text ?? '');

const missing = [];
const sections = [...packages]
  .filter((dir) => existsSync(join(root, dir, 'package.json')))
  .map((dir) => {
    const manifest = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
    const name = manifest.name;
    const declared = manifest.license?.type ?? manifest.license ?? manifest.licenses?.[0]?.type;
    const file = licenseFile(join(root, dir));
    const found = file ? readFileSync(join(root, dir, file), 'utf8').trim() : licenseInReadme(join(root, dir));
    const text = isNotice(found) ? found : noticeOf(name);
    if (!isNotice(text)) missing.push(name);
    return { name, version: manifest.version, declared, text };
  })
  .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.version < b.version ? -1 : 1));

if (missing.length) {
  console.error(`No license notice for: ${missing.join(', ')}. Add one to scripts/third-party-notices.`);
  process.exit(1);
}

const rule = '-'.repeat(80);
const body = sections
  .map(({ name, version, declared, text }) =>
    [rule, `${name} ${version}`, `License: ${declared ?? 'see below'}`, '', text, ''].join('\n'),
  )
  .join('\n');

writeFileSync(
  join(dist, 'THIRD-PARTY-LICENSES.txt'),
  `Pixtopia Keychain bundles these packages. Each stays under its own license.\n\n${body}`,
);
console.log(`THIRD-PARTY-LICENSES.txt: ${sections.length} packages`);
