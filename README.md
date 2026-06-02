# ☕ PA Work Portal — ติดตั้งลงบัญชีคุณในคลิกเดียว

> ศูนย์รวมงานของผู้ช่วย (PA) ที่เจ้านายเปิดอ่านทุกเช้า — Morning Brief อยู่บนสุด งานโปรเจคไล่ลงมา
> PA แค่ "วางไฟล์ + บอก Claude" ระบบสร้างหน้า index ให้อัตโนมัติ เก็บบน GitHub + เปิดเว็บด้วยรหัสผ่าน 1 ชุด

## 🚀 ติดตั้ง (คลิกเดียว)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkimcodriver%2Fpa-portal-template&env=PORTAL_PASSWORD&envDescription=ตั้งรหัสผ่านสำหรับเปิดพอร์ทัล&project-name=pa-portal&repository-name=pa-portal)

**คลิกปุ่มด้านบนแล้วเกิดอะไรขึ้น:**
1. Vercel สร้าง **repo ส่วนตัว (private)** ชื่อ `pa-portal` ในบัญชี **GitHub ของคุณ** (ก๊อประบบนี้ไปให้)
2. ถามให้ตั้ง **`PORTAL_PASSWORD`** = รหัสผ่านที่เจ้านายใช้เปิดเว็บ
3. **Deploy ขึ้น Vercel ของคุณ** → ได้ลิงก์เว็บพร้อมใช้ทันที 🎉

> ระบบเป็นของคุณเองทั้งหมด (repo + เว็บ + รหัส) — เจ้าของ template มองไม่เห็นเนื้อหาคุณ

---

## 📅 ใช้งานทุกวัน (หลังติดตั้งเสร็จ)

1. `git clone` repo `pa-portal` ที่เพิ่งสร้าง ลงเครื่องที่ PA ใช้ทำงาน (ทำครั้งเดียว — ดู [SETUP.md](SETUP.md))
2. เปิด Claude ในโฟลเดอร์นั้น แล้ว **พูด** เช่น:
   - *"เอา Morning Brief วันนี้ขึ้นพอร์ทัล"*
   - *"เพิ่มสรุปงานโปรเจค X อันนี้"*
3. Claude (สกิล `publish-to-portal`) จะใส่ meta → วางไฟล์ → push → Vercel deploy เอง
   เจ้านายเปิดเว็บเดิมก็เห็นงานใหม่ทันที — **PA ไม่ต้องแตะโค้ดเลย**

---

## 📁 หมวด & โครงสร้าง

| วางไฟล์ใน... | หมวด | แสดงผล |
|--------------|------|--------|
| `content/morning-brief/` | Morning Brief | **บนสุดเสมอ** ฉบับล่าสุดเป็นการ์ดใหญ่ |
| `content/projects/<ชื่อโปรเจค>/` | งานโปรเจค | จัดกลุ่มตามโปรเจค ใหม่→เก่า |
| `content/reports/` | รายงาน | ไล่ลงมา ใหม่→เก่า |

ทุกหน้าใส่ข้อมูลหัวไฟล์ (สกิลทำให้อัตโนมัติ): `portal:title / category / date / pin / summary / project`
ลืมใส่ไม่พัง — ไม่มี title ใช้ชื่อไฟล์, ไม่มี date ใช้วันที่ไฟล์

---

## 💻 ลองบนเครื่อง (ไม่บังคับ)

```bash
npm run build           # สร้าง public/index.html
open public/index.html  # เปิดดู (Windows: start public\index.html)
```
ไม่มี dependency ให้ติดตั้ง — ใช้ Node ล้วน

---

## 🔑 เปลี่ยนรหัสผ่านภายหลัง
Vercel → โปรเจค `pa-portal` → Settings → Environment Variables → แก้ `PORTAL_PASSWORD` → Redeploy
