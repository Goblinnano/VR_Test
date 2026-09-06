// ==============================================================
// 1. อ้างอิงองค์ประกอบต่างๆ ใน DOM
// ==============================================================
const viewer = document.querySelector('#viewer');
const toast = document.querySelector('#ar-toast');
const moveBtn = document.querySelector('#moveBtn');
const rotateBtn = document.querySelector('#rotateBtn');
const resetBtn = document.querySelector('#resetBtn');
const captureBtn = document.querySelector('#captureBtn');
const shutterFlash = document.querySelector('#shutterFlash');
const spinner = document.querySelector('#spinner');
const errorBox = document.querySelector('#errorBox');
const progressBar = document.querySelector('.progress-bar');
const openCameraBtn = document.querySelector('#openCameraBtn');
const closeCameraBtn = document.querySelector('#closeCameraBtn');
const trueArBtn = document.querySelector('#trueArBtn');
const inCameraTrueArBtn = document.querySelector('#inCameraTrueArBtn');
const measureBtn = document.querySelector('#measureBtn');
const a4GuideBtn = document.querySelector('#a4GuideBtn');
const dimensionBadge = document.querySelector('#dimensionBadge');
const a4GuideOverlay = document.querySelector('#a4GuideOverlay');
const cameraFeed = document.querySelector('#cameraFeed');
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

    // ล็อกตำแหน่งสินค้าและสเกลขนาดจริง 1:1 เป็นค่าเริ่มต้นทันที
    currentTranslateX = 0;
    currentTranslateY = 0;
    applyViewerTransform(false);
    if (viewer) {
      viewer.cameraOrbit = '0deg 75deg 105%';
      if (typeof viewer.jumpCameraToGoal === 'function') {
        viewer.jumpCameraToGoal();
      }
    }

    // อัปเดตข้อความแนะนำตามโหมดปัจจุบัน
    if (isMoveMode) {
      updateHintText('👆 ลากนิ้วบนหน้าจอ เพื่อเลื่อนตำแหน่งสินค้า');
    } else {
      updateHintText('👆 ลากนิ้วเพื่อหมุนดูสินค้า 360° (ขนาดจริง 1:1)');
    }

    showToast('เปิดกล้องเทียบขนาดจริง 1:1 เรียบร้อย 📐');
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

  if (dimensionBadge) dimensionBadge.classList.remove('show');
  if (measureBtn) measureBtn.classList.remove('is-active');
  if (a4GuideOverlay) a4GuideOverlay.classList.remove('show');
  if (a4GuideBtn) a4GuideBtn.classList.remove('is-active');

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

  // รีเซ็ตไฮไลท์ปุ่มมุมมองกลับมาที่ 'front'
  document.querySelectorAll('.angle-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.angle === 'front');
  });

  updateHintText('👆 ลากนิ้วเพื่อหมุนดูสินค้า 360°');
  showToast('รีเซ็ตสินค้ากลับตรงกลางแล้ว 🎯');
}

// --- ฟังก์ชันที่ 5: หมุนสินค้าไปยังมุมมองมาตรฐาน (หน้า, ซ้าย, ขวา, หลัง) ---
function setProductAngle(angleName) {
  if (!viewer) return;

  // 1. หยุดการหมุนอัตโนมัติ เพื่อให้ล็อกอยู่ที่องศาที่เลือก
  if (isRotating) {
    isRotating = false;
    viewer.autoRotate = false;
    if (rotateBtn) {
      rotateBtn.classList.remove('is-active');
      rotateBtn.innerHTML = '▶️ หมุนสินค้า';
    }
  }

  // 2. กำหนดพิกัด cameraOrbit ตามองศาที่เลือก (มุมกล้องค่อยๆ หมุนอย่างนุ่มนวล)
  let orbit = '0deg 75deg 105%';
  let label = 'ด้านหน้า 🖥️ (0°)';

  switch (angleName) {
    case 'front':
      orbit = '0deg 75deg 105%';
      label = 'ด้านหน้า 🖥️ (0°)';
      break;
    case 'left':
      orbit = '-90deg 75deg 105%';
      label = 'ด้านซ้าย 👈 (90°)';
      break;
    case 'right':
      orbit = '90deg 75deg 105%';
      label = 'ด้านขวา 👉 (90°)';
      break;
    case 'back':
      orbit = '180deg 75deg 105%';
      label = 'ด้านหลัง 🔙 (180°)';
      break;
  }

  viewer.cameraOrbit = orbit;

  // 3. อัปเดตไฮไลท์ปุ่มมุมมองทั้งหมด
  document.querySelectorAll('.angle-btn').forEach((btn) => {
    if (btn.dataset.angle === angleName) {
      btn.classList.add('is-active');
    } else {
      btn.classList.remove('is-active');
    }
  });

  showToast(`หมุนไปยังมุมมอง${label}`);
}

