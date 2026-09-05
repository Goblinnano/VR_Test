# Master Prompt สำหรับสร้างโปรเจกต์ 3D/AR Web Viewer

> คุณสามารถคัดลอกข้อความด้านล่างนี้ทั้งหมด ไปสั่ง AI (เช่น ChatGPT, Claude, Gemini, Cursor หรือ AI ตัวอื่นๆ) เพื่อสร้างโปรเจกต์เว็บแสดงสินค้า 3D/AR พร้อมระบบเปิดกล้องเทียบขนาดจริง 1:1 และ 4 ปุ่มควบคุม ได้ทันที

---

```markdown
คุณคือผู้เชี่ยวชาญด้าน Frontend Developer และ Web 3D/AR 
ช่วยสร้างโปรเจกต์เว็บ "3D & Web Camera AR Product Viewer" แบบ Single-Page Application (HTML, CSS, JavaScript และ Node.js Dev Server) ที่สามารถเปิดกล้องเทียบขนาดสินค้าจริง 1:1 บนเบราว์เซอร์ได้ทันที โดยไม่ต้องโหลดแอปพลิเคชันเพิ่มเติม รองรับทั้ง iPhone (iOS Safari), Android (Chrome) และคอมพิวเตอร์

---

### [เป้าหมายและฟังก์ชันหลักของระบบ]
1. **แสดงสินค้า 3D (3D Viewer)**: 
   - แสดงผลโมเดล 3D ด้วย Google `<model-viewer>` (เวอร์ชันล่าสุด 3.4.0+)
   - หมุนโมเดลได้ 360 องศา, หมุนอัตโนมัติ (Auto-rotate) เมื่อไม่ได้สัมผัส
   - ปิดการซูม (disable-zoom) และล็อกสเกลโมเดลไว้ที่ขนาดจริง 1:1 (ar-scale="fixed")
   - มี Progress Bar และ Loading Spinner แสดงความคืบหน้าขณะดาวน์โหลดโมเดล

2. **ระบบเปิดกล้องเทียบขนาดจริงในเว็บ (Web Camera AR Overlay)**:
   - **เหตุผลทางเทคนิค**: ไม่ใช้ Native App QuickLook/SceneViewer เพราะต้องการให้ปุ่มฟังก์ชันบนหน้าเว็บยังทำงานได้ 100%
   - เมื่อกดปุ่ม "📷 เปิดกล้อง" ให้เรียกใช้กล้องหลังผ่าน `navigator.mediaDevices.getUserMedia` (`facingMode: { ideal: "environment" }`) มาแสดงเป็นพื้นหลังแบบ Fullscreen Cover
   - นำเลเยอร์ `<model-viewer>` ซ้อนทับบนภาพจากกล้องแบบพื้นหลังโปร่งใส ล็อกขนาดสินค้าไว้ที่สัดส่วนจริง 1:1 อัตโนมัติทันที ไม่ต้องกดปุ่มเทียบขนาดซ้ำซ้อน

3. **แผงควบคุม 4 ฟังก์ชัน (Camera Controls Toolbar)**:
   - จัดวางแผงควบคุมไว้ด้านซ้ายบนของหน้าจอเมื่ออยู่ในโหมดกล้อง (และกึ่งกลางเมื่ออยู่นอกกล้อง)
   - มีปุ่มควบคุม 4 ปุ่ม พร้อมไฮไลท์กรอบสี (Active State) ชัดเจนเมื่อเปิดใช้งาน:
     1) `🖐️ ย้ายตำแหน่ง` (Toggle): สลับระหว่าง "โหมดลากย้าย" กับ "โหมดหมุนดูรอบตัว" (เมื่อเปิดใช้งาน ให้ลาก 1 นิ้วเพื่อเลื่อนสินค้าบนหน้าจอแบบ real-time ด้วย GPU translate3d)
     2) `⏸️ หยุดหมุน / ▶️ หมุนสินค้า` (Toggle): เปิด/ปิดการหมุนสินค้าอัตโนมัติ
     3) `🎯 รีเซ็ตตรงกลาง`: ดึงสินค้ากลับสู่กึ่งกลางหน้าจอ และคืนมุมมองกล้องเริ่มต้นทันที
     4) `📸 ถ่ายรูป`: จำลองแสงแฟลชสีขาว (Shutter Flash) พร้อมบันทึกภาพถ่ายที่มีพื้นหลังเป็นภาพจากกล้องจริง + ซ้อนสินค้า 3D ตามตำแหน่งที่เลื่อนไว้ โดยใช้ Web Share API (สำหรับบันทึกลง Photos หรือแชร์ LINE บนมือถือ) และมี Fallback ดาวน์โหลดไฟล์ PNG บนคอมพิวเตอร์
   - มีปุ่ม "✕ ปิดกล้อง" เพื่อปิดกล้องและคืนค่าสู่หน้าแรก

4. **รองรับอุปกรณ์มือถือสมบูรณ์แบบ (Mobile-First & iOS Safe Area)**:
   - รองรับ Safe Area Insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) สำหรับ iPhone ที่มี Dynamic Island หรือรอยบาก
   - ป้องกัน Pointer / Touch Conflict ด้วย `e.stopPropagation()` เพื่อไม่ให้การกดปุ่มไปกระทบกับการลากโมเดล 3D

---

### [โครงสร้างไฟล์ที่ต้องการสร้าง (4 ไฟล์)]

#### 1. `index.html`
- รวมโครงสร้างหน้าเว็บทั้งหมด:
  - แท็ก `<video id="cameraFeed" autoplay playsinline muted></video>`
  - ส่วน Header แสดงชื่อและคำอธิบายสินค้า
  - ส่วน Container ของ `<model-viewer>` พร้อม progress-bar, loading-spinner, toast และปุ่มเปิดกล้อง
  - แผง `#cameraControls` พร้อมปุ่มฟังก์ชันทั้ง 4 และปุ่มปิดกล้อง
  - แฟลชชัตเตอร์ `#shutterFlash`
  - โหลดสคริปต์ `@google/model-viewer` จาก Google CDN และเชื่อมไฟล์ `style.css`, `script.js`

