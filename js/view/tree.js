// tree.js — рисует Денежное дерево. Восемь стадий (семечко → Древо Мира),
// и внутри стадии дерево постепенно растёт: выше ствол, пышнее крона,
// больше цветов и яблок. Форма строится по "зерну", поэтому не дрожит.
//
// Дерево рисуется один раз в отдельный холст (спрайт) и потом каждый кадр
// просто выводится с покачиванием — это очень быстро даже на слабых телефонах.

(function (root) {
    const R = root.R = root.R || {};
    const U = R.util;
    const P = R.paint;
    const T = R.tree = {};

    // Высота дерева в "единицах мира" для стадии s и прогресса p (0..1)
    T.heightUnits = (s, p) => {
        const H = [46, 95, 175, 255, 300, 335, 370, 430];
        const next = s < 7 ? H[s + 1] : H[7] * 1.06;
        return U.lerp(H[s], U.lerp(H[s], next, 0.85), p);
    };

    // Ширина (для расчёта спрайта): крона шире ствола
    T.widthUnits = (s, p) => {
        const W = [90, 110, 190, 270, 310, 340, 370, 460];
        const next = s < 7 ? W[s + 1] : W[7] * 1.05;
        return U.lerp(W[s], U.lerp(W[s], next, 0.85), p);
    };

    // ---------- Части дерева ----------

    // Холмик земли у основания
    // Холмик земли у основания. Рисуем только верхнюю часть — нижний край
    // уходит в траву, поэтому кажется, что дерево растёт прямо из луга
    function mound(ctx, w, k) {
        const hw = w * 0.5, top = -11 * k, base = 6 * k;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-hw, base);
        ctx.bezierCurveTo(-hw * 0.8, top, hw * 0.8, top, hw, base);
        ctx.quadraticCurveTo(0, base + 5 * k, -hw, base);
        ctx.closePath();
        ctx.fillStyle = P.linear(ctx, 0, top, 0, base + 5 * k, ['#b07a46', '#8a5a30', '#6e4424']);
        ctx.fill();
        // контур только по верху холмика
        ctx.beginPath();
        ctx.moveTo(-hw, base);
        ctx.bezierCurveTo(-hw * 0.8, top, hw * 0.8, top, hw, base);
        ctx.strokeStyle = '#5e3519';
        ctx.lineWidth = 2.4 * k;
        ctx.lineCap = 'round';
        ctx.stroke();
        // комочки земли
        ctx.fillStyle = 'rgba(94,53,25,0.35)';
        [[-0.45, -2], [0.2, -5], [0.5, 0], [-0.1, 1]].forEach(([fx, fy]) => {
            P.ellipse(ctx, fx * hw, fy * k, 3.2 * k, 2 * k);
            ctx.fill();
        });
        // трава по нижнему краю прячет границу холмика
        ctx.strokeStyle = '#4cae45';
        ctx.lineWidth = 1.7 * k;
        const blades = Math.max(8, Math.round(w / (7 * k)));
        for (let i = 0; i <= blades; i++) {
            const x = -hw * 1.05 + (i / blades) * hw * 2.1;
            const y = base + 3 * k;
            const len = (5 + (i % 3) * 2.5) * k;
            ctx.beginPath();
            ctx.moveTo(x, y + 2 * k);
            ctx.quadraticCurveTo(x + 1.5 * k, y - len * 0.6, x + (i % 2 ? 3 : -3) * k, y - len);
            ctx.stroke();
        }
        // травинки на самом холмике
        ctx.strokeStyle = '#5cbf4f';
        ctx.lineWidth = 1.6 * k;
        for (let i = -2; i <= 2; i++) {
            if (i === 0) continue;
            const x = i * hw * 0.32;
            const y = top * 0.55 + Math.abs(i) * 2 * k;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + 2 * k, y - 6 * k, x + (i > 0 ? 4 : -4) * k, y - 10 * k);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Лист: миндаль с прожилкой. angle — направление от черенка
    function leaf(ctx, x, y, len, angle, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
        ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
        const g = P.linear(ctx, 0, -len * 0.4, 0, len * 0.4, [U.shade(color, 0.35), color, U.shade(color, -0.2)]);
        P.fillStroke(ctx, g, U.shade(color, -0.45), Math.max(1, len * 0.06));
        ctx.strokeStyle = U.shade(color, -0.35);
        ctx.lineWidth = Math.max(0.8, len * 0.04);
        ctx.beginPath();
        ctx.moveTo(len * 0.08, 0);
        ctx.lineTo(len * 0.85, 0);
        ctx.stroke();
        ctx.restore();
    }

    // Ствол: сужающийся изогнутый путь от земли до верха
    function trunk(ctx, baseW, topW, h, bend, k, colors) {
        ctx.beginPath();
        ctx.moveTo(-baseW / 2, 0);
        ctx.bezierCurveTo(-baseW * 0.45, -h * 0.35, -topW / 2 + bend * 0.6, -h * 0.7, -topW / 2 + bend, -h);
        ctx.lineTo(topW / 2 + bend, -h);
        ctx.bezierCurveTo(topW / 2 + bend * 0.6, -h * 0.7, baseW * 0.45, -h * 0.35, baseW / 2, 0);
        // корни
        ctx.quadraticCurveTo(baseW * 0.8, 4 * k, baseW * 0.95, 6 * k);
        ctx.lineTo(-baseW * 0.95, 6 * k);
        ctx.quadraticCurveTo(-baseW * 0.8, 4 * k, -baseW / 2, 0);
        ctx.closePath();
        const g = P.linear(ctx, -baseW / 2, 0, baseW / 2, 0, colors || ['#8a5a32', '#b07a48', '#6e4424']);
        P.fillStroke(ctx, g, '#4a2a14', 3 * k);
        // штрихи коры
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = 'rgba(74,42,20,0.35)';
        ctx.lineWidth = 2 * k;
        ctx.lineCap = 'round';
        for (let i = 1; i < 5; i++) {
            const y = -h * i / 5.5;
            const wv = U.lerp(baseW, topW, i / 5.5);
            ctx.beginPath();
            ctx.moveTo(-wv * 0.2, y);
            ctx.quadraticCurveTo(0, y - 5 * k, wv * 0.15, y - 2 * k);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Ветка — сужающийся мазок
    function branch(ctx, x0, y0, x1, y1, w, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        const steps = 6;
        for (let i = 0; i < steps; i++) {
            const t0 = i / steps, t1 = (i + 1) / steps;
            ctx.lineWidth = U.lerp(w, w * 0.35, t0);
            ctx.beginPath();
            ctx.moveTo(U.lerp(x0, x1, t0), U.lerp(y0, y1, t0) - Math.sin(t0 * Math.PI) * w);
            ctx.lineTo(U.lerp(x0, x1, t1), U.lerp(y0, y1, t1) - Math.sin(t1 * Math.PI) * w);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Крона из "облачков": единый контур, объём сверху вниз (светлее к солнцу,
    // темнее снизу), мягкие блики на верхних облачках и штрихи листвы
    function crown(ctx, blobs, colors, k, seed = 1) {
        const [light, mid, dark, line] = colors;
        let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
        blobs.forEach(b => {
            minY = Math.min(minY, b.y - b.r); maxY = Math.max(maxY, b.y + b.r);
            minX = Math.min(minX, b.x - b.r); maxX = Math.max(maxX, b.x + b.r);
        });
        const midY = (minY + maxY) / 2;
        ctx.save();
        // контур — чуть больший силуэт тёмного цвета
        ctx.fillStyle = line;
        blobs.forEach(b => { P.circle(ctx, b.x, b.y, b.r + 3.4 * k); ctx.fill(); });
        // основная заливка с вертикальным градиентом
        ctx.fillStyle = P.linear(ctx, 0, minY, 0, maxY, [U.shade(mid, 0.15), mid, U.shade(dark, -0.05)]);
        blobs.forEach(b => { P.circle(ctx, b.x, b.y, b.r); ctx.fill(); });
        // всё дальнейшее — только внутри силуэта кроны
        ctx.beginPath();
        blobs.forEach(b => { ctx.moveTo(b.x + b.r, b.y); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); });
        ctx.clip();
        // тень снизу каждого облачка — даёт "пухлость"
        ctx.fillStyle = U.rgba(dark, 0.55);
        blobs.forEach(b => { if (b.y > midY - b.r * 0.3) { P.circle(ctx, b.x + b.r * 0.12, b.y + b.r * 0.38, b.r * 0.78); ctx.fill(); } });
        // светлые макушки облачков
        ctx.fillStyle = U.rgba(light, 0.6);
        blobs.forEach(b => { if (b.y < midY + b.r * 0.2) { P.circle(ctx, b.x - b.r * 0.24, b.y - b.r * 0.32, b.r * 0.5); ctx.fill(); } });
        // штрихи листвы
        const rnd = P.rng(seed * 31 + 7);
        ctx.strokeStyle = U.rgba(dark, 0.4);
        ctx.lineWidth = 1.8 * k;
        ctx.lineCap = 'round';
        const marks = Math.round((maxX - minX) / (22 * k));
        for (let i = 0; i < marks; i++) {
            const b = blobs[Math.floor(rnd() * blobs.length)];
            const a = rnd() * Math.PI * 2, d = rnd() * b.r * 0.7;
            const x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d * 0.8;
            ctx.beginPath();
            ctx.moveTo(x - 3 * k, y - 2.5 * k);
            ctx.lineTo(x, y);
            ctx.lineTo(x + 3.5 * k, y - 3.5 * k);
            ctx.stroke();
        }
        // блестящие точки
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        blobs.forEach(b => { if (b.y < midY) { P.ellipse(ctx, b.x - b.r * 0.38, b.y - b.r * 0.48, b.r * 0.16, b.r * 0.09, -0.6); ctx.fill(); } });
        ctx.restore();
    }

    // Пушистая крона-облако: кольцо "облачков" по эллипсу + несколько в середине
    function dome(rnd, cx, cy, Rr, n, k) {
        const blobs = [];
        blobs.push({ x: cx, y: cy, r: Rr * 0.62 });
        blobs.push({ x: cx - Rr * 0.32, y: cy + Rr * 0.12, r: Rr * 0.5 });
        blobs.push({ x: cx + Rr * 0.34, y: cy + Rr * 0.1, r: Rr * 0.5 });
        for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.25;
            const rr = Rr * (0.36 + rnd() * 0.12);
            blobs.push({ x: cx + Math.cos(a) * Rr * 0.66, y: cy + Math.sin(a) * Rr * 0.5, r: rr });
        }
        return blobs;
    }

    function blossomFlower(ctx, x, y, r, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = color;
        for (let i = 0; i < 5; i++) {
            const a = i * Math.PI * 2 / 5;
            P.circle(ctx, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.52);
            ctx.fill();
        }
        ctx.fillStyle = '#fff4a0';
        P.circle(ctx, 0, 0, r * 0.35);
        ctx.fill();
        ctx.restore();
    }

    function apple(ctx, x, y, r, gold) {
        ctx.save();
        P.circle(ctx, x, y, r);
        const g = P.ball(ctx, x, y, r, gold ? '#ffcf33' : '#ff4a4a');
        P.fillStroke(ctx, g, gold ? '#a86b08' : '#9e1f1f', r * 0.16);
        ctx.strokeStyle = '#6b3d1a';
        ctx.lineWidth = r * 0.18;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y - r * 0.8);
        ctx.lineTo(x + r * 0.15, y - r * 1.25);
        ctx.stroke();
        ctx.fillStyle = '#5fc94f';
        P.ellipse(ctx, x + r * 0.45, y - r * 1.1, r * 0.38, r * 0.18, -0.5);
        ctx.fill();
        P.shine(ctx, x - r * 0.35, y - r * 0.3, r * 0.22, r * 0.13, 0.8);
        ctx.restore();
    }

    function crystalFruit(ctx, x, y, r, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.2);
        ctx.lineTo(r * 0.75, -r * 0.1);
        ctx.lineTo(0, r * 1.1);
        ctx.lineTo(-r * 0.75, -r * 0.1);
        ctx.closePath();
        const g = P.linear(ctx, -r, -r, r, r, ['#ffffff', color, U.shade(color, -0.3)]);
        P.fillStroke(ctx, g, U.shade(color, -0.5), r * 0.14);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = r * 0.1;
        ctx.beginPath();
        ctx.moveTo(-r * 0.75, -r * 0.1); ctx.lineTo(r * 0.75, -r * 0.1);
        ctx.moveTo(0, -r * 1.2); ctx.lineTo(0, r * 1.1);
        ctx.stroke();
        ctx.restore();
    }

    function lantern(ctx, x, y, r) {
        ctx.save();
        ctx.strokeStyle = '#6b4a2a';
        ctx.lineWidth = r * 0.12;
        ctx.beginPath();
        ctx.moveTo(x, y - r * 2.2);
        ctx.lineTo(x, y - r);
        ctx.stroke();
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
        g.addColorStop(0, 'rgba(255,230,140,0.55)');
        g.addColorStop(1, 'rgba(255,230,140,0)');
        ctx.fillStyle = g;
        P.circle(ctx, x, y, r * 2.6);
        ctx.fill();
        P.roundRect(ctx, x - r * 0.7, y - r, r * 1.4, r * 1.9, r * 0.5);
        P.fillStroke(ctx, P.linear(ctx, x, y - r, x, y + r, ['#fff3b0', '#ffc94a']), '#8a5a1a', r * 0.14);
        ctx.restore();
    }

    function treehouse(ctx, x, y, k) {
        ctx.save();
        ctx.translate(x, y);
        // площадка
        P.roundRect(ctx, -34 * k, 0, 68 * k, 8 * k, 3 * k);
        P.fillStroke(ctx, '#9a6236', '#4a2a14', 2 * k);
        // домик
        P.roundRect(ctx, -24 * k, -34 * k, 48 * k, 36 * k, 4 * k);
        P.fillStroke(ctx, P.linear(ctx, 0, -34 * k, 0, 0, ['#ffd9a8', '#e8a96a']), '#6e4424', 2.4 * k);
        // крыша
        ctx.beginPath();
        ctx.moveTo(-32 * k, -32 * k);
        ctx.lineTo(0, -58 * k);
        ctx.lineTo(32 * k, -32 * k);
        ctx.closePath();
        P.fillStroke(ctx, P.linear(ctx, 0, -58 * k, 0, -32 * k, ['#ff7a6b', '#d9443a']), '#7a1f18', 2.4 * k);
        // окошко с тёплым светом
        P.circle(ctx, 0, -18 * k, 8 * k);
        P.fillStroke(ctx, '#fff2a0', '#6e4424', 2 * k);
        ctx.strokeStyle = '#6e4424';
        ctx.lineWidth = 1.6 * k;
        ctx.beginPath();
        ctx.moveTo(-8 * k, -18 * k); ctx.lineTo(8 * k, -18 * k);
        ctx.moveTo(0, -26 * k); ctx.lineTo(0, -10 * k);
        ctx.stroke();
        ctx.restore();
    }

    // ---------- Сборка дерева ----------
    // Рисует дерево с основанием в (0,0), растущее вверх (отрицательный y).
    // k — сколько пикселей в одной единице. Возвращает "точки посадки"
    // (куда сядут белочка и сова) и центр кроны (оттуда летят монетки)
    T.draw = (ctx, s, p, k) => {
        const rnd = P.rng(1000 + s * 97);
        const h = T.heightUnits(s, p) * k;
        const info = { perches: [], crownX: 0, crownY: -h * 0.6, crownR: h * 0.35, top: -h };

        if (s === 0) {
            // Семечко в холмике, с каждым уровнем пробивается росток
            mound(ctx, 80 * k, k);
            const sr = (13 + p * 3) * k;
            ctx.save();
            ctx.translate(0, -sr * 0.55);
            ctx.rotate(-0.3);
            P.ellipse(ctx, 0, 0, sr * 0.78, sr);
            P.fillStroke(ctx, P.ball(ctx, 0, 0, sr, '#c98a4b'), '#6e4424', 2.6 * k);
            ctx.strokeStyle = 'rgba(110,68,36,0.5)';
            ctx.lineWidth = 2 * k;
            ctx.beginPath();
            ctx.moveTo(0, -sr * 0.7);
            ctx.quadraticCurveTo(sr * 0.25, 0, 0, sr * 0.7);
            ctx.stroke();
            P.shine(ctx, -sr * 0.3, -sr * 0.35, sr * 0.18, sr * 0.32, 0.7, 0.3);
            ctx.restore();
            if (p > 0.3) {
                const len = U.lerp(8, 24, (p - 0.3) / 0.7) * k;
                ctx.strokeStyle = '#4caf50';
                ctx.lineWidth = 3.4 * k;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(sr * 0.25, -sr * 1.35);
                ctx.quadraticCurveTo(sr * 0.5, -sr * 1.35 - len * 0.6, sr * 0.15, -sr * 1.35 - len);
                ctx.stroke();
                leaf(ctx, sr * 0.15, -sr * 1.35 - len, len * 0.7, -0.6, '#7ed957');
            }
            info.crownY = -sr;
            info.crownR = 30 * k;
            info.top = -sr * 2.5;
            info.halfW = 42 * k;
            return info;
        }

        if (s === 1) {
            // Росток: изогнутый стебель и листья, их всё больше
            mound(ctx, 90 * k, k);
            ctx.strokeStyle = '#3f9a3f';
            ctx.lineWidth = 5 * k;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, -4 * k);
            ctx.bezierCurveTo(-10 * k, -h * 0.4, 12 * k, -h * 0.7, 0, -h * 0.95);
            ctx.stroke();
            const leaves = 2 + Math.floor(p * 5);
            for (let i = 0; i < leaves; i++) {
                const t = 0.35 + 0.6 * (i / Math.max(1, leaves - 1));
                const y = -h * t;
                const x = Math.sin(t * 5) * 6 * k;
                const dir = i % 2 === 0 ? -1 : 1;
                leaf(ctx, x, y, (18 + (1 - t) * 14 + p * 6) * k, dir < 0 ? Math.PI + 0.5 : -0.5, i % 2 ? '#8be05f' : '#6fcf4f');
            }
            leaf(ctx, 0, -h * 0.95, 22 * k, -1.2, '#9be86a');
            leaf(ctx, 0, -h * 0.95, 22 * k, Math.PI + 1.2, '#7ed957');
            info.crownY = -h * 0.7;
            info.crownR = h * 0.4;
            info.top = -h - 14 * k;
            info.halfW = 46 * k;
            return info;
        }

        // Стадии 2..7 — настоящее дерево
        const colorsByStage = {
            2: ['#a8ec7a', '#6fcf4f', '#43a843', '#2d6e2d'],
            3: ['#9be86a', '#55c24f', '#2f9a45', '#1f5e2c'],
            4: ['#b5ef8a', '#62c95a', '#3aa24c', '#215f2e'],
            5: ['#a8ec7a', '#4cbc4f', '#2c8f42', '#1b552a'],
            6: ['#d6c8ff', '#a98bff', '#7a5be0', '#3d2a8a'],
            7: ['#fff1a8', '#ffcf3d', '#e8a020', '#8a5a0a']
        };
        const cc = colorsByStage[s];
        // Пропорции мультяшного дерева: короткий крепкий ствол, большая крона сверху
        const RR = { 3: 0.37, 4: 0.39, 5: 0.4, 6: 0.41, 7: 0.33 };
        const Rr = s >= 3 ? RR[s] * h : 0;
        const twoTier = s === 7;
        const cy = s >= 3 ? -h + Rr * (twoTier ? 1.75 : 0.98) : 0;
        const trunkH = s === 2 ? h * 0.62 : Math.max(h * 0.3, -(cy + Rr * 0.55));
        const baseW = s === 2 ? h * 0.07 : h * (0.13 + 0.006 * s) * (1 + p * 0.08);
        const topW = baseW * 0.62;
        const bend = (rnd() - 0.5) * 8 * k;

        if (s >= 6) {
            // Мягкое сияние вокруг волшебных деревьев
            const gr = ctx.createRadialGradient(0, -h * 0.6, h * 0.05, 0, -h * 0.6, h * 0.75);
            gr.addColorStop(0, s === 7 ? 'rgba(255,240,160,0.55)' : 'rgba(200,170,255,0.5)');
            gr.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gr;
            P.circle(ctx, 0, -h * 0.6, h * 0.75);
            ctx.fill();
        }

        mound(ctx, Math.max(70 * k, baseW * 3.6), k);
        trunk(ctx, baseW, topW, trunkH, bend, k, s === 7 ? ['#9a6a3a', '#c99258', '#7a4e26'] : null);

        // Верхняя граница и ширина считаются по настоящим "облачкам" кроны
        const fit = (blobs) => {
            info.top = Math.min(...blobs.map(b => b.y - b.r)) - 4 * k;
            info.halfW = Math.max(...blobs.map(b => Math.abs(b.x) + b.r)) + 4 * k;
        };

        if (s === 2) {
            // Саженец: тонкие веточки с пучками листьев
            const tufts = 3 + Math.floor(p * 4);
            const pts = [];
            for (let i = 0; i < tufts; i++) {
                const side = i % 2 === 0 ? -1 : 1;
                const y0 = -trunkH * (0.45 + 0.5 * i / tufts);
                const x1 = side * (22 + rnd() * 18) * k * (1 + p * 0.4);
                const y1 = y0 - (14 + rnd() * 16) * k;
                branch(ctx, bend * 0.5, y0, x1, y1, 5 * k, '#7a4e2a');
                pts.push({ x: x1, y: y1 });
            }
            pts.push({ x: bend, y: -trunkH - 6 * k });
            const blobs = [];
            pts.forEach(pt => {
                const r = (16 + p * 8) * k;
                blobs.push({ x: pt.x, y: pt.y, r });
                blobs.push({ x: pt.x + r * 0.6, y: pt.y + r * 0.2, r: r * 0.7 });
                blobs.push({ x: pt.x - r * 0.6, y: pt.y + r * 0.25, r: r * 0.65 });
            });
            crown(ctx, blobs, cc, k, s);
            fit(blobs);
            info.crownY = -trunkH;
            info.crownR = h * 0.3;
            info.perches.push({ x: pts[0].x, y: pts[0].y - 16 * k });
            return info;
        }

        // Ветки уходят в крону
        branch(ctx, bend, -trunkH * 0.82, bend - Rr * 0.5, cy + Rr * 0.25, baseW * 0.36, '#6e4424');
        branch(ctx, bend, -trunkH * 0.88, bend + Rr * 0.55, cy + Rr * 0.2, baseW * 0.34, '#6e4424');

        let blobs = dome(rnd, bend, cy, Rr, 9, k);
        if (twoTier) {
            // Древо Мира — двухъярусная крона
            blobs = blobs.concat(dome(rnd, bend, cy - Rr * 0.78, Rr * 0.7, 7, k));
        }
        crown(ctx, blobs, cc, k, s);
        fit(blobs);

        // Украшения по стадиям — их становится больше с прогрессом
        const spots = [];
        const fr = P.rng(500 + s * 13);
        for (let i = 0; i < 40; i++) {
            const a = fr() * Math.PI * 2;
            const d = Math.sqrt(fr()) * Rr * 0.82;
            spots.push({ x: bend + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.68 - (twoTier && i % 2 ? Rr * 0.7 : 0) });
        }
        if (s === 4) {
            const count = Math.round(10 + p * 18);
            spots.slice(0, count).forEach((pt, i) => blossomFlower(ctx, pt.x, pt.y, (6 + (i % 3)) * k, i % 4 === 0 ? '#ffffff' : '#ff9fd0'));
        }
        if (s === 5) {
            const count = Math.round(6 + p * 12);
            spots.slice(0, count).forEach((pt, i) => apple(ctx, pt.x, pt.y, 9 * k, i % 7 === 3));
        }
        if (s === 6) {
            const count = Math.round(6 + p * 10);
            const cols = ['#7be0ff', '#ff9fe0', '#fff27a', '#b6ff8a'];
            spots.slice(0, count).forEach((pt, i) => crystalFruit(ctx, pt.x, pt.y, 8 * k, cols[i % cols.length]));
            lantern(ctx, bend - Rr * 0.72, cy + Rr * 0.62, 7 * k);
            lantern(ctx, bend + Rr * 0.76, cy + Rr * 0.58, 7 * k);
        }
        if (twoTier) {
            const count = Math.round(10 + p * 12);
            spots.slice(0, count).forEach((pt, i) => (i % 3 === 0 ? apple(ctx, pt.x, pt.y, 9 * k, true) : blossomFlower(ctx, pt.x, pt.y, 7 * k, i % 2 ? '#ffffff' : '#ffb3e0')));
            treehouse(ctx, bend + Rr * 0.05, cy + Rr * 0.32, k * 0.9);
            lantern(ctx, bend - Rr * 0.82, cy + Rr * 0.55, 7 * k);
            lantern(ctx, bend + Rr * 0.86, cy + Rr * 0.5, 7 * k);
        }

        info.crownX = bend;
        info.crownY = twoTier ? cy - Rr * 0.35 : cy;
        info.crownR = Rr * (twoTier ? 1.25 : 1);
        // Места для белочки и совы — на краях кроны
        info.perches.push({ x: bend - Rr * 0.72, y: cy - Rr * 0.3 });
        info.perches.push({ x: bend + Rr * 0.74, y: cy - Rr * 0.22 });
        return info;
    };

    // Размеры дерева в единицах мира: высота над землёй и полуширина
    const measureCache = {};
    T.measure = (s, p) => {
        const key = s + ':' + Math.round(p * 100);
        if (measureCache[key]) return measureCache[key];
        const c = document.createElement('canvas');
        c.width = c.height = 2;
        const info = T.draw(c.getContext('2d'), s, p, 1);
        return (measureCache[key] = { h: -info.top, halfW: info.halfW || 60 });
    };

    // ---------- Спрайт ----------
    // Отрисовать дерево в отдельный холст нужного размера (в пикселях)
    T.makeSprite = (s, p, k) => {
        const m = T.measure(s, p);
        const glow = s >= 6 ? T.heightUnits(s, p) : 0;   // у волшебных деревьев есть сияние вокруг
        const wU = Math.max(m.halfW * 2, glow * 1.5) + 40, hU = Math.max(m.h, glow * 1.35) + 50;
        const c = document.createElement('canvas');
        c.width = Math.ceil(wU * k);
        c.height = Math.ceil(hU * k);
        const ctx = c.getContext('2d');
        const ox = c.width / 2, oy = c.height - 24 * k;
        ctx.translate(ox, oy);
        const raw = T.draw(ctx, s, p, k);
        // Переводим размеры из пикселей холста обратно в единицы мира
        const info = {
            crownX: raw.crownX / k, crownY: raw.crownY / k, crownR: raw.crownR / k,
            top: raw.top / k, halfW: (raw.halfW || 60 * k) / k,
            perches: raw.perches.map(pt => ({ x: pt.x / k, y: pt.y / k }))
        };
        return { canvas: c, ox, oy, info, k };
    };
})(typeof window !== 'undefined' ? window : globalThis);