// --- ฟังก์ชันที่ 5: สลับเปิด/ปิดป้ายบอกขนาดจริง 1:1 ---
function toggleDimensionBadge() {
  if (!dimensionBadge) return;
  const isShown = dimensionBadge.classList.toggle('show');
  if (measureBtn) {
    measureBtn.classList.toggle('is-active', isShown);
  }
  showToast(isShown ? 'เปิดป้ายแสดงขนาดจริง 1:1 📏' : 'ซ่อนป้ายขนาดจริง');
}

// --- ฟังก์ชันที่ 6: สลับเปิด/ปิดกรอบอ้างอิงกระดาษ A4 บนโต๊ะ ---
function toggleA4Guide() {
  if (!a4GuideOverlay) return;
  const isShown = a4GuideOverlay.classList.toggle('show');
  if (a4GuideBtn) {
    a4GuideBtn.classList.toggle('is-active', isShown);
  }
  showToast(isShown ? 'เปิดกรอบเทียบกระดาษ A4 บนโต๊ะ 📄' : 'ปิดกรอบเทียบ A4');
}

// --- ฟังก์ชันที่ 7: เปิดโหมดสแกนหาพื้นผิวโต๊ะจริง (True AR / 3D Spatial Tracking) ---
async function launchTrueAR() {
  if (cameraStream) {
    stopWebCamera();
  }
  showToast('กำลังเปิดระบบสแกนพื้นผิวโต๊ะจริง (True AR)... 🌟');
  try {
    if (viewer && typeof viewer.activateAR === 'function') {
      await viewer.activateAR();
    } else {
      const nativeArBtn = document.querySelector('#nativeArButton');
      if (nativeArBtn) nativeArBtn.click();
    }
  } catch (err) {
    console.error('True AR launch error:', err);
    showToast('กำลังเตรียมความพร้อมของระบบ AR บนอุปกรณ์ของคุณ...');
  }
}

// ==============================================================
// 6. ระบบลากนิ้ว 1 นิ้วเพื่อเลื่อนตำแหน่ง (1-Finger Drag Engine)
// ==============================================================

