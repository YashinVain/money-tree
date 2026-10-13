// critters.js — зверята-помощники. Каждый рисуется функцией (ctx, size, t),
// где size — высота зверька в пикселях, t — время в секундах (для анимации:
// взмахи крыльев, моргание, прыжки). Зверёк смотрит вправо, центр — в (0,0).

(function (root) {
    const R = root.R = root.R || {};
    const U = R.util;
    const P = R.paint;
    const C = R.critters = {};

    // Моргание раз в несколько секунд: возвращает 0..1 (1 — глаз закрыт)
    function blinkAt(t, seed) {
        const period = 3.2 + (seed % 5) * 0.4;
        const ph = (t + seed * 0.77) % period;
        return ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI) : 0;
    }

    // ---------- Пчёлка ----------
    C.bee = (ctx, s, t, seed = 0) => {
        const k = s / 40;
        const flap = Math.sin(t * 40 + seed);
        ctx.save();
        // крылья (сзади)
        ctx.save();
        ctx.globalAlpha = 0.8;
        [[-4, -1], [5, 1]].forEach(([dx, dir], i) => {
            ctx.save();
            ctx.translate(dx * k, -12 * k);
            ctx.rotate(-0.4 + flap * 0.35 * (i ? -1 : 1));
            P.ellipse(ctx, 0, -9 * k, 7 * k, 12 * k);
            P.fillStroke(ctx, 'rgba(225,245,255,0.9)', 'rgba(120,170,210,0.9)', 1.6 * k);
            ctx.restore();
        });
        ctx.restore();
        // тельце
        P.ellipse(ctx, 0, 0, 17 * k, 13 * k);
        P.fillStroke(ctx, P.ball(ctx, 0, 0, 16 * k, '#ffd23f'), '#8a5a0a', 2.4 * k);
        ctx.save();
        P.ellipse(ctx, 0, 0, 17 * k, 13 * k);
        ctx.clip();
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(-7 * k, -14 * k, 5 * k, 28 * k);
        ctx.fillRect(2 * k, -14 * k, 5 * k, 28 * k);
        ctx.restore();
        // жало
        ctx.fillStyle = '#3a2a1a';
        ctx.beginPath();
        ctx.moveTo(-16 * k, -2 * k); ctx.lineTo(-23 * k, 0); ctx.lineTo(-16 * k, 3 * k);
        ctx.fill();
        // голова
        P.circle(ctx, 14 * k, -3 * k, 9 * k);
        P.fillStroke(ctx, P.ball(ctx, 14 * k, -3 * k, 9 * k, '#ffe066'), '#8a5a0a', 2.2 * k);
        P.eye(ctx, 17 * k, -5 * k, 2.6 * k, blinkAt(t, seed));
        P.blush(ctx, 19 * k, 0, 2.6 * k);
        // усики
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 1.6 * k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(15 * k, -11 * k); ctx.quadraticCurveTo(17 * k, -18 * k, 22 * k, -19 * k);
        ctx.moveTo(12 * k, -11 * k); ctx.quadraticCurveTo(12 * k, -18 * k, 15 * k, -21 * k);
        ctx.stroke();
        ctx.fillStyle = '#3a2a1a';
        P.circle(ctx, 22 * k, -19 * k, 1.8 * k); ctx.fill();
        P.circle(ctx, 15 * k, -21 * k, 1.8 * k); ctx.fill();
        P.shine(ctx, -4 * k, -7 * k, 6 * k, 2.6 * k, 0.55);
        ctx.restore();
    };

    // ---------- Ёжик ----------
    // walk: фаза шага (лапки), carrying: несёт монетку на иголках
    C.hedgehog = (ctx, s, t, seed = 0, carrying = true) => {
        const k = s / 40;
        const step = Math.sin(t * 10 + seed);
        ctx.save();
        // лапки
        ctx.fillStyle = '#5e3519';
        [[-8, step], [6, -step]].forEach(([x, ph]) => {
            P.ellipse(ctx, x * k + ph * 2 * k, 14 * k, 4 * k, 3 * k);
            ctx.fill();
        });
        // иголки — зубчатый купол
        ctx.beginPath();
        const spikes = 9;
        for (let i = 0; i <= spikes; i++) {
            const a = Math.PI + Math.PI * i / spikes;
            const r1 = 21 * k, r2 = 15 * k;
            const x1 = Math.cos(a) * r1 - 3 * k, y1 = Math.sin(a) * r1 * 0.85 + 6 * k;
            const a2 = Math.PI + Math.PI * (i + 0.5) / spikes;
            const x2 = Math.cos(a2) * r2 - 3 * k, y2 = Math.sin(a2) * r2 * 0.85 + 6 * k;
            if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
            if (i < spikes) ctx.lineTo(x2 - Math.cos(a2) * -1 * k, y2 - 2 * k);
        }
        ctx.lineTo(16 * k, 12 * k);
        ctx.lineTo(-22 * k, 12 * k);
        ctx.closePath();
        P.fillStroke(ctx, P.linear(ctx, 0, -14 * k, 0, 12 * k, ['#9a6a44', '#6e4424']), '#3e2210', 2.2 * k);
        // мордочка
        ctx.beginPath();
        ctx.moveTo(8 * k, -4 * k);
        ctx.quadraticCurveTo(24 * k, -2 * k, 27 * k, 6 * k);
        ctx.quadraticCurveTo(22 * k, 13 * k, 8 * k, 12 * k);
        ctx.closePath();
        P.fillStroke(ctx, P.linear(ctx, 8 * k, 0, 27 * k, 0, ['#f2c79a', '#f8dcb8']), '#8a5a32', 2 * k);
        ctx.fillStyle = '#2b1d16';
        P.circle(ctx, 27 * k, 5.5 * k, 2.6 * k); ctx.fill();
        P.eye(ctx, 16 * k, 2 * k, 2.4 * k, blinkAt(t, seed + 2));
        P.blush(ctx, 19 * k, 8 * k, 2.6 * k);
        // монетка на иголках
        if (carrying) P.coin(ctx, -6 * k, -16 * k, 6.5 * k, 0.1);
        ctx.restore();
    };

    // ---------- Белочка ----------
    C.squirrel = (ctx, s, t, seed = 0) => {
        const k = s / 40;
        const wag = Math.sin(t * 3 + seed) * 0.12;
        ctx.save();
        // хвост
        ctx.save();
        ctx.translate(-8 * k, 8 * k);
        ctx.rotate(wag);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-24 * k, 0, -26 * k, -30 * k, -10 * k, -34 * k);
        ctx.bezierCurveTo(4 * k, -38 * k, 6 * k, -24 * k, -2 * k, -20 * k);
        ctx.bezierCurveTo(-10 * k, -16 * k, -6 * k, -6 * k, 4 * k, -2 * k);
        ctx.closePath();
        P.fillStroke(ctx, P.linear(ctx, -24 * k, -34 * k, 0, 0, ['#ffc27a', '#ff9a3d', '#e0731f']), '#8a3f0a', 2.2 * k);
        ctx.restore();
        // тельце
        P.ellipse(ctx, 2 * k, 6 * k, 11 * k, 13 * k);
        P.fillStroke(ctx, P.ball(ctx, 2 * k, 6 * k, 13 * k, '#ff9a3d'), '#8a3f0a', 2.2 * k);
        P.ellipse(ctx, 6 * k, 8 * k, 6 * k, 8 * k);
        ctx.fillStyle = '#ffe8c8';
        ctx.fill();
        // голова
        P.circle(ctx, 8 * k, -10 * k, 10 * k);
        P.fillStroke(ctx, P.ball(ctx, 8 * k, -10 * k, 10 * k, '#ffa64f'), '#8a3f0a', 2.2 * k);
        // ушки с кисточками
        [[2, -19], [11, -20]].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.moveTo(x * k - 3 * k, y * k + 4 * k);
            ctx.lineTo(x * k, y * k - 6 * k);
            ctx.lineTo(x * k + 3 * k, y * k + 4 * k);
            ctx.closePath();
            P.fillStroke(ctx, '#ff9a3d', '#8a3f0a', 2 * k);
        });
        P.eye(ctx, 12 * k, -11 * k, 2.6 * k, blinkAt(t, seed + 4));
        P.blush(ctx, 14 * k, -5 * k, 2.6 * k);
        ctx.fillStyle = '#5a2a10';
        P.circle(ctx, 17.5 * k, -8 * k, 1.8 * k); ctx.fill();
        // жёлудь-монетка в лапках
        P.coin(ctx, 13 * k, 4 * k, 5.5 * k, 0.05);
        ctx.restore();
    };

    // ---------- Кролик ----------
    // hop: 0..1 фаза прыжка — тело слегка вытягивается в прыжке
    C.bunny = (ctx, s, t, seed = 0, hop = 0) => {
        const k = s / 40;
        const stretch = 1 + Math.sin(hop * Math.PI) * 0.12;
        ctx.save();
        ctx.scale(1 / Math.sqrt(stretch), stretch);
        // хвостик
        P.circle(ctx, -15 * k, 6 * k, 5 * k);
        P.fillStroke(ctx, '#ffffff', '#9a8aaa', 1.8 * k);
        // тело
        P.ellipse(ctx, -2 * k, 6 * k, 15 * k, 11 * k);
        P.fillStroke(ctx, P.ball(ctx, -2 * k, 6 * k, 14 * k, '#f4ecff'), '#8a7aa0', 2.2 * k);
        // лапка
        P.ellipse(ctx, -8 * k, 15 * k, 6 * k, 3 * k);
        P.fillStroke(ctx, '#ffffff', '#8a7aa0', 1.8 * k);
        // уши
        const earSway = Math.sin(t * 2 + seed) * 0.08;
        [[6, -0.25], [12, 0.12]].forEach(([x, a]) => {
            ctx.save();
            ctx.translate(x * k, -10 * k);
            ctx.rotate(a + earSway);
            P.ellipse(ctx, 0, -12 * k, 4.5 * k, 12 * k);
            P.fillStroke(ctx, '#f4ecff', '#8a7aa0', 2 * k);
            P.ellipse(ctx, 0, -12 * k, 2.2 * k, 8.5 * k);
            ctx.fillStyle = '#ffb3cf';
            ctx.fill();
            ctx.restore();
        });
        // голова
        P.circle(ctx, 10 * k, -4 * k, 10 * k);
        P.fillStroke(ctx, P.ball(ctx, 10 * k, -4 * k, 10 * k, '#f8f2ff'), '#8a7aa0', 2.2 * k);
        P.eye(ctx, 14 * k, -6 * k, 2.6 * k, blinkAt(t, seed + 6));
        P.blush(ctx, 15 * k, 1 * k, 2.8 * k);
        ctx.fillStyle = '#ff8ab0';
        P.circle(ctx, 19.5 * k, -2 * k, 1.8 * k); ctx.fill();
        ctx.restore();
    };

    // ---------- Сова ----------
    C.owl = (ctx, s, t, seed = 0) => {
        const k = s / 40;
        const bl = blinkAt(t, seed + 8);
        ctx.save();
        // тело
        P.ellipse(ctx, 0, 2 * k, 15 * k, 18 * k);
        P.fillStroke(ctx, P.ball(ctx, 0, 2 * k, 17 * k, '#a07850'), '#4e3218', 2.4 * k);
        // животик с пёрышками
        P.ellipse(ctx, 0, 8 * k, 9 * k, 11 * k);
        ctx.fillStyle = '#f2dcb8';
        ctx.fill();
        ctx.strokeStyle = 'rgba(160,120,80,0.7)';
        ctx.lineWidth = 1.4 * k;
        for (let r = 0; r < 3; r++) {
            for (let c = -1; c <= 1; c++) {
                const x = c * 4 * k, y = (3 + r * 5) * k;
                ctx.beginPath();
                ctx.moveTo(x - 2 * k, y); ctx.lineTo(x, y + 2 * k); ctx.lineTo(x + 2 * k, y);
                ctx.stroke();
            }
        }
        // крылышки
        [-1, 1].forEach(d => {
            P.ellipse(ctx, d * 13 * k, 4 * k, 5 * k, 11 * k, d * 0.2);
            P.fillStroke(ctx, '#8a6440', '#4e3218', 2 * k);
        });
        // ушки-пучки
        [-1, 1].forEach(d => {
            ctx.beginPath();
            ctx.moveTo(d * 6 * k, -13 * k);
            ctx.lineTo(d * 13 * k, -22 * k);
            ctx.lineTo(d * 13 * k, -10 * k);
            ctx.closePath();
            P.fillStroke(ctx, '#a07850', '#4e3218', 2 * k);
        });
        // глаза
        [-1, 1].forEach(d => {
            P.circle(ctx, d * 6 * k, -7 * k, 6.5 * k);
            P.fillStroke(ctx, '#fff6dc', '#4e3218', 1.8 * k);
            P.circle(ctx, d * 6 * k, -7 * k, 4.5 * k);
            ctx.fillStyle = '#ffb02e';
            ctx.fill();
            P.eye(ctx, d * 6 * k, -7 * k, 3 * k, bl);
        });
        // клюв
        ctx.beginPath();
        ctx.moveTo(-2.5 * k, -2 * k); ctx.lineTo(2.5 * k, -2 * k); ctx.lineTo(0, 3 * k);
        ctx.closePath();
        P.fillStroke(ctx, '#ffb02e', '#8a5a0a', 1.4 * k);
        // лапки
        ctx.fillStyle = '#ffb02e';
        [-5, 5].forEach(x => { P.ellipse(ctx, x * k, 20 * k, 3.5 * k, 2 * k); ctx.fill(); });
        ctx.restore();
    };

    // ---------- Дракончик ----------
    C.dragon = (ctx, s, t, seed = 0) => {
        const k = s / 40;
        const flap = Math.sin(t * 7 + seed);
        ctx.save();
        // хвост
        ctx.strokeStyle = '#2f9a6a';
        ctx.lineWidth = 6 * k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-10 * k, 6 * k);
        ctx.quadraticCurveTo(-24 * k, 10 * k + flap * 2 * k, -28 * k, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-28 * k, -6 * k); ctx.lineTo(-24 * k, 1 * k); ctx.lineTo(-33 * k, 2 * k);
        ctx.closePath();
        P.fillStroke(ctx, '#ffd23f', '#8a5a0a', 1.6 * k);
        // крыло
        ctx.save();
        ctx.translate(-2 * k, -6 * k);
        ctx.rotate(-0.3 + flap * 0.45);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-6 * k, -22 * k);
        ctx.quadraticCurveTo(-12 * k, -14 * k, -18 * k, -16 * k);
        ctx.quadraticCurveTo(-16 * k, -6 * k, -20 * k, -4 * k);
        ctx.quadraticCurveTo(-10 * k, 0, 0, 0);
        P.fillStroke(ctx, P.linear(ctx, 0, -22 * k, 0, 0, ['#b8ffd8', '#5fd6a0']), '#1f6e4a', 2 * k);
        ctx.restore();
        // тело
        P.ellipse(ctx, 0, 4 * k, 15 * k, 12 * k);
        P.fillStroke(ctx, P.ball(ctx, 0, 4 * k, 14 * k, '#5fd6a0'), '#1f6e4a', 2.4 * k);
        P.ellipse(ctx, 3 * k, 8 * k, 8 * k, 6 * k);
        ctx.fillStyle = '#fff1a8';
        ctx.fill();
        // голова
        P.circle(ctx, 14 * k, -8 * k, 10 * k);
        P.fillStroke(ctx, P.ball(ctx, 14 * k, -8 * k, 10 * k, '#6fe0aa'), '#1f6e4a', 2.4 * k);
        // рожки
        [[9, -17], [15, -18]].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.moveTo(x * k - 2.5 * k, y * k + 3 * k);
            ctx.lineTo(x * k - 1 * k, y * k - 5 * k);
            ctx.lineTo(x * k + 2.5 * k, y * k + 3 * k);
            ctx.closePath();
            P.fillStroke(ctx, '#fff1a8', '#8a6a1a', 1.4 * k);
        });
        P.eye(ctx, 18 * k, -9 * k, 2.8 * k, blinkAt(t, seed + 10));
        P.blush(ctx, 19 * k, -3 * k, 2.8 * k);
        ctx.fillStyle = '#1f6e4a';
        P.circle(ctx, 23 * k, -6 * k, 1.2 * k); ctx.fill();
        // лапка
        P.ellipse(ctx, 6 * k, 15 * k, 4 * k, 3 * k);
        P.fillStroke(ctx, '#5fd6a0', '#1f6e4a', 1.8 * k);
        ctx.restore();
    };

    C.draw = (id, ctx, size, t, seed, extra) => {
        const fn = C[id];
        if (fn) fn(ctx, size, t, seed, extra);
    };
})(typeof window !== 'undefined' ? window : globalThis);
