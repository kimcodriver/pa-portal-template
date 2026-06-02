# 🖥️ ใช้งานบนเครื่อง PA (หลังคลิก Deploy แล้ว)

> หลังคลิกปุ่ม Deploy คุณจะมี repo `pa-portal` (private) ในบัญชี GitHub ของคุณ + เว็บบน Vercel แล้ว
> เอกสารนี้คือวิธีตั้งเครื่อง PA ให้เผยแพร่งานได้ทุกวัน (ตั้งครั้งเดียว)

## ขั้นที่ 1 — ติดตั้งเครื่องมือบนเครื่อง PA
ต้องมี: **Node ≥18**, **Git**, **GitHub CLI (`gh`)**, **Claude (cowork/Claude Code)**
```bash
node --version && git --version && gh --version
```

## ขั้นที่ 2 — ล็อกอิน GitHub บนเครื่อง PA
```bash
gh auth login        # เลือก GitHub.com → เข้าด้วยบัญชีที่เป็นเจ้าของ repo pa-portal
gh auth setup-git
```

## ขั้นที่ 3 — Clone repo ของคุณ
```bash
git clone https://github.com/<บัญชี-github-ของคุณ>/pa-portal.git
cd pa-portal
```
> สกิล `publish-to-portal` อยู่ใน `.claude/skills/` — ติดมากับ clone ใช้ได้ทันที

## ขั้นที่ 4 — ทดสอบ
```bash
npm run build
open public/index.html      # Windows: start public\index.html
```

## ขั้นที่ 5 — งานประจำวัน (ไม่ต้องแตะโค้ด)
เปิด Claude ในโฟลเดอร์ `pa-portal` แล้วพูด เช่น
- *"เอา Morning Brief วันนี้ขึ้นพอร์ทัล"*
- *"เพิ่มสรุปงานโปรเจค X อันนี้ขึ้นพอร์ทัล"*

Claude จะใส่ meta → วางไฟล์ → push → Vercel deploy เอง

---

## หมายเหตุ
- **Vercel ผูกกับ repo แล้ว** — push เมื่อไหร่ deploy เมื่อนั้น ไม่ต้องตั้งใหม่
- **รหัสผ่าน** อยู่ที่ Vercel (`PORTAL_PASSWORD`) ไม่ใช่ในเครื่อง
- **public/ ไม่ถูก commit** — Vercel สร้างใหม่ทุก deploy
- ก่อนเริ่มงานควร `git pull` เผื่อมีคนอัปเดตไฟล์ไว้
