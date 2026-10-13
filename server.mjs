import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

function createHospitalServer() {
  return http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    let requestUrl = req.url || '/';
    const qIdx = requestUrl.indexOf('?');
    if (qIdx !== -1) {
      requestUrl = requestUrl.substring(0, qIdx);
    }

    let filePath = path.join(__dirname, decodeURIComponent(requestUrl));

    if (requestUrl === '/' || requestUrl === '') {
      filePath = path.join(__dirname, 'login.html');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html lang="id">
          <head><meta charset="UTF-8"><title>404 - Halaman Tidak Ditemukan</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 3rem;">
            <h2>404 - Halaman Tidak Ditemukan</h2>
            <p>Berkas <code>${requestUrl}</code> tidak ditemukan di server lokal.</p>
            <p><a href="/login.html">Kembali ke Halaman Login</a></p>
          </body>
          </html>
        `);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
  });
}

function listenWithFallback(portToTry) {
  const currentServer = createHospitalServer();
  currentServer.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[INFO] Port ${portToTry} sedang terpakai, mencoba port ${portToTry + 1}...`);
      listenWithFallback(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  currentServer.listen(portToTry, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  SISTEM ANTRIAN RUMAH SAKIT BERJALAN DI LOCAL SERVER`);
    console.log(`======================================================`);
    console.log(`  Portal Login      : http://localhost:${portToTry}/login.html`);
    console.log(`  Kiosk Pasien      : http://localhost:${portToTry}/ambil-antrian.html`);
    console.log(`  Layar TV Display  : http://localhost:${portToTry}/layar.html`);
    console.log(`  Panel Operator    : http://localhost:${portToTry}/operator.html`);
    console.log(`  Dashboard Admin   : http://localhost:${portToTry}/index.html`);
    console.log(`======================================================\n`);
  });
}

listenWithFallback(DEFAULT_PORT);
