// ==============================================================
// 1. อ้างอิงองค์ประกอบต่างๆ ใน DOM
// ==============================================================
const viewer = document.querySelector('#viewer');
const toast = document.querySelector('#ar-toast');
const spinner = document.querySelector('#spinner');
const errorBox = document.querySelector('#errorBox');
const progressBar = document.querySelector('.progress-bar');
const dimensionsText = document.querySelector('#dimensionsText');

// แสดง spinner ระหว่างรอโหลดโมเดล 3D
if (spinner) spinner.style.display = 'block';

// ==============================================================
// 2. ฟังก์ชันแสดงข้อความแจ้งเตือน (Toast)
// ==============================================================
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// ==============================================================
// 3. กฎที่ 4: ฟังก์ชัน showRealDimensions() 
// อ่านค่ามิติขนาดจริง (กว้าง x ลึก x สูง) จากไฟล์โมเดล 3D ด้วย viewer.getDimensions()
// กฎที่ 5: 1 หน่วยใน glTF = 1 เมตร นำมาคูณ 100 เพื่อแปลงเป็นเซนติเมตร
// ==============================================================
function showRealDimensions() {
  if (!viewer) return;

  try {
    const dimensions = viewer.getDimensions();
    if (!dimensions) return;

    // x = กว้าง (Width), y = สูง (Height), z = ลึก (Depth)
    const widthCm = Math.round(dimensions.x * 100);
    const heightCm = Math.round(dimensions.y * 100);
    const depthCm = Math.round(dimensions.z * 100);

    if (dimensionsText) {
      dimensionsText.textContent = `ขนาดจริง: กว้าง ${widthCm} × ลึก ${depthCm} × สูง ${heightCm} ซม.`;
    }

    console.log(`[AR Scale Info] Dimensions: Width=${widthCm}cm, Depth=${depthCm}cm, Height=${heightCm}cm`);
  } catch (err) {
    console.warn('Could not calculate model dimensions:', err);
  }
}

// ==============================================================
// 4. จัดการสถานะการโหลดโมเดล 3D (Model Lifecycle & Progress)
// ==============================================================
if (viewer) {
  // แถบความคืบหน้า (Progress Bar)
  viewer.addEventListener('progress', (event) => {
    const bar = viewer.querySelector('.update-bar');
    const percent = event.detail.totalProgress * 100;
    if (bar) bar.style.width = percent + '%';

    if (event.detail.totalProgress === 1) {
      setTimeout(() => {
        if (progressBar) progressBar.classList.add('hide');
      }, 300);
    }
  });

  // เมื่อโหลดโมเดลเสร็จสมบูรณ์
  viewer.addEventListener('load', () => {
    if (spinner) spinner.style.display = 'none';
    if (progressBar) progressBar.classList.add('hide');
    if (errorBox) errorBox.style.display = 'none';

    // คำนวณและแสดงขนาดจริงจากโมเดลทันที
    showRealDimensions();

    showToast('โมเดลพร้อมใช้งาน: กดปุ่มเพื่อวางในห้องจริง (1:1) 📐');
  });

  // กรณีเกิดข้อผิดพลาดในการโหลดโมเดล
  viewer.addEventListener('error', (event) => {
    console.error('model-viewer error:', event);
    if (spinner) spinner.style.display = 'none';
    if (progressBar) progressBar.classList.add('hide');
    if (errorBox) {
      errorBox.style.display = 'block';
      errorBox.textContent = '⚠️ ไม่สามารถโหลดโมเดล 3D ได้ กรุณาลองใหม่อีกครั้ง';
    }
  });

  // สถานะโหมด True AR (WebXR / Quick Look / Scene Viewer)
  viewer.addEventListener('ar-status', (event) => {
    if (event.detail.status === 'session-started') {
      showToast('เริ่มโหมดเทียบขนาดจริง 1:1 บนพื้นห้องแล้ว 📐');
    } else if (event.detail.status === 'not-presenting') {
      showToast('ออกจากโหมด AR แล้ว');
    } else if (event.detail.status === 'failed') {
      showToast('อุปกรณ์นี้ไม่รองรับ AR');
    }
  });
}
