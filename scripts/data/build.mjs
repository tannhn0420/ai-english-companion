// ============================================
// Pipeline bundle dữ liệu mở (DATA.md §3) — chạy THỦ CÔNG: node scripts/data/build.mjs
// Tải + lọc → public/data/v1/{ngsl,ipa-core,sentences-core,manifest}.json
// Deterministic với cùng input nguồn; manifest ghi nguồn + thời điểm build.
// Budget tổng ≤ 1,5 MB gzip — vượt là phải cắt (PHASES nguyên tắc 4).
// ============================================

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'data', 'v1');
mkdirSync(OUT, { recursive: true });

const SOURCES = {
  ngsl: {
    name: 'NGSL 1.01 (bands, qua machine_readable_wordlists)',
    url: 'https://raw.githubusercontent.com/lpmi-13/machine_readable_wordlists/master/General/NGSL/NGSL.json',
    license: 'NGSL: CC BY-SA 4.0 (Browne, Culligan & Phillips); repo: CC0',
  },
  ipa: {
    name: 'CMUdict-IPA',
    url: 'https://raw.githubusercontent.com/menelik3/cmudict-ipa/master/cmudict-0.7b-ipa.txt',
    license: 'BSD (CMUdict)',
  },
  sentences: {
    name: 'Tatoeba EN-VI pairs (qua ManyThings.org)',
    url: 'https://www.manythings.org/anki/vie-eng.zip',
    license: 'CC-BY 2.0 FR (Tatoeba) — giữ id câu để attribution',
  },
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

function writeJson(name, data) {
  const json = JSON.stringify(data);
  writeFileSync(join(OUT, name), json);
  const kb = (n) => `${Math.round(n / 102.4) / 10} KB`;
  console.log(`${name}: ${kb(json.length)} raw, ${kb(gzipSync(json).length)} gz`);
  return json.length;
}

// ---- 1) NGSL: bands 1000/2000/3000 + biến thể → {words, variants} ----

console.log('Downloading NGSL…');
const ngslSrc = JSON.parse(await fetchText(SOURCES.ngsl.url));
const words = {};
const variants = {};
for (const [bandKey, entries] of Object.entries(ngslSrc)) {
  const band = Math.ceil(Number(bandKey) / 1000); // 1000→1, 2000→2, 3000→3
  for (const [head, forms] of Object.entries(entries)) {
    const h = head.toLowerCase();
    words[h] = band;
    for (const f of forms) {
      const v = String(f).toLowerCase();
      if (!words[v] && !variants[v]) variants[v] = h;
    }
  }
}
writeJson('ngsl.json', { words, variants });

// ---- 2) IPA: cmudict-ipa lọc theo NGSL (headword + biến thể) ----

console.log('Downloading CMUdict-IPA…');
const ipaTxt = await fetchText(SOURCES.ipa.url);
const wanted = new Set([...Object.keys(words), ...Object.keys(variants)]);
const ipa = {};
for (const line of ipaTxt.split('\n')) {
  const tab = line.indexOf('\t');
  if (tab < 1) continue;
  const w = line.slice(0, tab).trim().toLowerCase();
  if (w.includes('(')) continue; // biến thể phát âm phụ "word(2)"
  if (!wanted.has(w) || ipa[w]) continue;
  const first = line.slice(tab + 1).split(',')[0].trim().replace(/^\/|\/$/g, '');
  if (first) ipa[w] = first;
}
writeJson('ipa-core.json', ipa);

// ---- 3) Câu Tatoeba EN-VI: lọc theo spec DATA.md §3 ----

console.log('Downloading Tatoeba EN-VI (ManyThings)…');
const zipRes = await fetch(SOURCES.sentences.url, { headers: { 'User-Agent': UA } });
if (!zipRes.ok) throw new Error(`vie-eng.zip → HTTP ${zipRes.status}`);
const zipPath = join(tmpdir(), 'aec-vie-eng.zip');
writeFileSync(zipPath, Buffer.from(await zipRes.arrayBuffer()));
// bsdtar (tar.exe của Windows 10+) đọc được zip; -xOf ghi ra stdout.
// Đường dẫn tuyệt đối để không dính GNU tar của Git Bash (hiểu nhầm "C:" là remote host).
const tarBin =
  process.platform === 'win32' ? join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
const tar = spawnSync(tarBin, ['-xOf', zipPath, 'vie.txt'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (tar.status !== 0) throw new Error(`tar failed: ${tar.stderr}`);

const isKnown = (tok) => words[tok] || variants[tok];
const MAX_PER_WORD = 5;
const MAX_TOTAL = 8000;
const perWord = {};
const seenEn = new Set();
const sentences = [];

for (const line of tar.stdout.split('\n')) {
  const parts = line.split('\t');
  if (parts.length < 3) continue;
  const [en, vi, attr] = parts;
  const enNorm = en.trim();
  const viNorm = vi.trim();
  if (!enNorm || !viNorm || seenEn.has(enNorm.toLowerCase())) continue;

  const tokens = enNorm.toLowerCase().replace(/[^a-z' -]/g, '').split(/[\s-]+/).filter(Boolean);
  if (tokens.length < 4 || tokens.length > 12) continue;

  // Mọi content word thuộc NGSL; cho phép tối đa 1 từ lạ viết hoa (tên riêng)
  let unknown = 0;
  let ok = true;
  for (const tok of tokens) {
    const clean = tok.replace(/'/g, "'").replace(/^'+|'+$/g, '');
    if (!clean || isKnown(clean)) continue;
    unknown++;
    if (unknown > 1) {
      ok = false;
      break;
    }
  }
  if (!ok) continue;

  // Cap theo headword để phủ đều 2801 từ thay vì dồn vào câu dễ
  const heads = [...new Set(tokens.map((t) => variants[t] || (words[t] ? t : null)).filter(Boolean))];
  if (!heads.some((h) => (perWord[h] || 0) < MAX_PER_WORD)) continue;
  for (const h of heads) perWord[h] = (perWord[h] || 0) + 1;

  // Attribution: "…tatoeba.org #123 (user) & #456 (user)" — id đầu là câu EN
  const idMatch = /#(\d+)/.exec(attr || '');
  seenEn.add(enNorm.toLowerCase());
  sentences.push({ id: idMatch ? Number(idMatch[1]) : 0, en: enNorm, vi: viNorm });
  if (sentences.length >= MAX_TOTAL) break;
}
writeJson('sentences-core.json', sentences);

// ---- 4) Manifest ----

writeJson('manifest.json', {
  schema: 1,
  dir: 'v1',
  built: new Date().toISOString(),
  sources: Object.values(SOURCES),
  counts: {
    ngslWords: Object.keys(words).length,
    ngslVariants: Object.keys(variants).length,
    ipa: Object.keys(ipa).length,
    sentences: sentences.length,
    wordsWithSentence: Object.keys(perWord).length,
  },
});
console.log('Done →', OUT);