// ตรวจจับการแตะเริ่มลาก
window.addEventListener('pointerdown', (e) => {
  if (!isMoveMode) return;

  // เมินเฉยต่อการแตะปุ่มควบคุมต่างๆ เพื่อให้กดปุ่มได้ตามปกติ
  if (e.target.closest('button') || e.target.closest('.camera-btn-group') || e.target.closest('.action-buttons') || e.target.closest('.angle-selector')) {
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
// 7. ฟังก์ชันถ่ายรูปสินค้าในห้องจริง (Snapshot & Save / Share Photo)
// ==============================================================
async function takeSnapshot() {
  if (!viewer) return;

  // 1. แสดงเอฟเฟกต์แสงแฟลชชัตเตอร์สีขาว
  if (shutterFlash) {
    shutterFlash.classList.remove('is-flashing');
    void shutterFlash.offsetWidth; // บังคับ reflow ทันที
    shutterFlash.classList.add('is-flashing');
  }

  showToast('กำลังประมวลผลรูปถ่าย... 📸');

  try {
    const isCameraMode = document.body.classList.contains('camera-active');
    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // ปรับความคมชัดให้พอดีกับแรมมือถือ

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    canvas.width = Math.round(screenW * dpr);
    canvas.height = Math.round(screenH * dpr);
    const ctx = canvas.getContext('2d');

    // 2. หากอยู่ในโหมดกล้อง ให้ดึงภาพสดจากกล้องวิดีโอมาวาดเป็นพื้นหลัง (object-fit: cover)
    if (isCameraMode && cameraFeed && cameraFeed.videoWidth) {
      const vWidth = cameraFeed.videoWidth;
      const vHeight = cameraFeed.videoHeight;
      const cWidth = canvas.width;
      const cHeight = canvas.height;

      const vAspect = vWidth / vHeight;
      const cAspect = cWidth / cHeight;
      let sx, sy, sWidth, sHeight;

      if (vAspect > cAspect) {
        sHeight = vHeight;
        sWidth = vHeight * cAspect;
        sx = (vWidth - sWidth) / 2;
        sy = 0;
      } else {
        sWidth = vWidth;
        sHeight = vWidth / cAspect;
        sx = 0;
        sy = (vHeight - sHeight) / 2;
      }

      ctx.drawImage(cameraFeed, sx, sy, sWidth, sHeight, 0, 0, cWidth, cHeight);
    } else {
      // หากอยู่นอกกล้อง ให้วาดพื้นหลังสีการ์เดียนท์สวยงาม
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#f5f7fa');
      grad.addColorStop(1, '#c3cfe2');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 3. ดึงภาพโมเดล 3D แบบพื้นหลังโปร่งใสจาก model-viewer
    const modelBlob = await viewer.toBlob({ idealAspect: false });
    if (!modelBlob) {
      throw new Error('Could not capture model-viewer blob');
    }

    const modelImg = new Image();
    await new Promise((resolve, reject) => {
      modelImg.onload = resolve;
      modelImg.onerror = reject;
      modelImg.src = URL.createObjectURL(modelBlob);
    });

    // 4. วาดโมเดล 3D ลงบนผืนผ้าใบตามตำแหน่งที่ผู้ใช้ลากเลื่อนไว้จริง
    const offsetX = Math.round(currentTranslateX * dpr);
    const offsetY = Math.round(currentTranslateY * dpr);
    ctx.drawImage(modelImg, offsetX, offsetY, canvas.width, canvas.height);
    URL.revokeObjectURL(modelImg.src);

    // 5. บันทึกรูปภาพลงเครื่อง หรือเปิด Native Share Sheet บนมือถือ
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const now = new Date();
      const fileName = `ar-photo-${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}-${now.getHours()}${now.getMinutes()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // บน iPhone และ Android: ใช้ Web Share API ให้บันทึกลง Photos หรือแชร์ LINE ได้ทันที
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'รูปสินค้าในห้องจริง',
            text: 'ลองจัดวางหน้าจอคอมพิวเตอร์บนโต๊ะทำงานในห้องจริงด้วยระบบ Web AR',
            files: [file]
          });
          showToast('แชร์รูปถ่ายสำเร็จแล้ว 🎉');
          return;
        } catch (err) {
          if (err.name === 'AbortError') return; // ผู้ใช้กดยกเลิก
        }
      }

      // สำหรับเบราว์เซอร์บน PC หรือกรณีที่ไม่รองรับ Web Share
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 1000);

      showToast('บันทึกรูปถ่ายลงเครื่องเรียบร้อยแล้ว 📸');
    }, 'image/png', 0.95);

  } catch (err) {
    console.error('Capture error:', err);
    showToast('ไม่สามารถบันทึกภาพถ่ายได้ กรุณาลองใหม่อีกครั้ง');
  }
}

// ==============================================================
// 8. ผูกอีเวนต์ปุ่มกดและการทำงาน
// ==============================================================

// ปุ่มเปิด-ปิดกล้อง (เปิดหน้ากล้องที่ฟังก์ชันทุกตัว ย้าย/หมุน/รีเซ็ต/ถ่ายรูป ใช้งานได้ครบ 100%)
if (openCameraBtn) openCameraBtn.addEventListener('click', startWebCamera);
if (closeCameraBtn) closeCameraBtn.addEventListener('click', stopWebCamera);

// ปุ่มโหมดควบคุม (ย้ายตำแหน่ง, หยุด/หมุนสินค้า, รีเซ็ตตรงกลาง, ขนาดจริง, เทียบ A4, ถ่ายรูป, สแกนโต๊ะจริง)
if (moveBtn) moveBtn.addEventListener('click', toggleMoveMode);
if (rotateBtn) rotateBtn.addEventListener('click', toggleRotateMode);
if (resetBtn) resetBtn.addEventListener('click', resetAll);
if (measureBtn) measureBtn.addEventListener('click', toggleDimensionBadge);
if (a4GuideBtn) a4GuideBtn.addEventListener('click', toggleA4Guide);
if (inCameraTrueArBtn) inCameraTrueArBtn.addEventListener('click', launchTrueAR);
if (trueArBtn) trueArBtn.addEventListener('click', launchTrueAR);
if (captureBtn) captureBtn.addEventListener('click', takeSnapshot);

// ปุ่มเลือกมุมมองมาตรฐาน (หน้า / ซ้าย / ขวา / หลัง)
const angleButtons = Array.from(document.querySelectorAll('.angle-btn'));
angleButtons.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const angle = btn.dataset.angle;
    if (angle) setProductAngle(angle);
  });
});

// ป้องกันอีเวนต์แตะปุ่มแล้วส่งผลกระทบต่อการลาก/หมุนโมเดล (Stop Propagation)
const allButtons = [
  moveBtn,
  rotateBtn,
  resetBtn,
  measureBtn,
  a4GuideBtn,
  inCameraTrueArBtn,
  trueArBtn,
  captureBtn,
  openCameraBtn,
  closeCameraBtn,
  ...angleButtons
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
    if (errorBox) errorBox.style.display = 'none';
  });

  // กรณีเกิดข้อผิดพลาดในการโหลดโมเดล
  viewer.addEventListener('error', (event) => {
    console.error('model-viewer error:', event);
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
