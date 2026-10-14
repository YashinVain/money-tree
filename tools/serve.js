// serve.js — простой сервер для проверки игры, в том числе на телефоне.
//   node tools/serve.js            — только на этом компьютере: http://127.0.0.1:8934
//   node tools/serve.js 8935 --lan — ещё и в домашней сети: телефон в том же Wi-Fi
//                                    открывает адрес, который напечатает сервер
// Кэш отключён, чтобы после правок телефон сразу получал новую версию.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const lan = args.includes('--lan');
const port = +(args.find(a => /^\d+$/.test(a)) || 8934);
const root = path.resolve(__dirname, '..');

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8'
};

http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(root, p);
    // Только файлы игры и без служебной папки git
    if (!file.startsWith(root + path.sep) || file.includes(path.sep + '.git')) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end('404'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
    });
}).listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => {
    console.log(`На этом компьютере: http://127.0.0.1:${port}/`);
    if (lan) {
        Object.values(os.networkInterfaces()).flat()
            .filter(a => a && a.family === 'IPv4' && !a.internal)
            .forEach(a => console.log(`С телефона в той же сети: http://${a.address}:${port}/`));
    }
});
