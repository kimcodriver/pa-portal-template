// middleware.js — ประตูรหัสผ่าน 1 ชุด (HTTP Basic Auth)
// ทำงานบน Vercel Edge ได้ทุกแผน รวม Hobby (ฟรี) — ไม่ต้องให้เจ้านายมีบัญชี Vercel
//
// วิธีตั้งรหัสผ่าน: Vercel → Project → Settings → Environment Variables
//   ใส่ key:  PORTAL_PASSWORD   value: <รหัสที่ต้องการ>
// แล้ว redeploy 1 ครั้ง
//
// เวลาเปิดเว็บ เบราว์เซอร์จะเด้งช่อง username/password —
// username อะไรก็ได้ (เว้นว่างได้), ใส่เฉพาะรหัสผ่านให้ตรง PORTAL_PASSWORD

export const config = {
  // ใช้กับทุก path ยกเว้นไฟล์ระบบ/ไอคอน
  matcher: ['/((?!_next|favicon.ico|robots.txt).*)'],
};

export default function middleware(request) {
  const PASS = process.env.PORTAL_PASSWORD;

  // ยังไม่ได้ตั้งรหัส = เปิดได้ (ช่วงตั้งค่าครั้งแรก) — อย่าลืมตั้งก่อนใช้งานจริง!
  if (!PASS) return;

  const auth = request.headers.get('authorization') || '';
  const [scheme, encoded] = auth.split(' ');
  if (scheme === 'Basic' && encoded) {
    try {
      const decoded = atob(encoded);
      const pass = decoded.slice(decoded.indexOf(':') + 1);
      if (pass === PASS) return; // รหัสถูก → ผ่าน
    } catch (_) { /* ignore */ }
  }

  return new Response('ต้องใส่รหัสผ่านเพื่อเข้าถึงพอร์ทัล', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="PA Portal", charset="UTF-8"',
      'content-type': 'text/plain; charset=utf-8',
    },
  });
}
