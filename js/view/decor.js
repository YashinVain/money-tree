// decor.js — украшения сада. Появляются по мере роста дерева (по лучшему
// уровню за всё время) и остаются навсегда, даже после нового сада —
// сад постепенно обживается, и в каждом заходе что-то меняется.
// Рисуются в статичный слой фона, поэтому почти ничего не стоят по скорости.

(function (root) {
    const R = root.R = root.R || {};
    const U = R.util;
    const P = R.paint;
    const D = R.decor = {};

    // lvl — с какого лучшего уровня появляется; dx — сдвиг от дерева в долях
    // ширины экрана; depth: 0 — на лугу рядом, 1 — на ближнем холме, 2 — вдали
    D.list = [
        { id: 'mushrooms', lvl: 0, dx: -0.37, depth: 0 },
        { id: 'stones', lvl: 4, dx: 0.37, depth: 0 },
        { id: 'fence', lvl: 18, dx: -0.44, depth: 1 },
        { id: 'birdhouse', lvl: 26, dx: 0.42, depth: 1 },
        { id: 'pond', lvl: 34, dx: 0.3, depth: 1 },
        { id: 'windmill', lvl: 42, dx: -0.3, depth: 2 },
        { id: 'cottage', lvl: 52, dx: 0.22, depth: 2 },
        { id: 'lanterns', lvl: 61, dx: -0.22, depth: 1 },
        { id: 'arch', lvl: 70, dx: 0.15, depth: 2 },
        { id: 'fountain', lvl: 82, dx: -0.14, depth: 2 },
        { id: 'island', lvl: 96, dx: -0.47, depth: 3 },
        { id: 'castle', lvl: 110, dx: 0.475, depth: 2 }
    ];

    D.unlocked = (best) => D.list.filter(d => best >= d.lvl);

    const line = '#4a2a14';

    // Каждый рисунок: основание в (0,0), растёт вверх, k — масштаб (≈ пикселей на единицу)
    const ART = {
        mushrooms(c, k) {
            [[-10, 0, 1], [6, 2, 0.75], [16, 1, 0.55]].forEach(([x, y, s]) => {
                c.save();
                c.translate(x * k, y * k);
                c.scale(s, s);
                P.roundRect(c, -4 * k, -12 * k, 8 * k, 13 * k, 3 * k);
                P.fillStroke(c, '#fff3dc', line, 1.6 * k);
                c.beginPath();
                c.ellipse(0, -12 * k, 13 * k, 9 * k, 0, Math.PI, 0);
                c.closePath();
                P.fillStroke(c, P.linear(c, 0, -21 * k, 0, -12 * k, ['#ff7a6b', '#e0443a']), '#7a1f18', 1.8 * k);
                c.fillStyle = '#ffffff';
                [[-6, -15], [2, -18], [7, -14]].forEach(([dx, dy]) => { P.circle(c, dx * k, dy * k, 1.9 * k); c.fill(); });
                c.restore();
            });
        },
        stones(c, k) {
            [[-12, 0, 9, 6, '#b8b4c8'], [4, 1, 12, 8, '#a8a4bc'], [18, 0, 6, 4, '#c8c4d8']].forEach(([x, y, rx, ry, col]) => {
                P.ellipse(c, x * k, (y - ry * 0.6) * k, rx * k, ry * k);
                P.fillStroke(c, P.ball(c, x * k, (y - ry * 0.6) * k, rx * k, col), '#5a5470', 1.6 * k);
            });
        },
        fence(c, k) {
            c.fillStyle = '#c99258';
            for (let i = 0; i < 5; i++) {
                const x = (i - 2) * 16 * k;
                c.beginPath();
                c.moveTo(x - 4 * k, 0);
                c.lineTo(x - 4 * k, -22 * k);
                c.lineTo(x, -27 * k);
                c.lineTo(x + 4 * k, -22 * k);
                c.lineTo(x + 4 * k, 0);
                c.closePath();
                P.fillStroke(c, P.linear(c, x - 4 * k, 0, x + 4 * k, 0, ['#d9a066', '#b07a46']), line, 1.6 * k);
            }
            [-8, -18].forEach(y => {
                P.roundRect(c, -36 * k, y * k - 2.5 * k, 72 * k, 5 * k, 2 * k);
                P.fillStroke(c, '#c99258', line, 1.4 * k);
            });
        },
        birdhouse(c, k) {
            P.roundRect(c, -2.5 * k, -46 * k, 5 * k, 46 * k, 2 * k);
            P.fillStroke(c, '#a8703f', line, 1.6 * k);
            P.roundRect(c, -11 * k, -66 * k, 22 * k, 22 * k, 3 * k);
            P.fillStroke(c, P.linear(c, 0, -66 * k, 0, -44 * k, ['#8fd8ff', '#4fa8e0']), '#1f4a7a', 1.8 * k);
            c.beginPath();
            c.moveTo(-15 * k, -64 * k); c.lineTo(0, -78 * k); c.lineTo(15 * k, -64 * k);
            c.closePath();
            P.fillStroke(c, '#ff7a6b', '#7a1f18', 1.8 * k);
            c.fillStyle = '#2b1d16';
            P.circle(c, 0, -56 * k, 4 * k); c.fill();
            c.strokeStyle = line;
            c.lineWidth = 1.6 * k;
            c.beginPath(); c.moveTo(0, -50 * k); c.lineTo(0, -47 * k); c.stroke();
        },
        pond(c, k) {
            P.ellipse(c, 0, -4 * k, 34 * k, 9 * k);
            P.fillStroke(c, P.linear(c, 0, -13 * k, 0, 5 * k, ['#9fe6ff', '#4fb6e8']), '#2a6e9a', 1.8 * k);
            c.fillStyle = 'rgba(255,255,255,0.6)';
            P.ellipse(c, -10 * k, -7 * k, 10 * k, 2 * k); c.fill();
            // кувшинка
            c.beginPath();
            c.ellipse(12 * k, -4 * k, 7 * k, 3 * k, 0, 0.3, Math.PI * 2 - 0.3);
            c.lineTo(12 * k, -4 * k);
            c.closePath();
            P.fillStroke(c, '#5fd65a', '#1f6e2a', 1.2 * k);
            c.fillStyle = '#ff9fd0';
            P.circle(c, 12 * k, -6 * k, 2.6 * k); c.fill();
            // камыш
            c.strokeStyle = '#3f9a3f';
            c.lineWidth = 2 * k;
            [-30, -26, 28].forEach(x => { c.beginPath(); c.moveTo(x * k, -2 * k); c.lineTo((x + 1) * k, -18 * k); c.stroke(); });
            c.fillStyle = '#8a5a30';
            [-30, -26, 28].forEach(x => { P.ellipse(c, (x + 1) * k, -19 * k, 1.8 * k, 4.5 * k); c.fill(); });
        },
        windmill(c, k, t) {
            c.beginPath();
            c.moveTo(-14 * k, 0); c.lineTo(-9 * k, -62 * k); c.lineTo(9 * k, -62 * k); c.lineTo(14 * k, 0);
            c.closePath();
            P.fillStroke(c, P.linear(c, -14 * k, 0, 14 * k, 0, ['#fff3dc', '#e8d2a8']), line, 1.8 * k);
            c.beginPath();
            c.moveTo(-12 * k, -60 * k); c.lineTo(0, -76 * k); c.lineTo(12 * k, -60 * k);
            c.closePath();
            P.fillStroke(c, '#c96a4a', '#6e2a18', 1.8 * k);
            P.roundRect(c, -4 * k, -16 * k, 8 * k, 16 * k, 3 * k);
            P.fillStroke(c, '#8a5a30', line, 1.4 * k);
            c.save();
            c.translate(0, -60 * k);
            c.rotate((t || 0) * 0.6);
            for (let i = 0; i < 4; i++) {
                c.rotate(Math.PI / 2);
                P.roundRect(c, 2 * k, -3.5 * k, 32 * k, 7 * k, 2 * k);
                P.fillStroke(c, '#fffaf0', line, 1.4 * k);
            }
            P.circle(c, 0, 0, 3.5 * k);
            P.fillStroke(c, '#c96a4a', line, 1.4 * k);
            c.restore();
        },
        cottage(c, k) {
            P.roundRect(c, -24 * k, -30 * k, 48 * k, 30 * k, 3 * k);
            P.fillStroke(c, P.linear(c, 0, -30 * k, 0, 0, ['#fff1d6', '#e8c89a']), line, 1.8 * k);
            c.beginPath();
            c.moveTo(-30 * k, -28 * k); c.lineTo(0, -52 * k); c.lineTo(30 * k, -28 * k);
            c.closePath();
            P.fillStroke(c, P.linear(c, 0, -52 * k, 0, -28 * k, ['#ff8a6b', '#d9443a']), '#7a1f18', 1.8 * k);
            P.roundRect(c, 12 * k, -50 * k, 7 * k, 12 * k, 1.5 * k);
            P.fillStroke(c, '#a8703f', line, 1.4 * k);
            P.roundRect(c, -6 * k, -18 * k, 12 * k, 18 * k, 5 * k);
            P.fillStroke(c, '#a8703f', line, 1.6 * k);
            P.roundRect(c, -19 * k, -22 * k, 9 * k, 9 * k, 2 * k);
            P.fillStroke(c, '#fff2a0', line, 1.4 * k);
            P.roundRect(c, 11 * k, -22 * k, 9 * k, 9 * k, 2 * k);
            P.fillStroke(c, '#fff2a0', line, 1.4 * k);
        },
        lanterns(c, k) {
            [-16, 16].forEach(x => {
                P.roundRect(c, x * k - 2 * k, -40 * k, 4 * k, 40 * k, 2 * k);
                P.fillStroke(c, '#5a4a6a', '#2a1f3a', 1.4 * k);
                const g = c.createRadialGradient(x * k, -44 * k, 0, x * k, -44 * k, 18 * k);
                g.addColorStop(0, 'rgba(255,230,140,0.6)');
                g.addColorStop(1, 'rgba(255,230,140,0)');
                c.fillStyle = g;
                P.circle(c, x * k, -44 * k, 18 * k); c.fill();
                P.roundRect(c, x * k - 5 * k, -51 * k, 10 * k, 12 * k, 3 * k);
                P.fillStroke(c, P.linear(c, 0, -51 * k, 0, -39 * k, ['#fff6c0', '#ffc94a']), '#8a5a1a', 1.4 * k);
            });
        },
        arch(c, k) {
            c.strokeStyle = '#a8703f';
            c.lineWidth = 6 * k;
            c.beginPath();
            c.moveTo(-24 * k, 0);
            c.lineTo(-24 * k, -36 * k);
            c.arc(0, -36 * k, 24 * k, Math.PI, 0);
            c.lineTo(24 * k, 0);
            c.stroke();
            const roses = ['#ff4f6d', '#ff8fb0', '#ffffff'];
            for (let i = 0; i < 14; i++) {
                const a = Math.PI + (i / 13) * Math.PI;
                const x = Math.cos(a) * 24 * k, y = -36 * k + Math.sin(a) * 24 * k;
                c.fillStyle = '#4caf50';
                P.circle(c, x + 2 * k, y + 2 * k, 4 * k); c.fill();
                c.fillStyle = roses[i % 3];
                P.circle(c, x, y, 3.4 * k); c.fill();
            }
            [-24, 24].forEach(x => {
                for (let j = 0; j < 4; j++) {
                    c.fillStyle = roses[(j + 1) % 3];
                    P.circle(c, x * k + (j % 2 ? 3 : -3) * k, (-6 - j * 9) * k, 3.2 * k); c.fill();
                }
            });
        },
        fountain(c, k, t) {
            P.ellipse(c, 0, -5 * k, 30 * k, 8 * k);
            P.fillStroke(c, '#c8c4d8', '#5a5470', 1.8 * k);
            P.ellipse(c, 0, -7 * k, 25 * k, 5 * k);
            c.fillStyle = '#7fd8ff'; c.fill();
            P.roundRect(c, -4 * k, -30 * k, 8 * k, 24 * k, 3 * k);
            P.fillStroke(c, '#d8d4e8', '#5a5470', 1.6 * k);
            P.ellipse(c, 0, -30 * k, 12 * k, 4 * k);
            P.fillStroke(c, '#c8c4d8', '#5a5470', 1.6 * k);
            c.strokeStyle = 'rgba(160,225,255,0.9)';
            c.lineWidth = 2.2 * k;
            const sp = Math.sin((t || 0) * 3) * 2 * k;
            [-1, 1].forEach(d => {
                c.beginPath();
                c.moveTo(0, -34 * k);
                c.quadraticCurveTo(d * 14 * k, -50 * k - sp, d * 22 * k, -10 * k);
                c.stroke();
            });
        },
        island(c, k, t) {
            // летающий остров с водопадом (висит в небе)
            const bob = Math.sin((t || 0) * 0.8) * 3 * k;
            c.save();
            c.translate(0, bob);
            c.beginPath();
            c.moveTo(-34 * k, 0);
            c.quadraticCurveTo(-20 * k, 34 * k, 0, 40 * k);
            c.quadraticCurveTo(20 * k, 34 * k, 34 * k, 0);
            c.closePath();
            P.fillStroke(c, P.linear(c, 0, 0, 0, 40 * k, ['#b07a46', '#6e4424']), line, 1.8 * k);
            P.ellipse(c, 0, 0, 36 * k, 7 * k);
            P.fillStroke(c, '#6fcf4f', '#2d6e2d', 1.8 * k);
            c.fillStyle = 'rgba(160,225,255,0.85)';
            c.fillRect(14 * k, 2 * k, 5 * k, 46 * k);
            [[-14, -10, 9], [-2, -16, 11], [12, -9, 8]].forEach(([x, y, r]) => {
                P.circle(c, x * k, y * k, r * k);
                P.fillStroke(c, '#5fc94f', '#2d6e2d', 1.6 * k);
            });
            c.restore();
        },
        castle(c, k) {
            const tower = (x, w, h, roof) => {
                P.roundRect(c, x - w / 2, -h, w, h, 2 * k);
                P.fillStroke(c, P.linear(c, x - w / 2, 0, x + w / 2, 0, ['#f4ecff', '#d8ccf0']), '#5a4a8a', 1.8 * k);
                c.beginPath();
                c.moveTo(x - w / 2 - 3 * k, -h);
                c.lineTo(x, -h - roof);
                c.lineTo(x + w / 2 + 3 * k, -h);
                c.closePath();
                P.fillStroke(c, P.linear(c, 0, -h - roof, 0, -h, ['#c9a8ff', '#8a5be0']), '#3d2a8a', 1.8 * k);
                c.fillStyle = '#ffe680';
                P.roundRect(c, x - 3 * k, -h * 0.7, 6 * k, 8 * k, 3 * k); c.fill();
            };
            tower(-24 * k, 16 * k, 46 * k, 18 * k);
            tower(24 * k, 16 * k, 46 * k, 18 * k);
            tower(0, 24 * k, 62 * k, 24 * k);
            P.roundRect(c, -6 * k, -18 * k, 12 * k, 18 * k, 6 * k);
            P.fillStroke(c, '#a8703f', line, 1.6 * k);
            c.strokeStyle = '#ff5a8a';
            c.lineWidth = 1.6 * k;
            c.beginPath(); c.moveTo(0, -86 * k); c.lineTo(0, -98 * k); c.stroke();
            c.fillStyle = '#ff5a8a';
            c.beginPath(); c.moveTo(0, -98 * k); c.lineTo(10 * k, -94 * k); c.lineTo(0, -90 * k); c.fill();
        }
    };

    // Нарисовать украшение id с основанием в (x, y)
    D.draw = (c, id, x, y, k, t) => {
        const fn = ART[id];
        if (!fn) return;
        c.save();
        c.translate(x, y);
        fn(c, k, t);
        c.restore();
    };

    // Анимированные украшения (мельница крутится, фонтан брызжет, остров парит)
    D.animated = { windmill: true, fountain: true, island: true };
})(typeof window !== 'undefined' ? window : globalThis);
