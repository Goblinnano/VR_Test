// ==============================================================
// 1. อ้างอิงองค์ประกอบต่างๆ ใน DOM
// ==============================================================
const viewer = document.querySelector('#viewer');
const toast = document.querySelector('#ar-toast');
const moveBtn = document.querySelector('#moveBtn');
const rotateBtn = document.querySelector('#rotateBtn');
const resetBtn = document.querySelector('#resetBtn');
const spinner = document.querySelector('#spinner');
const errorBox = document.querySelector('#errorBox');
const progressBar = document.querySelector('.progress-bar');
const openCameraBtn = document.querySelector('#openCameraBtn');
const closeCameraBtn = document.querySelector('#closeCameraBtn');
const cameraFeed = document.querySelector('#cameraFeed');
const quickLookBtn = document.querySelector('#quickLookBtn');
const cameraHint = document.querySelector('.camera-hint');
const normalHint = document.querySelector('.hint');

// แสดง spinner ระหว่างรอโหลดโมเดล 3D
if (spinner) spinner.style.display = 'block';

// ==============================================================
// 2. ตัวแปรสถานะการทำงาน (State Variables)
// ==============================================================
let cameraStream = null;
let isMoveMode = false;      // โหมดลากย้ายตำแหน่ง (เปิด=ย้าย, ปิด=หมุน)
let isRotating = true;       // โหมดหมุนอัตโนมัติ (เปิด=หมุน, ปิด=หยุด)
let isDragging = false;      // กำลังลากนิ้วอยู่หรือไม่
let lastPointerX = 0;
let lastPointerY = 0;
let currentTranslateX = 0;   // พิกัดการเลื่อนแนวนอน (px)
let currentTranslateY = 0;   // พิกัดการเลื่อนแนวตั้ง (px)

// ==============================================================
// 3. ฟังก์ชันการแสดงผลและการแปลงพิกัด (Transform & Hints)
// ==============================================================

// อัปเดตตำแหน่งการแสดงผลของโมเดล 3D แบบฮาร์ดแวร์เร่งความเร็ว (GPU translate3d)
function applyViewerTransform(animated = false) {
  if (!viewer) return;
  if (animated) {
    viewer.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)';
  } else {
    viewer.style.transition = 'none';
  }
  viewer.style.transform = `translate3d(${currentTranslateX}px, ${currentTranslateY}px, 0)`;
}

// อัปเดตข้อความแนะนำการใช้งานบนหน้าจอ
function updateHintText(text) {
  if (cameraHint) cameraHint.textContent = text;
  if (normalHint) normalHint.textContent = text;
}

// แสดงข้อความแจ้งเตือน Toast สั้นๆ
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.display = 'none';
  }, 2500);
}

// ==============================================================
// 4. ฟังก์ชันเปิด-ปิดกล้อง (Web Camera AR Mode)
// ==============================================================
async function startWebCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง');
    return;
  }

  try {
    showToast('กำลังเปิดกล้อง...');
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (cameraFeed) {
      cameraFeed.srcObject = cameraStream;
      await cameraFeed.play();
    }

    document.body.classList.add('camera-active');

    // อัปเดตข้อความแนะนำตามโหมดปัจจุบัน
    if (isMoveMode) {
      updateHintText('👆 ลากนิ้วบนหน้าจอ เพื่อเลื่อนตำแหน่งสินค้า');
    } else {
      updateHintText('👆 ลากนิ้วเพื่อหมุนดูสินค้า 360°');
    }

    showToast('เข้าสู่โหมดกล้องในห้องจริงแล้ว 🎉');
  } catch (err) {
    console.error('Camera error:', err);
    showToast('ไม่สามารถเปิดกล้องได้: กรุณากดอนุญาตให้เข้าถึงกล้อง');
  }
}

function stopWebCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  if (cameraFeed) {
    cameraFeed.srcObject = null;
  }

  // รีเซ็ตตำแหน่งโมเดลกลับสู่กึ่งกลางเมื่อปิดกล้อง
  currentTranslateX = 0;
  currentTranslateY = 0;
  applyViewerTransform(false);

  // ปิดโหมดย้ายหากเปิดค้างไว้
  if (isMoveMode) {
    isMoveMode = false;
    if (moveBtn) {
      moveBtn.classList.remove('is-active');
      moveBtn.innerHTML = '🖐️ ย้ายตำแหน่ง';
    }
    if (viewer) {
      viewer.setAttribute('camera-controls', '');
      viewer.style.touchAction = '';
    }
  }

  document.body.classList.remove('camera-active');
  updateHintText('👆 ลากนิ้วเพื่อหมุนดูสินค้า');
  showToast('ออกจากโหมดกล้องแล้ว');
}

