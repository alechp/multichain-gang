#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetDir = resolve(repoRoot, 'assets/chain-tools');
const manifestPath = resolve(assetDir, 'manifest.json');
const failures = [];

const expectedAssets = {
  solana: {
    chain: 'Solana',
    spec: 'docs/v4/03-SOLANA-TOOLS.md',
    sourceSha256: 'e41fee36905397c3f07b47c2ad05d6434be2e3a6aeadf0781240e8b26ac32395',
    promptFragments: ['parallel execution lanes', 'routing basins'],
    captionFragments: ['parallel execution lanes', 'not a protocol map']
  },
  ethereum: {
    chain: 'Ethereum',
    spec: 'docs/v4/04-ETHEREUM-TOOLS.md',
    sourceSha256: '2b24d2a72f6c569b55f8df0f26db6c99bd857bddbb898c9de3805460caeec31e',
    promptFragments: ['settlement planes', 'composable lattice'],
    captionFragments: ['settlement', 'not live dependency data']
  },
  'bnb-chain': {
    chain: 'BNB Chain',
    spec: 'docs/v4/05-BNB-CHAIN-TOOLS.md',
    sourceSha256: '038ac58d617cd9082e3a24b7ebf364fac256c9d570f2fc6547085299cf82fa7a',
    promptFragments: ['validator', 'liquidity ring', 'issuance grid'],
    captionFragments: ['validator and liquidity ring', 'exact validator count']
  },
  bitcoin: {
    chain: 'Bitcoin',
    spec: 'docs/v4/06-BITCOIN-TOOLS.md',
    sourceSha256: 'f96d3b436e9cf761800813a0764c1a118e3a5f6ffe7d9bc0690910ae3d5869a7',
    promptFragments: ['settlement blocks', 'Lightning mesh', 'inscription branch'],
    captionFragments: ['base settlement', 'Lightning', 'inscription', 'node or channel counts']
  },
  zcash: {
    chain: 'Zcash',
    spec: 'docs/v4/07-ZCASH-TOOLS.md',
    sourceSha256: 'be1cc65424ae592a43b862e0af10dc92c35126b8cbf284b3f808301c91243ea8',
    promptFragments: ['shielded geometric interior', 'minimal outputs'],
    captionFragments: ['privacy topology', 'observable onchain']
  },
  'robinhood-chain': {
    chain: 'Robinhood Chain',
    spec: 'docs/v4/08-ROBINHOOD-CHAIN-TOOLS.md',
    sourceSha256: '2a4acc0635e435353b069f14ccb01a27b30d42393caf3eb1a301e6488f65cc24',
    promptFragments: ['sequencer spine', 'finality rails', 'open sockets'],
    captionFragments: ['open sockets', 'emerging ecosystem', 'exact dependencies']
  }
};

const expectedWidths = [960, 1440];
const expectedSourceDimensions = { width: 1672, height: 941 };
const expectedMaxBytes = 220 * 1024;
const expectedEncoderArguments = ['-q', '82', '-m', '6', '-sharp_yuv', '-metadata', 'none', '-resize', '{width}', '0'];
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const check = (condition, message) => { if (!condition) failures.push(message); };

function parsePng(buffer, label) {
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature || buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    failures.push(`${label}: invalid PNG signature/IHDR`);
    return null;
  }
  return { format: 'png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), chunks: ['IHDR'] };
}

