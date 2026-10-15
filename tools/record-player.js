// record-player.js — сценарий ролика для tools/record.js: «живой» игрок с курсором мыши.
// Настоящие события мыши через DevTools (кнопки вдавливаются, тапы засчитываются как
// у человека), плавные движения руки по дуге, неровный ритм тапов. Курсор и «круги»
// от нажатий рисует сама страница поверх игры — в игре их нет.

const CURSOR = `
    const cur = document.createElement('div');
    cur.id = 'rec-cursor';
    cur.innerHTML = '<svg width="34" height="40" viewBox="0 0 34 40"><path d="M3 2 L3 31 L10 25 L15 37 L21 34 L16 23 L26 23 Z" fill="#fff" stroke="#2a1a0e" stroke-width="2.4" stroke-linejoin="round"/></svg>';
    Object.assign(cur.style, { position: 'fixed', left: '1780px', top: '980px', zIndex: 99999, pointerEvents: 'none', transformOrigin: '3px 2px', transition: 'transform 0.08s', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' });
    document.body.appendChild(cur);
    window.addEventListener('mousemove', (e) => { cur.style.left = e.clientX - 3 + 'px'; cur.style.top = e.clientY - 2 + 'px'; }, true);
    window.addEventListener('mousedown', (e) => {
        cur.style.transform = 'scale(0.86)';
        const r = document.createElement('div');
        Object.assign(r.style, { position: 'fixed', left: e.clientX - 18 + 'px', top: e.clientY - 18 + 'px', width: '36px', height: '36px', borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.9)', zIndex: 99998, pointerEvents: 'none', transition: 'transform 0.35s ease-out, opacity 0.35s ease-out', transform: 'scale(0.4)', opacity: '1' });
        document.body.appendChild(r);
        requestAnimationFrame(() => { r.style.transform = 'scale(1.3)'; r.style.opacity = '0'; });
        setTimeout(() => r.remove(), 400);
    }, true);
    window.addEventListener('mouseup', () => { cur.style.transform = 'scale(1)'; }, true);
`;

async function play(game, sleep, limitMs = 25000) {
    const t0 = Date.now();
    const left = () => limitMs - (Date.now() - t0);
    let pos = { x: 1780, y: 980 };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const send = (type, x, y) => game.send('Input.dispatchMouseEvent', {
        type, x: Math.round(x), y: Math.round(y),
        button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0,
        clickCount: type === 'mouseMoved' ? 0 : 1, pointerType: 'mouse'
    });
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Плавное движение по дуге, как рукой: быстрее на коротких расстояниях
    async function move(x, y, ms) {
        const dist = Math.hypot(x - pos.x, y - pos.y);
        ms = ms || Math.min(650, 200 + dist * 0.35);
        const from = { ...pos }, steps = Math.max(5, Math.round(ms / 16));
        const bend = rnd(-0.12, 0.12) * dist;
        const nx = -(y - from.y), ny = x - from.x, nl = Math.hypot(nx, ny) || 1;
        for (let i = 1; i <= steps; i++) {
            const t = ease(i / steps), arc = Math.sin(Math.PI * t) * bend;
            pos = { x: from.x + (x - from.x) * t + nx / nl * arc, y: from.y + (y - from.y) * t + ny / nl * arc };
            send('mouseMoved', pos.x, pos.y).catch(() => { });
            await sleep(16);
        }
    }
    async function click(hold = rnd(70, 120)) {
        await send('mousePressed', pos.x, pos.y);
        await sleep(hold);
        await send('mouseReleased', pos.x, pos.y);
    }
    const rect = (sel) => game.eval(`const e = document.querySelector(${JSON.stringify(sel)});
        if (!e || !e.offsetParent) return null; const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };`);
    const tree = () => game.eval('const p = R.scene.treePoint(); return { x: p.x, y: p.y, r: (p.bottom - p.top) / 2 };');
    async function clickOn(sel, wait) {
        if (left() < 1200) return false;
        const r = await rect(sel);
        if (!r) { console.log('  нет на экране:', sel); return false; }
        await move(r.x + rnd(-r.w * 0.15, r.w * 0.15), r.y + rnd(-r.h * 0.12, r.h * 0.12));
        await sleep(rnd(90, 180));
        await click();
        await sleep(wait || rnd(250, 400));
        return true;
    }
    // Тапы по дереву: неровный ритм, рука немного «гуляет» по кроне
    async function tapTree(n, fast) {
        if (left() < 1500) return;
        const t = await tree();
        await move(t.x + rnd(-t.r * 0.25, t.r * 0.25), t.y + rnd(-t.r * 0.2, t.r * 0.2));
        for (let i = 0; i < n; i++) {
            if (Math.random() < 0.35) await move(t.x + rnd(-t.r * 0.45, t.r * 0.45), t.y + rnd(-t.r * 0.35, t.r * 0.3), rnd(60, 130));
            await click(rnd(45, 85));
            await sleep(fast ? rnd(70, 150) : rnd(110, 260));
        }
    }

    // ---------- Сам ролик (~25 с) ----------
    await move(1150, 620, 500);                          // рука заходит в кадр
    await tapTree(10);                                   // тапы — летят монетки
    await sleep(250);
    await clickOn('#btn-grow', 520);                     // растим дерево
    await clickOn('#btn-grow', 300);                     // ещё уровень — новая стадия!
    await sleep(1200);                                   // смотрим окно «Дерево выросло»
    await clickOn('.modal [data-a=stageTake]', 700);
    await tapTree(6);                                    // радуга наполняется
    await game.eval('R.game.S.charge = R.CFG.chargeMax;');
    await sleep(300);
    await clickOn('#btn-rainbow', 250);                  // радужный дождь!
    await tapTree(14, true);
    // Бабочка: появляется, курсор её догоняет и ловит
    await game.eval('R.main.debug.comet();');
    await sleep(1100);
    for (let k = 0; k < 18; k++) {
        const c = await game.eval('const p = R.scene.cometPoint(); return p ? { x: p.x, y: p.y } : null;');
        if (!c) break;
        const d = Math.hypot(c.x - pos.x, c.y - pos.y);
        if (d < 36 || k === 17) {
            await game.eval('window.__luck = Math.random; Math.random = () => 0.1;');   // в ролике — мешочек монет
            await click();
            await game.eval('Math.random = window.__luck;');
            break;
        }
        await move(c.x + rnd(-6, 6), c.y + rnd(-6, 6), Math.min(240, 90 + d * 0.25));
    }
    await sleep(700);
    // Зовём зверят
    await clickOn('.tab[data-tab=helpers]', 700);
    await clickOn('[data-a="hire:3"]', 420);
    await clickOn('[data-a="hire:4"]', 520);
    await clickOn('.tab.active', 500);                   // панель свернули — сад целиком
    await tapTree(8);
    await move(pos.x + 120, pos.y + 160, 400);           // рука отходит, любуемся садом
    await sleep(Math.max(300, Math.min(1000, left())));
    console.log('  сценарий: ' + ((Date.now() - t0) / 1000).toFixed(1) + ' с');
}

module.exports = { CURSOR, play };
