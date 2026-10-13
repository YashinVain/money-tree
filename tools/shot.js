// shot.js — автоматические скриншоты и проверки игры в браузере Edge без окна
// (через протокол DevTools). Нужен только Node.js 22+ и установленный Edge.
//
//   node tools/shot.js tools/scenarios/smoke.json
//
// Сценарий — список шагов: размер экрана (size), замедление процессора (cpu),
// открыть страницу (open), выполнить JS (js), подождать (sleep), снимок (shot). Снимки и ошибки консоли сохраняются в папку out сценария.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(p => fs.existsSync(p));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getJson(url, tries = 40) {
    for (let i = 0; i < tries; i++) {
        try {
            const r = await fetch(url);
            return await r.json();
        } catch (e) { await sleep(150); }
    }
    throw new Error('DevTools не отвечает: ' + url);
}

class Page {
    constructor(ws) {
        this.ws = ws;
        this.id = 0;
        this.wait = new Map();
        this.logs = [];
        ws.addEventListener('message', (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.id && this.wait.has(msg.id)) {
                const { res, rej } = this.wait.get(msg.id);
                this.wait.delete(msg.id);
                msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
            } else if (msg.method === 'Runtime.consoleAPICalled') {
                const text = msg.params.args.map(a => a.value !== undefined ? a.value : a.description).join(' ');
                this.logs.push(msg.params.type + ': ' + text);
            } else if (msg.method === 'Runtime.exceptionThrown') {
                const d = msg.params.exceptionDetails;
                this.logs.push('EXCEPTION: ' + (d.exception ? d.exception.description : d.text));
            }
        });
    }
    send(method, params = {}) {
        const id = ++this.id;
        this.ws.send(JSON.stringify({ id, method, params }));
        return new Promise((res, rej) => this.wait.set(id, { res, rej }));
    }
    async eval(expr) {
        const r = await this.send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
        return r.result.value;
    }
}

async function run(scenarioPath) {
    const sc = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
    const outDir = path.resolve(path.dirname(scenarioPath), sc.out || 'out');
    fs.mkdirSync(outDir, { recursive: true });
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-edge-'));
    const port = 9300 + Math.floor(Math.random() * 500);
    const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        '--no-first-run', '--ignore-certificate-errors', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
    let page;
    const report = [];
    try {
        const list = await getJson(`http://127.0.0.1:${port}/json/list`);
        const target = list.find(t => t.type === 'page');
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
        page = new Page(ws);
        await page.send('Page.enable');
        await page.send('Runtime.enable');

        for (const step of sc.steps) {
            if (step.size) {
                const [w, h, dpr = 1, mobile = false] = step.size;
                await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile });
                if (mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true });
            }
            if (step.cpu) await page.send('Emulation.setCPUThrottlingRate', { rate: step.cpu });
            if (step.open) {
                await page.send('Page.navigate', { url: step.open });
                await sleep(step.wait || 1500);
            }
            if (step.js) {
                // Ошибка в шаге не останавливает сценарий — записываем и идём дальше
                try {
                    const v = await page.eval(step.js);
                    if (v !== undefined) report.push((step.name || 'js') + ': ' + JSON.stringify(v));
                } catch (e) {
                    report.push('ОШИБКА шага ' + (step.name || step.js.slice(0, 60)) + ': ' + e.message.split(String.fromCharCode(10))[0]);
                }
            }
            if (step.click) {
                // Настоящий клик мышью по координатам (например, крестик рекламы)
                const [x, y] = step.click;
                for (const type of ['mousePressed', 'mouseReleased']) {
                    await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
                }
            }
            if (step.sleep) await sleep(step.sleep);
            if (step.shot) {
                const r = await page.send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(outDir, step.shot), Buffer.from(r.data, 'base64'));
                report.push('снимок: ' + step.shot);
            }
        }
    } finally {
        if (page) {
            if (page.logs.length) fs.writeFileSync(path.join(outDir, 'console.txt'), page.logs.join('\n'));
            const errors = page.logs.filter(l => /EXCEPTION|error/i.test(l));
            report.push('ошибок в консоли: ' + errors.length);
            errors.slice(0, 15).forEach(e => report.push('  ' + e));
        }
        edge.kill();
        await sleep(300);
        try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* Edge мог ещё держать файлы */ }
    }
    console.log(report.join('\n'));
}

run(process.argv[2]).catch(e => { console.error(e); process.exit(1); });