// ==============================================================
// 5. ระบบ 4 ฟังก์ชันควบคุม พร้อมสลับเปิด/ปิด และไฮไลท์กรอบสี
// ==============================================================

// --- ฟังก์ชันที่ 1: ย้ายตำแหน่งสินค้า (1-Finger Drag Move Toggle) ---
function toggleMoveMode() {
  isMoveMode = !isMoveMode;

  if (isMoveMode) {
    // เปิดใช้งาน: แสดงไฮไลท์กรอบสี, เปลี่ยนข้อความ, ปิด camera-controls เพื่อให้ลากย้ายได้
    if (moveBtn) {
      moveBtn.classList.add('is-active');
      moveBtn.innerHTML = '🖐️ กำลังย้าย';
    }
    if (viewer) {
      viewer.removeAttribute('camera-controls');
      viewer.style.touchAction = 'none';
    }
    updateHintText('👆 ลากนิ้วบนหน้าจอ เพื่อเลื่อนตำแหน่งสินค้า');
    showToast('โหมดย้ายเปิดแล้ว: ลาก 1 นิ้วเพื่อเลื่อนสินค้า 🖐️');
  } else {
    // ปิดใช้งาน: ปลดไฮไลท์กรอบสี, เปลี่ยนข้อความเดิม, เปิด camera-controls ให้หมุนได้
    if (moveBtn) {
      moveBtn.classList.remove('is-active');
      moveBtn.innerHTML = '🖐️ ย้ายตำแหน่ง';
    }
    if (viewer) {
      viewer.setAttribute('camera-controls', '');
      viewer.style.touchAction = '';
    }
    updateHintText('👆 ลากนิ้วเพื่อหมุนดูสินค้า 360°');
    showToast('ปิดโหมดย้ายแล้ว: ลากนิ้วเพื่อหมุนดู 360° 🔄');
  }
}

// --- ฟังก์ชันที่ 2: หมุนสินค้าอัตโนมัติ / หยุดหมุน (Auto-Rotate Toggle) ---
function toggleRotateMode() {
  isRotating = !isRotating;
  if (viewer) viewer.autoRotate = isRotating;

  if (rotateBtn) {
    if (isRotating) {
      // กำลังหมุนอยู่: แสดงไฮไลท์กรอบสี และปุ่มสำหรับกดหยุดหมุน
      rotateBtn.classList.add('is-active');
      rotateBtn.innerHTML = '⏸️ หยุดหมุน';
      showToast('เปิดการหมุนสินค้าอัตโนมัติ ▶️');
    } else {
      // หยุดหมุนแล้ว: ปลดไฮไลท์กรอบสี และปุ่มสำหรับกดเริ่มหมุนสินค้า
      rotateBtn.classList.remove('is-active');
      rotateBtn.innerHTML = '▶️ หมุนสินค้า';
      showToast('หยุดการหมุนสินค้าแล้ว ⏸️');
    }
  }
}

// --- ฟังก์ชันที่ 4: รีเซ็ตตรงกลาง (Recenter & Reset) ---
function resetAll() {
  currentTranslateX = 0;
  currentTranslateY = 0;
  applyViewerTransform(true);

  // หากเปิดโหมดย้ายค้างไว้ ให้ปิดและคืนค่าการหมุน
  if (isMoveMode) {
    isMoveMode = false;
    if (moveBtn) {
      moveBtn.classList.remove('is-active');
      moveBtn.innerHTML = '🖐️ ย้ายตำแหน่ง';
    }
    if (viewer) {
      viewer.setAttribute('camera-controls', '');
      viewer.style.touchAction = '';
    }
  }

  // รีเซ็ตมุมมองและทิศทางกล้องของ model-viewer
  if (viewer) {
    viewer.cameraOrbit = '0deg 75deg 105%';
    if (typeof viewer.jumpCameraToGoal === 'function') {
      viewer.jumpCameraToGoal();
    }
  }

  // กะพริบไฮไลท์ปุ่มรีเซ็ตสั้นๆ เพื่อให้การตอบสนองที่ชัดเจน
  if (resetBtn) {
    resetBtn.classList.add('is-active');
    setTimeout(() => {
      resetBtn.classList.remove('is-active');
    }, 450);
  }

  updateHintText('👆 ลากนิ้วเพื่อหมุนดูสินค้า 360°');
  showToast('รีเซ็ตสินค้ากลับตรงกลางแล้ว 🎯');
}