function parseWebp(buffer, label) {
  if (buffer.length < 30 || buffer.subarray(0, 4).toString('ascii') !== 'RIFF' || buffer.subarray(8, 12).toString('ascii') !== 'WEBP') {
    failures.push(`${label}: invalid RIFF/WEBP signature`);
    return null;
  }
  check(buffer.readUInt32LE(4) + 8 === buffer.length, `${label}: RIFF length does not match file bytes`);
  const chunks = [];
  let dimensions = null;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.subarray(offset, offset + 4).toString('ascii');
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    if (end > buffer.length) {
      failures.push(`${label}: ${type} chunk overruns the file`);
      return null;
    }
    chunks.push(type);
    if (type === 'VP8X' && size >= 10) {
      dimensions = { width: buffer.readUIntLE(start + 4, 3) + 1, height: buffer.readUIntLE(start + 7, 3) + 1 };
    } else if (type === 'VP8 ' && size >= 10) {
      if (buffer.subarray(start + 3, start + 6).toString('hex') !== '9d012a') failures.push(`${label}: VP8 frame sync code is invalid`);
      dimensions = { width: buffer.readUInt16LE(start + 6) & 0x3fff, height: buffer.readUInt16LE(start + 8) & 0x3fff };
    } else if (type === 'VP8L' && size >= 5) {
      if (buffer[start] !== 0x2f) failures.push(`${label}: VP8L signature is invalid`);
      const bits = buffer.readUInt32LE(start + 1);
      dimensions = { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    offset = end + (size % 2);
  }
  if (!dimensions) {
    failures.push(`${label}: no supported VP8 dimension chunk found`);
    return null;
  }
  for (const metadata of ['EXIF', 'XMP ', 'ICCP']) check(!chunks.includes(metadata), `${label}: prohibited ${metadata.trim()} metadata chunk is present`);
  return { format: 'webp', ...dimensions, chunks };
}

function imageInfo(buffer, label) {
  if (buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return parsePng(buffer, label);
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF') return parseWebp(buffer, label);
  failures.push(`${label}: unsupported image format`);
  return null;
}

function safeAssetPath(path, label) {
  check(typeof path === 'string' && path.length > 0, `${label}: path is missing`);
  if (typeof path !== 'string') return null;
  check(!isAbsolute(path), `${label}: path must be repository-relative`);
  check(!path.includes('\\'), `${label}: path must use forward slashes`);
  check(!/^[a-z][a-z\d+.-]*:/i.test(path) && !path.startsWith('//'), `${label}: remote/protocol asset dependency is prohibited`);
  check(!path.split('/').includes('..'), `${label}: parent traversal is prohibited`);
  check(path.startsWith('assets/chain-tools/'), `${label}: path must stay under assets/chain-tools`);
  const absolute = resolve(repoRoot, path);
  check(absolute === assetDir || absolute.startsWith(`${assetDir}${sep}`), `${label}: path escapes the asset directory`);
  return absolute;
}

function verifyFile(record, expectedFormat, label) {
  if (!record || typeof record !== 'object') {
    failures.push(`${label}: manifest record is missing`);
    return null;
  }
  const absolute = safeAssetPath(record.path, label);
  if (!absolute) return null;
  let buffer;
  try { buffer = readFileSync(absolute); }
  catch (error) {
    failures.push(`${label}: cannot read ${record.path}: ${error.message}`);
    return null;
  }
  const info = imageInfo(buffer, label);
  const actualHash = sha256(buffer);
  check(record.format === expectedFormat, `${label}: manifest format ${record.format} must be ${expectedFormat}`);
  check(info?.format === expectedFormat, `${label}: encoded format ${info?.format || 'unknown'} must be ${expectedFormat}`);
  check(record.width === info?.width, `${label}: manifest width ${record.width} != encoded width ${info?.width}`);
  check(record.height === info?.height, `${label}: manifest height ${record.height} != encoded height ${info?.height}`);
  check(record.bytes === buffer.length, `${label}: manifest bytes ${record.bytes} != file bytes ${buffer.length}`);
  check(/^[a-f\d]{64}$/.test(record.sha256 || ''), `${label}: manifest SHA-256 is malformed`);
  check(record.sha256 === actualHash, `${label}: manifest SHA-256 does not match file`);
  return { ...info, bytes: buffer.length, sha256: actualHash, path: record.path };
}

let manifest;
try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
catch (error) {
  console.error(`CHAIN TOOLS ASSET FAIL (1)\n- manifest unreadable: ${error.message}`);
  process.exit(1);
}

check(manifest.schemaVersion === 1, 'manifest schemaVersion must be 1');
check(manifest.snapshotDate === '2026-08-29', 'manifest snapshotDate must match the v4 research snapshot');
check(manifest.assetRoot === 'assets/chain-tools', 'manifest assetRoot must be local assets/chain-tools');
check(manifest.rendering?.decorative === true, 'manifest must mark topology images decorative');
check(manifest.rendering?.renderedAlt === '', 'decorative topology images must render with an empty alt');
check(manifest.rendering?.captionLabel === 'CONCEPTUAL TOPOLOGY', 'caption label must be CONCEPTUAL TOPOLOGY');
check(JSON.stringify(manifest.derivativePolicy?.widths) === JSON.stringify(expectedWidths), 'derivative widths must be exactly 960 and 1440');
check(manifest.derivativePolicy?.format === 'webp', 'derivative format must be webp');
check(manifest.derivativePolicy?.maxBytes === expectedMaxBytes, `derivative maxBytes must be ${expectedMaxBytes}`);
check(manifest.derivativePolicy?.encoder?.tool === 'cwebp', 'manifest encoder must be cwebp');
check(/^\d+\.\d+\.\d+$/.test(manifest.derivativePolicy?.encoder?.version || ''), 'manifest encoder version must be pinned');
check(JSON.stringify(manifest.derivativePolicy?.encoder?.arguments) === JSON.stringify(expectedEncoderArguments), 'manifest encoder arguments do not match the reproducible recipe');
check(!/(?:https?:)?\/\//i.test(JSON.stringify(manifest)), 'manifest contains a remote asset dependency');

const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
check(assets.length === 6, `manifest has ${assets.length}/6 asset records`);
const slugs = assets.map(asset => asset.slug);
check(new Set(slugs).size === slugs.length, 'manifest asset slugs must be unique');
check(JSON.stringify([...slugs].sort()) === JSON.stringify(Object.keys(expectedAssets).sort()), 'manifest slugs do not match the six canonical chains');

const allHashes = [];
const allPaths = [];
let derivativeCount = 0;
let largestDerivative = { bytes: 0, path: '' };

for (const asset of assets) {
  const expected = expectedAssets[asset.slug];
  if (!expected) continue;
  const label = `${expected.chain} source`;
  check(asset.chain === expected.chain, `${asset.slug}: chain display name must be ${expected.chain}`);

  const specText = readFileSync(resolve(repoRoot, expected.spec), 'utf8');
  const markdownImage = specText.match(/!\[([^\]]+)\]\(([^)]+)\)/);
  const markdownAlt = normalize(markdownImage?.[1]);
  const markdownSource = markdownImage ? relative(repoRoot, resolve(dirname(resolve(repoRoot, expected.spec)), markdownImage[2])).split(sep).join('/') : '';
  check(normalize(asset.alt).replace(/\.$/, '') === markdownAlt.replace(/\.$/, ''), `${asset.slug}: manifest alt must match its chain specification`);
  check(asset.alt.length >= 45 && asset.alt.length <= 150, `${asset.slug}: alt must be concise and descriptive (45–150 characters)`);
  check(asset.alt.startsWith(`Abstract ${expected.chain}`), `${asset.slug}: alt must identify an abstract ${expected.chain} topology`);
  check(!/\b(?:image|picture|graphic) of\b|\bnetwork map\b|\bexact\b|\b\d+\s+(?:nodes?|validators?|channels?)\b/i.test(asset.alt), `${asset.slug}: alt contains low-quality or factual-map phrasing`);

  check(typeof asset.caption === 'string' && asset.caption.length >= 100 && asset.caption.length <= 240, `${asset.slug}: caption must be substantive (100–240 characters)`);
  check(asset.caption.startsWith(`CONCEPTUAL TOPOLOGY ·`), `${asset.slug}: caption must start with CONCEPTUAL TOPOLOGY`);
  check(asset.caption.includes(expected.chain), `${asset.slug}: caption must name ${expected.chain}`);
  check(!/NETWORK MAP/i.test(asset.caption), `${asset.slug}: caption must never say NETWORK MAP`);
  for (const fragment of expected.captionFragments) check(asset.caption.toLowerCase().includes(fragment.toLowerCase()), `${asset.slug}: caption must include “${fragment}”`);

  check(asset.source?.path === markdownSource, `${asset.slug}: source path must match ${expected.spec}`);
  const source = verifyFile(asset.source, 'png', label);
  if (source) {
    check(source.width === expectedSourceDimensions.width && source.height === expectedSourceDimensions.height, `${label}: frozen master dimensions must remain 1672×941`);
    check(source.sha256 === expected.sourceSha256, `${label}: frozen PNG master was modified`);
    allHashes.push(source.sha256);
    allPaths.push(source.path);
  }
  check(asset.source?.provenance?.mode === 'generate', `${label}: provenance mode must remain generate`);
  check(/Chain Tools/i.test(asset.source?.provenance?.purpose || '') && /text-free/i.test(asset.source?.provenance?.purpose || '') && /logo-free/i.test(asset.source?.provenance?.purpose || ''), `${label}: provenance purpose must record Chain Tools and text/logo-free constraints`);
  const promptSummary = asset.source?.provenance?.promptSummary || '';
  check(promptSummary.length >= 55 && promptSummary.length <= 180, `${label}: prompt summary must be 55–180 characters`);
  for (const fragment of expected.promptFragments) check(promptSummary.toLowerCase().includes(fragment.toLowerCase()), `${label}: prompt summary must include “${fragment}”`);

  const derivatives = Array.isArray(asset.derivatives) ? asset.derivatives : [];
  check(derivatives.length === 2, `${asset.slug}: expected exactly two derivatives`);
  const widths = derivatives.map(derivative => derivative.width);
  check(JSON.stringify(widths) === JSON.stringify(expectedWidths), `${asset.slug}: derivative records must be ordered 960 then 1440`);
  for (const derivative of derivatives) {
    const derivativeLabel = `${expected.chain} ${derivative.width}w`;
    const expectedPath = `assets/chain-tools/${asset.slug}-landscape-${derivative.width}.webp`;
    check(derivative.path === expectedPath, `${derivativeLabel}: path must be ${expectedPath}`);
    const actual = verifyFile(derivative, 'webp', derivativeLabel);
    derivativeCount += 1;
    if (!actual || !source) continue;
    const expectedHeight = Math.ceil(source.height * derivative.width / source.width);
    check(actual.width === derivative.width, `${derivativeLabel}: encoded width must be ${derivative.width}`);
    check(actual.height === expectedHeight, `${derivativeLabel}: expected aspect-preserving height ${expectedHeight}, got ${actual.height}`);
    const aspectError = Math.abs(actual.width / actual.height - source.width / source.height) / (source.width / source.height);
    check(aspectError <= 0.002, `${derivativeLabel}: aspect-ratio error ${(aspectError * 100).toFixed(3)}% exceeds 0.2%`);
    check(actual.bytes <= expectedMaxBytes, `${derivativeLabel}: ${actual.bytes} bytes exceeds ${expectedMaxBytes}`);
    check(actual.sha256 !== source.sha256, `${derivativeLabel}: derivative hash unexpectedly equals its source`);
    allHashes.push(actual.sha256);
    allPaths.push(actual.path);
    if (actual.bytes > largestDerivative.bytes) largestDerivative = { bytes: actual.bytes, path: actual.path };
  }
  if (derivatives.length === 2) check(derivatives[1].bytes > derivatives[0].bytes, `${asset.slug}: 1440w derivative should contain more encoded data than 960w`);
}

check(derivativeCount === 12, `verified ${derivativeCount}/12 derivative records`);
check(new Set(allHashes).size === allHashes.length, 'all six masters and twelve derivatives must have unique SHA-256 hashes');
check(new Set(allPaths).size === allPaths.length, 'manifest file paths must be unique');

const expectedFiles = Object.keys(expectedAssets).flatMap(slug => [
  `${slug}-landscape.png`,
  ...expectedWidths.map(width => `${slug}-landscape-${width}.webp`)
]).sort();
const actualFiles = readdirSync(assetDir).filter(name => /\.(?:png|webp)$/i.test(name)).sort();
check(JSON.stringify(actualFiles) === JSON.stringify(expectedFiles), 'asset directory PNG/WebP inventory must contain exactly six masters and twelve derivatives');

if (failures.length) {
  console.error(`CHAIN TOOLS ASSET FAIL (${failures.length})`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`CHAIN TOOLS ASSET PASS — 6 frozen PNG masters + ${derivativeCount} unique WebP derivatives verified; 960/1440 widths, aspect ratios, manifest provenance, decorative alt/captions, local-only paths, hashes, and ${expectedMaxBytes}-byte cap pass (largest ${largestDerivative.bytes}: ${largestDerivative.path}).`);
