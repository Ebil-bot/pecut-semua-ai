const http = require('http');
const fs = require('fs');
const path = require('path');

let currentPort = parseInt(process.env.PORT || '3300', 10);
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.icns': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(path.join(__dirname, reqPath));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache',
    });

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
});

function startServer(port) {
  server.listen(port, '127.0.0.1', () => {
    console.log(`\n⚡ Simulator Pecut AI Web aktif!`);
    console.log(`👉 Buka browser: http://localhost:${port}`);
    console.log(`Tekan Ctrl+C untuk berhenti.\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️ Port ${currentPort} sedang digunakan, mencoba port ${currentPort + 1}...`);
    currentPort++;
    setTimeout(() => {
      startServer(currentPort);
    }, 200);
  } else {
    console.error('Server error:', err);
  }
});

startServer(currentPort);
