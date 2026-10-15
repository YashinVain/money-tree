// critters.js — зверята-помощники. Каждый рисуется функцией (ctx, size, t, seed, o):
// size — высота зверька в пикселях, t — время в секундах, o — что он сейчас делает:
//   o.moving  — идёт (лапки перебирают, тело покачивается)
//   o.hop     — фаза прыжка 0..1 (кролик, белочка)
//   o.flap    — взмах крыльев 0..1 (сова)
//   o.happy   — радость 0..1 (подпрыгивает и улыбается после покупки)
//   o.carry   — несёт монетку
// Анимация покадровая: каждый кадр зверёк рисуется заново в новой позе.
// Зверёк смотрит вправо, центр — в (0,0).

(function (root) {
    const R = root.R = root.R || {};
    const P = R.paint;
    const C = R.critters = {};

    // Моргание раз в несколько секунд: 0..1 (1 — глаз закрыт)
    function blinkAt(t, seed) {
        const period = 3.2 + (seed % 5) * 0.4;
        const ph = (t + seed * 0.77) % period;
        return ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI) : 0;
    }

    // Улыбка-дужка (когда зверёк радуется — шире)
    function smile(ctx, x, y, r, k, happy) {
        ctx.strokeStyle = '#2b1d16';
        ctx.lineWidth = 1.4 * k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y, r * (1 + happy * 0.4), 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
    }

    // Глаз-радость: закрытый "^" вместо обычного глаза
    function eyeOrHappy(ctx, x, y, r, t, seed, happy) {
        if (happy > 0.4) {
            ctx.strokeStyle = '#2b1d16';
            ctx.lineWidth = r * 0.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x - r * 0.8, y + r * 0.3);
            ctx.quadraticCurveTo(x, y - r * 0.9, x + r * 0.8, y + r * 0.3);
            ctx.stroke();
        } else {
            P.eye(ctx, x, y, r, blinkAt(t, seed));
        }
    }

    // ---------- Пчёлка ----------
    C.bee = (ctx, s, t, seed = 0, o = {}) => {
        const k = s / 40;
        const flap = Math.sin(t * 46 + seed);
        const bob = Math.sin(t * 6 + seed) * 1.5 * k;
        ctx.save();
        ctx.translate(0, bob);
        // крылья: быстрые взмахи, полупрозрачные
        ctx.save();
        ctx.globalAlpha = 0.8;
        [[-4, 1], [5, -1]].forEach(([dx, dir]) => {
            ctx.save();
            ctx.translate(dx * k, -12 * k);
            ctx.rotate(-0.35 + flap * 0.45 * dir);
            P.ellipse(ctx, 0, -9 * k, 7 * k, 12 * k);
            P.fillStroke(ctx, 'rgba(225,245,255,0.9)', 'rgba(120,170,210,0.9)', 1.6 * k);
            ctx.restore();
        });
        ctx.restore();
        // тельце в полоску
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
        // лапки болтаются
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 1.6 * k;
        ctx.lineCap = 'round';
        [-4, 3].forEach((x, i) => {
            ctx.beginPath();
            ctx.moveTo(x * k, 11 * k);
            ctx.lineTo(x * k - 2 * k + Math.sin(t * 8 + i) * 1.5 * k, 16 * k);
            ctx.stroke();
        });
        // голова
        P.circle(ctx, 14 * k, -3 * k, 9 * k);
        P.fillStroke(ctx, P.ball(ctx, 14 * k, -3 * k, 9 * k, '#ffe066'), '#8a5a0a', 2.2 * k);
        eyeOrHappy(ctx, 17 * k, -5 * k, 2.6 * k, t, seed, o.happy || 0);
        P.blush(ctx, 19 * k, 0, 2.6 * k);
        if (o.happy > 0.2) smile(ctx, 18 * k, 0.5 * k, 2.2 * k, k, o.happy);
        // усики пружинят
        const ant = Math.sin(t * 5 + seed) * 1.2 * k;
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 1.6 * k;
        ctx.beginPath();
        ctx.moveTo(15 * k, -11 * k); ctx.quadraticCurveTo(17 * k, -18 * k, 22 * k, -19 * k + ant);
        ctx.moveTo(12 * k, -11 * k); ctx.quadraticCurveTo(12 * k, -18 * k, 15 * k, -21 * k - ant);
        ctx.stroke();
        ctx.fillStyle = '#3a2a1a';
        P.circle(ctx, 22 * k, -19 * k + ant, 1.8 * k); ctx.fill();
        P.circle(ctx, 15 * k, -21 * k - ant, 1.8 * k); ctx.fill();
        P.shine(ctx, -4 * k, -7 * k, 6 * k, 2.6 * k, 0.55);
        ctx.restore();
    };

    // ---------- Ёжик ----------
    C.hedgehog = (ctx, s, t, seed = 0, o = {}) => {
        const k = s / 40;
        const moving = o.moving !== false;
        const ph = t * 11 + seed;
        const step = moving ? Math.sin(ph) : 0;
        const bob = moving ? Math.abs(Math.sin(ph)) * 1.6 * k : 0;
        const sniff = moving ? 0 : Math.max(0, Math.sin(t * 9)) * 1.2 * k;
        ctx.save();
        ctx.translate(0, -bob);
        // задние и передние лапки шагают по очереди
        ctx.fillStyle = '#5e3519';
        [[-10, step], [-3, -step], [5, -step], [11, step]].forEach(([x, f], i) => {
            P.ellipse(ctx, x * k + f * 2.4 * k, 14 * k + bob - Math.max(0, f) * 1.2 * k, 3.6 * k, 2.6 * k);
            ctx.fill();
        });
        // иголки — зубчатый купол
        ctx.beginPath();
        const spikes = 10;
        for (let i = 0; i <= spikes; i++) {
            const a = Math.PI + Math.PI * i / spikes;
            const x1 = Math.cos(a) * 21 * k - 4 * k, y1 = Math.sin(a) * 18 * k + 7 * k;
            if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
            if (i < spikes) {
                const a2 = Math.PI + Math.PI * (i + 0.5) / spikes;
                ctx.lineTo(Math.cos(a2) * 15 * k - 4 * k, Math.sin(a2) * 12.5 * k + 7 * k);
            }
        }
        ctx.lineTo(14 * k, 12 * k);
        ctx.lineTo(-24 * k, 12 * k);
        ctx.closePath();
        P.fillStroke(ctx, P.linear(ctx, 0, -12 * k, 0, 12 * k, ['#a8764c', '#6e4424']), '#3e2210', 2.2 * k);
        // светлые кончики иголок
        ctx.strokeStyle = 'rgba(255,230,190,0.55)';
        ctx.lineWidth = 1.4 * k;
        for (let i = 1; i < spikes; i += 2) {
            const a = Math.PI + Math.PI * i / spikes;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 15 * k - 4 * k, Math.sin(a) * 12 * k + 7 * k);
            ctx.lineTo(Math.cos(a) * 19 * k - 4 * k, Math.sin(a) * 16 * k + 7 * k);
            ctx.stroke();
        }
        // мордочка (нюхает воздух на остановках)
        ctx.save();
        ctx.translate(0, -sniff * 0.5);
        ctx.beginPath();
        ctx.moveTo(6 * k, -3 * k);
        ctx.quadraticCurveTo(22 * k, -3 * k, 27 * k + sniff, 5 * k);
        ctx.quadraticCurveTo(22 * k, 13 * k, 6 * k, 12 * k);
        ctx.closePath();
        P.fillStroke(ctx, P.linear(ctx, 6 * k, 0, 27 * k, 0, ['#f2c79a', '#fbe2c2']), '#8a5a32', 2 * k);
        ctx.fillStyle = '#2b1d16';
        P.circle(ctx, 27 * k + sniff, 4.5 * k, 2.8 * k); ctx.fill();
        eyeOrHappy(ctx, 15 * k, 1.5 * k, 2.5 * k, t, seed + 2, o.happy || 0);
        P.blush(ctx, 18.5 * k, 7.5 * k, 2.8 * k);
        // ушко
        P.circle(ctx, 9 * k, -3 * k, 3 * k);
        P.fillStroke(ctx, '#f2c79a', '#8a5a32', 1.6 * k);
        ctx.restore();
        // монетка на иголках
        if (o.carry !== false) P.coin(ctx, -7 * k, -13 * k + Math.sin(ph) * 0.8 * k, 6.5 * k, 0.12);
        ctx.restore();
    };

    // ---------- Белочка ----------
    C.squirrel = (ctx, s, t, seed = 0, o = {}) => {
        const k = s / 40;
        const hop = o.hop || 0;
        const wag = Math.sin(t * 3.2 + seed) * 0.14 + (hop ? Math.sin(hop * Math.PI) * 0.4 : 0);
        // Иногда белочка грызёт монетку: лапки поднимаются ко рту
        const nibble = !hop && ((t + seed) % 5) < 1.4 ? Math.abs(Math.sin(t * 14)) : 0;
        ctx.save();
        if (hop) ctx.rotate(-Math.sin(hop * Math.PI) * 0.25);
        // хвост
        ctx.save();
        ctx.translate(-8 * k, 8 * k);
        ctx.rotate(wag);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-24 * k, 0, -27 * k, -30 * k, -10 * k, -34 * k);
        ctx.bezierCurveTo(4 * k, -38 * k, 7 * k, -24 * k, -2 * k, -20 * k);
        ctx.bezierCurveTo(-10 * k, -16 * k, -6 * k, -6 * k, 4 * k, -2 * k);
        ctx.closePath();
        P.fillStroke(ctx, P.linear(ctx, -24 * k, -34 * k, 0, 0, ['#ffc27a', '#ff9a3d', '#e0731f']), '#8a3f0a', 2.2 * k);
        ctx.strokeStyle = 'rgba(255,230,180,0.7)';
        ctx.lineWidth = 2 * k;
        ctx.beginPath();
        ctx.moveTo(-6 * k, -6 * k);
        ctx.quadraticCurveTo(-20 * k, -14 * k, -12 * k, -28 * k);
        ctx.stroke();
        ctx.restore();
        // задние лапки (в прыжке вытягиваются)
        ctx.fillStyle = '#e0731f';
        P.ellipse(ctx, -2 * k - hop * 3 * k, 17 * k, 6 * k, 3.5 * k, hop * 0.5);
        ctx.fill();
        // тельце
        P.ellipse(ctx, 2 * k, 6 * k, 11 * k, 13 * k);
        P.fillStroke(ctx, P.ball(ctx, 2 * k, 6 * k, 13 * k, '#ff9a3d'), '#8a3f0a', 2.2 * k);
        P.ellipse(ctx, 6 * k, 8 * k, 6 * k, 8 * k);
        ctx.fillStyle = '#ffe8c8';
        ctx.fill();
        // голова
        P.circle(ctx, 8 * k, -10 * k, 10 * k);
        P.fillStroke(ctx, P.ball(ctx, 8 * k, -10 * k, 10 * k, '#ffa64f'), '#8a3f0a', 2.2 * k);
        [[2, -19], [11, -20]].forEach(([x, y], i) => {
            ctx.beginPath();
            ctx.moveTo(x * k - 3 * k, y * k + 4 * k);
            ctx.lineTo(x * k + (i ? 0.5 : -0.5) * Math.sin(t * 7) * k, y * k - 6 * k);
            ctx.lineTo(x * k + 3 * k, y * k + 4 * k);
            ctx.closePath();
            P.fillStroke(ctx, '#ff9a3d', '#8a3f0a', 2 * k);
        });
        eyeOrHappy(ctx, 12 * k, -11 * k, 2.6 * k, t, seed + 4, o.happy || 0);
        P.blush(ctx, 14 * k, -5 * k, 2.6 * k);
        ctx.fillStyle = '#5a2a10';
        P.circle(ctx, 17.5 * k, -8 * k, 1.8 * k); ctx.fill();
        // передние лапки с монеткой (поднимаются, когда грызёт)
        P.coin(ctx, 13 * k, 4 * k - nibble * 5 * k, 5.5 * k, nibble * 0.3);
        ctx.fillStyle = '#ff9a3d';
        P.ellipse(ctx, 11 * k, 7 * k - nibble * 5 * k, 3 * k, 2.4 * k); ctx.fill();
        ctx.restore();
    };

    // ---------- Кролик ----------
    // hop: 0..1 — присел (начало), летит (середина), шлёпнулся (конец)
    C.bunny = (ctx, s, t, seed = 0, o = {}) => {
        const k = s / 40;
        const hop = o.hop || 0;
        const air = hop > 0.15 && hop < 0.85 ? Math.sin((hop - 0.15) / 0.7 * Math.PI) : 0;
        const squash = hop > 0 && (hop < 0.15 || hop > 0.85) ? 0.12 : 0;
        const sy = 1 + air * 0.12 - squash, sx = 1 / Math.sqrt(sy);
        ctx.save();
        ctx.translate(0, 16 * k);
        ctx.scale(sx, sy);
        ctx.translate(0, -16 * k);
        // хвостик
        P.circle(ctx, -15 * k, 6 * k, 5 * k);
        P.fillStroke(ctx, '#ffffff', '#9a8aaa', 1.8 * k);
        // задняя лапа: в прыжке вытянута назад
        ctx.save();
        ctx.translate(-8 * k, 14 * k);
        ctx.rotate(air * 0.7);
        P.ellipse(ctx, -2 * k * air, 1 * k, 7 * k, 3 * k);
        P.fillStroke(ctx, '#ffffff', '#8a7aa0', 1.8 * k);
        ctx.restore();
        // тело
        P.ellipse(ctx, -2 * k, 6 * k, 15 * k, 11 * k);
        P.fillStroke(ctx, P.ball(ctx, -2 * k, 6 * k, 14 * k, '#f4ecff'), '#8a7aa0', 2.2 * k);
        // передняя лапка
        P.ellipse(ctx, 6 * k + air * 3 * k, 15 * k - air * 2 * k, 4 * k, 3 * k);
        P.fillStroke(ctx, '#ffffff', '#8a7aa0', 1.6 * k);
        // уши: в прыжке отклоняются назад, в покое шевелятся
        const earIdle = Math.sin(t * 2 + seed) * 0.08 + (((t + seed) % 4) < 0.3 ? Math.sin(t * 30) * 0.12 : 0);
        [[6, -0.25], [12, 0.12]].forEach(([x, a]) => {
            ctx.save();
            ctx.translate(x * k, -10 * k);
            ctx.rotate(a + earIdle - air * 0.55);
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
        eyeOrHappy(ctx, 14 * k, -6 * k, 2.6 * k, t, seed + 6, o.happy || 0);
        P.blush(ctx, 15 * k, 1 * k, 2.8 * k);
        // носик подёргивается
        const nose = Math.sin(t * 18 + seed) * 0.5 * k;
        ctx.fillStyle = '#ff8ab0';
        P.circle(ctx, 19.5 * k, -2 * k + nose, 1.9 * k); ctx.fill();
        if (o.happy > 0.2) smile(ctx, 17 * k, 0, 2 * k, k, o.happy);
        ctx.restore();
    };

    // ---------- Сова ----------
    C.owl = (ctx, s, t, seed = 0, o = {}) => {
        const k = s / 40;
        const bl = blinkAt(t, seed + 8);
        const look = Math.sin(t * 0.6 + seed) * 0.18;           // поворачивает голову
        const flap = o.flap || 0;
        ctx.save();
        // тело
        P.ellipse(ctx, 0, 4 * k, 15 * k, 17 * k);
        P.fillStroke(ctx, P.ball(ctx, 0, 4 * k, 17 * k, '#a07850'), '#4e3218', 2.4 * k);
        P.ellipse(ctx, 0, 9 * k, 9 * k, 11 * k);
        ctx.fillStyle = '#f2dcb8';
        ctx.fill();
        ctx.strokeStyle = 'rgba(160,120,80,0.7)';
        ctx.lineWidth = 1.4 * k;
        for (let r = 0; r < 3; r++) {
            for (let c = -1; c <= 1; c++) {
                const x = c * 4 * k, y = (4 + r * 5) * k;
                ctx.beginPath();
                ctx.moveTo(x - 2 * k, y); ctx.lineTo(x, y + 2 * k); ctx.lineTo(x + 2 * k, y);
                ctx.stroke();
            }
        }
        // крылья: иногда сова ими взмахивает
        [-1, 1].forEach(d => {
            ctx.save();
            ctx.translate(d * 12 * k, -2 * k);
            ctx.rotate(d * (0.15 + flap * 0.9));
            P.ellipse(ctx, d * 1 * k, 8 * k, 5 * k, 11 * k);
            P.fillStroke(ctx, '#8a6440', '#4e3218', 2 * k);
            ctx.restore();
        });
        // голова с ушками-пучками и большими глазами
        ctx.save();
        ctx.translate(0, -8 * k);
        ctx.rotate(look);
        P.ellipse(ctx, 0, 0, 13 * k, 11 * k);
        P.fillStroke(ctx, P.ball(ctx, 0, 0, 13 * k, '#a8805a'), '#4e3218', 2.2 * k);
        [-1, 1].forEach(d => {
            ctx.beginPath();
            ctx.moveTo(d * 6 * k, -8 * k);
            ctx.lineTo(d * 13 * k, -16 * k);
            ctx.lineTo(d * 12.5 * k, -4 * k);
            ctx.closePath();
            P.fillStroke(ctx, '#a07850', '#4e3218', 2 * k);
        });
        [-1, 1].forEach(d => {
            P.circle(ctx, d * 5.6 * k, 0, 6 * k);
            P.fillStroke(ctx, '#fff6dc', '#4e3218', 1.8 * k);
            P.circle(ctx, d * 5.6 * k, 0, 4.2 * k);
            ctx.fillStyle = '#ffb02e';
            ctx.fill();
            if ((o.happy || 0) > 0.4) {
                ctx.strokeStyle = '#2b1d16';
                ctx.lineWidth = 1.6 * k;
                ctx.beginPath();
                ctx.arc(d * 5.6 * k, 1.5 * k, 2.6 * k, 1.15 * Math.PI, 1.85 * Math.PI);
                ctx.stroke();
            } else {
                P.eye(ctx, d * 5.6 * k + look * 4 * k, 0, 2.9 * k, bl);
            }
        });
        ctx.beginPath();
        ctx.moveTo(-2.5 * k, 4 * k); ctx.lineTo(2.5 * k, 4 * k); ctx.lineTo(0, 8.5 * k);
        ctx.closePath();
        P.fillStroke(ctx, '#ffb02e', '#8a5a0a', 1.4 * k);
        ctx.restore();
        // лапки
        ctx.fillStyle = '#ffb02e';
        [-5, 5].forEach(x => { P.ellipse(ctx, x * k, 21 * k, 3.5 * k, 2 * k); ctx.fill(); });
        ctx.restore();
    };

    // ---------- Дракончик ----------
    C.dragon = (ctx, s, t, seed = 0, o = {}) => {
        const k = s / 40;
        const flap = Math.sin(t * 7 + seed);
        const tail = Math.sin(t * 3 + seed);
        ctx.save();
        ctx.translate(0, flap * 1.5 * k);
        // хвост извивается
        ctx.strokeStyle = '#2f9a6a';
        ctx.lineWidth = 6 * k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-10 * k, 6 * k);
        ctx.quadraticCurveTo(-22 * k, 12 * k + tail * 4 * k, -29 * k, tail * 3 * k);
        ctx.stroke();
        ctx.save();
        ctx.translate(-29 * k, tail * 3 * k);
        ctx.rotate(-0.4 + tail * 0.2);
        ctx.beginPath();
        ctx.moveTo(0, -6 * k); ctx.lineTo(4 * k, 2 * k); ctx.lineTo(-5 * k, 3 * k);
        ctx.closePath();
        P.fillStroke(ctx, '#ffd23f', '#8a5a0a', 1.6 * k);
        ctx.restore();
        // дальнее крыло
        ctx.save();
        ctx.translate(2 * k, -6 * k);
        ctx.rotate(-0.1 - flap * 0.4);
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(4 * k, -18 * k);
        ctx.quadraticCurveTo(10 * k, -10 * k, 15 * k, -12 * k);
        ctx.quadraticCurveTo(10 * k, -2 * k, 0, 0);
        P.fillStroke(ctx, '#7fe0b4', '#1f6e4a', 1.6 * k);
        ctx.restore();
        // тело
        P.ellipse(ctx, 0, 4 * k, 15 * k, 12 * k);
        P.fillStroke(ctx, P.ball(ctx, 0, 4 * k, 14 * k, '#5fd6a0'), '#1f6e4a', 2.4 * k);
        P.ellipse(ctx, 3 * k, 8 * k, 8 * k, 6 * k);
        ctx.fillStyle = '#fff1a8';
        ctx.fill();
        // ближнее крыло
        ctx.save();
        ctx.translate(-2 * k, -6 * k);
        ctx.rotate(-0.3 + flap * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-6 * k, -22 * k);
        ctx.quadraticCurveTo(-12 * k, -14 * k, -18 * k, -16 * k);
        ctx.quadraticCurveTo(-16 * k, -6 * k, -20 * k, -4 * k);
        ctx.quadraticCurveTo(-10 * k, 0, 0, 0);
        P.fillStroke(ctx, P.linear(ctx, 0, -22 * k, 0, 0, ['#b8ffd8', '#5fd6a0']), '#1f6e4a', 2 * k);
        ctx.restore();
        // голова
        P.circle(ctx, 14 * k, -8 * k, 10 * k);
        P.fillStroke(ctx, P.ball(ctx, 14 * k, -8 * k, 10 * k, '#6fe0aa'), '#1f6e4a', 2.4 * k);
        [[9, -17], [15, -18]].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.moveTo(x * k - 2.5 * k, y * k + 3 * k);
            ctx.lineTo(x * k - 1 * k, y * k - 5 * k);
            ctx.lineTo(x * k + 2.5 * k, y * k + 3 * k);
            ctx.closePath();
            P.fillStroke(ctx, '#fff1a8', '#8a6a1a', 1.4 * k);
        });
        eyeOrHappy(ctx, 18 * k, -9 * k, 2.8 * k, t, seed + 10, o.happy || 0);
        P.blush(ctx, 19 * k, -3 * k, 2.8 * k);
        ctx.fillStyle = '#1f6e4a';
        P.circle(ctx, 23 * k, -6 * k, 1.2 * k); ctx.fill();
        if (o.happy > 0.2) smile(ctx, 20 * k, -4 * k, 2.2 * k, k, o.happy);
        // лапки
        P.ellipse(ctx, 6 * k, 15 * k, 4 * k, 3 * k);
        P.fillStroke(ctx, '#5fd6a0', '#1f6e4a', 1.8 * k);
        P.ellipse(ctx, -5 * k, 15 * k, 3.5 * k, 2.6 * k);
        P.fillStroke(ctx, '#5fd6a0', '#1f6e4a', 1.6 * k);
        ctx.restore();
    };

    C.draw = (id, ctx, size, t, seed, o) => {
        const fn = C[id];
        if (fn) fn(ctx, size, t, seed || 0, o || {});
    };
})(typeof window !== 'undefined' ? window : globalThis);
