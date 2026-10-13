// panels.js — содержимое вкладок и окон (Дерево, Зверята, Цветы, Новый сад,
// Подарки, Цели, Настройки). У каждой панели:
//   sig()   — "отпечаток" важного состояния: изменился → панель перерисуется
//   html()  — разметка
//   patch() — быстрое обновление цифр и доступности кнопок без перерисовки

(function (root) {
    const R = root.R = root.R || {};
    const U = R.util;
    const G = R.game;
    const M = R.meta;
    const CFG = R.CFG;
    const UI = R.ui;
    const t = (k, v) => R.t(k, v);
    const PN = R.panels = {};

    const setBtn = (btn, on) => { if (btn) btn.classList.toggle('off', !on); };
    const txt = (el, s) => { if (el && el.textContent !== s) el.textContent = s; };

    // Режим покупки зверят: 1, 10 или максимум
    PN.buyMode = 1;

    // ---------- Дерево ----------
    PN.tree = {
        title: () => t('tab_tree'),
        sig: () => G.S.level + ':' + G.isMaxed(),
        html: () => {
            const st = G.stageIndex();
            const stage = CFG.stages[st];
            const sub = G.subLevel();
            const lps = CFG.levelsPerStage;
            const flowerIdx = st;
            const flower = CFG.flowers[flowerIdx];
            let main;
            if (G.isMaxed()) {
                main = `<div class="card hl"><div class="row">
                    <div class="pic">${UI.img('stage', st)}</div>
                    <div class="grow"><div class="title">${t('tree_maxed')}</div>
                    <div class="desc">${t('tree_maxed_hint')}</div></div></div></div>`;
            } else {
                main = `<div class="card hl">
                    <div class="row">
                        <div class="pic">${UI.img('stage', st)}</div>
                        <div class="grow">
                            <div class="title">${t('stage_' + stage.id)}</div>
                            <div class="desc">${t('tree_level', { cur: sub, max: lps })}</div>
                            <div class="bar"><i style="width:${sub / lps * 100}%"></i></div>
                        </div>
                    </div>
                    <div class="row" style="margin-top:10px">
                        <div class="grow desc">${t('tree_tap_power')}: <b class="good" data-k="tap"></b></div>
                    </div>
                    <div class="btns">
                        <button class="btn col big" data-a="grow" data-k="growBtn"><span>${t('tree_grow')}</span><small data-k="growPrice"></small></button>
                        <button class="btn col big gold" data-a="growMax" data-k="maxBtn"><span data-k="maxLabel"></span><small data-k="maxPrice"></small></button>
                    </div>
                    ${stage.perk ? `<div class="desc" style="margin-top:10px">⭐ ${t('tree_perk')}: ${t('perk_stage_' + stage.id)}</div>` : ''}
                    <div class="desc" style="margin-top:4px">🌸 ${t('tree_reward', { name: t('flower_' + flower.id) })}</div>
                </div>`;
            }
            const dots = CFG.stages.map((s, i) => {
                const cls = i < st || (i === st && G.isMaxed()) ? 'done' : (i === st ? 'now' : 'locked');
                return `<div class="stage-dot ${cls}">
                    <div class="pic">${UI.img('stage', i)}</div>
                    ${i <= st ? t('stage_' + s.id) : '?'}
                    <div class="flower">${UI.img('flower', CFG.flowers[i].id)}</div>
                </div>`;
            }).join('');
            return main + `<div class="sec-title">${t('tree_stages')}</div><div class="stages">${dots}</div>`;
        },
        patch: (el) => {
            if (G.isMaxed()) return;
            const price = G.treePrice();
            const next = G.tapBaseAt(G.S.level + 1) * G.globalMult();
            txt(el.querySelector('[data-k="tap"]'), U.fmt(G.tapBase() * G.globalMult()) + ' → ' + U.fmt(next));
            const gp = el.querySelector('[data-k="growPrice"]');
            const html = UI.price(price);
            if (gp && gp.dataset.h !== html) { gp.innerHTML = html; gp.dataset.h = html; }
            setBtn(el.querySelector('[data-k="growBtn"]'), G.S.coins >= price);
            const plan = G.treeMaxPlan();
            const n = Math.max(1, plan.count);
            txt(el.querySelector('[data-k="maxLabel"]'), t('tree_grow_max', { n }));
            const mp = el.querySelector('[data-k="maxPrice"]');
            const mhtml = UI.price(plan.count ? plan.price : price);
            if (mp && mp.dataset.h !== mhtml) { mp.innerHTML = mhtml; mp.dataset.h = mhtml; }
            setBtn(el.querySelector('[data-k="maxBtn"]'), plan.count > 1);
        }
    };

    // ---------- Зверята ----------
    PN.helpers = {
        title: () => t('tab_helpers'),
        sig: () => G.S.helpers.join(',') + ':' + CFG.helpers.map((h, i) => G.helperRevealed(i) ? 1 : 0).join('') + ':' + PN.buyMode + ':' + G.flowerCount(),
        html: () => {
            const head = `<div class="row" style="padding:0 4px 8px">
                <div class="grow"><div class="title" data-k="total"></div><div class="desc">${t('helpers_hint')}</div></div>
            </div>
            <div class="row" style="padding:0 4px 10px"><div class="grow desc">${t('buy_mode')}</div>
                <div class="seg">${[1, 10, 'max'].map(m => `<button class="${PN.buyMode === m ? 'on' : ''}" data-a="mode:${m}">${m === 'max' ? 'Макс'.replace('Макс', R.i18n.lang === 'ru' ? 'Макс' : 'Max') : '×' + m}</button>`).join('')}</div>
            </div>`;
            const cards = CFG.helpers.map((h, i) => {
                const lvl = G.S.helpers[i];
                if (!G.helperRevealed(i)) {
                    return `<div class="card locked"><div class="row">
                        <div class="pic dark">${UI.img('helper', h.id)}</div>
                        <div class="grow"><div class="title">${t('helper_unknown')}</div>
                        <div class="desc">${t('helper_unknown_hint', { n: U.fmt(h.basePrice * 0.5) })}</div></div></div></div>`;
                }
                const ms = G.nextMilestone(lvl);
                const prevMs = CFG.helperMilestones.filter(m => m <= lvl).pop() || 0;
                const msFrac = ms ? (lvl - prevMs) / (ms - prevMs) : 1;
                return `<div class="card ${lvl > 0 ? '' : 'hl'}">
                    <div class="row">
                        <div class="pic has-lvl">${UI.img('helper', h.id)}${lvl > 0 ? `<span class="pic-lvl">${lvl}</span>` : ''}</div>
                        <div class="grow">
                            <div class="title">${t('helper_' + h.id)}</div>
                            <div class="desc">${lvl > 0 ? `<b class="good" data-k="rate${i}"></b>` : t('helper_desc_' + h.id)}</div>
                        </div>
                        <button class="btn col" data-a="hire:${i}" data-k="hire${i}"><span data-k="hireLabel${i}"></span><small data-k="hirePrice${i}"></small></button>
                    </div>
                    ${ms ? `<div class="bar gold"><i style="width:${msFrac * 100}%"></i><span>${t('helper_milestone', { n: ms })}</span></div>` : ''}
                </div>`;
            }).join('');
            return head + cards;
        },
        patch: (el) => {
            txt(el.querySelector('[data-k="total"]'), t('helpers_total', { n: U.fmt(G.passivePerSec()) }));
            CFG.helpers.forEach((h, i) => {
                if (!G.helperRevealed(i)) return;
                const btn = el.querySelector(`[data-k="hire${i}"]`);
                if (!btn) return;
                let count = PN.buyMode === 'max' ? Math.max(1, G.helperMaxAffordable(i)) : PN.buyMode;
                const price = G.helperBulkPrice(i, count);
                const lvl = G.S.helpers[i];
                const label = (lvl > 0 ? t('helper_more') : t('helper_hire')) + (count > 1 ? ' ×' + count : '');
                txt(el.querySelector(`[data-k="hireLabel${i}"]`), label);
                const p = el.querySelector(`[data-k="hirePrice${i}"]`);
                const html = UI.price(price);
                if (p.dataset.h !== html) { p.innerHTML = html; p.dataset.h = html; }
                setBtn(btn, G.S.coins >= price);
                const rate = el.querySelector(`[data-k="rate${i}"]`);
                if (rate) txt(rate, '+' + U.fmt(G.helperRate(i) * G.globalMult()) + (R.i18n.lang === 'ru' ? '/сек' : '/sec'));
            });
        }
    };

    // ---------- Цветы ----------
    PN.flowers = {
        title: () => t('tab_flowers'),
        sig: () => String(G.flowerCount()),
        html: () => {
            const cards = CFG.flowers.map((f, i) => {
                const on = G.flowerUnlocked(i);
                return `<div class="card ${on ? 'done' : 'locked'}">
                    <div class="pic ${on ? '' : 'dark'}">${UI.img('flower', f.id)}</div>
                    <div class="title">${on ? t('flower_' + f.id) : '?'}</div>
                    <div class="desc">${on ? t('flower_desc_' + f.id) : t('flower_locked', { n: f.unlockLevel })}</div>
                    ${on ? `<div class="desc good" style="margin-top:4px">✓ ${t('flower_active')}</div>` : ''}
                </div>`;
            }).join('');
            return `<div class="note">${t('flowers_intro')}</div>
                <div class="sec-title" style="margin-top:0">${t('flowers_count', { a: G.flowerCount(), b: CFG.flowers.length })}</div>
                <div class="grid2">${cards}</div>`;
        }
    };

    // ---------- Новый сад ----------
    const PERK_ICONS = { can: 'can', fertilizer: 'fertilizer', bed: 'bed', net: 'net', diary: 'diary', basket: 'basket' };

    PN.garden = {
        title: () => t('garden_title'),
        sig: () => [G.canPrestige(), G.seedsOnPrestige() > 0, G.S.seeds, JSON.stringify(G.S.perks)].join(':'),
        html: () => {
            let top;
            if (!G.canPrestige()) {
                top = `<div class="card"><div class="row">
                    <div class="pic">${R.icon('lock')}</div>
                    <div class="grow"><div class="title">${t('garden_locked', { n: CFG.prestigeLevel })}</div>
                    <div class="bar"><i style="width:${Math.min(1, G.S.level / CFG.prestigeLevel) * 100}%"></i><span>${G.S.level} / ${CFG.prestigeLevel}</span></div></div>
                </div></div>`;
            } else {
                top = `<div class="card hl" style="text-align:center">
                    <div class="desc">${t('garden_gain')}</div>
                    <div class="title" style="font-size:34px;display:flex;align-items:center;justify-content:center;gap:6px;margin:4px 0">
                        <span class="inline-ico">${UI.seedImg()}</span><span data-k="gain"></span></div>
                    <div class="desc" data-k="next"></div>
                    <button class="btn big wide gold" style="margin-top:10px" data-a="prestige" data-k="pbtn">${R.icon('garden').replace('<svg', '<svg class="ico" style="width:28px;height:28px"')}${t('garden_button')}</button>
                    <div class="desc" style="margin-top:10px">🔄 ${t('garden_resets')}</div>
                    <div class="desc">💛 ${t('garden_keeps')}</div>
                </div>`;
            }
            const perks = CFG.perks.map(p => {
                const lvl = G.perkLevel(p.id);
                const maxed = G.perkMaxed(p.id);
                return `<div class="card"><div class="row">
                    <div class="pic" style="padding:8px">${R.icon(PERK_ICONS[p.id])}</div>
                    <div class="grow"><div class="title">${t('perk_' + p.id)}${lvl ? `<span class="lvl">${t('perk_level', { n: lvl })}</span>` : ''}</div>
                    <div class="desc">${t('perk_desc_' + p.id)}</div></div>
                    ${maxed ? `<button class="btn off col">${p.max === 1 ? t('perk_bought') : t('perk_max')}</button>`
                        : `<button class="btn col gold" data-a="perk:${p.id}" data-k="perk_${p.id}"><span>+1</span><small>${UI.price(G.perkPrice(p.id), true)}</small></button>`}
                </div></div>`;
            }).join('');
            return `<div class="note">${t('garden_intro')}</div>${top}<div class="sec-title">${t('perks_title')}</div>${perks}`;
        },
        patch: (el) => {
            const gain = G.seedsOnPrestige();
            txt(el.querySelector('[data-k="gain"]'), U.fmt(gain));
            const next = el.querySelector('[data-k="next"]');
            if (next) txt(next, gain > 0 ? t('garden_next', { n: U.fmt(G.nextSeedAt() - G.S.runEarned) }) : t('garden_need_more', { n: U.fmt(CFG.seedDivisor) }));
            setBtn(el.querySelector('[data-k="pbtn"]'), gain > 0);
            CFG.perks.forEach(p => setBtn(el.querySelector(`[data-k="perk_${p.id}"]`), G.S.seeds >= G.perkPrice(p.id)));
        }
    };

    // ---------- Подарки ----------
    const AD_BONUSES = [
        { type: 'incomeX2', icon: 'x2', name: 'bonus_income_x2', desc: 'bonus_income_x2_desc' },
        { type: 'chest', icon: 'bag', name: 'bonus_chest', desc: 'bonus_chest_desc' },
        { type: 'chargeX2', icon: 'rainbow', name: 'bonus_charge_x2', desc: 'bonus_charge_x2_desc' },
        { type: 'instantCharge', icon: 'bolt', name: 'bonus_instant', desc: 'bonus_instant_desc' }
    ];

    PN.bonus = {
        title: () => t('bonus_title'),
        sig: () => [M.giftAvailable(), G.freeChestReady(), AD_BONUSES.map(b => G.adAvailable(b.type) ? 1 : 0).join('')].join(':'),
        html: () => {
            const day = M.giftStreakDay();
            const got = M.giftAvailable() ? day - 1 : day;
            const streak = Array.from({ length: 7 }, (_, i) => {
                const n = i + 1;
                const cls = n <= got ? 'got' : (n === day && M.giftAvailable() ? 'now' : '');
                return `<div class="${cls}">${n <= got ? '✓' : t('gift_day', { n })}</div>`;
            }).join('');
            const gift = `<div class="card ${M.giftAvailable() ? 'hl' : ''}">
                <div class="row"><div class="pic" style="padding:8px">${R.icon('gift')}</div>
                <div class="grow"><div class="title">${t('gift_title')}</div><div class="desc">${t('gift_desc')}</div></div></div>
                <div class="streak">${streak}</div>
                ${M.giftAvailable()
                    ? `<button class="btn big wide gold" data-a="gift"><span>${t('gift_take')}</span>&nbsp;<span data-k="giftAmt"></span></button>`
                    : `<div class="desc" style="text-align:center;margin-top:6px">${t('gift_taken')}</div>`}
            </div>`;
            const chest = `<div class="card ${G.freeChestReady() ? 'hl' : ''}"><div class="row">
                <div class="pic" style="padding:8px">${R.icon('basket')}</div>
                <div class="grow"><div class="title">${t('free_chest')}</div><div class="desc" data-k="chestDesc"></div></div>
                <button class="btn col" data-a="freeChest" data-k="chestBtn"><span data-k="chestLabel"></span></button>
            </div></div>`;
            const ads = AD_BONUSES.map(b => `<div class="card"><div class="row">
                <div class="pic" style="padding:8px">${R.icon(b.icon)}</div>
                <div class="grow"><div class="title">${t(b.name)}</div><div class="desc" data-k="addesc_${b.type}"></div></div>
                <button class="btn col blue" data-a="ad:${b.type}" data-k="ad_${b.type}">
                    <span style="display:flex;align-items:center;gap:4px"><i class="ico" style="width:22px;height:22px">${R.icon('video')}</i>${t('bonus_watch')}</span>
                    <small data-k="adtime_${b.type}"></small></button>
            </div></div>`).join('');
            return gift + chest + `<div class="sec-title">${t('bonus_ad')}</div>` + ads;
        },
        patch: (el) => {
            const now = G.now();
            const ga = el.querySelector('[data-k="giftAmt"]');
            if (ga) {
                const h = UI.price(M.giftAmount());
                if (ga.dataset.h !== h) { ga.innerHTML = h; ga.dataset.h = h; }
            }
            const ready = G.freeChestReady();
            const cd = el.querySelector('[data-k="chestDesc"]');
            const ch = U.fmt(G.freeChestAmount());
            txt(cd, t('free_chest_desc', { n: ch }));
            txt(el.querySelector('[data-k="chestLabel"]'), ready ? t('free_take') : U.fmtTime(G.S.freeChestAt - now));
            setBtn(el.querySelector('[data-k="chestBtn"]'), ready);
            AD_BONUSES.forEach(b => {
                const d = el.querySelector(`[data-k="addesc_${b.type}"]`);
                txt(d, b.type === 'chest' ? t(b.desc, { n: U.fmt(G.secondsOfIncome(CFG.ads.chest.seconds)) }) : t(b.desc));
                const avail = G.adAvailable(b.type);
                setBtn(el.querySelector(`[data-k="ad_${b.type}"]`), avail);
                let sub = '';
                if (b.type === 'incomeX2' && G.S.boosts.incomeX2End > now) sub = t('bonus_active', { t: U.fmtTime(G.S.boosts.incomeX2End - now) });
                else if (b.type === 'chargeX2' && G.S.boosts.chargeX2End > now) sub = t('bonus_active', { t: U.fmtTime(G.S.boosts.chargeX2End - now) });
                else if (!avail) sub = t('bonus_wait', { t: U.fmtTime((G.S.adReady[b.type] || 0) - now) });
                txt(el.querySelector(`[data-k="adtime_${b.type}"]`), sub);
            });
        }
    };

    // ---------- Значки "есть что сделать" ----------
    PN.badges = () => {
        const b = {};
        b.tree = !G.isMaxed() && G.S.coins >= G.treePrice() ? 1 : 0;
        b.helpers = CFG.helpers.some((h, i) => G.helperRevealed(i) && G.S.coins >= G.helperPrice(i)) ? 1 : 0;
        b.garden = (G.canPrestige() && G.seedsOnPrestige() >= Math.max(1, Math.ceil(G.S.seedsLife * 0.5))) || CFG.perks.some(p => !G.perkMaxed(p.id) && G.S.seeds >= G.perkPrice(p.id)) ? 1 : 0;
        b.bonus = M.giftAvailable() || G.freeChestReady() ? 1 : 0;
        b.flowers = 0;
        b.goals = M.claimableCount();
        return b;
    };

    // ---------- Окно «Цели» (задания и достижения) ----------
    let goalsTab = 'quests';

    function goalsHtml() {
        const tabs = `<div class="seg" style="margin:0 0 10px">${['quests', 'achievements'].map(id =>
            `<button class="${goalsTab === id ? 'on' : ''}" data-a="goalsTab:${id}">${t('goals_' + id)}</button>`).join('')}</div>`;
        let body = '';
        if (goalsTab === 'quests') {
            M.ensureDaily();
            const qs = G.S.daily.quests.map((q, i) => {
                const done = q.progress >= q.target;
                const target = q.type === 'earn' ? U.fmt(q.target) : q.target;
                return `<div class="card ${q.claimed ? 'done' : (done ? 'hl' : '')}"><div class="row">
                    <div class="pic" style="padding:9px">${iconOrPic(M.questTypes[q.type].icon)}</div>
                    <div class="grow"><div class="title" style="font-size:16px">${t('quest_' + q.type, { n: target })}</div>
                    <div class="bar"><i style="width:${q.progress / q.target * 100}%"></i><span>${q.type === 'earn' ? U.fmt(q.progress) : Math.floor(q.progress)} / ${target}</span></div></div>
                    ${q.claimed ? `<div class="pic" style="width:40px;height:40px;border:0;background:none">${R.icon('check')}</div>`
                        : `<button class="btn col ${done ? 'gold' : 'off'}" data-a="claimQuest:${i}"><span>${t('quest_claim')}</span><small>${UI.price(M.questReward())}</small></button>`}
                </div></div>`;
            }).join('');
            const bonus = M.dailyBonusInfo();
            const allDone = M.allQuestsClaimed();
            const bonusCard = `<div class="card ${allDone && !G.S.daily.bonusClaimed ? 'hl' : ''}"><div class="row">
                <div class="pic" style="padding:9px">${R.icon('star')}</div>
                <div class="grow"><div class="title" style="font-size:16px">${t('quest_bonus')}</div>
                <div class="desc">${bonus.kind === 'seed' ? t('quest_bonus_seed') : UI.price(bonus.amount)}</div></div>
                ${G.S.daily.bonusClaimed ? `<div class="pic" style="width:40px;height:40px;border:0;background:none">${R.icon('check')}</div>`
                    : `<button class="btn col ${allDone ? 'gold' : 'off'}" data-a="claimBonus">${t('quest_claim')}</button>`}
            </div></div>`;
            const tomorrow = new Date(G.now());
            tomorrow.setHours(24, 0, 0, 0);
            body = `<div class="note">${t('quests_refresh', { t: U.fmtTime(tomorrow - G.now()) })}</div>` + qs + bonusCard;
        } else {
            const all = M.allAchievements();
            const got = all.filter(a => G.S.ach[a.id]).length;
            body = `<div class="note">${t('ach_count', { a: got, b: all.length, p: Math.round(got * CFG.achievementBonus * 100) })}<br>${t('ach_hint')}</div>`;
            M.achGroups.forEach(g => {
                const val = g.stat(G.S);
                const next = g.steps.find((s, k) => !G.S.ach[g.id + '_' + k]);
                const done = g.steps.filter((s, k) => G.S.ach[g.id + '_' + k]).length;
                const stars = g.steps.map((s, k) => `<span style="opacity:${G.S.ach[g.id + '_' + k] ? 1 : 0.25}">★</span>`).join('');
                const target = next === undefined ? g.steps[g.steps.length - 1] : next;
                const fmtT = g.id === 'earn' ? U.fmt(target) : U.fmtInt(target);
                body += `<div class="card ${next === undefined ? 'done' : ''}"><div class="row">
                    <div class="pic" style="padding:9px">${['tree', 'coin', 'seed', 'butterfly'].includes(g.icon) ? achPic(g.icon) : R.icon(g.icon === 'helpers' ? 'paw' : (g.icon === 'goldapple' ? 'star' : g.icon))}</div>
                    <div class="grow"><div class="title" style="font-size:16px">${t('ach_' + g.id)} <span style="color:#f0a81c">${stars}</span></div>
                    <div class="desc">${t('ach_' + g.id + '_desc', { n: fmtT })}</div>
                    <div class="bar gold"><i style="width:${Math.min(1, val / target) * 100}%"></i></div></div>
                </div></div>`;
            });
        }
        return `<div class="panel-head"><div class="grow">${t('goals_title')}</div><button class="round-btn" data-a="close">${R.icon('close')}</button></div>
            <div class="panel-body">${tabs}${body}</div>`;
    }

    // Значок: рисунок из сада (монетка, бабочка, дерево) или SVG-иконка
    function iconOrPic(icon) {
        return ['tree', 'coin', 'seed', 'butterfly'].includes(icon) ? achPic(icon) : R.icon(icon);
    }

    function achPic(icon) {
        if (icon === 'tree') return UI.img('stage', 4);
        if (icon === 'coin') return UI.coinImg();
        if (icon === 'seed') return UI.seedImg();
        if (icon === 'butterfly') return UI.img('butterfly', 0);
        return '';
    }

    let goalsModal = null;
    PN.openGoals = () => {
        R.audio.open();
        goalsModal = UI.modal({ html: goalsHtml(), onClose: () => { goalsModal = null; } });
    };
    PN.refreshGoals = () => {
        if (!goalsModal) return;
        const body = goalsModal.el.querySelector('.panel-body');
        const scroll = body ? body.scrollTop : 0;
        goalsModal.el.querySelector('.modal').innerHTML = goalsHtml();
        const nb = goalsModal.el.querySelector('.panel-body');
        if (nb) nb.scrollTop = scroll;
    };

    // ---------- Окно «Настройки» ----------
    function settingsHtml() {
        const S = G.S;
        const onOff = (on, action) => `<div class="seg"><button class="${on ? 'on' : ''}" data-a="${action}:1">${t('set_on')}</button><button class="${on ? '' : 'on'}" data-a="${action}:0">${t('set_off')}</button></div>`;
        const stats = [
            ['stat_taps', U.fmtInt(S.stats.taps)],
            ['stat_earned', U.fmt(S.lifeEarned)],
            ['stat_best', S.bestLevel],
            ['stat_prestiges', S.prestiges],
            ['stat_comets', S.stats.comets],
            ['stat_time', fmtPlay(S.stats.playMs)]
        ].map(([k, v]) => `<div class="list-row"><span>${t(k)}</span><b>${v}</b></div>`).join('');
        let auth = '';
        if (!R.sdk.mock && R.sdk.ysdk) {
            auth = R.sdk.isAuthorized()
                ? `<div class="card done"><div class="desc">✓ ${t('set_authorized')}</div></div>`
                : `<div class="card"><div class="desc" style="margin-bottom:8px">${t('set_auth_hint')}</div><button class="btn wide blue" data-a="auth">${t('set_auth')}</button></div>`;
        }
        const lb = R.sdk.leaderboardAvailable() ? `<button class="btn wide white" style="margin-bottom:10px" data-a="leaderboard"><i class="ico">${R.icon('crown')}</i>${t('leaderboard')}</button>` : '';
        return `<div class="panel-head"><div class="grow">${t('settings')}</div><button class="round-btn" data-a="close">${R.icon('close')}</button></div>
            <div class="panel-body">
                <div class="card">
                    <div class="set-row"><i class="ico">${R.icon('globe')}</i><div class="grow">${t('set_language')}</div>
                        <div class="seg"><button class="${R.i18n.lang === 'ru' ? 'on' : ''}" data-a="lang:ru">Русский</button><button class="${R.i18n.lang === 'en' ? 'on' : ''}" data-a="lang:en">English</button></div></div>
                    <div class="set-row"><i class="ico">${R.icon(S.settings.sound ? 'sound' : 'soundOff')}</i><div class="grow">${t('set_sound')}</div>${onOff(S.settings.sound, 'sound')}</div>
                    <div class="set-row"><i class="ico">${R.icon(S.settings.music ? 'music' : 'musicOff')}</i><div class="grow">${t('set_music')}</div>${onOff(S.settings.music, 'music')}</div>
                </div>
                ${auth}${lb}
                <div class="sec-title">${t('set_stats')}</div>
                <div class="card">${stats}</div>
                <div class="note" style="text-align:center">${t('version', { v: R.VERSION })}</div>
            </div>`;
    }

    function fmtPlay(ms) {
        const m = Math.floor(ms / 60000);
        return m >= 60 ? t('time_h_m', { h: Math.floor(m / 60), m: m % 60 }) : t('time_m', { m });
    }

    let settingsModal = null;
    PN.openSettings = () => {
        R.audio.open();
        settingsModal = UI.modal({ html: settingsHtml(), onClose: () => { settingsModal = null; } });
    };
    PN.refreshSettings = () => {
        if (settingsModal) settingsModal.el.querySelector('.modal').innerHTML = settingsHtml();
    };

    // ---------- Рейтинг ----------
    PN.openLeaderboard = async () => {
        const m = UI.modal({ html: `<div class="panel-head"><div class="grow">${t('leaderboard')}</div><button class="round-btn" data-a="close">${R.icon('close')}</button></div><div class="panel-body"><div class="note">${t('loading')}</div></div>` });
        const data = await R.sdk.getLeaderboard();
        let html = `<div class="note">${t('leaderboard_hint')}</div>`;
        if (!data || !data.entries || !data.entries.length) {
            html += `<div class="card"><div class="desc">${t('leaderboard_empty')}</div></div>`;
        } else {
            html += '<div class="card">' + data.entries.map(e => {
                const me = data.userRank && e.rank === data.userRank;
                const name = (e.player && e.player.publicName) || '—';
                return `<div class="list-row ${me ? 'me' : ''}"><span>${e.rank}. ${me ? t('you') : escapeHtml(name)}</span><b>${U.fmt(e.score)}</b></div>`;
            }).join('') + '</div>';
        }
        const body = m.el.querySelector('.panel-body');
        if (body) body.innerHTML = html;
    };

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    PN.goalsTab = (id) => { goalsTab = id; PN.refreshGoals(); };
})(typeof window !== 'undefined' ? window : globalThis);
