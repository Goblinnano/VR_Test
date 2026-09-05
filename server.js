const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.usdz': 'model/vnd.usdz+zip'
};

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found: ' + reqPath);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  const localIp = getLocalIp();
  console.log('========================================================');
  console.log('🚀 เซิร์ฟเวอร์ทดสอบในเครื่องเริ่มทำงานแล้ว!');
  console.log('--------------------------------------------------------');
  console.log(`📱 บนคอมพิวเตอร์: http://localhost:${PORT}`);
  console.log(`📱 บนวง Wi-Fi เดียวกัน: http://${localIp}:${PORT}`);
  console.log('--------------------------------------------------------');
  console.log('💡 วิธีทดสอบกล้อง AR บน iPhone ผ่าน HTTPS:');
  console.log('   1. ดูแถบด้านล่างข้าง Terminal กดที่แท็บ "Ports"');
  console.log('   2. กด "Forward a Port" แล้วใส่เลข 3000');
  console.log('   3. คลิกขวาที่พอร์ต 3000 -> Port Visibility -> Public');
  console.log('   4. นำลิงก์ HTTPS หรือสแกน QR Code ไปเปิดบน iPhone ได้ทันที!');
  console.log('========================================================');
});

