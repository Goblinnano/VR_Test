// อ้างอิงองค์ประกอบต่างๆ ใน DOM
const viewer = document.querySelector('#viewer');
const toast = document.querySelector('#ar-toast');
const resetBtn = document.querySelector('#resetBtn');
const rotateBtn = document.querySelector('#rotateBtn');
const spinner = document.querySelector('#spinner');
const errorBox = document.querySelector('#errorBox');
const progressBar = document.querySelector('.progress-bar');
const openCameraBtn = document.querySelector('#openCameraBtn');
const closeCameraBtn = document.querySelector('#closeCameraBtn');
const cameraFeed = document.querySelector('#cameraFeed');
const quickLookBtn = document.querySelector('#quickLookBtn');

// แสดง spinner ตอนโหลด
if (spinner) spinner.style.display = 'block';

// ตัวแปรเก็บสตรีมวิดีโอกล้อง
let cameraStream = null;

// ฟังก์ชันเปิดกล้องหลังในเว็บ (Web Camera AR สำหรับ iPhone & Android)
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
    cameraFeed.srcObject = cameraStream;
    await cameraFeed.play();

    document.body.classList.add('camera-active');
    showToast('เข้าสู่โหมดกล้องในห้องจริงแล้ว 🎉');
  } catch (err) {
    console.error('Camera error:', err);
    showToast('ไม่สามารถเปิดกล้องได้: กรุณากดอนุญาตให้เข้าถึงกล้อง');
  }
}

// ฟังก์ชันปิดกล้อง
function stopWebCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  if (cameraFeed) {
    cameraFeed.srcObject = null;
  }
  document.body.classList.remove('camera-active');
  showToast('ออกจากโหมดกล้องแล้ว');
}

// ผูกอีเวนต์ปุ่มเปิด-ปิดกล้อง
if (openCameraBtn) {
  openCameraBtn.addEventListener('click', startWebCamera);
}

if (closeCameraBtn) {
  closeCameraBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stopWebCamera();
  });
}

// ปุ่มเปิดโหมด Apple Quick Look (หากต้องการใช้ระบบของ Apple)
if (quickLookBtn && viewer) {
  quickLookBtn.addEventListener('click', () => {
    if (typeof viewer.activateAR === 'function') {
      viewer.activateAR();
    }
  });
}

// ป้องกันการแตะปุ่มแล้วส่งผลกระทบต่อการหมุนโมเดล (Stop Propagation)
[resetBtn, rotateBtn, closeCameraBtn].forEach((btn) => {
  if (btn) {
    ['touchstart', 'touchend', 'click'].forEach((evt) => {
      btn.addEventListener(evt, (e) => e.stopPropagation());
    });
  }
});

// จัดการสถานะการโหลดของโมเดล
if (viewer) {
  // แถบความคืบหน้า (Progress Bar)
  viewer.addEventListener('progress', (event) => {
    const bar = viewer.querySelector('.update-bar');
    const percent = event.detail.totalProgress * 100;
    if (bar) {
      bar.style.width = percent + '%';
    }

    // เมื่อดาวน์โหลดครบ 100% ให้ซ่อนแถบดาวน์โหลด
    if (event.detail.totalProgress === 1) {
      setTimeout(() => {
        if (progressBar) progressBar.classList.add('hide');
      }, 300);
    }
  });

  viewer.addEventListener('load', () => {
    if (spinner) spinner.style.display = 'none';
    if (progressBar) progressBar.classList.add('hide');
  });

  viewer.addEventListener('error', () => {
    if (spinner) spinner.style.display = 'none';
    if (progressBar) progressBar.classList.add('hide');
    if (errorBox) errorBox.style.display = 'block';
  });

  // สถานะ AR แบบดั้งเดิม (Quick Look / WebXR)
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

// ฟังก์ชันแสดงข้อความแจ้งเตือน Toast
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 2500);
}

// ฟังก์ชันรีเซ็ตมุมมองกล้อง
function resetCamera() {
  if (viewer) {
    viewer.cameraOrbit = '0deg 75deg 105%';
    if (typeof viewer.jumpCameraToGoal === 'function') {
      viewer.jumpCameraToGoal();
    } else {
      viewer.cameraTarget = 'auto';
    }
  }
}

// ปุ่มรีเซ็ตมุมมอง
if (resetBtn) {
  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetCamera();
  });
}

// ปุ่มหยุด / หมุนอัตโนมัติต่อ
let isRotating = true;
if (rotateBtn && viewer) {
  rotateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isRotating = !isRotating;
    viewer.autoRotate = isRotating;
    rotateBtn.textContent = isRotating ? '⏸️ หยุดหมุน' : '▶️ หมุนต่อ';
  });
}
