// record.js — запись видео геймплея для страницы игры на Яндексе (MP4, 16:9, до 28 с).
// Нужны только Node.js 22+, установленный Edge и запущенный сервер игры:
//
//   node tools/serve.js            (в другом окне)
//   node tools/record.js           → docs/promo/gameplay-ru-1920x1080.mp4
//   node tools/record.js --lang en → docs/promo/gameplay-en-1920x1080.mp4
//
// Как работает: Edge без окна открывает игру 1920×1080, сценарий сам играет
// (тапы, рост дерева, новая стадия, радуга, бабочка, зверята), а DevTools присылает
// кадры экрана. Потом кадры раскладываются по сетке 30 к/с, браузер сжимает их
// кодеком H.264 (WebCodecs), а tools/mp4.js собирает обычный MP4 с честной
// длительностью — ffmpeg и другие программы не нужны. Сценарий «живого» игрока
// с курсором — в tools/record-player.js.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const GAME = process.env.GAME_URL || 'http://127.0.0.1:8934/index.html';
// --vertical: ролик 9:16 для телефона (раскладка телефона 360×640, кадры 1080×1920)
const VERTICAL = process.argv.includes('--vertical');
const W = VERTICAL ? 1080 : 1920, H = VERTICAL ? 1920 : 1080, FPS = 30;
const VIEW = VERTICAL ? { width: 360, height: 640, deviceScaleFactor: 3, mobile: true } : { width: W, height: H, deviceScaleFactor: 1, mobile: false };
const MP4 = require('./mp4.js');
// Язык ролика: node tools/record.js --lang en  (по умолчанию русский)
const LANG = (process.argv.find(a => a.startsWith('--lang=')) || '').slice(7) || (process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : 'ru');
const OUT = path.join(ROOT, 'docs', 'promo', VERTICAL ? `gameplay-vertical-${LANG}-1080x1920.mp4` : `gameplay-${LANG}-1920x1080.mp4`);
const FRAMES = path.join(ROOT, 'dist', 'video-frames');   // dist/ не попадает в git

const EDGE = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(p => fs.existsSync(p));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getJson(url, opts, tries = 40) {
    for (let i = 0; i < tries; i++) {
        try { const r = await fetch(url, opts); return await r.json(); } catch (e) { await sleep(150); }
    }
    throw new Error('DevTools не отвечает: ' + url);
}

class Page {
    constructor(ws) {
        this.ws = ws; this.id = 0; this.wait = new Map(); this.handlers = {};
        ws.addEventListener('message', (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.id && this.wait.has(msg.id)) {
                const { res, rej } = this.wait.get(msg.id);
                this.wait.delete(msg.id);
                msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
            } else if (msg.method && this.handlers[msg.method]) this.handlers[msg.method](msg.params);
            else if (msg.method === 'Runtime.exceptionThrown') console.log('  ошибка на странице:', msg.params.exceptionDetails.text);
        });
    }
    send(method, params = {}) {
        const id = ++this.id;
        this.ws.send(JSON.stringify({ id, method, params }));
        return new Promise((res, rej) => this.wait.set(id, { res, rej }));
    }
    on(method, fn) { this.handlers[method] = fn; }
    async eval(expr) {
        const r = await this.send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
        return r.result.value;
    }
}
async function connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const p = new Page(ws);
    await p.send('Page.enable');
    await p.send('Runtime.enable');
    return p;
}

// ---- Сценарий ролика: ~26 секунд, всё самое интересное ----
const PREPARE = () => `
    R.save.disabled = true;
    localStorage.clear();
    const s = R.game.newState();
    s.level = 58; s.bestLevel = 58; s.coins = 1.6e7;
    s.helpers = [30, 24, 16, 6, 0, 0]; s.charge = 26;
    s.hints = { tap: 1, upgrade: 1, helper: 1, release: 1, comet: 1, goals: 1, gift: 1, prestige: 1, basket: 1 };
    s.gift = { lastDay: R.util.dayKey(Date.now()), streak: 2 };
    s.stats.playMs = 1e6; s.stats.taps = 4000; s.freeChestAt = Date.now() + 3600000;
    s.settings.lang = '${LANG}';
    s.savedAt = Date.now();
    localStorage.setItem('moneytree_v1', JSON.stringify(s));
    location.reload();
`;
const START = `
    R.save.disabled = true;
    R.ui.offer = () => {};                 // в ролике без предложений рекламы
    document.getElementById('btn-play').click();
    await new Promise(r => setTimeout(r, 300));
    if (R.ui.sheetOpen) document.querySelector('.tab.active').click();   // сад во весь экран
`;
// Сам ролик — «живой» игрок с курсором мыши: tools/record-player.js
const PLAYER = require('./record-player.js');