// ==============================================================
// 6. ระบบลากนิ้ว 1 นิ้วเพื่อเลื่อนตำแหน่ง (1-Finger Drag Engine)
// ==============================================================

// ตรวจจับการแตะเริ่มลาก
window.addEventListener('pointerdown', (e) => {
  if (!isMoveMode) return;

  // เมินเฉยต่อการแตะปุ่มควบคุมต่างๆ เพื่อให้กดปุ่มได้ตามปกติ
  if (e.target.closest('button') || e.target.closest('.camera-btn-group') || e.target.closest('.action-buttons')) {
    return;
  }

  isDragging = true;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  applyViewerTransform(false); // ลากแบบ real-time ไม่มี animation ดีเลย์
}, { passive: true });

// คำนวณระยะเลื่อนขณะลากนิ้ว
window.addEventListener('pointermove', (e) => {
  if (!isDragging || !isMoveMode) return;

  const deltaX = e.clientX - lastPointerX;
  const deltaY = e.clientY - lastPointerY;

  currentTranslateX += deltaX;
  currentTranslateY += deltaY;

  lastPointerX = e.clientX;
  lastPointerY = e.clientY;

  applyViewerTransform(false);
}, { passive: true });

// เมื่อยกนิ้วขึ้นหรือการสัมผัสถูกยกเลิก
window.addEventListener('pointerup', () => {
  isDragging = false;
});

window.addEventListener('pointercancel', () => {
  isDragging = false;
});

// ==============================================================
// 7. ผูกอีเวนต์ปุ่มกดและการทำงาน
// ==============================================================

// ปุ่มเปิด-ปิดกล้อง
if (openCameraBtn) openCameraBtn.addEventListener('click', startWebCamera);
if (closeCameraBtn) closeCameraBtn.addEventListener('click', stopWebCamera);

// ปุ่มโหมดทั้ง 3 (ย้ายตำแหน่ง, หยุด/หมุนสินค้า, รีเซ็ตตรงกลาง)
if (moveBtn) moveBtn.addEventListener('click', toggleMoveMode);
if (rotateBtn) rotateBtn.addEventListener('click', toggleRotateMode);
if (resetBtn) resetBtn.addEventListener('click', resetAll);

// ปุ่ม Quick Look (Apple AR สำหรับ iOS Safari)
if (quickLookBtn && viewer) {
  quickLookBtn.addEventListener('click', () => {
    if (typeof viewer.activateAR === 'function') {
      viewer.activateAR();
    }
  });
}

// ป้องกันอีเวนต์แตะปุ่มแล้วส่งผลกระทบต่อการลาก/หมุนโมเดล (Stop Propagation)
const allButtons = [
  moveBtn,
  rotateBtn,
  resetBtn,
  openCameraBtn,
  closeCameraBtn,
  quickLookBtn
];

allButtons.forEach((btn) => {
  if (btn) {
    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach((evt) => {
      btn.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
    });
  }
});

// ==============================================================
// 8. จัดการสถานะการโหลดโมเดล 3D (Model Lifecycle & Progress)
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
  });

  // กรณีเกิดข้อผิดพลาดในการโหลดโมเดล
  viewer.addEventListener('error', () => {
    if (spinner) spinner.style.display = 'none';
    if (progressBar) progressBar.classList.add('hide');
    if (errorBox) errorBox.style.display = 'block';
  });

  // สถานะโหมด AR ดั้งเดิม
  viewer.addEventListener('ar-status', (event) => {
    if (event.detail.status === 'not-presenting') {
      showToast('ออกจากโหมด AR แล้ว');
    } else if (event.detail.status === 'session-started') {
      showToast('เข้าสู่โหมดดูในห้องจริงแล้ว 🎉');
    } else if (event.detail.status === 'failed') {
      showToast('อุปกรณ์นี้ไม่รองรับ AR 😢');
    }
  });
}
