/**
 * Offline Chrome Web Store artwork renderer.
 * Run from any directory: node /path/to/repo/store/assets/render.mjs
 * Reads only repository assets; all outputs and temporary files stay here.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';
import puppeteer from 'puppeteer-core';
import * as sass from 'sass';

const assets = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(assets, '../..');
const source = path.join(assets, 'src');
const markPath = path.join(root, 'public/assets/images/pixtopia-keychain-mark.svg');
const jobs = [
  { name: 'screenshot-1', width: 1280, height: 800, capture: 'home-dark.png', caption: 'Your keys stay on your device' },
  { name: 'screenshot-2', width: 1280, height: 800, capture: 'sign-like.png', caption: "See what you're signing, in plain words" },
  { name: 'screenshot-3', width: 1280, height: 800, capture: 'sign-transfer.png', caption: 'Check every transfer before it goes' },
  { name: 'screenshot-4', width: 1280, height: 800, capture: 'sign-control.png', caption: 'Warned before anything risky' },
  { name: 'screenshot-5', width: 1280, height: 800, capture: 'home-light.png', caption: 'Send, stake and vote on Pixa' },
  { name: 'promo-small', width: 440, height: 280 },
  { name: 'promo-marquee', width: 1400, height: 560 },
];

// Same cache discovery as scripts/e2e.mjs, with a local installed-Chrome fallback.
function chromePath() {
  const base = path.join(homedir(), '.cache/puppeteer/chrome');
  const versions = existsSync(base)
    ? readdirSync(base).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    : [];
  const candidates = versions.flatMap(version => ['arm64', 'x64'].map(arch => path.join(
    base, version,
    `chrome-mac-${arch}/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  )));
  candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  const executable = candidates.find(candidate => existsSync(candidate));
  assert(executable, 'Install Chrome locally before rendering; this script never downloads it.');
  return executable;
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function pngHeader(bytes) {
  assert(bytes.subarray(0, 8).equals(signature), 'Invalid PNG signature');
  assert.equal(bytes.readUInt32BE(8), 13, 'Invalid IHDR length');
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bitDepth: bytes[24], colorType: bytes[25], interlace: bytes[28] };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePNG(bytes) {
  const header = pngHeader(bytes);
  assert.equal(header.bitDepth, 8);
  assert.equal(header.interlace, 0);
  assert([2, 6].includes(header.colorType), 'Expected Chrome RGB or RGBA PNG');
  const channels = header.colorType === 2 ? 3 : 4;
  const stride = header.width * channels;
  const parts = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') parts.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const packed = inflateSync(Buffer.concat(parts));
  assert.equal(packed.length, (stride + 1) * header.height);
  const pixels = Buffer.alloc(stride * header.height);
  for (let y = 0; y < header.height; y++) {
    const filter = packed[y * (stride + 1)];
    assert(filter <= 4, 'Unsupported PNG filter');
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x;
      const a = x >= channels ? pixels[i - channels] : 0;
      const b = y ? pixels[i - stride] : 0;
      const c = y && x >= channels ? pixels[i - stride - channels] : 0;
      const prediction = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
      pixels[i] = (packed[y * (stride + 1) + x + 1] + prediction) & 255;
    }
  }
  return { ...header, channels, pixels };
}

// Chromium normally emits type 2. If it emits type 6, flatten onto the exact
// canvas token and write an RGB PNG using Node's built-in zlib, never a CLI.
function ensureRGB(bytes, background) {
  if (pngHeader(bytes).colorType === 2) return bytes;
  const { width, height, channels, pixels } = decodePNG(bytes);
  const scanlines = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * channels;
      const to = y * (width * 3 + 1) + 1 + x * 3;
      const alpha = pixels[from + 3] / 255;
      for (let c = 0; c < 3; c++) scanlines[to + c] = Math.round(pixels[from + c] * alpha + background[c] * (1 - alpha));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('sRGB', Buffer.from([0])), chunk('IDAT', deflateSync(scanlines, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// Compile the authoritative theme directly; no copied palette can drift.
const theme = sass.compile(path.join(root, 'src/common-style/theme.scss'), { style: 'expanded', sourceMap: false }).css;
await writeFile(path.join(source, 'theme.css'), `/* Generated from src/common-style/theme.scss by render.mjs. */\n${theme}\n`);
const mark = await readFile(markPath, 'utf8');
const captureHashes = new Map();
for (const job of jobs.filter(job => job.capture)) {
  const bytes = await readFile(path.join(source, 'captures', job.capture));
  const header = pngHeader(bytes);
  assert.equal(header.width, 870); assert.equal(header.height, 1200);
  captureHashes.set(job.capture, createHash('sha256').update(bytes).digest('hex'));
}

const temporary = await mkdtemp(path.join(assets, '.render-'));
const report = [];
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    pipe: true,
    userDataDir: path.join(temporary, 'profile'),
    env: { ...process.env, TMPDIR: temporary },
    args: [
      '--disable-background-networking', '--disable-component-update',
      '--disable-sync', '--disable-domain-reliability', '--disable-breakpad',
      '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
      '--host-resolver-rules=MAP * ~NOTFOUND', '--force-color-profile=srgb',
      '--disable-features=MediaRouter,OptimizationHints,AutofillServerCommunication,CertificateTransparencyComponentUpdater,Translate',
    ],
  });
  for (const job of jobs) {
    const page = await browser.newPage();
    const problems = [];
    const requests = [];
    page.on('pageerror', error => problems.push(error.message));
    page.on('requestfailed', request => problems.push(`${request.url()}: ${request.failure()?.errorText}`));
    await page.setOfflineMode(true);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.protocol === 'file:' && fileURLToPath(url).startsWith(root + path.sep)) {
        requests.push(path.relative(root, fileURLToPath(url)));
        void request.continue();
      } else if (url.protocol === 'data:') {
        void request.continue();
      } else {
        problems.push(`Blocked nonlocal request: ${request.url()}`);
        void request.abort('blockedbyclient');
      }
    });
    await page.setViewport({ width: job.width, height: job.height, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(source, `${job.name}.html`)).href, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode()));
    });
    const layout = await page.evaluate(({ job, mark }) => {
      const style = getComputedStyle(document.body);
      const bounds = element => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      };
      const svg = document.querySelector('.brand-mark svg');
      const expectedMark = new DOMParser().parseFromString(mark, 'image/svg+xml').documentElement;
      const actualMark = new DOMParser().parseFromString(svg.outerHTML, 'image/svg+xml').documentElement;
      const common = {
        frame: bounds(document.querySelector('main')),
        text: document.body.innerText.trim().replace(/\s+/g, ' '),
        background: style.backgroundColor.match(/\d+/g).slice(0, 3).map(Number),
        markMatches: actualMark.isEqualNode(expectedMark),
        overflow: document.documentElement.scrollWidth > job.width || document.documentElement.scrollHeight > job.height,
      };
      if (job.capture) {
        const heading = document.querySelector('h1');
        const captionStyle = getComputedStyle(heading);
        const image = document.querySelector('.capture img');
        const captureStyle = getComputedStyle(image);
        const frameStyle = getComputedStyle(document.querySelector('.capture'));
        return { ...common, font: captionStyle.fontFamily, fontSize: parseFloat(captionStyle.fontSize), fontWeight: captionStyle.fontWeight,
          fontLoaded: document.fonts.check('600 64px Geist'), lines: [...heading.children].map(bounds),
          image: { ...bounds(image), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, file: image.src.split('/').at(-1), objectFit: captureStyle.objectFit, filter: captureStyle.filter, opacity: captureStyle.opacity },
          borderWidth: frameStyle.borderTopWidth, radius: frameStyle.borderTopLeftRadius,
        };
      }
      const props = ['--canvas', '--surface', '--raised', '--hover', '--border', '--borderStrong', '--ink', '--prism-pink', '--prism-amber', '--prism-mint', '--prism-sky'];
      return { ...common, palette: props.map(property => style.getPropertyValue(property).trim().toLowerCase()) };
    }, { job, mark });
    assert.deepEqual(layout.frame, { x: 0, y: 0, width: job.width, height: job.height });
    assert(layout.markMatches, `${job.name}: mark differs from the supplied SVG`);
    assert(!layout.overflow, `${job.name}: canvas overflow`);
    assert.equal(layout.text, job.caption ?? '', `${job.name}: unexpected visible text`);
    if (job.capture) {
      assert(layout.fontLoaded && layout.font.includes('Geist'));
      assert.equal(layout.fontWeight, '600'); assert(layout.fontSize >= 56);
      assert(layout.lines.length <= 3);
      assert(layout.lines.every(line => line.x === 72 && line.x + line.width < 696));
      assert.equal(layout.image.file, job.capture);
      assert.equal(layout.image.height, 700);
      assert.equal(layout.image.width / layout.image.height, 870 / 1200);
      assert.equal(layout.image.objectFit, 'contain'); assert.equal(layout.image.filter, 'none'); assert.equal(layout.image.opacity, '1');
      assert.equal(layout.borderWidth, '1px'); assert(parseFloat(layout.radius) > 0);
    }
    const rendered = Buffer.from(await page.screenshot({ type: 'png', omitBackground: false }));
    const rgb = ensureRGB(rendered, layout.background);
    const destination = path.join(assets, `${job.name}.png`);
    await writeFile(destination, rgb);
    // Read the saved file's IHDR; opaque pixels alone do not prove no alpha channel.
    const saved = await readFile(destination);
    const header = pngHeader(saved);
    assert.equal(header.width, job.width); assert.equal(header.height, job.height);
    assert.equal(header.bitDepth, 8); assert.equal(header.colorType, 2);
    if (!job.capture) {
      const { pixels } = decodePNG(saved);
      const palette = new Set(layout.palette);
      const used = new Set();
      for (let i = 0; i < pixels.length; i += 3) used.add('#' + pixels.subarray(i, i + 3).toString('hex'));
      assert([...used].every(color => palette.has(color)), `${job.name}: off-palette or softened pixel edge`);
      for (const prism of ['#ff4f8b', '#ffb547', '#3ee0a1', '#4ca8ff']) assert(used.has(prism));
    }
    assert.deepEqual(problems, [], `${job.name}: render errors`);
    report.push({ file: `${job.name}.png`, ...header, alpha: false, markMatches: layout.markMatches,
      ...(job.capture ? { capture: job.capture, captureHeight: layout.image.height, captionSize: layout.fontSize, captionLines: layout.lines.length } : { exactPaletteOnly: true }),
      requests,
    });
    console.log(`${job.name}.png: ${header.width}×${header.height}, ${header.bitDepth}-bit RGB, IHDR color type ${header.colorType}, no alpha — PASS`);
    await page.close();
  }
  for (const [capture, originalHash] of captureHashes) {
    const bytes = await readFile(path.join(source, 'captures', capture));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), originalHash, `${capture} was changed`);
  }
} finally {
  if (browser) await browser.close();
  await rm(temporary, { recursive: true, force: true });
}
