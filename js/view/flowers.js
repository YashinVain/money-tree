// flowers.js — восемь волшебных цветов. Каждый рисуется со стеблем,
// основание — в (0,0), растёт вверх на высоту size. t — время для покачивания.

(function (root) {
    const R = root.R = root.R || {};
    const U = R.util;
    const P = R.paint;
    const F = R.flowers = {};

    function stem(ctx, h, k, sway) {
        ctx.strokeStyle = '#3f9a3f';
        ctx.lineWidth = 3.2 * k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(sway * 0.5, -h * 0.5, sway, -h);
        ctx.stroke();
    }

    function stemLeaf(ctx, x, y, len, dir, k) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(dir, 1);
        ctx.rotate(-0.6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -len * 0.45, len, 0);
        ctx.quadraticCurveTo(len * 0.5, len * 0.45, 0, 0);
        P.fillStroke(ctx, P.linear(ctx, 0, -len * 0.4, 0, len * 0.4, ['#9be86a', '#5fc94f']), '#2f7a2f', 1.6 * k);
        ctx.restore();
    }

    function petalsRing(ctx, n, r, pr, colorA, colorB, line, k, rot = 0) {
        for (let i = 0; i < n; i++) {
            const a = rot + i * Math.PI * 2 / n;
            ctx.save();
            ctx.rotate(a);
            P.ellipse(ctx, r, 0, pr, pr * 0.45);
            P.fillStroke(ctx, P.linear(ctx, 0, 0, r + pr, 0, [colorB, colorA]), line, 1.4 * k);
            ctx.restore();
        }
    }

    F.sunflower = (ctx, s, t) => {
        const k = s / 60, sway = Math.sin(t * 1.3) * 3 * k;
        stem(ctx, s * 0.72, k, sway);
        stemLeaf(ctx, 0, -s * 0.3, 16 * k, 1, k);
        stemLeaf(ctx, 0, -s * 0.42, 14 * k, -1, k);
        ctx.save();
        ctx.translate(sway, -s * 0.78);
        ctx.rotate(Math.sin(t * 0.8) * 0.08);
        petalsRing(ctx, 12, 12 * k, 9 * k, '#ffd23f', '#ffb000', '#b86d0c', k);
        P.circle(ctx, 0, 0, 10 * k);
        P.fillStroke(ctx, P.ball(ctx, 0, 0, 10 * k, '#8a5a2a'), '#4a2a10', 1.6 * k);
        ctx.fillStyle = '#5a3414';
        for (let i = 0; i < 7; i++) { P.circle(ctx, Math.cos(i) * 5 * k, Math.sin(i * 1.7) * 5 * k, 1.2 * k); ctx.fill(); }
        ctx.restore();
    };

    F.bluebell = (ctx, s, t) => {
        const k = s / 60;
        const sway = Math.sin(t * 1.5 + 1) * 3 * k;
        ctx.strokeStyle = '#3f9a3f';
        ctx.lineWidth = 3 * k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(2 * k, -s * 0.6, sway + 14 * k, -s * 0.85);
        ctx.stroke();
        stemLeaf(ctx, 0, -s * 0.2, 16 * k, -1, k);
        [[0.45, 0], [0.62, 1], [0.78, 2]].forEach(([tt, i]) => {
            const x = U.lerp(2 * k, sway + 14 * k, tt * 1.1) - 2 * k, y = -s * tt;
            ctx.save();
            ctx.translate(x + 4 * k, y + 6 * k);
            ctx.rotate(0.2 + Math.sin(t * 2 + i) * 0.1);
            ctx.beginPath();
            ctx.moveTo(-6 * k, 0);
            ctx.quadraticCurveTo(-6 * k, -10 * k, 0, -10 * k);
            ctx.quadraticCurveTo(6 * k, -10 * k, 6 * k, 0);
            ctx.lineTo(8 * k, 4 * k); ctx.lineTo(4 * k, 2 * k); ctx.lineTo(0, 5 * k);
            ctx.lineTo(-4 * k, 2 * k); ctx.lineTo(-8 * k, 4 * k);
            ctx.closePath();
            P.fillStroke(ctx, P.linear(ctx, 0, -10 * k, 0, 5 * k, ['#a8c2ff', '#6f9bff', '#4a6fe0']), '#2a3f9a', 1.6 * k);
            ctx.restore();
        });
    };

    F.dandelion = (ctx, s, t) => {
        const k = s / 60, sway = Math.sin(t * 1.2 + 2) * 3 * k;
        stem(ctx, s * 0.72, k, sway);
        stemLeaf(ctx, 0, -s * 0.15, 18 * k, 1, k);
        ctx.save();
        ctx.translate(sway, -s * 0.78);
        const g = ctx.createRadialGradient(0, 0, 2 * k, 0, 0, 16 * k);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(1, 'rgba(255,255,255,0.15)');
        // тёплая серо-голубая тень под пушком — одуванчик виден и на светлом фоне
        ctx.fillStyle = 'rgba(120,140,170,0.28)';
        P.circle(ctx, 0.8 * k, 1.2 * k, 17.5 * k);
        ctx.fill();
        ctx.fillStyle = g;
        P.circle(ctx, 0, 0, 16 * k);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 1 * k;
        for (let i = 0; i < 18; i++) {
            const a = i * Math.PI * 2 / 18 + t * 0.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * 15 * k, Math.sin(a) * 15 * k);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            P.circle(ctx, Math.cos(a) * 15 * k, Math.sin(a) * 15 * k, 1.6 * k);
            ctx.fill();
            ctx.strokeStyle = 'rgba(110,130,160,0.55)';
            ctx.lineWidth = 0.7 * k;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.lineWidth = 1 * k;
        }
        ctx.fillStyle = '#e8d870';
        P.circle(ctx, 0, 0, 3 * k);
        ctx.fill();
        ctx.restore();
    };

    F.clover = (ctx, s, t) => {
        const k = s / 60, sway = Math.sin(t * 1.4 + 3) * 2 * k;
        stem(ctx, s * 0.55, k, sway);
        ctx.save();
        ctx.translate(sway, -s * 0.6);
        ctx.rotate(Math.sin(t) * 0.1);
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 2 + Math.PI / 4);
            // лепесток-сердечко
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-10 * k, -4 * k, -10 * k, -16 * k, -2 * k, -15 * k);
            ctx.quadraticCurveTo(0, -13 * k, 2 * k, -15 * k);
            ctx.bezierCurveTo(10 * k, -16 * k, 10 * k, -4 * k, 0, 0);
            P.fillStroke(ctx, P.linear(ctx, 0, -15 * k, 0, 0, ['#9cf07a', '#45b545']), '#1f6e2a', 1.6 * k);
            ctx.restore();
        }
        P.sparkle(ctx, 6 * k, -8 * k, 3 * k * (0.6 + 0.4 * Math.sin(t * 3)), '#fffbd0');
        ctx.restore();
    };

    F.rose = (ctx, s, t) => {
        const k = s / 60, sway = Math.sin(t * 1.1 + 4) * 2.5 * k;
        stem(ctx, s * 0.7, k, sway);
        stemLeaf(ctx, 0, -s * 0.32, 15 * k, -1, k);
        stemLeaf(ctx, 0, -s * 0.45, 13 * k, 1, k);
        ctx.save();
        ctx.translate(sway, -s * 0.76);
        P.circle(ctx, 0, 0, 13 * k);
        P.fillStroke(ctx, P.ball(ctx, 0, 0, 13 * k, '#ff4f6d'), '#8a1a2a', 1.8 * k);
        // спираль лепестков
        ctx.strokeStyle = '#a81f36';
        ctx.lineWidth = 1.8 * k;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 5; a += 0.2) {
            const r = 1.2 * k + a * 0.65 * k;
            const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.85;
            if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        P.shine(ctx, -5 * k, -6 * k, 3 * k, 1.6 * k, 0.6);
        ctx.restore();
    };

    F.lavender = (ctx, s, t) => {
        const k = s / 60;
        [-6, 0, 6].forEach((dx, j) => {
            const sway = Math.sin(t * 1.5 + j) * 3 * k;
            const h = s * (0.75 + (j === 1 ? 0.12 : 0));
            ctx.strokeStyle = '#4f9a4f';
            ctx.lineWidth = 2.4 * k;
            ctx.beginPath();
            ctx.moveTo(dx * k * 0.3, 0);
            ctx.quadraticCurveTo(dx * k, -h * 0.5, dx * k + sway, -h);
            ctx.stroke();
            for (let i = 0; i < 6; i++) {
                const y = -h + i * 4.5 * k;
                const x = dx * k + sway * (1 - i / 10);
                [-1, 1].forEach(d => {
                    P.ellipse(ctx, x + d * 2.4 * k, y, 2.6 * k, 3.2 * k, d * 0.4);
                    P.fillStroke(ctx, i % 2 ? '#b98bff' : '#9d6bf0', '#5a3a9a', 1 * k);
                });
            }
        });
    };

    F.lotus = (ctx, s, t) => {
        const k = s / 60;
        // лист кувшинки
        ctx.beginPath();
        ctx.ellipse(0, -2 * k, 26 * k, 8 * k, 0, 0.15, Math.PI * 2 - 0.15);
        ctx.lineTo(0, -2 * k);
        ctx.closePath();
        P.fillStroke(ctx, P.linear(ctx, 0, -10 * k, 0, 6 * k, ['#7fe07a', '#3fa84a']), '#1f6e2a', 1.6 * k);
        ctx.save();
        ctx.translate(0, -8 * k + Math.sin(t * 1.5) * 1.2 * k);
        const petal = (a, len, col) => {
            ctx.save();
            ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-7 * k, -len * 0.55, 0, -len);
            ctx.quadraticCurveTo(7 * k, -len * 0.55, 0, 0);
            P.fillStroke(ctx, P.linear(ctx, 0, -len, 0, 0, ['#ffffff', col]), '#b04a8a', 1.4 * k);
            ctx.restore();
        };
        [-1.1, 1.1, -0.6, 0.6].forEach(a => petal(a, 18 * k, '#ffb3df'));
        [-0.25, 0.25, 0].forEach(a => petal(a, 22 * k, '#ff9fd0'));
        ctx.fillStyle = '#ffe066';
        P.circle(ctx, 0, -4 * k, 3 * k);
        ctx.fill();
        ctx.restore();
    };

    F.rainbowflower = (ctx, s, t) => {
        const k = s / 60, sway = Math.sin(t * 1.2 + 5) * 3 * k;
        stem(ctx, s * 0.72, k, sway);
        stemLeaf(ctx, 0, -s * 0.3, 16 * k, 1, k);
        stemLeaf(ctx, 0, -s * 0.4, 14 * k, -1, k);
        ctx.save();
        ctx.translate(sway, -s * 0.8);
        ctx.rotate(t * 0.4);
        P.RAINBOW.forEach((col, i) => {
            ctx.save();
            ctx.rotate(i * Math.PI * 2 / 7);
            P.ellipse(ctx, 11 * k, 0, 9 * k, 5.5 * k);
            P.fillStroke(ctx, P.linear(ctx, 0, 0, 20 * k, 0, [U.shade(col, 0.5), col]), U.shade(col, -0.4), 1.4 * k);
            ctx.restore();
        });
        P.circle(ctx, 0, 0, 7 * k);
        P.fillStroke(ctx, P.ball(ctx, 0, 0, 7 * k, '#fff2a8'), '#b88a1a', 1.4 * k);
        ctx.restore();
        P.sparkle(ctx, sway + 16 * k, -s * 0.95, 3.5 * k * (0.5 + 0.5 * Math.sin(t * 4)), '#ffffff');
    };

    F.draw = (id, ctx, size, t) => {
        const fn = F[id];
        if (fn) fn(ctx, size, t);
    };
})(typeof window !== 'undefined' ? window : globalThis);