#### 2. `style.css`
- สไตล์แบบ Modern Minimalist คลีน สบายตา โทนสีเป็นกลาง
- รองรับ Responsive ตั้งแต่มือถือจอเล็กจนถึงหน้าจอคอมพิวเตอร์
- โค้ดสำหรับ `.camera-active`: ซ่อน Header, ปรับ video feed ให้เต็มจอ 100vw/100vh object-fit: cover, ปรับโมเดล 3D ให้อยู่กึ่งกลางหน้ากล้อง
- การจัดวางปุ่มบนหน้ากล้อง: เรียงในแนวตั้งชิดขอบซ้ายบน พร้อมพื้นหลังโปร่งแสง (glassmorphism blur)
- คลาส `.is-active` สำหรับปุ่มที่เปิดใช้งาน (มีกรอบแสงสีฟ้า/เขียวเด่นชัด)
- แอนิเมชันแฟลช `@keyframes shutterFlashAnimation`

#### 3. `script.js`
- เขียนโค้ด Vanilla JavaScript แยกหมวดหมู่อย่างเป็นระเบียบ พร้อมคอมเมนต์ภาษาไทยอธิบายทุกขั้นตอน:
  1. การอ้างอิง DOM Elements
  2. ตัวแปรสถานะ (State Variables): `cameraStream`, `isMoveMode`, `isRotating`, `isDragging`, `currentTranslateX`, `currentTranslateY`
  3. ฟังก์ชันแปลงพิกัด `applyViewerTransform()` ด้วย `translate3d(X, Y, 0)`
  4. ฟังก์ชันเปิด/ปิดกล้อง `startWebCamera()` และ `stopWebCamera()`
  5. ฟังก์ชันการทำงานของ 4 ปุ่ม: `toggleMoveMode()`, `toggleRotateMode()`, `resetAll()`, `takeSnapshot()`
  6. กลไกลากนิ้ว 1 นิ้ว (1-Finger Drag Engine) ผ่าน Pointer Events (`pointerdown`, `pointermove`, `pointerup`)
  7. กลไกถ่ายรูป Snapshot: วาด Video Frame ลง Canvas + นำ Blob โปร่งใสจาก `viewer.toBlob()` มาซ้อนทับตามพิกัดจริง + บันทึก/แชร์
  8. Model Lifecycle Events (`progress`, `load`, `error`)

#### 4. `server.js` (Node.js Local Server)
- เซิร์ฟเวอร์ทดสอบในเครื่องโดยใช้โมดูลในตัวของ Node.js (http, fs, path, os) ไม่ต้องติดตั้ง npm packages เพิ่มเติม
- กำหนด MIME Types รองรับ `.glb` (`model/gltf-binary`), `.gltf`, `.usdz`, `.html`, `.css`, `.js`
- ตรวจหา IP Address ของเครื่องในวง LAN อัตโนมัติ พร้อมแสดง URL สำหรับนำ iPhone หรือ Android ที่ต่อ WiFi เดียวกันมาสแกนเปิดทดสอบได้ทันที

---

### [ข้อมูลสินค้าตัวอย่าง (สามารถแก้ไขได้)]
- ชื่อสินค้า: แก้วน้ำสแตนเลสเก็บอุณหภูมิ (Insulated Tumbler)
- คำอธิบาย: แก้วน้ำพกพาสแตนเลส ดีไซน์มินิมอล เก็บร้อน-เย็นได้ยาวนาน ขนาดพอดีมือ
- ลิงก์โมเดล 3D (.glb): `https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/WaterBottle/glTF-Binary/WaterBottle.glb`
```
