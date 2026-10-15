// scene.js — живой сад на весь экран (Canvas): небо, солнце, облака, холмы,
// луг, дерево, зверята, волшебные цветы, радуга, бабочки и частицы.
// Интерфейс (HTML) лежит поверх и сообщает сцене, где оставить место под дерево.

(function (root) {
    const R = root.R = root.R || {};
    const U = R.util;
    const P = R.paint;
    const G = R.game;
    const CFG = R.CFG;
    const SC = R.scene = {};

    let cv, ctx, dpr = 1;
    let W = 0, H = 0;
    let time = 0;

    // Где рисовать дерево: прямоугольник от интерфейса (плавно подстраивается)
    const view = { x: 0, y: 0, w: 1, h: 1, tx: 0, ty: 0, tw: 1, th: 1, ready: false };
    let coinTarget = { x: 40, y: 40 };

    // ---------- Палитры неба по стадиям: верх, низ, холмы дальние, холмы ближние, луг ----------
    const SKY = [
        ['#8fd3ff', '#fff0d6', '#b9dcc0', '#8fcf86', '#79c45a'],   // семечко — утро
        ['#7fd0ff', '#eaffdf', '#a9dcc8', '#86d07a', '#6fc24f'],   // росток — весна
        ['#69c4ff', '#ddf5ff', '#9fd6d0', '#7ccb76', '#63bb4c'],   // саженец — ясный день
        ['#58b8ff', '#e3fbff', '#95cfd8', '#70c46e', '#58b448'],   // деревце — лето
        ['#8dbaff', '#ffe0ef', '#c4c9e8', '#8fcf86', '#6cc25a'],   // цветущее — розовая весна
        ['#73b8ff', '#fff0c4', '#b8cfb0', '#86c46a', '#6cb84a'],   // яблоня — тёплое лето
        ['#6b5bd6', '#ffb8dc', '#8f86d8', '#6aa88a', '#4f9a62'],   // волшебное — сумерки
        ['#7a6bff', '#a8f0ff', '#a8a0ff', '#7ccb9a', '#5fbf6a']    // Древо Мира — сияние
    ];

    function palette() {
        const s = G.stageIndex();
        const p = G.isMaxed() ? 1 : G.subLevel() / CFG.levelsPerStage;
        const a = SKY[s], b = SKY[Math.min(s + 1, SKY.length - 1)];
        // Первые 60% стадии — свой цвет, дальше плавный переход к следующей
        const tt = p < 0.6 ? 0 : (p - 0.6) / 0.4 * 0.5;
        return a.map((c, i) => U.mix(c, b[i], tt));
    }

    // ---------- Частицы ----------
    const parts = [];
    const MAX_PARTS = 420;

    function add(p) {
        if (parts.length >= MAX_PARTS) parts.shift();
        p.age = 0;
        parts.push(p);
        return p;
    }

    // ---------- Дерево ----------
    let sprite = null, spriteKey = '';
    let oldSprite = null, morph = 1;          // смена стадии: старое дерево тает, новое растёт
    const spring = { s: 1, v: 0 };             // "сжатие" при тапе
    let kick = 0;                              // толчок качания
    let gust = 0;                              // порыв ветра (авто-тап)
    let growPop = 0;                           // подпрыгивание при покупке уровня
    let tree = { x: 0, y: 0, k: 1, info: null };

    // Какую долю высоты сада занимает дерево: с каждой стадией всё больше
    function treeFrac(s, p) {
        const F = [0.24, 0.33, 0.42, 0.5, 0.55, 0.58, 0.61, 0.64];
        const next = s < 7 ? F[s + 1] : F[7] + 0.03;
        return U.lerp(F[s], U.lerp(F[s], next, 0.85), p);
    }

    function currentTreeParams() {
        const s = G.stageIndex();
        const p = G.isMaxed() ? 1 : G.subLevel() / CFG.levelsPerStage;
        return { s, p };
    }

    // Сколько пикселей в единице мира для сада высотой h и шириной w
    function treeScale(h, w) {
        const { s, p } = currentTreeParams();
        const m = R.tree.measure(s, p);
        return Math.min(h * treeFrac(s, p) / m.h, w * 0.9 / (m.halfW * 2));
    }

    function updateTreeSprite(force) {
        const { s, p } = currentTreeParams();
        // Вписываем дерево и по высоте, и по ширине (на узком телефоне крона не вылезет)
        const k = treeScale(view.th, view.tw);
        const key = s + ':' + G.S.level + ':' + Math.round(k * dpr * 20);
        if (!force && key === spriteKey) return;
        const prevStage = sprite ? sprite.stage : s;
        const prev = sprite;
        sprite = R.tree.makeSprite(s, p, k * dpr);
        sprite.stage = s;
        sprite.kView = k;
        spriteKey = key;
        if (prev && prevStage !== s) {
            oldSprite = prev;
            morph = 0;
        }
    }

    // ---------- Облака, холмы (кэш) ----------
    let clouds = [];
    let hillsCanvas = null, hillsKey = '';

    function makeClouds() {
        clouds = [];
        const n = W > H ? 7 : 5;
        for (let i = 0; i < n; i++) {
            const w = (120 + Math.random() * 120) * uScale();
            clouds.push({
                img: P.cloudSprite(w * dpr, 11 + i * 7),
                w, h: w * 0.55,
                x: Math.random() * W,
                y: H * (0.05 + Math.random() * 0.32),
                v: (6 + Math.random() * 10) * uScale(),
                a: 0.75 + Math.random() * 0.25
            });
        }
    }

    // Где на экране земля. Пока дерево маленькое, горизонт выше (меньше пустого неба),
    // по мере роста он плавно опускается
    const GROUND = [0.72, 0.76, 0.83, 0.88, 0.9, 0.9, 0.9, 0.9];
    let groundFrac = 0.8;
    function groundTarget() {
        const st = G.stageIndex();
        const p = G.isMaxed() ? 1 : G.subLevel() / CFG.levelsPerStage;
        return U.lerp(GROUND[st], GROUND[Math.min(st + 1, 7)], p);
    }
    function groundY() { return view.y + view.h * groundFrac; }

    // Общий масштаб для зверят, цветов, текста — от высоты области сада
    function uScale() { return U.clamp(Math.min(view.h, view.w * 1.4) / 620, 0.55, 1.6); }

    // Холмы, луг и неподвижные украшения рисуются один раз в отдельный холст
    // относительно опорной линии земли; при выводе холст просто сдвигается.
    // Так фон не перерисовывается каждый кадр, пока выезжает панель
    let hillsRef = 0, hillsU = 1;
    let frontCanvas = null;
    function drawHills(pal) {
        const u = Math.round(uScale() * 10) / 10;
        const decorN = R.decor.unlocked(G.S.bestLevel).length;
        const key = W + 'x' + H + ':' + Math.round(tree.x) + ':' + Math.round(view.w) + ':' + u + ':' + decorN + ':' + pal.join('');
        if (key === hillsKey && hillsCanvas) return;
        hillsKey = key;
        hillsU = u;
        hillsCanvas = hillsCanvas || document.createElement('canvas');
        const CH = H * 1.6;
        hillsCanvas.width = Math.ceil(W * dpr);
        hillsCanvas.height = Math.ceil(CH * dpr);
        let c = hillsCanvas.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, W, CH);
        const gy = hillsRef = H * 0.62;
        const Hb = H;
        H = CH;   // временно: луг тянется до низа высокого холста
        const layer = (base, amp, freq, phase, color, shade) => {
            c.beginPath();
            c.moveTo(0, H);
            for (let x = 0; x <= W + 10; x += 8) {
                const y = base - amp * (0.55 + 0.45 * Math.sin(x * freq + phase)) - amp * 0.35 * Math.sin(x * freq * 2.3 + phase * 1.7);
                c.lineTo(x, y);
            }
            c.lineTo(W, H);
            c.closePath();
            const g = c.createLinearGradient(0, base - amp * 1.4, 0, base + 40);
            g.addColorStop(0, U.shade(color, 0.12));
            g.addColorStop(1, U.shade(color, shade));
            c.fillStyle = g;
            c.fill();
        };
        layer(gy - 70 * u, 70 * u, 0.006 / u, 1.3, pal[2], -0.05);
        layer(gy - 25 * u, 55 * u, 0.009 / u, 4.1, pal[3], -0.1);
        // Дальние украшения (мельница, домик, замок) — на холмах, за радугой
        R.decor.unlocked(G.S.bestLevel).forEach(d => {
            if (R.decor.animated[d.id] || d.depth < 2) return;
            const pos = decorPos(d, gy, u);
            R.decor.draw(c, d.id, pos.x, pos.y, pos.k, 0);
        });
        // Дальше рисуем луг — в отдельный холст, он будет перед радугой
        const back = c;
        frontCanvas = frontCanvas || document.createElement('canvas');
        frontCanvas.width = hillsCanvas.width;
        frontCanvas.height = hillsCanvas.height;
        c = frontCanvas.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, W, CH);
        void back;
        // Луг — широкий холм, на котором стоит дерево
        c.beginPath();
        c.moveTo(0, H);
        c.lineTo(0, gy + 18 * u);
        const cx = tree.x;
        c.bezierCurveTo(cx - W * 0.35, gy - 6 * u, cx - W * 0.2, gy - 22 * u, cx, gy - 22 * u);
        c.bezierCurveTo(cx + W * 0.2, gy - 22 * u, cx + W * 0.35, gy - 6 * u, W, gy + 18 * u);
        c.lineTo(W, H);
        c.closePath();
        const g = c.createLinearGradient(0, gy - 30 * u, 0, H);
        g.addColorStop(0, U.shade(pal[4], 0.18));
        g.addColorStop(0.3, pal[4]);
        g.addColorStop(1, U.shade(pal[4], -0.22));
        c.fillStyle = g;
        c.fill();
        // Травинки и цветочки на лугу — фиксированный узор
        const rnd = P.rng(77);
        for (let i = 0; i < 70; i++) {
            const x = rnd() * W;
            const y = gy + rnd() * (H - gy) * 0.9 + 4 * u;
            if (Math.abs(x - cx) < 60 * u && y < gy + 30 * u) continue;
            const r = rnd();
            if (r < 0.62) {
                c.strokeStyle = U.shade(pal[4], -0.25);
                c.lineWidth = 2 * u;
                c.lineCap = 'round';
                c.beginPath();
                c.moveTo(x, y); c.quadraticCurveTo(x - 2 * u, y - 7 * u, x - 4 * u, y - 10 * u);
                c.moveTo(x + 3 * u, y); c.quadraticCurveTo(x + 4 * u, y - 8 * u, x + 7 * u, y - 11 * u);
                c.stroke();
            } else {
                const col = ['#ffffff', '#fff27a', '#ffb3d1', '#c9b3ff'][Math.floor(rnd() * 4)];
                c.fillStyle = col;
                for (let k = 0; k < 5; k++) {
                    const a = k * Math.PI * 2 / 5;
                    P.circle(c, x + Math.cos(a) * 2.6 * u, y + Math.sin(a) * 2.6 * u, 2 * u);
                    c.fill();
                }
                c.fillStyle = '#ffcf3d';
                P.circle(c, x, y, 1.6 * u);
                c.fill();
            }
        }
        // Ближние неподвижные украшения — на лугу, перед радугой
        R.decor.unlocked(G.S.bestLevel).forEach(d => {
            if (R.decor.animated[d.id] || d.depth >= 2) return;
            const pos = decorPos(d, gy, u);
            R.decor.draw(c, d.id, pos.x, pos.y, pos.k, 0);
        });
        H = Hb;
    }

    // Где стоит украшение: depth 0 — на лугу, 1 — ближний холм, 2 — дальний, 3 — в небе
    function decorPos(d, gy, u) {
        const scale = [1.3, 1.05, 0.8, 0.85][d.depth];
        const yOff = [14, -10, -46, -150][d.depth];
        const x = U.clamp(tree.x + d.dx * view.w * 1.05, view.x + 44 * u, view.x + view.w - 44 * u);
        return { x, y: gy + yOff * u, k: scale * u };
    }

    // Анимированные украшения (мельница, фонтан, остров) — каждый кадр
    function drawAnimatedDecor() {
        const gy = groundY(), u = hillsU;
        R.decor.unlocked(G.S.bestLevel).forEach(d => {
            if (!R.decor.animated[d.id]) return;
            const pos = decorPos(d, gy, u);
            R.decor.draw(ctx, d.id, pos.x, pos.y, pos.k, time);
        });
    }

    // ---------- Зверята в саду ----------
    // Для каждого купленного зверька держим "актёров" с позицией и поведением
    const actors = [];

    function actorCount(i, lvl) {
        if (lvl <= 0) return 0;
        const id = CFG.helpers[i].id;
        if (id === 'bee') return Math.min(1 + Math.floor(lvl / 10), 5);
        if (id === 'owl') return 1;
        if (id === 'dragon') return lvl >= 50 ? 2 : 1;
        return Math.min(1 + Math.floor(lvl / 25), 3);
    }

    function syncActors() {
        CFG.helpers.forEach((h, i) => {
            const need = actorCount(i, G.S.helpers[i]);
            const have = actors.filter(a => a.i === i);
            for (let k = have.length; k < need; k++) {
                actors.push({
                    i, id: h.id, n: k, seed: Math.random() * 100,
                    x: tree.x + (Math.random() - 0.5) * 100, y: groundY(),
                    dir: Math.random() < 0.5 ? -1 : 1, phase: Math.random() * 10,
                    state: 'walk', stateT: 1 + Math.random() * 3,
                    hop: 0, hopT: Math.random() * 2, nextCoin: 1 + Math.random() * 2.5,
                    appear: 0, perch: k, jump: null, flap: 0, flapT: 4 + Math.random() * 8,
                    happy: 0, breathT: 3 + Math.random() * 5,
                    sc: 0.86 + Math.random() * 0.24      // зверята одного вида — немного разного роста
                });
            }
            for (let k = have.length - 1; k >= need; k--) actors.splice(actors.indexOf(have[k]), 1);
        });
    }

    // Точка посадки на дереве (или на земле рядом, пока дерево маленькое)
    function perchPoint(a, index) {
        const u = uScale();
        const info = tree.info;
        if (info && info.perches.length && G.stageIndex() >= 2) {
            // Сова сидит на месте 1, белочки — на остальных ветках
            const spots = info.perches.length > 2 ? (a.id === 'owl' ? [1] : [0, 2, 3]) : [0];
            const pt = info.perches[spots[index % spots.length] % info.perches.length];
            return { x: tree.x + pt.x * tree.k, y: tree.y + pt.y * tree.k, dir: pt.x < 0 ? -1 : 1 };
        }
        const side = a.id === 'owl' ? 1 : -1;
        return { x: tree.x + side * (95 + a.n * 30) * u, y: groundY() - 4 * u, dir: -side };
    }

    function updateActor(a, dt) {
        const u = uScale();
        const gy = groundY();
        const half = view.w * 0.42;
        const edgeL = view.x + 30 * u, edgeR = view.x + view.w - 30 * u;
        a.appear = Math.min(1, a.appear + dt * 1.5);
        a.happy = Math.max(0, a.happy - dt * 0.8);
        const info = tree.info;
        const crownX = tree.x + (info ? info.crownX * tree.k : 0);
        const crownY = tree.y + (info ? info.crownY * tree.k : -100);
        const crownR = Math.max(40 * u, info ? info.crownR * tree.k : 60);

        if (a.id === 'bee') {
            // Пчёлка летает восьмёркой вокруг кроны
            const ph = time * (0.55 + a.n * 0.08) + a.seed + a.n * 1.9;
            const nx = crownX + Math.sin(ph) * Math.min(crownR * 1.15 + 20 * u, view.w * 0.4);
            const ny = Math.max(view.y + 26 * u, crownY + Math.sin(ph * 1.7) * crownR * 0.55 - 10 * u);
            a.dir = nx >= a.x ? 1 : -1;
            a.x = nx; a.y = ny;
        } else if (a.id === 'hedgehog' || a.id === 'bunny') {
            // Ёжики гуляют слева от дерева, кролики прыгают справа
            const side = a.id === 'hedgehog' ? -1 : 1;
            const minX = tree.x + side * (60 * u + crownR * 0.2), maxX = tree.x + side * half;
            const lo = Math.max(edgeL, Math.min(minX, maxX)), hi = Math.min(edgeR, Math.max(minX, maxX));
            // У каждого зверька своя «дорожка» — не слипаются в кучку
            const lane = (a.n % 3) / 3;
            const llo = U.lerp(lo, hi, lane), lhi = U.lerp(lo, hi, Math.min(1, lane + 0.45));
            if (a.x < lo - 5 || a.x > hi + 5) a.x = U.lerp(llo, lhi, 0.5);
            a.stateT -= dt;
            if (a.id === 'hedgehog') {
                // То идёт, то останавливается понюхать воздух
                if (a.stateT <= 0) {
                    a.state = a.state === 'walk' ? 'idle' : 'walk';
                    a.stateT = a.state === 'walk' ? U.rand(2, 5) : U.rand(0.8, 2);
                    if (a.state === 'walk' && Math.random() < 0.4) a.dir *= -1;
                }
                if (a.state === 'walk') a.x += a.dir * 24 * u * dt;
                if (a.x < llo) { a.x = llo; a.dir = 1; }
                if (a.x > lhi) { a.x = lhi; a.dir = -1; }
                a.y = gy + (8 + a.n * 10) * u;
            } else {
                // Кролик: присел — прыжок — приземлился — посидел
                a.hopT -= dt;
                if (a.hop > 0) {
                    a.hop = Math.min(1, a.hop + dt * 1.7);
                    if (a.hop > 0.15 && a.hop < 0.85) a.x += a.dir * 70 * u * dt;
                    if (a.hop >= 1) a.hop = 0;
                } else if (a.hopT <= 0) {
                    a.hop = 0.001;
                    a.hopT = U.rand(0.9, 2.6);
                    if (Math.random() < 0.3) a.dir *= -1;
                }
                if (a.x < llo) { a.x = llo; a.dir = 1; }
                if (a.x > lhi) { a.x = lhi; a.dir = -1; }
                const air = a.hop > 0.15 && a.hop < 0.85 ? Math.sin((a.hop - 0.15) / 0.7 * Math.PI) : 0;
                a.y = gy + (12 + a.n * 10) * u - air * 28 * u;
            }
        } else if (a.id === 'squirrel') {
            // Белочка сидит на ветке и иногда перепрыгивает на другую
            a.stateT -= dt;
            if (!a.jump && a.stateT <= 0 && info && info.perches.length > 1 && G.stageIndex() >= 3) {
                a.jump = { from: a.perch, to: a.perch + 1, t: 0 };
                a.stateT = U.rand(6, 12);
            }
            if (a.jump) {
                a.jump.t = Math.min(1, a.jump.t + dt * 1.4);
                const p0 = perchPoint(a, a.jump.from), p1 = perchPoint(a, a.jump.to);
                const tt = U.easeInOutSine(a.jump.t);
                a.x = U.lerp(p0.x, p1.x, tt);
                a.y = U.lerp(p0.y, p1.y, tt) - Math.sin(tt * Math.PI) * 50 * u;
                a.dir = p1.x >= p0.x ? 1 : -1;
                a.hop = a.jump.t;
                if (a.jump.t >= 1) { a.perch = a.jump.to; a.jump = null; a.hop = 0; }
            } else {
                const p = perchPoint(a, a.perch);
                a.x = p.x; a.y = p.y + Math.sin(time * 2 + a.seed) * 1.2 * u;
                a.dir = p.dir;
            }
        } else if (a.id === 'owl') {
            const p = perchPoint(a, 0);
            a.x = p.x; a.y = p.y + Math.sin(time * 1.6 + a.seed) * 1.2 * u;
            a.dir = p.dir;
            // Время от времени сова взмахивает крыльями
            a.flapT -= dt;
            if (a.flapT <= 0) { a.flapT = U.rand(7, 14); a.flap = 1; }
            a.flap = Math.max(0, a.flap - dt * 1.6);
        } else if (a.id === 'dragon') {
            const ph = time * 0.35 + a.seed;
            const rx = Math.min(view.w * 0.38, 260 * u), ry = 40 * u;
            a.dir = -Math.sin(ph) >= 0 ? 1 : -1;
            a.x = tree.x + Math.cos(ph) * rx;
            a.y = Math.max(view.y + 40 * u, view.y + view.h * (0.22 + a.n * 0.08) + Math.sin(ph * 2) * ry);
            // Дракончик выдыхает золотые искорки
            a.breathT -= dt;
            if (a.breathT <= 0) {
                a.breathT = U.rand(3, 7);
                for (let i = 0; i < 10; i++) {
                    add({ type: 'spark', x: a.x + a.dir * 24 * u, y: a.y - 8 * u, vx: a.dir * U.rand(60, 140) * u, vy: U.rand(-40, 40) * u, life: U.rand(0.5, 0.9), size: U.rand(3, 6) * u, color: '#ffe066' });
                }
            }
        }
        if (a.id !== 'squirrel' && a.id !== 'bunny') a.hop = 0;

        // Зверёк время от времени "приносит" монетку — она летит к счётчику
        a.nextCoin -= dt;
        if (a.nextCoin <= 0) {
            a.nextCoin = 2.2 + Math.random() * 2.5 + actors.length * 0.25;
            deliverCoin(a.x, a.y - 20 * u);
        }
    }

    // Каждый зверёк рисуется в свой маленький холст не чаще 20 раз в секунду,
    // а на экран выводится каждый кадр — движение по саду плавное, а рисования
    // векторных фигур в 3 раза меньше (важно для слабых телефонов)
    const ACTOR_FPS = 20;
    function drawActor(a) {
        const u = uScale();
        // Холст под масштаб с шагом 0.1: пока плавно выезжает панель и масштаб сада
        // меняется каждый кадр, холст пересоздаётся всего несколько раз, а не каждый кадр
        const uq = Math.ceil(u * 10) / 10;
        const size = { bee: 30, hedgehog: 38, squirrel: 38, bunny: 38, owl: 42, dragon: 46 }[a.id] * uq * (a.sc || 1);
        const box = Math.ceil(size * 2.2);
        const px = Math.ceil(box * dpr);
        // Холст только растёт: зверёк поменьше рисуется в уже готовый холст побольше
        if (!a.cv || a.cv.width < px) {
            a.cv = document.createElement('canvas');
            a.cv.width = a.cv.height = px;
            a.cvAt = -1;
        }
        if (a.cvSize !== size) { a.cvSize = size; a.cvAt = -1; }
        const cw = a.cv.width, cbox = cw / dpr;
        if (time - a.cvAt >= 1 / ACTOR_FPS || a.cvAt < 0) {
            a.cvAt = time;
            const c = a.cv.getContext('2d');
            c.setTransform(1, 0, 0, 1, 0, 0);
            c.clearRect(0, 0, cw, cw);
            c.setTransform(dpr, 0, 0, dpr, cw / 2, cw / 2);
            R.critters.draw(a.id, c, size, time + a.phase, a.n, {
                moving: a.state === 'walk', hop: a.hop, flap: a.flap ? Math.sin(a.flap * Math.PI * 3) * 0.5 + 0.5 : 0,
                happy: a.happy, carry: true
            });
        }
        ctx.save();
        // Радостный подскок после покупки
        const jumpY = a.happy > 0 ? -Math.abs(Math.sin(a.happy * Math.PI * 3)) * 14 * u * a.happy : 0;
        ctx.translate(a.x, a.y + jumpY);
        const pop = U.easeOutBack(a.appear);
        ctx.scale(a.dir * pop, pop);
        const shown = cbox * (u / uq);
        ctx.drawImage(a.cv, -shown / 2, -shown / 2, shown, shown);
        ctx.restore();
    }

    // ---------- Монетка летит к счётчику ----------
    let pendingPassive = 0;

    function deliverCoin(x, y) {
        const u = uScale();
        add({ type: 'fly', x0: x, y0: y, x, y, life: 0.9 + Math.random() * 0.3, size: 9 * u, spin: Math.random() });
    }

    // ---------- Бабочка ----------
    let comet = null;
    let nextCometAt = 0;

    SC.scheduleComet = (first) => {
        const gap = first ? CFG.cometFirstDelay : U.rand(CFG.cometMinGap, CFG.cometMaxGap) / G.cometRateMult();
        nextCometAt = time + gap / 1000;
    };

    // Для отладки и сценариев проверки: бабочка через полсекунды
    SC.cometSoon = () => { nextCometAt = time + 0.5; };

    function spawnComet() {
        const u = uScale();
        const fromLeft = Math.random() < 0.5;
        comet = {
            x: fromLeft ? view.x - 40 : view.x + view.w + 40,   // в пределах сада, а не под панелью
            y: view.y + view.h * U.rand(0.25, 0.6),
            dir: fromLeft ? 1 : -1,
            t: 0, life: CFG.cometLife / 1000,
            speed: (view.w + 80) / (CFG.cometLife / 1000),
            size: 34 * u, wob: Math.random() * 10,
            caught: false
        };
        R.emit('cometAppear');
    }

    function updateComet(dt) {
        if (!comet) {
            if (time >= nextCometAt && nextCometAt > 0 && !SC.paused) spawnComet();
            return;
        }
        if (SC.paused) return;          // пока открыто окно или реклама — бабочка ждёт
        comet.t += dt;
        comet.x += comet.dir * comet.speed * dt * (0.8 + 0.4 * Math.sin(comet.t * 1.3 + comet.wob));
        comet.y += Math.sin(comet.t * 2.6 + comet.wob) * 40 * dt * uScale();
        if (Math.random() < 0.5) {
            add({ type: 'spark', x: comet.x + U.rand(-8, 8), y: comet.y + U.rand(-8, 8), vx: -comet.dir * 20, vy: 20, life: 0.6, size: U.rand(3, 6) * uScale(), color: '#fff3a0' });
        }
        if (comet.t > comet.life || comet.x < view.x - 80 || comet.x > view.x + view.w + 80) {
            comet = null;
            SC.scheduleComet(false);
        }
    }

    // ---------- Эффекты по событиям игры ----------

    SC.tapFx = (res, x, y) => {
        const u = uScale();
        // Толчок пружины, но с пределом: даже при бешеных тапах дерево не сплющится
        spring.v = Math.max(-2.2, spring.v - (res.source === 'auto' ? 0.6 : 1.6));
        kick += (Math.random() < 0.5 ? -1 : 1) * (res.source === 'auto' ? 0.01 : 0.025);
        const info = tree.info;
        const cx = tree.x + (info ? info.crownX * tree.k : 0);
        const cy = tree.y + (info ? info.crownY * tree.k : -60);
        if (x === undefined) {
            const r = info ? info.crownR * tree.k : 40;
            x = cx + U.rand(-r, r) * 0.7;
            y = cy + U.rand(-r, r) * 0.4;
        }
        const n = res.crit ? 8 : (res.source === 'auto' ? 1 : 4);
        for (let i = 0; i < n; i++) {
            add({ type: 'coin', x, y, vx: U.rand(-150, 150) * u, vy: U.rand(-360, -210) * u, g: 900 * u, life: 0.85, size: (res.crit ? 15 : 12) * u, spin: Math.random(), vs: U.rand(1.5, 3) });
        }
        if (G.stageIndex() >= 2 && Math.random() < (res.source === 'auto' ? 0.3 : 0.7)) {
            const r = info ? info.crownR * tree.k : 40;
            const leafColor = G.stageIndex() === 4 && Math.random() < 0.6 ? '#ff9fd0' : (G.stageIndex() === 6 ? '#b9a3ff' : (G.stageIndex() === 7 ? '#ffd23f' : '#6fcf4f'));
            add({ type: 'leaf', x: cx + U.rand(-r, r) * 0.8, y: cy + U.rand(-r, r) * 0.3, vx: U.rand(-30, 30) * u, vy: U.rand(20, 50) * u, life: 2.4, size: U.rand(6, 9) * u, rot: Math.random() * 6, vr: U.rand(-3, 3), color: leafColor });
        }
        if (res.source === 'player') {
            add({ type: 'ring', x, y, life: 0.4, size: 10 * u, grow: 60 * u, color: '#ffffff' });
            const size = Math.max(res.crit ? 24 : 18, (res.crit ? 30 : 22) * u);
            if (!res.crit && comboText && comboText.age < 0.3 && parts.includes(comboText)) {
                comboText.value += res.value;
                comboText.text = '+' + U.fmt(comboText.value);
                comboText.age = 0.05;
                comboText.size = Math.min(size * 1.5, comboText.size + 0.6);
                comboText.y -= 2 * u;
            } else {
                const p = add({ type: 'text', x: x + U.rand(-24, 24) * u, y: y - U.rand(10, 26) * u, vy: -70 * u, life: 0.9, size, text: '+' + U.fmt(res.value), color: res.crit ? '#ffe14f' : '#ffffff', crit: res.crit, value: res.value });
                if (!res.crit) comboText = p;
            }
            if (res.crit) {
                add({ type: 'text', x, y: y - 62 * u, vy: -50 * u, life: 1.1, size: Math.max(18, 20 * u), text: R.t('crit'), color: '#ffcf3d', crit: true });
                burst(x, y, 14, '#ffe680', 260);
            }
        }
        if (res.instant) {
            add({ type: 'text', x: cx, y: cy - 60 * u, vy: -40 * u, life: 1.2, size: 26 * u, text: R.t('instant'), color: '#ffffff', crit: true });
            burst(cx, cy, 24, '#ffffff', 300);
        }
    };

    function burst(x, y, n, color, speed) {
        const u = uScale();
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = U.rand(0.4, 1) * speed * u;
            add({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: U.rand(0.5, 0.9), size: U.rand(3, 7) * u, color });
        }
    }
    SC.burst = burst;

    SC.releaseFx = () => {
        const u = uScale();
        flash = 0.55;
        flashColor = '#ffffff';
        shake = 10 * u;
        for (let i = 0; i < 60; i++) {
            setTimeout(() => {
                add({ type: 'coin', x: U.rand(view.x, view.x + view.w), y: -20, vx: U.rand(-20, 20), vy: U.rand(80, 200) * u, g: 380 * u, life: 2.6, size: U.rand(8, 12) * u, spin: Math.random(), vs: U.rand(1, 3), rain: true });
            }, i * 40);
        }
    };

    SC.stageFx = () => {
        flash = 0.85;
        flashColor = '#ffffff';
        shake = 6 * uScale();
        const cx = tree.x, cy = tree.y - view.h * 0.3;
        burst(cx, cy, 60, '#fff6b0', 520);
        burst(cx, cy, 40, '#ffffff', 380);
        updateTreeSprite(true);
    };

    SC.growFx = (count) => {
        growPop = Math.min(1, 0.5 + count * 0.1);
        const u = uScale();
        const info = tree.info;
        const cy = tree.y + (info ? info.crownY * tree.k : -60);
        for (let i = 0; i < 10; i++) {
            add({ type: 'spark', x: tree.x + U.rand(-50, 50) * u, y: cy + U.rand(-40, 40) * u, vx: U.rand(-40, 40) * u, vy: U.rand(-140, -60) * u, life: 0.8, size: U.rand(3, 6) * u, color: '#d6ff9a' });
        }
    };

    // Зверёк куплен: новый появляется с искрами, остальные этого вида радуются
    SC.helperFx = (i, first) => {
        syncActors();
        const list = actors.filter(x => x.i === i);
        list.forEach(a => { a.happy = 1; });
        const a = list[list.length - 1];
        if (a && first) { a.appear = 0; burst(a.x, a.y, 18, CFG.helpers[i].color, 220); }
        else if (a) burst(a.x, a.y - 10 * uScale(), 8, '#fff6b0', 140);
    };

    SC.flowerFx = (i) => {
        const pos = flowerPos(i);
        burst(pos.x, pos.y - 20, 30, CFG.flowers[i].color, 260);
        flowerPop[i] = 0;
    };

    SC.prestigeFx = () => {
        flash = 1;
        flashColor = '#fff6c8';
        actors.length = 0;
        oldSprite = null;
        morph = 1;
        updateTreeSprite(true);
        for (let i = 0; i < 80; i++) {
            add({ type: 'seed', x: U.rand(view.x, view.x + view.w), y: -20 - Math.random() * 200, vx: U.rand(-30, 30), vy: U.rand(60, 160), g: 300, life: 3, size: U.rand(8, 13) * uScale(), rot: Math.random() * 6, vr: U.rand(-2, 2) });
        }
    };

    SC.rewardFx = (x, y) => {
        burst(x === undefined ? tree.x : x, y === undefined ? tree.y - view.h * 0.3 : y, 40, '#ffe680', 360);
        for (let i = 0; i < 16; i++) {
            const u = uScale();
            add({ type: 'coin', x: tree.x + U.rand(-30, 30) * u, y: tree.y - view.h * 0.3, vx: U.rand(-200, 200) * u, vy: U.rand(-420, -220) * u, g: 900 * u, life: 1.1, size: 12 * u, spin: Math.random(), vs: U.rand(1.5, 3) });
        }
    };

    // Монетки от зверят: сцена показывает "+N" над счётчиком не чаще раза в секунду
    SC.passiveTick = () => { pendingPassive += G.takePassiveAccum(); };

    let flash = 0, flashColor = '#ffffff', shake = 0;
    let comboText = null;
    const flowerPop = {};

    // ---------- Цветы в саду ----------
    function flowerPos(i) {
        const u = uScale();
        const side = i % 2 === 0 ? -1 : 1;
        const slot = Math.floor(i / 2);
        const base = Math.max(70 * u, (tree.info ? tree.info.crownR * tree.k * 0.55 : 40));
        return { x: tree.x + side * (base + slot * 46 * u), y: groundY() - 4 * u + (slot % 2) * 10 * u };
    }

    // ---------- Готовые картинки монетки ----------
    const COIN_R = 24;
    let coinFrames = null, coinFramesDpr = 0;
    function coinSprite(spin) {
        if (!coinFrames || coinFramesDpr !== dpr) {
            coinFramesDpr = dpr;
            coinFrames = [];
            for (let i = 0; i < 8; i++) {
                const c = document.createElement('canvas');
                const size = Math.ceil((COIN_R * 2 + 6) * dpr);
                c.width = c.height = size;
                const x = c.getContext('2d');
                x.scale(dpr, dpr);
                P.coin(x, COIN_R + 3, COIN_R + 3, COIN_R, i / 8);
                coinFrames.push(c);
            }
        }
        const idx = Math.floor(((spin % 1) + 1) % 1 * 8) % 8;
        return coinFrames[idx];
    }
    function drawCoin(x, y, r, spin) {
        const img = coinSprite(spin);
        const d = (COIN_R * 2 + 6) * (r / COIN_R);
        ctx.drawImage(img, x - d / 2, y - d / 2, d, d);
    }

    // ---------- Тап ----------
    // Возвращает, во что попал тап: бабочка, дерево (вся область сада) или ничего
    // Корзинка урожая у дерева, когда готов бесплатный подарок
    function basketPos() {
        const u = uScale();
        const r = tree.info ? tree.info.crownR * tree.k : 40;
        // Подальше от ствола: тап по дереву не должен случайно открыть корзинку
        const x = Math.min(tree.x + Math.max(110 * u, r * 1.05), view.x + view.w - 40 * u);
        return { x, y: groundY() + 2 * u, s: 34 * u };
    }
    function drawBasket() {
        if (!G.freeChestReady() || !SC.basketEnabled) return;
        const b = basketPos();
        const bob = Math.abs(Math.sin(time * 3)) * 4;
        ctx.save();
        ctx.translate(b.x, b.y - bob);
        const glow = ctx.createRadialGradient(0, -b.s * 0.4, 0, 0, -b.s * 0.4, b.s * 1.4);
        glow.addColorStop(0, 'rgba(255,240,150,0.6)');
        glow.addColorStop(1, 'rgba(255,240,150,0)');
        ctx.fillStyle = glow;
        P.circle(ctx, 0, -b.s * 0.4, b.s * 1.4);
        ctx.fill();
        const k = b.s / 40;
        ctx.strokeStyle = '#8a5a2a';
        ctx.lineWidth = 3 * k;
        ctx.beginPath();
        ctx.arc(0, -18 * k, 16 * k, Math.PI, 0);
        ctx.stroke();
        [[-8, -22, '#ff5a5a'], [3, -25, '#ffd23f'], [11, -21, '#ff5a5a']].forEach(([ax, ay, col]) => {
            P.circle(ctx, ax * k, ay * k, 7 * k);
            P.fillStroke(ctx, P.ball(ctx, ax * k, ay * k, 7 * k, col), '#7a1f1f', 1.4 * k);
        });
        ctx.beginPath();
        ctx.moveTo(-20 * k, -18 * k); ctx.lineTo(20 * k, -18 * k); ctx.lineTo(15 * k, 0); ctx.lineTo(-15 * k, 0);
        ctx.closePath();
        P.fillStroke(ctx, P.linear(ctx, 0, -18 * k, 0, 0, ['#e8b878', '#c08a4a']), '#6e4424', 2 * k);
        ctx.strokeStyle = 'rgba(110,68,36,0.5)';
        ctx.lineWidth = 1.4 * k;
        [-9, 0, 9].forEach(xx => { ctx.beginPath(); ctx.moveTo(xx * k, -17 * k); ctx.lineTo(xx * 0.8 * k, -1 * k); ctx.stroke(); });
        ctx.restore();
        if (Math.random() < 0.08) add({ type: 'spark', x: b.x + U.rand(-20, 20), y: b.y - b.s * 0.8, vx: 0, vy: -20, life: 0.8, size: 4 * uScale(), color: '#fff6b0' });
    }
    SC.basketEnabled = true;
    SC.basketPoint = () => { const b = basketPos(); return { x: b.x, y: b.y - b.s * 0.4, top: b.y - b.s, bottom: b.y }; };

    // Зверёк под пальцем (кроме тех, кто летает высоко)
    function actorAt(x, y) {
        const u = uScale();
        let best = null, bd = 1e9;
        actors.forEach(a => {
            const size = (a.id === 'bee' ? 30 : 40) * u;
            const d = Math.hypot(x - a.x, y - (a.y - size * 0.1));
            if (d < size * 0.75 && d < bd) { bd = d; best = a; }
        });
        return best;
    }

    // Зверёк радуется тапу: подпрыгивает, искрится
    SC.pokeActor = (a) => {
        a.happy = 1;
        burst(a.x, a.y - 10 * uScale(), 10, CFG.helpers[a.i].color, 180);
    };

    SC.hit = (x, y) => {
        if (comet && !comet.caught) {
            const d = Math.hypot(x - comet.x, y - comet.y);
            if (d < comet.size * 1.6 + 18) return 'comet';
        }
        if (G.freeChestReady() && SC.basketEnabled) {
            const b = basketPos();
            if (Math.hypot(x - b.x, y - (b.y - b.s * 0.4)) < b.s * 1.1) return 'basket';
        }
        const a = actorAt(x, y);
        if (a) { SC.lastActor = a; return 'critter'; }
        if (x >= view.x && x <= view.x + view.w && y >= view.y && y <= view.y + view.h + 30) return 'tree';
        return null;
    };

    SC.catchComet = () => {
        if (!comet) return null;
        const pos = { x: comet.x, y: comet.y };
        burst(pos.x, pos.y, 36, '#fff3a0', 340);
        burst(pos.x, pos.y, 16, '#ffffff', 220);
        comet = null;
        SC.scheduleComet(false);
        return pos;
    };

    SC.cometVisible = () => !!comet;
    SC.cometPoint = () => (comet ? { x: comet.x, y: comet.y, top: comet.y - comet.size, bottom: comet.y + comet.size } : null);

    // Центр кроны на экране — сюда показывает подсказка "тапай" и сюда бьёт пробел
    SC.treePoint = () => {
        const info = tree.info;
        const x = tree.x + (info ? info.crownX * tree.k : 0);
        const y = tree.y + (info ? info.crownY * tree.k : -60);
        const r = info ? info.crownR * tree.k : 40;
        return { x, y, top: y - r, bottom: y + r };
    };

    // ---------- Разметка ----------
    SC.setView = (rect, coinPos) => {
        view.tx = rect.x; view.ty = rect.y; view.tw = rect.w; view.th = rect.h;
        if (!view.ready) {
            view.x = rect.x; view.y = rect.y; view.w = rect.w; view.h = rect.h;
            view.ready = true;
        }
        if (coinPos) coinTarget = coinPos;
    };

    // На слабых устройствах плотность пикселей снижается автоматически
    let maxDpr = 2, slowTime = 0, fastTime = 0, raises = 0;
    function watchQuality(dt) {
        if (dt <= 0 || dt > 0.25) return;
        slowTime = dt > 0.045 ? slowTime + dt : Math.max(0, slowTime - dt * 0.5);
        fastTime = dt < 0.022 ? fastTime + dt : 0;
        if (slowTime > 2.5 && dpr > 1) {
            slowTime = 0;
            fastTime = 0;
            maxDpr = Math.max(1, dpr - 0.5);
            SC.resize();
        } else if (fastTime > 20 && raises < 2 && dpr < Math.min(2, root.devicePixelRatio || 1)) {
            fastTime = 0;
            raises++;
            maxDpr = Math.min(2, dpr + 0.5);
            SC.resize();
        }
    }

    SC.resize = () => {
        dpr = Math.min(maxDpr, root.devicePixelRatio || 1);
        W = root.innerWidth;
        H = root.innerHeight;
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px';
        cv.style.height = H + 'px';
        hillsKey = '';
        spriteKey = '';
        skyGradKey = '';
        coinFrames = null;
        actors.forEach(a => { a.cv = null; });
        Object.keys(flowerCache).forEach(k => delete flowerCache[k]);
        makeClouds();
    };

    SC.init = (canvas) => {
        cv = canvas;
        ctx = cv.getContext('2d');
        SC.resize();
    };

    // Экран для титульного меню — дерево по центру всего экрана
    SC.paused = false;

    // ---------- Кадр ----------
    SC.frame = (dt) => {
        time += dt;
        frameDt = dt;
        watchQuality(dt);
        // Плавно подвинуть область сада к цели (открытие панели и т.п.)
        const a = 1 - Math.pow(0.0015, dt);
        view.x = U.lerp(view.x, view.tx, a);
        view.y = U.lerp(view.y, view.ty, a);
        view.w = U.lerp(view.w, view.tw, a);
        view.h = U.lerp(view.h, view.th, a);

        const pal = palette();
        groundFrac = U.lerp(groundFrac, groundTarget(), 1 - Math.pow(0.05, dt));
        const decorN = R.decor.unlocked(G.S.bestLevel).length;
        if (decorSeen >= 0 && decorN > decorSeen) R.emit('decor', R.decor.unlocked(G.S.bestLevel).slice(decorSeen));
        decorSeen = decorN;
        tree.x = view.x + view.w / 2;
        tree.y = groundY() - 14 * uScale();
        updateTreeSprite(false);
        tree.k = treeScale(view.h, view.w);
        tree.info = sprite.info;

        // Пружина дерева
        spring.v += (1 - spring.s) * 220 * dt;
        spring.v *= Math.pow(0.002, dt);
        spring.s = U.clamp(spring.s + spring.v * dt, 0.86, 1.12);
        kick *= Math.pow(0.02, dt);
        gust *= Math.pow(0.3, dt);
        growPop *= Math.pow(0.01, dt);
        morph = Math.min(1, morph + dt * 0.9);
        flash *= Math.pow(0.02, dt);
        shake *= Math.pow(0.001, dt);

        ambient(dt);
        syncActors();
        actors.forEach(ac => updateActor(ac, dt));
        updateComet(dt);
        updateParts(dt);

        // Монетки от зверят — подпись "+N" у счётчика раз в секунду
        passiveTimer += dt;
        if (passiveTimer > 1) {
            passiveTimer = 0;
            pendingPassive = 0;
        }

        render(pal);
    };
    let passiveTimer = 0;
    let skyGrad = null, skyGradKey = '';
    let frameDt = 1 / 60;
    let decorSeen = -1;

    let ambientAcc = 0;
    function ambient(dt) {
        const st = G.stageIndex();
        if (st < 4 || !tree.info) return;
        ambientAcc += dt * (st === 4 ? 2.2 : 1.6);
        const u = uScale();
        const r = tree.info.crownR * tree.k;
        const cx = tree.x + tree.info.crownX * tree.k, cy = tree.y + tree.info.crownY * tree.k;
        while (ambientAcc >= 1) {
            ambientAcc -= 1;
            if (st === 4 || st === 5) {
                const col = st === 4 ? (Math.random() < 0.7 ? '#ffb3d9' : '#ffffff') : '#7ed957';
                add({ type: 'leaf', x: cx + U.rand(-r, r), y: cy + U.rand(-r * 0.3, r * 0.4), vx: U.rand(-20, 20) * u, vy: U.rand(15, 35) * u, life: 3, size: U.rand(4, 6) * u, rot: Math.random() * 6, vr: U.rand(-2, 2), color: col });
            } else {
                add({ type: 'spark', x: cx + U.rand(-r * 1.2, r * 1.2), y: cy + U.rand(-r, r * 0.6), vx: 0, vy: U.rand(-25, -10) * u, life: 1.6, size: U.rand(2.5, 4.5) * u, color: st === 6 ? '#e4d8ff' : '#fff2a0' });
            }
        }
    }

    function updateParts(dt) {
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.age += dt;
            if (p.age >= p.life) { parts.splice(i, 1); continue; }
            if (p.type === 'fly') {
                const t = U.easeInOutSine(p.age / p.life);
                const cx = (p.x0 + coinTarget.x) / 2, cy = Math.min(p.y0, coinTarget.y) - 80 * uScale();
                p.x = (1 - t) * (1 - t) * p.x0 + 2 * (1 - t) * t * cx + t * t * coinTarget.x;
                p.y = (1 - t) * (1 - t) * p.y0 + 2 * (1 - t) * t * cy + t * t * coinTarget.y;
                if (p.age + dt >= p.life) R.emit('coinArrived');
                continue;
            }
            if (p.g) p.vy += p.g * dt;
            if (p.type === 'leaf') {
                p.vx += Math.sin(time * 3 + p.rot) * 30 * dt;
                p.vy = Math.min(p.vy, 60 * uScale());
            }
            p.x += (p.vx || 0) * dt;
            p.y += (p.vy || 0) * dt;
            if (p.vr) p.rot += p.vr * dt;
            if (p.type === 'coin' && !p.rain && p.y > groundY() && p.vy > 0) {
                p.vy *= -0.35;
                p.vx *= 0.6;
                p.y = groundY();
            }
            if (p.type === 'spark') { p.vx *= Math.pow(0.1, dt); p.vy *= Math.pow(0.1, dt); }
        }
    }

    function drawSky(pal) {
        const skyKey = pal[0] + pal[1] + Math.round(groundY());
        if (skyKey !== skyGradKey) {
            skyGradKey = skyKey;
            skyGrad = ctx.createLinearGradient(0, 0, 0, groundY());
            skyGrad.addColorStop(0, pal[0]);
            skyGrad.addColorStop(1, pal[1]);
        }
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        const u = uScale();
        const s = G.stageIndex();
        // Звёздочки в волшебных сумерках
        if (s >= 6) {
            const rnd = P.rng(5);
            for (let i = 0; i < 40; i++) {
                const x = rnd() * W, y = rnd() * groundY() * 0.6;
                const tw = 0.5 + 0.5 * Math.sin(time * 2 + i);
                ctx.globalAlpha = 0.4 + 0.6 * tw;
                P.sparkle(ctx, x, y, (1.5 + rnd() * 2.5) * u, '#ffffff');
            }
            ctx.globalAlpha = 1;
        }

        // Солнце с мягкими лучами
        const sx = Math.min(W - 70 * u, view.x + view.w * 0.84), sy = Math.max(60 * u, view.y + view.h * 0.08);
        const buff = G.buffActive();
        const sr = 34 * u * (buff ? 1.15 : 1);
        ctx.save();
        ctx.translate(sx, sy);
        const halo = ctx.createRadialGradient(0, 0, sr * 0.5, 0, 0, sr * 4);
        halo.addColorStop(0, s >= 6 ? 'rgba(255,240,200,0.55)' : 'rgba(255,248,200,0.75)');
        halo.addColorStop(1, 'rgba(255,248,200,0)');
        ctx.fillStyle = halo;
        P.circle(ctx, 0, 0, sr * 4);
        ctx.fill();
        if (s < 6) {
            ctx.rotate(time * 0.08);
            ctx.fillStyle = 'rgba(255,236,150,0.55)';
            for (let i = 0; i < 12; i++) {
                ctx.rotate(Math.PI / 6);
                ctx.beginPath();
                ctx.moveTo(sr * 1.15, -sr * 0.12);
                ctx.lineTo(sr * (1.8 + (buff ? 0.4 : 0) + 0.15 * Math.sin(time * 2 + i)), 0);
                ctx.lineTo(sr * 1.15, sr * 0.12);
                ctx.fill();
            }
            P.circle(ctx, 0, 0, sr);
            ctx.fillStyle = P.ball(ctx, 0, 0, sr, '#ffd93d');
            ctx.fill();
        } else {
            // Месяц: круг луны минус смещённый круг (вырезаем через обрезку, не трогая небо)
            ctx.save();
            ctx.beginPath();
            ctx.rect(-sr * 2, -sr * 2, sr * 4, sr * 4);
            ctx.arc(sr * 0.45, -sr * 0.22, sr * 0.82, 0, Math.PI * 2, true);
            ctx.clip('evenodd');
            P.circle(ctx, 0, 0, sr);
            ctx.fillStyle = P.ball(ctx, 0, 0, sr, '#fff3c4');
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();

        // Облака плывут
        clouds.forEach(c => {
            c.x += c.v * frameDt;
            if (c.x > W + c.w) c.x = -c.w;
            ctx.globalAlpha = c.a * (s >= 6 ? 0.55 : 1);
            ctx.drawImage(c.img, c.x, c.y, c.w, c.h);
        });
        ctx.globalAlpha = 1;
    }

    function drawRainbow() {
        const u = uScale();
        const fill = G.S.charge / CFG.chargeMax;
        const buff = G.buffActive();
        const cool = G.cooldownLeft() > 0 && !buff;
        const treeH = (tree.info ? -tree.info.top * tree.k : 100);
        const r = U.clamp(treeH * 1.05 + 46 * u, view.w * 0.24, Math.min(view.w * 0.43, view.h * 0.8));
        const band = U.clamp(r * 0.05, 5 * u, 11 * u);
        const ready = G.canRelease();
        const alpha = buff ? 1 : (cool ? 0.55 : 0.92);
        const glow = buff || ready ? 0.75 + 0.25 * Math.sin(time * 6) : 0;
        P.rainbowArc(ctx, tree.x, groundY() + 6 * u, r, band, buff ? 1 : fill, alpha, glow);
        if (ready && !buff && Math.random() < 0.4) {
            const a = Math.PI + Math.random() * Math.PI;
            add({ type: 'spark', x: tree.x + Math.cos(a) * (r - band * 3), y: groundY() + Math.sin(a) * (r - band * 3), vx: 0, vy: -20, life: 0.7, size: U.rand(3, 6) * u, color: '#ffffff' });
        }
        return r;
    }

    function drawTree() {
        const u = uScale();
        const sway = Math.sin(time * 1.1) * 0.012 + kick * Math.sin(time * 18) + gust * Math.sin(time * 7) * 0.03;
        const sy = spring.s * (1 + growPop * 0.06 * Math.sin(time * 20));
        const sx = 1 + (1 - spring.s) * 0.6;
        const drawSprite = (sp, alpha, scale) => {
            if (!sp) return;
            ctx.save();
            ctx.translate(tree.x, tree.y);
            ctx.rotate(sway);
            const fit = tree.k / sp.kView;     // плавное масштабирование во время анимации
            ctx.scale(sx * scale * fit, sy * scale * fit);
            ctx.globalAlpha = alpha;
            ctx.drawImage(sp.canvas, -sp.ox / dpr, -sp.oy / dpr, sp.canvas.width / dpr, sp.canvas.height / dpr);
            ctx.restore();
        };
        // Мягкая тень на траве: солнце справа сверху, поэтому тень чуть левее.
        // Растёт вместе с кроной, у семечка — совсем маленькая
        const crownW = tree.info ? tree.info.crownR * tree.k : 30;
        const shW = crownW * 1.15;
        const shH = Math.max(6 * u, shW * 0.16);
        const shX = tree.x - shW * 0.12, shY = tree.y + 6 * u;
        // Тень отбрасывает только настоящее дерево (с саженца), семечко и росток — без тени
        const shadowA = G.stageIndex() >= 2 ? 1 : 0;
        ctx.save();
        ctx.globalAlpha = shadowA;
        ctx.translate(shX, shY);
        ctx.scale(1, shH / shW);
        const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, shW);
        sg.addColorStop(0, 'rgba(30,70,20,0.28)');
        sg.addColorStop(0.6, 'rgba(30,70,20,0.14)');
        sg.addColorStop(1, 'rgba(30,70,20,0)');
        ctx.fillStyle = sg;
        P.circle(ctx, 0, 0, shW);
        ctx.fill();
        ctx.restore();
        if (oldSprite && morph < 1) {
            drawSprite(oldSprite, 1 - morph, 1 - morph * 0.3);
            drawSprite(sprite, morph, U.easeOutBack(morph));
        } else {
            drawSprite(sprite, 1, 1);
        }
    }

    const flowerCache = {};
    function flowerSprite(id, size) {
        size = Math.ceil(size / 6) * 6;          // ступеньками: кэш не растёт, пока едет панель
        const key = id + ':' + size + ':' + dpr;
        if (flowerCache[key]) return flowerCache[key];
        const w = size * 1.3, h = size * 1.15;
        const cv = document.createElement('canvas');
        cv.width = Math.ceil(w * dpr);
        cv.height = Math.ceil(h * dpr);
        const c = cv.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, w / 2 * dpr, (h - size * 0.04) * dpr);
        R.flowers.draw(id, c, size, 0);
        return (flowerCache[key] = { cv, w, h });
    }

    function drawFlowers() {
        const u = uScale();
        CFG.flowers.forEach((f, i) => {
            if (!G.flowerUnlocked(i)) return;
            const pos = flowerPos(i);
            if (flowerPop[i] !== undefined && flowerPop[i] < 1) flowerPop[i] = Math.min(1, flowerPop[i] + frameDt);
            const pop = flowerPop[i] === undefined ? 1 : U.easeOutBack(flowerPop[i]);
            const img = flowerSprite(f.id, 58 * u);
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(Math.sin(time * 1.3 + i) * 0.04);
            ctx.scale(pop, pop);
            ctx.drawImage(img.cv, -img.w / 2, -img.h, img.w, img.h);
            ctx.restore();
        });
    }

    function drawParts() {
        parts.forEach(p => {
            const k = p.age / p.life;
            if (p.type === 'coin') {
                ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
                drawCoin(p.x, p.y, p.size, p.spin + p.age * p.vs);
            } else if (p.type === 'fly') {
                ctx.globalAlpha = 1;
                drawCoin(p.x, p.y, p.size * (1 - k * 0.3), p.spin + p.age * 2);
            } else if (p.type === 'seed') {
                ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                P.goldSeed(ctx, 0, 0, p.size);
                ctx.restore();
            } else if (p.type === 'leaf') {
                ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.moveTo(-p.size, 0);
                ctx.quadraticCurveTo(0, -p.size * 0.7, p.size, 0);
                ctx.quadraticCurveTo(0, p.size * 0.7, -p.size, 0);
                ctx.fill();
                ctx.restore();
            } else if (p.type === 'spark') {
                ctx.globalAlpha = 1 - k;
                P.sparkle(ctx, p.x, p.y, p.size * (1 - k * 0.5), p.color);
            } else if (p.type === 'ring') {
                ctx.globalAlpha = (1 - k) * 0.7;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3 * uScale() * (1 - k);
                P.circle(ctx, p.x, p.y, p.size + p.grow * U.easeOutCubic(k));
                ctx.stroke();
            }
        });
        ctx.globalAlpha = 1;
        // Тексты — поверх всего
        parts.forEach(p => {
            if (p.type !== 'text') return;
            const k = p.age / p.life;
            const pop = k < 0.15 ? U.easeOutBack(k / 0.15) : 1;
            ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(pop, pop);
            ctx.font = '900 ' + Math.round(p.size) + 'px ' + SC.font;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';
            ctx.lineWidth = Math.max(3, p.size * 0.26);   // толстая обводка — «+N» читается и на светлом небе
            ctx.strokeStyle = p.crit ? '#8a4a00' : 'rgba(60,40,20,0.85)';
            ctx.strokeText(p.text, 0, 0);
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, 0, 0);
            ctx.restore();
        });
        ctx.globalAlpha = 1;
    }

    SC.font = '"Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

    function render(pal) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sh = shake > 0.3 ? shake : 0;
        if (sh) ctx.translate(U.rand(-sh, sh), U.rand(-sh, sh));

        drawSky(pal);
        drawHills(pal);
        ctx.drawImage(hillsCanvas, 0, groundY() - hillsRef, W, H * 1.6);
        drawRainbow();
        if (frontCanvas) ctx.drawImage(frontCanvas, 0, groundY() - hillsRef, W, H * 1.6);
        drawAnimatedDecor();
        drawBasket();
        // Дракончик летает за деревом
        actors.filter(a => a.id === 'dragon').forEach(drawActor);
        drawFlowers();
        drawTree();
        actors.filter(a => a.id !== 'dragon').sort((a, b) => a.y - b.y).forEach(drawActor);
        drawParts();
        if (comet) {
            const flap = comet.t * 4;
            ctx.save();
            const glow = ctx.createRadialGradient(comet.x, comet.y, 0, comet.x, comet.y, comet.size * 2.2);
            glow.addColorStop(0, 'rgba(255,240,150,0.6)');
            glow.addColorStop(1, 'rgba(255,240,150,0)');
            ctx.fillStyle = glow;
            P.circle(ctx, comet.x, comet.y, comet.size * 2.2);
            ctx.fill();
            ctx.translate(comet.x, comet.y);
            ctx.rotate(comet.dir * 0.25 + Math.sin(comet.t * 3) * 0.1);
            P.butterfly(ctx, 0, 0, comet.size, flap);
            ctx.restore();
        }
        if (flash > 0.01) {
            ctx.globalAlpha = flash;
            ctx.fillStyle = flashColor;
            ctx.fillRect(-20, -20, W + 40, H + 40);
            ctx.globalAlpha = 1;
        }
    }

    // Нарисовать картинку-иконку (зверёк, цветок, стадия дерева) в data URL —
    // интерфейс показывает те же рисунки, что и сад
    SC.portrait = (kind, id, px) => {
        const c = document.createElement('canvas');
        const s = Math.round(px * 2);
        c.width = s; c.height = s;
        const x = c.getContext('2d');
        if (kind === 'helper') {
            x.translate(s * 0.48, s * 0.56);
            R.critters.draw(id, x, s * 0.62, 0.3, 0, { moving: false });
        } else if (kind === 'flower') {
            x.translate(s / 2, s * 0.93);
            R.flowers.draw(id, x, s * 0.86, 0);
        } else if (kind === 'stage') {
            const st = +id;
            const hU = R.tree.heightUnits(st, 0.85), wU = R.tree.widthUnits(st, 0.85);
            const k = Math.min((s * 0.82) / hU, (s * 0.9) / wU);
            x.translate(s / 2, s * 0.9);
            R.tree.draw(x, st, 0.85, k);
        } else if (kind === 'decor') {
            x.translate(s / 2, s * 0.86);
            R.decor.draw(x, id, 0, 0, s / 110, 0);
        } else if (kind === 'coin') {
            P.coin(x, s / 2, s / 2, s * 0.42, 0);
        } else if (kind === 'seed') {
            P.goldSeed(x, s / 2, s / 2, s * 0.36);
        } else if (kind === 'butterfly') {
            P.butterfly(x, s / 2, s / 2, s * 0.4, 0.5);
        }
        return c.toDataURL('image/png');
    };
})(typeof window !== 'undefined' ? window : globalThis);
