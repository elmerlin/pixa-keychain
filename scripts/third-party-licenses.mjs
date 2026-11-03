#!/usr/bin/env node
// Writes THIRD-PARTY-LICENSES.txt into a build, with the license of every package bundled into it. The source maps say
// which ones those are, so this needs a build that still has its .map files.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, process.argv[2] ?? 'dist-prod');

const packages = new Map();
for (const file of readdirSync(dist).filter((name) => name.endsWith('.js.map'))) {
  const { sources } = JSON.parse(readFileSync(join(dist, file), 'utf8'));
  for (const source of sources) {
    for (const [, name] of source.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g)) {
      packages.set(name, join('node_modules', name));
    }
    if (source.includes('vendor/hive-tx/')) packages.set('hive-tx', 'vendor/hive-tx');
  }
}

const licenseFile = (dir) =>
  readdirSync(dir).find((name) => /^(licen[sc]e|copying|notice)(\.|-|$)/i.test(name));

// Some packages only state their license at the end of their README.
const licenseInReadme = (dir) => {
  const readme = readdirSync(dir).find((name) => /^readme/i.test(name));
  if (!readme) return null;
  const match = readFileSync(join(dir, readme), 'utf8').match(/^#+\s*licen[sc]e\b[^\n]*\n([\s\S]*?)(?=^#|$(?![\s\S]))/im);
  return match?.[1].trim() || null;
};

const missing = [];
const sections = [...packages.entries()]
  .filter(([, dir]) => existsSync(join(root, dir, 'package.json')))
  .map(([name, dir]) => {
    const manifest = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
    const declared = manifest.license?.type ?? manifest.license ?? manifest.licenses?.[0]?.type;
    const file = licenseFile(join(root, dir));
    const text = file ? readFileSync(join(root, dir, file), 'utf8').trim() : licenseInReadme(join(root, dir));
    if (!text) missing.push(name);
    return { name, version: manifest.version, declared, text };
  })
  .sort((a, b) => (a.name < b.name ? -1 : 1));

const rule = '-'.repeat(80);
const body = sections
  .map(({ name, version, declared, text }) =>
    [rule, `${name} ${version}`, `License: ${declared ?? 'see the package'}`, '', text ?? `No license file ships with this package. It declares: ${declared ?? 'nothing'}.`, ''].join('\n'),
  )
  .join('\n');

writeFileSync(
  join(dist, 'THIRD-PARTY-LICENSES.txt'),
  `Pixtopia Keychain bundles these packages. Each stays under its own license.\n\n${body}`,
);
console.log(`THIRD-PARTY-LICENSES.txt: ${sections.length} packages${missing.length ? `, no license file in: ${missing.join(', ')}` : ''}`);
const unknown = sections.filter(({ declared }) => !declared).map(({ name }) => name);
if (unknown.length) console.log(`Declare no license: ${unknown.join(', ')}`);
