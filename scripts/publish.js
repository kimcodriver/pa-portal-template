#!/usr/bin/env node
/**
 * publish.js — เผยแพร่ไฟล์ขึ้น PA Work Portal โดยไม่ต้องแก้โค้ด
 * -----------------------------------------------------------
 * รับไฟล์ HTML (เต็มหน้า หรือชิ้นส่วน) -> ใส่ meta tag ให้อัตโนมัติ
 * -> วางในโฟลเดอร์หมวดที่ถูกต้อง (ชื่อไฟล์ขึ้นต้นด้วยวันที่) -> build -> (ถ้า --push) push
 *
 * ตัวอย่าง:
 *   node scripts/publish.js --file ~/Downloads/brief.html --category morning-brief --push
 *   node scripts/publish.js --file out.html --category projects --project "JR ERP" \
 *        --title "อัปเดตสเปค" --summary "เพิ่มหน้าจอช่างผลิต" --slug spec-update --push
 *
 * อาร์กิวเมนต์:
 *   --file <path>      (จำเป็น) ไฟล์ต้นทาง
 *   --category <c>     (จำเป็น) morning-brief | projects | reports
 *   --project "<ชื่อ>"  (จำเป็นเมื่อ category=projects) เช่น "JR ERP"
 *   --title "<ชื่อ>"    ถ้าไม่ใส่ จะดึงจาก <title>/<h1> หรือชื่อไฟล์
 *   --summary "<โปรย>"  คำโปรย 1 บรรทัดในเมนู
 *   --slug <eng-slug>  ชื่อไฟล์ (อังกฤษ) ถ้าไม่ใส่จะสร้างจาก title
 *   --date YYYY-MM-DD  ค่าเริ่มต้น = วันนี้
 *   --pin              ปักหมุดบนสุด (morning-brief ปักให้อัตโนมัติ)
 *   --push             commit + push ขึ้น GitHub (Vercel deploy เอง)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const TEMPLATE = path.join(ROOT, 'templates', 'base.html');

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }
function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function slugify(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 40);
}

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith('--')) continue;
    const key = t.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[key] = true;
    else { a[key] = next; i++; }
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));

// ---------- validate ----------
const src = args.file;
if (!src) fail('ต้องระบุ --file <path ของไฟล์ที่จะเผยแพร่>');
if (!fs.existsSync(src)) fail('ไม่พบไฟล์: ' + src);

const VALID = ['morning-brief', 'projects', 'reports'];
const category = String(args.category || '').toLowerCase();
if (!VALID.includes(category)) fail('--category ต้องเป็น morning-brief | projects | reports');

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const isoToday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const date = (typeof args.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date)) ? args.date : isoToday;
const pin = category === 'morning-brief' ? true : (args.pin === true || String(args.pin).toLowerCase() === 'true');
const project = typeof args.project === 'string' ? args.project : '';
const summary = typeof args.summary === 'string' ? args.summary : '';

let raw = fs.readFileSync(src, 'utf8');

// ---------- derive title ----------
let title = typeof args.title === 'string' ? args.title : '';
if (!title) {
  const m = raw.match(/<title>([^<]*)<\/title>/i) || raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  title = m ? m[1].replace(/<[^>]+>/g, '').trim() : path.basename(src).replace(/\.[^.]+$/, '');
}

let slug = args.slug ? slugify(args.slug) : slugify(title);
if (!slug) slug = 'page';

const metaBlock =
`  <meta name="portal:title"    content="${escAttr(title)}">
  <meta name="portal:category" content="${category}">
  <meta name="portal:date"     content="${date}">
  <meta name="portal:pin"      content="${pin}">
  <meta name="portal:summary"  content="${escAttr(summary)}">
  <meta name="portal:project"  content="${escAttr(project)}">`;

// ---------- build output html ----------
let outHtml;
if (/<\/head>/i.test(raw)) {
  // ไฟล์ HTML เต็มหน้า: ลบ portal meta เก่า แล้วแทรกใหม่ก่อน </head>
  raw = raw.replace(/[ \t]*<meta\s+name=["']portal:[^>]*>\s*\n?/gi, '');
  outHtml = raw.replace(/<\/head>/i, metaBlock + '\n</head>');
  if (/<title>[\s\S]*?<\/title>/i.test(outHtml)) {
    outHtml = outHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escAttr(title)}</title>`);
  }
} else {
  // ชิ้นส่วน/ข้อความล้วน: ห่อด้วย templates/base.html
  if (!fs.existsSync(TEMPLATE)) fail('ไม่พบเทมเพลต: templates/base.html');
  const tpl = fs.readFileSync(TEMPLATE, 'utf8');
  outHtml = tpl
    .replace(/[ \t]*<!--\s*▼▼▼[\s\S]*?▼▼▼\s*-->\s*\n?/g, '')
    .replace(/[ \t]*<!--\s*▲▲▲[\s\S]*?▲▲▲\s*-->\s*\n?/g, '')
    .replace(/[ \t]*<meta\s+name=["']portal:[^>]*>\s*\n?/gi, '')
    .replace(/<\/head>/i, metaBlock + '\n</head>')
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escAttr(title)}</title>`)
    .replace(/<h1>[\s\S]*?<\/h1>/i, `<h1>${escAttr(title)}</h1>`)
    .replace(/<div class="doc-meta">[\s\S]*?<\/div>/i, `<div class="doc-meta">${escAttr(date)} · จัดทำโดย PA</div>`)
    .replace(/<!-- ▼ เริ่มเขียนเนื้อหาตรงนี้ ▼ -->[\s\S]*?<!-- ▲ จบเนื้อหา ▲ -->/i, raw);
}

// ---------- destination ----------
let destDir, destName;
if (category === 'morning-brief') {
  destDir = path.join(CONTENT, 'morning-brief');
  destName = args.slug ? `${date}-${slug}.html` : `${date}.html`;
} else if (category === 'projects') {
  if (!project) fail('หมวด projects ต้องระบุ --project "ชื่อโปรเจค" (เช่น "JR ERP")');
  const projSlug = slugify(args['project-slug'] || project) || 'project';
  destDir = path.join(CONTENT, 'projects', projSlug);
  destName = `${date}-${slug}.html`;
} else {
  destDir = path.join(CONTENT, 'reports');
  destName = `${date}-${slug}.html`;
}

fs.mkdirSync(destDir, { recursive: true });
const destPath = path.join(destDir, destName);
fs.writeFileSync(destPath, outHtml);
const relDest = path.relative(ROOT, destPath);
console.log(`✓ สร้างหน้า: ${relDest}`);
console.log(`  หมวด: ${category}${project ? ' · โปรเจค: ' + project : ''} · วันที่: ${date} · pin: ${pin}`);

// ---------- build (verify) ----------
try {
  execSync('node scripts/build-index.js', { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  fail('build ล้มเหลว — ตรวจไฟล์ที่สร้าง');
}

// ---------- push (optional) ----------
if (args.push) {
  try {
    execSync(`git add ${JSON.stringify(relDest)}`, { cwd: ROOT, stdio: 'inherit' });
    execSync(`git commit -q -m ${JSON.stringify('เพิ่ม: ' + title)}`, { cwd: ROOT, stdio: 'inherit' });
    execSync('git push -q', { cwd: ROOT, stdio: 'inherit' });
    console.log('✓ push ขึ้น GitHub แล้ว — Vercel กำลัง deploy (รอ ~30 วินาที)');
  } catch (e) {
    fail('git push ล้มเหลว: ' + (e.message || e));
  }
} else {
  console.log('ℹ️  ยังไม่ push — ตรวจ public/index.html ก่อน แล้วรันซ้ำพร้อม --push');
}
