// build-web.js — тестовая сборка для проверки на телефоне по ссылке (не для Яндекса).
// Запуск: node tools/build-web.js  →  dist/web/
// Берёт обычную сборку dist/money-tree, убирает обёртку <html>/<head>/<body>
// (страницу-артефакт её добавляет сама) и включает тестовый режим: SDK Яндекса
// не грузится, реклама — тестовое окно, как при локальном запуске.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'ignore' });

const SRC = path.join(ROOT, 'dist', 'money-tree');
const OUT = path.join(ROOT, 'dist', 'web');
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });

let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const body = html.slice(html.indexOf('>', html.indexOf('<body')) + 1, html.indexOf('</body>'));
// Из <head> оставляем заголовок, шрифты и стили; классы <body> ставим скриптом
const keep = head.split('\n').filter(l => /<title>|rel="preload"|rel="stylesheet"/.test(l)).join('\n');
const bodyClass = (html.match(/<body class="([^"]*)"/) || [])[1] || '';
html = keep + '\n' +
    `<script>window.R_TEST_BUILD = true; document.body.className = ${JSON.stringify(bodyClass)};</script>\n` +
    body.trim() + '\n';
// Адреса без ?v=… — файлы артефакта лежат по точным путям
html = html.replace(/\?v=[0-9.]+/g, '');
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('Готово: dist/web/ — тестовая сборка для телефона');
