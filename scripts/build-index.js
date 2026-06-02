#!/usr/bin/env node
/**
 * build-index.js — หัวใจของ PA Work Portal (KIMPACodriver)
 * -----------------------------------------------------------
 * 1) สแกนโฟลเดอร์ content/ หาไฟล์ .html ทุกไฟล์
 * 2) อ่าน meta tag (portal:*) จากหัวไฟล์แต่ละหน้า
 * 3) จัดกลุ่ม + เรียงลำดับ (Morning Brief บนสุด, โปรเจค, รายงาน, อื่น ๆ)
 * 4) สร้าง public/index.html (เมนู + badge "ใหม่" + วันที่)
 * 5) คัดลอกไฟล์เนื้อหาไป public/content/ เพื่อ deploy เป็น static site
 *
 * ไม่มี dependency ภายนอก — ใช้ Node built-in ล้วน (รันได้ทุกที่)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const PUBLIC_DIR = path.join(ROOT, 'public');
const NEW_DAYS = 2; // ไฟล์ใหม่กว่าหรือเท่ากับ N วัน = ติด badge "ใหม่"

// ---------- utilities ----------
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) out.push(full);
  }
  return out;
}

function parseMeta(html) {
  const meta = {};
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const n = tag.match(/\bname\s*=\s*["']([^"']+)["']/i);
    const c = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    if (n && c && n[1].toLowerCase().startsWith('portal:')) {
      meta[n[1].slice('portal:'.length).toLowerCase()] = c[1].trim();
    }
  }
  return meta;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function prettify(name) {
  return name.replace(/\.html$/i, '')
    .replace(/^\d{4}-\d{2}-\d{2}[-_]?/, '')
    .replace(/[-_]+/g, ' ').trim()
    .replace(/\b\w/g, (m) => m.toUpperCase()) || name;
}

function toDate(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
function fmtThaiDate(d) {
  if (!d) return '';
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

const today = new Date();
today.setHours(0, 0, 0, 0);
function daysAgo(d) { return d ? Math.floor((today - d) / 86400000) : Infinity; }
function isNew(d) { return daysAgo(d) <= NEW_DAYS; } // วันนี้/อนาคต/ภายใน N วัน = ใหม่

// ---------- collect items ----------
const files = walk(CONTENT_DIR);
const items = files.map((full) => {
  const rel = path.relative(CONTENT_DIR, full);
  const parts = rel.split(path.sep);
  const top = parts[0];
  const html = fs.readFileSync(full, 'utf8');
  const meta = parseMeta(html);
  const stat = fs.statSync(full);
  const date = toDate(meta.date) || toDate(path.basename(full)) || new Date(stat.mtime);
  date.setHours(0, 0, 0, 0);

  let category = (meta.category || '').toLowerCase();
  if (!category) {
    if (top === 'morning-brief') category = 'morning-brief';
    else if (top === 'projects') category = 'projects';
    else if (top === 'reports') category = 'reports';
    else category = 'other';
  }

  let project = meta.project || '';
  if (!project && category === 'projects' && parts.length >= 3) project = prettify(parts[1]);

  const pin = String(meta.pin).toLowerCase() === 'true' || category === 'morning-brief';

  return {
    title: meta.title || prettify(path.basename(full)),
    summary: meta.summary || '',
    category, project, pin, date,
    href: 'content/' + parts.join('/'),
  };
});

const byDateDesc = (a, b) => b.date - a.date;

const briefs = items.filter((i) => i.category === 'morning-brief').sort(byDateDesc);
const projectItems = items.filter((i) => i.category === 'projects');
const reports = items.filter((i) => i.category === 'reports').sort(byDateDesc);
const others = items.filter((i) => !['morning-brief', 'projects', 'reports'].includes(i.category)).sort(byDateDesc);

// group projects by name, newest group first
const projMap = new Map();
for (const it of projectItems) {
  const key = it.project || 'อื่น ๆ';
  if (!projMap.has(key)) projMap.set(key, []);
  projMap.get(key).push(it);
}
const projGroups = [...projMap.entries()]
  .map(([name, list]) => ({ name, list: list.sort(byDateDesc), latest: list[0].date }))
  .sort((a, b) => b.latest - a.latest);

// ---------- render ----------
function badgeNew(d) { return isNew(d) ? ' <span class="badge-new">ใหม่</span>' : ''; }

function card(it) {
  return `
        <a class="card" href="${esc(it.href)}">
          <div class="card-main">
            <h3>${esc(it.title)}${badgeNew(it.date)}</h3>
            ${it.summary ? `<p>${esc(it.summary)}</p>` : ''}
          </div>
          <div class="card-date">${esc(fmtThaiDate(it.date))}</div>
        </a>`;
}

const hero = briefs[0];
const olderBriefs = briefs.slice(1);
const sections = [];

if (briefs.length) {
  sections.push(`
      <section class="sec">
        <div class="sec-head"><span class="dot dot-brief"></span><h2>☀️ Morning Brief</h2></div>
        ${hero ? `
        <a class="hero" href="${esc(hero.href)}">
          <div class="hero-tag">อ่านวันนี้${badgeNew(hero.date)}</div>
          <h3>${esc(hero.title)}</h3>
          ${hero.summary ? `<p>${esc(hero.summary)}</p>` : ''}
          <div class="hero-foot"><span>${esc(fmtThaiDate(hero.date))}</span><span class="hero-cta">เปิดอ่าน →</span></div>
        </a>` : ''}
        ${olderBriefs.length ? `<div class="muted-label">ฉบับก่อนหน้า</div><div class="cards">${olderBriefs.map(card).join('')}</div>` : ''}
      </section>`);
}

if (projGroups.length) {
  sections.push(`
      <section class="sec">
        <div class="sec-head"><span class="dot dot-proj"></span><h2>📁 งานโปรเจค</h2></div>
        ${projGroups.map((g) => `
        <div class="proj-group">
          <h4 class="proj-name">${esc(g.name)}</h4>
          <div class="cards">${g.list.map(card).join('')}</div>
        </div>`).join('')}
      </section>`);
}

if (reports.length) {
  sections.push(`
      <section class="sec">
        <div class="sec-head"><span class="dot dot-rep"></span><h2>📊 รายงาน</h2></div>
        <div class="cards">${reports.map(card).join('')}</div>
      </section>`);
}

if (others.length) {
  sections.push(`
      <section class="sec">
        <div class="sec-head"><span class="dot"></span><h2>📄 อื่น ๆ</h2></div>
        <div class="cards">${others.map(card).join('')}</div>
      </section>`);
}

const empty = items.length === 0
  ? `<div class="empty">ยังไม่มีงานในระบบ — วางไฟล์ HTML ในโฟลเดอร์ <code>content/</code> แล้วรัน <code>npm run build</code> อีกครั้ง</div>`
  : '';

const page = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>ศูนย์รวมงาน PA</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Sarabun', system-ui, -apple-system, 'Segoe UI', sans-serif; background: #f5f6f8; color: #1f2430; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    .wrap { max-width: 920px; margin: 0 auto; padding: 0 20px; }
    .top { background: linear-gradient(135deg, #4f46e5, #6d28d9); color: #fff; padding: 36px 0 30px; }
    .top h1 { font-size: 1.7rem; font-weight: 700; }
    .top .sub { opacity: .85; font-size: .95rem; margin-top: 4px; }
    main { padding: 26px 0 40px; }
    .sec { margin-bottom: 30px; }
    .sec-head { display: flex; align-items: center; gap: 10px; margin: 6px 0 14px; }
    .sec-head h2 { font-size: 1.15rem; font-weight: 700; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #9aa0ad; flex: none; }
    .dot-brief { background: #f59e0b; } .dot-proj { background: #4f46e5; } .dot-rep { background: #10b981; }
    .hero { display: block; text-decoration: none; color: #fff; background: linear-gradient(135deg, #f59e0b, #ea580c); border-radius: 16px; padding: 22px 24px; box-shadow: 0 8px 24px rgba(234,88,12,.25); margin-bottom: 14px; transition: transform .15s, box-shadow .15s; }
    .hero:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(234,88,12,.32); }
    .hero-tag { font-size: .8rem; font-weight: 600; letter-spacing: .02em; opacity: .95; }
    .hero h3 { font-size: 1.35rem; font-weight: 700; margin: 8px 0 6px; }
    .hero p { opacity: .96; }
    .hero-foot { display: flex; justify-content: space-between; align-items: center; font-size: .85rem; opacity: .95; margin-top: 12px; }
    .hero-cta { font-weight: 600; }
    .muted-label { font-size: .8rem; color: #8a909c; margin: 4px 2px 8px; }
    .cards { display: grid; gap: 10px; }
    .card { display: flex; justify-content: space-between; align-items: center; gap: 14px; background: #fff; border: 1px solid #eceef2; border-radius: 12px; padding: 14px 16px; text-decoration: none; color: inherit; transition: border-color .15s, transform .15s, box-shadow .15s; }
    .card:hover { border-color: #cdd2ff; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79,70,229,.08); }
    .card h3 { font-size: 1.02rem; font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .card p { color: #5b6270; font-size: .9rem; margin-top: 2px; }
    .card-date { color: #8a909c; font-size: .82rem; white-space: nowrap; flex: none; }
    .proj-group { margin-bottom: 16px; }
    .proj-name { font-size: .95rem; font-weight: 600; color: #4f46e5; margin: 0 0 8px 2px; }
    .badge-new { background: #ef4444; color: #fff; font-size: .66rem; font-weight: 700; padding: 2px 7px; border-radius: 999px; letter-spacing: .03em; vertical-align: middle; }
    .empty { background: #fff; border: 1px dashed #cdd2dc; border-radius: 12px; padding: 30px; text-align: center; color: #7a8090; }
    .empty code { background: #f0f1f4; padding: 1px 6px; border-radius: 5px; }
    .foot { border-top: 1px solid #e8eaef; padding: 18px 0; color: #9aa0ad; font-size: .82rem; }
    @media (max-width: 560px) {
      .card { flex-direction: column; align-items: flex-start; gap: 4px; }
      .top h1 { font-size: 1.4rem; }
    }
  </style>
</head>
<body>
  <header class="top">
    <div class="wrap">
      <h1>☕ ศูนย์รวมงาน PA</h1>
      <p class="sub">อัปเดตล่าสุด ${fmtThaiDate(today)} · รวม ${items.length} งาน</p>
    </div>
  </header>
  <main class="wrap">
    ${empty}
    ${sections.join('\n')}
  </main>
  <footer class="foot">
    <div class="wrap">PA Work Portal · KIMPACodriver · สร้างอัตโนมัติจากโฟลเดอร์ <code>content/</code></div>
  </footer>
</body>
</html>
`;

// ---------- write output ----------
fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (fs.existsSync(CONTENT_DIR)) {
  fs.cpSync(CONTENT_DIR, path.join(PUBLIC_DIR, 'content'), { recursive: true });
}
fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), page);

console.log(`✓ build เสร็จ — ${items.length} หน้า | ${briefs.length} brief · ${projectItems.length} โปรเจค · ${reports.length} รายงาน · ${others.length} อื่น ๆ`);
console.log(`  เขียนไปที่ ${path.relative(ROOT, PUBLIC_DIR)}/index.html`);
