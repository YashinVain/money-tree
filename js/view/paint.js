// paint.js — "кисточки": базовые приёмы рисования в едином мультяшном стиле
// (мягкие градиенты, тёмный контур того же цвета, блики) и мелкие предметы:
// монетка, золотое семечко, бабочка, искорка, облако, радуга.
// Всё рисуется кодом — никаких картинок, поэтому игра весит копейки.

(function (root) {
    const R = root.R = root.R || {};
    const U = R.util;
    const P = R.paint = {};

    // Детерминированный генератор случайных чисел: одно и то же зерно —
    // одна и та же форма (дерево не "дрожит" от кадра к кадру)
    P.rng = (seed) => {
        let s = seed >>> 0 || 1;
        return () => {
            s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
            return ((s >>> 0) % 100000) / 100000;
        };
    };

    P.circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2); };
    P.ellipse = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2); };

    P.roundRect = (ctx, x, y, w, h, r) => {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    };

    // Радиальный градиент "свет сверху слева" — главный приём объёма
    P.ball = (ctx, x, y, r, color) => {
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
        g.addColorStop(0, U.shade(color, 0.45));
        g.addColorStop(0.55, color);
        g.addColorStop(1, U.shade(color, -0.25));
        return g;
    };

    P.linear = (ctx, x0, y0, x1, y1, stops) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
        return g;
    };

    // Залить текущий путь с контуром
    P.fillStroke = (ctx, fill, stroke, width) => {
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke && width > 0) {
            ctx.lineWidth = width;
            ctx.strokeStyle = stroke;
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    };

    // Блик — мягкое белое пятнышко
    P.shine = (ctx, x, y, rx, ry, alpha = 0.7, rot = -0.5) => {
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.fillStyle = '#ffffff';
        P.ellipse(ctx, x, y, rx, ry, rot);
        ctx.fill();
        ctx.restore();
    };

    // Глаза зверят: тёмный овал + блик + (по желанию) румянец
    P.eye = (ctx, x, y, r, blink = 0) => {
        ctx.save();
        ctx.fillStyle = '#2b1d16';
        P.ellipse(ctx, x, y, r * 0.8, r * Math.max(0.12, 1 - blink));
        ctx.fill();
        if (blink < 0.5) {
            ctx.fillStyle = '#ffffff';
            P.circle(ctx, x - r * 0.25, y - r * 0.35, r * 0.32);
            ctx.fill();
        }
        ctx.restore();
    };
    P.blush = (ctx, x, y, r) => {
        ctx.save();
        ctx.fillStyle = 'rgba(255,110,140,0.45)';
        P.ellipse(ctx, x, y, r, r * 0.6);
        ctx.fill();
        ctx.restore();
    };

    // ---------- Монетка ----------
    // spin: 0..1 — фаза вращения (сжатие по ширине), чтобы монетка "крутилась"
    P.coin = (ctx, x, y, r, spin = 0) => {
        const sx = Math.max(0.15, Math.abs(Math.cos(spin * Math.PI)));
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sx, 1);
        // ребро
        P.circle(ctx, 0, r * 0.08, r);
        ctx.fillStyle = '#c47f12';
        ctx.fill();
        // лицевая сторона
        P.circle(ctx, 0, 0, r);
        const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        g.addColorStop(0, '#fff6b0');
        g.addColorStop(0.5, '#ffd23f');
        g.addColorStop(1, '#f0a81c');
        P.fillStroke(ctx, g, '#b86d0c', r * 0.12);
        // внутренний ободок
        P.circle(ctx, 0, 0, r * 0.68);
        ctx.lineWidth = r * 0.08;
        ctx.strokeStyle = 'rgba(184,109,12,0.55)';
        ctx.stroke();
        // листик-чеканка (денежное дерево!)
        if (sx > 0.45) {
            ctx.fillStyle = 'rgba(184,109,12,0.75)';
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.42);
            ctx.quadraticCurveTo(r * 0.38, -r * 0.05, 0, r * 0.42);
            ctx.quadraticCurveTo(-r * 0.38, -r * 0.05, 0, -r * 0.42);
            ctx.fill();
            ctx.strokeStyle = '#fff3a0';
            ctx.lineWidth = r * 0.06;
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.32);
            ctx.lineTo(0, r * 0.34);
            ctx.stroke();
        }
        P.shine(ctx, -r * 0.38, -r * 0.42, r * 0.28, r * 0.14, 0.85);
        ctx.restore();
    };

    // ---------- Золотое семечко (валюта нового сада) ----------
    P.goldSeed = (ctx, x, y, r) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.35);
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.15);
        ctx.bezierCurveTo(r * 0.95, -r * 0.6, r * 0.85, r * 0.95, 0, r * 1.0);
        ctx.bezierCurveTo(-r * 0.85, r * 0.95, -r * 0.95, -r * 0.6, 0, -r * 1.15);
        const g = ctx.createLinearGradient(-r, -r, r, r);
        g.addColorStop(0, '#fff2a8');
        g.addColorStop(0.45, '#ffc93c');
        g.addColorStop(1, '#e08a12');
        P.fillStroke(ctx, g, '#a85f0a', r * 0.13);
        ctx.strokeStyle = 'rgba(168,95,10,0.5)';
        ctx.lineWidth = r * 0.09;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.8);
        ctx.quadraticCurveTo(r * 0.2, 0, 0, r * 0.75);
        ctx.stroke();
        P.shine(ctx, -r * 0.35, -r * 0.35, r * 0.2, r * 0.42, 0.8, 0.2);
        ctx.restore();
    };

    // ---------- Искорка (четырёхлучевая звёздочка) ----------
    P.sparkle = (ctx, x, y, r, color = '#ffffff') => {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
        ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
        ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
        ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
        ctx.fill();
        ctx.restore();
    };

    // ---------- Золотая бабочка ----------
    // flap: фаза взмаха 0..1
    P.butterfly = (ctx, x, y, size, flap, colors) => {
        const c = colors || ['#fff3a0', '#ffc928', '#f08c12'];
        const open = 0.25 + 0.75 * Math.abs(Math.sin(flap * Math.PI));
        ctx.save();
        ctx.translate(x, y);
        const wing = (dir) => {
            ctx.save();
            ctx.scale(dir * open, 1);
            // верхнее крыло
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.05);
            ctx.bezierCurveTo(size * 0.35, -size * 0.75, size * 1.05, -size * 0.7, size * 0.9, -size * 0.12);
            ctx.bezierCurveTo(size * 0.8, size * 0.1, size * 0.3, size * 0.12, 0, size * 0.05);
            let g = ctx.createRadialGradient(size * 0.55, -size * 0.35, size * 0.05, size * 0.4, -size * 0.3, size * 0.8);
            g.addColorStop(0, c[0]); g.addColorStop(0.5, c[1]); g.addColorStop(1, c[2]);
            P.fillStroke(ctx, g, U.shade(c[2], -0.35), size * 0.06);
            // нижнее крыло
            ctx.beginPath();
            ctx.moveTo(0, size * 0.05);
            ctx.bezierCurveTo(size * 0.55, size * 0.05, size * 0.8, size * 0.55, size * 0.45, size * 0.7);
            ctx.bezierCurveTo(size * 0.2, size * 0.78, size * 0.05, size * 0.4, 0, size * 0.1);
            g = ctx.createRadialGradient(size * 0.4, size * 0.35, size * 0.03, size * 0.35, size * 0.35, size * 0.5);
            g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
            P.fillStroke(ctx, g, U.shade(c[2], -0.35), size * 0.06);
            // пятнышки
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            P.circle(ctx, size * 0.62, -size * 0.38, size * 0.09); ctx.fill();
            P.circle(ctx, size * 0.42, size * 0.42, size * 0.07); ctx.fill();
            ctx.restore();
        };
        wing(1);
        wing(-1);
        // тельце
        ctx.fillStyle = '#5a3a1a';
        P.ellipse(ctx, 0, size * 0.05, size * 0.08, size * 0.38);
        ctx.fill();
        // усики
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = size * 0.035;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.3); ctx.quadraticCurveTo(size * 0.1, -size * 0.55, size * 0.2, -size * 0.62);
        ctx.moveTo(0, -size * 0.3); ctx.quadraticCurveTo(-size * 0.1, -size * 0.55, -size * 0.2, -size * 0.62);
        ctx.stroke();
        ctx.fillStyle = '#5a3a1a';
        P.circle(ctx, size * 0.2, -size * 0.62, size * 0.05); ctx.fill();
        P.circle(ctx, -size * 0.2, -size * 0.62, size * 0.05); ctx.fill();
        ctx.restore();
    };

    // ---------- Облако (рисуется один раз в отдельный холст) ----------
    P.cloudSprite = (w, seed) => {
        const rnd = P.rng(seed);
        const h = w * 0.55;
        const c = document.createElement('canvas');
        c.width = Math.ceil(w); c.height = Math.ceil(h);
        const ctx = c.getContext('2d');
        const puffs = [];
        const n = 5 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            const r = w * (0.13 + 0.1 * Math.sin(t * Math.PI) + rnd() * 0.05);
            puffs.push({ x: w * (0.18 + t * 0.64), y: h * 0.62 - Math.sin(t * Math.PI) * h * 0.22 + rnd() * h * 0.05, r });
        }
        // тень снизу
        ctx.fillStyle = 'rgba(170,190,235,0.9)';
        puffs.forEach(p => { P.circle(ctx, p.x, p.y + p.r * 0.12, p.r); ctx.fill(); });
        ctx.fillStyle = '#ffffff';
        puffs.forEach(p => { P.circle(ctx, p.x, p.y, p.r * 0.94); ctx.fill(); });
        return c;
    };

    // ---------- Радуга ----------
    P.RAINBOW = ['#ff5a5a', '#ff9f43', '#ffd93d', '#6bdc5a', '#4fc3ff', '#6f7bff', '#b06bff'];

    // Дуга радуги: fill 0..1 — сколько заполнено (слева направо)
    P.rainbowArc = (ctx, x, y, r, band, fill, alpha = 1, glow = 0) => {
        const a0 = Math.PI, a1 = Math.PI * 2;
        ctx.save();
        ctx.lineCap = 'round';
        // пустая часть — бледный контур радуги, чтобы было видно, что заполнять
        ctx.globalAlpha = alpha * 0.22;
        P.RAINBOW.forEach((col, i) => {
            ctx.strokeStyle = col;
            ctx.lineWidth = band + 0.6;
            ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.arc(x, y, r - i * band, a0, a1);
            ctx.stroke();
        });
        ctx.globalAlpha = alpha;
        if (fill > 0.001) {
            if (glow > 0) {
                // Свечение — широкий полупрозрачный белый штрих позади (дешевле, чем shadowBlur)
                ctx.save();
                ctx.globalAlpha = alpha * 0.35 * glow;
                ctx.strokeStyle = '#ffffff';
                ctx.lineCap = 'butt';
                ctx.lineWidth = band * (P.RAINBOW.length + 3);
                ctx.beginPath();
                ctx.arc(x, y, r - band * (P.RAINBOW.length - 1) / 2, a0, a0 + (a1 - a0) * fill);
                ctx.stroke();
                ctx.restore();
            }
            P.RAINBOW.forEach((col, i) => {
                ctx.strokeStyle = col;
                ctx.lineWidth = band + 0.6;
                ctx.lineCap = 'butt';
                ctx.beginPath();
                ctx.arc(x, y, r - i * band, a0, a0 + (a1 - a0) * fill);
                ctx.stroke();
            });
        }
        ctx.restore();
    };
})(typeof window !== 'undefined' ? window : globalThis);