async function main() {
    if (!EDGE) throw new Error('Не найден Microsoft Edge');
    fs.rmSync(FRAMES, { recursive: true, force: true });
    fs.mkdirSync(FRAMES, { recursive: true });
    fs.mkdirSync(path.dirname(OUT), { recursive: true });

    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-rec-'));
    const port = 9800 + Math.floor(Math.random() * 150);
    const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        '--no-first-run', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`,
        // вкладка-кодировщик не должна «засыпать» в фоне — от этого зависит ровность видео
        '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: 'ignore' });
    try {
        const list = await getJson(`http://127.0.0.1:${port}/json/list`);
        const game = await connect(list.find(t => t.type === 'page').webSocketDebuggerUrl);
        await game.send('Emulation.setDeviceMetricsOverride', VIEW);
        await game.send('Page.navigate', { url: GAME });
        await sleep(1500);
        await game.eval(PREPARE());
        await sleep(1800);
        await game.eval(START);
        await game.eval(PLAYER.cursor(VERTICAL ? 'touch' : 'mouse'));
        await sleep(1200);

        // 1. Запись кадров
        const frames = [];
        game.on('Page.screencastFrame', (p) => {
            const file = String(frames.length).padStart(5, '0') + '.jpg';
            fs.writeFileSync(path.join(FRAMES, file), Buffer.from(p.data, 'base64'));
            frames.push({ file, t: p.metadata.timestamp });
            game.send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => { });
        });
        await game.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
        await PLAYER.play(game, sleep, 25000, { touch: VERTICAL, vw: VIEW.width, vh: VIEW.height }).catch(e => console.log('  сценарий:', e.message.split('\n')[0]));
        await game.send('Page.stopScreencast');
        await sleep(300);
        const dur = frames.length ? frames[frames.length - 1].t - frames[0].t : 0;
        console.log(`Кадров: ${frames.length}, длительность ${dur.toFixed(1)} с, ~${Math.round(frames.length / dur)} к/с`);
        fs.writeFileSync(path.join(FRAMES, 'list.json'), JSON.stringify(frames.map(f => ({ file: f.file, t: f.t - frames[0].t }))));

        // 2. Кодирование: кадры раскладываются по сетке 30 к/с (по их отметкам времени),
        // браузер сжимает их кодеком H.264 (WebCodecs), а tools/mp4.js собирает обычный MP4
        await game.send('Page.navigate', { url: 'about:blank' });
        const tab = await getJson(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
        await fetch(`http://127.0.0.1:${port}/json/activate/${tab.id}`).catch(() => { });
        const enc = await connect(tab.webSocketDebuggerUrl);
        const base = new URL('../dist/video-frames/', GAME).href;
        await enc.send('Page.navigate', { url: new URL('../tools/sounds.html', GAME).href });   // страница того же сайта
        await sleep(800);
        const result = await enc.eval(`
            const FPS = ${FPS};
            const list = await (await fetch(${JSON.stringify(base)} + 'list.json')).json();
            const total = Math.floor(list[list.length - 1].t * FPS) + 1;
            const cv = new OffscreenCanvas(${W}, ${H});
            const c = cv.getContext('2d');
            const out = [];
            let avcC = null, err = null;
            const encoder = new VideoEncoder({
                output: (chunk, meta) => {
                    if (meta && meta.decoderConfig && meta.decoderConfig.description && !avcC) avcC = new Uint8Array(meta.decoderConfig.description);
                    const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d);
                    out.push({ d, key: chunk.type === 'key' });
                },
                error: (e) => { err = e.message; }
            });
            encoder.configure({ codec: 'avc1.640028', width: ${W}, height: ${H}, bitrate: 12000000, framerate: FPS,
                avc: { format: 'avc' }, latencyMode: 'realtime' });
            const load = async (f) => createImageBitmap(await (await fetch(${JSON.stringify(base)} + f.file)).blob());
            let src = 0, shown = await load(list[0]);
            for (let k = 0; k < total; k++) {
                // самый поздний снятый кадр, который уже должен быть на экране в момент k / FPS
                let pick = src;
                while (pick + 1 < list.length && list[pick + 1].t <= k / FPS) pick++;
                if (pick !== src) { shown.close(); shown = await load(list[pick]); src = pick; }
                c.drawImage(shown, 0, 0, ${W}, ${H});
                const frame = new VideoFrame(cv, { timestamp: Math.round(k * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
                encoder.encode(frame, { keyFrame: k % (FPS * 2) === 0 });
                frame.close();
                while (encoder.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 5));
                if (err) throw new Error(err);
            }
            await encoder.flush();
            shown.close();
            const join = (arrs) => { const n = arrs.reduce((s, a) => s + a.length, 0); const r = new Uint8Array(n); let o = 0; arrs.forEach(a => { r.set(a, o); o += a.length; }); return r; };
            const b64 = (u) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
            return { total, sizes: out.map(o => o.d.length), keys: out.map(o => o.key), data: b64(join(out.map(o => o.d))), avcC: b64(avcC) };
        `);
        const data = Buffer.from(result.data, 'base64');
        let off = 0;
        const samples = result.sizes.map((n, i) => { const d = data.subarray(off, off + n); off += n; return { data: d, key: result.keys[i] }; });
        const file = MP4.mux({ samples, avcC: Buffer.from(result.avcC, 'base64'), width: W, height: H, fps: FPS });
        fs.writeFileSync(OUT, file);
        const sizeMb = (file.length / 1048576).toFixed(1);
        console.log(`Готово: ${path.relative(ROOT, OUT)} — ${sizeMb} МБ, H.264, ${samples.length} кадров = ${(samples.length / FPS).toFixed(1)} с при ${FPS} к/с`);
    } finally {
        edge.kill();
        await sleep(400);
        try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* Edge мог ещё держать файлы */ }
    }
}

main().catch(e => { console.error(e); process.exit(1); });
