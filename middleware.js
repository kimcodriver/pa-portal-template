// middleware.js — ประตูรหัสผ่าน 1 ชุด (หน้า login เฉพาะ "ช่องรหัสผ่าน" ช่องเดียว ไม่มี username)
// ทำงานบน Vercel Edge ได้ทุกแผน รวม Hobby (ฟรี) — ไม่ต้องให้เจ้านายมีบัญชี Vercel
//
// ตั้งรหัสผ่าน: Vercel → Project → Settings → Environment Variables → PORTAL_PASSWORD
// เปิดเว็บแล้วจะเจอหน้าใส่รหัส (ช่องเดียว) → ใส่ถูก = จำไว้ 30 วันด้วย cookie

export const config = {
  matcher: ['/((?!_next|favicon.ico|robots.txt).*)'],
};

const COOKIE = 'portal_auth';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 วัน

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}

function loginPage(hasError) {
  const err = hasError ? '<p class="err">รหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง</p>' : '';
  return `<!DOCTYPE html>
<html lang="th"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>เข้าสู่พอร์ทัล</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#4f46e5,#6d28d9);padding:20px}
.card{background:#fff;border-radius:18px;padding:36px 32px;width:100%;max-width:360px;box-shadow:0 18px 50px rgba(0,0,0,.25);text-align:center}
h1{font-size:1.5rem;font-weight:700;color:#20242e}
.sub{color:#6b7280;font-size:.95rem;margin:6px 0 20px}
input{width:100%;padding:13px 15px;border:1px solid #d8dae0;border-radius:11px;font-size:1rem;font-family:inherit;outline:none;transition:border-color .15s}
input:focus{border-color:#6d28d9}
button{width:100%;margin-top:12px;padding:13px;border:0;border-radius:11px;background:linear-gradient(135deg,#4f46e5,#6d28d9);color:#fff;font-size:1rem;font-weight:600;font-family:inherit;cursor:pointer}
button:hover{opacity:.93}
.err{color:#dc2626;font-size:.9rem;margin-bottom:12px}
</style></head>
<body>
<form class="card" method="POST" action="/__auth">
  <h1>☕ ศูนย์รวมงาน PA</h1>
  <p class="sub">ใส่รหัสผ่านเพื่อเข้าอ่าน</p>
  ${err}
  <input type="password" name="password" placeholder="รหัสผ่าน" autofocus required autocomplete="current-password">
  <button type="submit">เข้าสู่ระบบ</button>
</form>
</body></html>`;
}

export default async function middleware(request) {
  const PASS = process.env.PORTAL_PASSWORD;
  if (!PASS) return; // ยังไม่ตั้งรหัส = เปิดได้ (ช่วงตั้งค่าครั้งแรก) — อย่าลืมตั้งก่อนใช้จริง!

  const url = new URL(request.url);
  const expected = await sha256hex(PASS);
  const htmlHeaders = { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };

  // รับการกรอกรหัสจากหน้า login
  if (request.method === 'POST' && url.pathname === '/__auth') {
    let password = '';
    try {
      password = new URLSearchParams(await request.text()).get('password') || '';
    } catch (_) { /* ignore */ }
    if (password === PASS) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/',
          'Cache-Control': 'no-store',
          'Set-Cookie': `${COOKIE}=${expected}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`,
        },
      });
    }
    return new Response(loginPage(true), { status: 200, headers: htmlHeaders });
  }

  // มี cookie ถูกต้องแล้ว = ผ่าน
  if (getCookie(request, COOKIE) === expected) return;

  // ยังไม่ได้ล็อกอิน = แสดงหน้า login (ช่องรหัสช่องเดียว)
  return new Response(loginPage(false), { status: 200, headers: htmlHeaders });
}
