// game.js - 福了個哥（百分比布局版）

// ==================== 百分比配置（所有数值为屏幕宽高的百分比） ====================
const CONFIG = {
    // 卡牌区域
    cardCols: 5,                 // 列数（固定）
    cardRows: 8,                 // 行数（固定）
    cardWidthPercent: 12,        // 卡牌宽度占屏幕宽度的百分比（约 12%）
    cardAreaTopPercent: 28,      // 卡牌区域顶部位置（屏幕高度百分比）
    cardAreaBottomPercent: 72,   // 卡牌区域底部位置（屏幕高度百分比）
    
    // 顶部文字区域
    titleTopPercent: 10,          // 标题顶部位置
    titleFontPercent: 6,         // 标题字体大小（屏幕宽度百分比）
    levelTopPercent: 13,         // 关卡文字顶部位置
    levelFontPercent: 4,         // 关卡文字大小
    bestTopPercent: 16,          // 最高分顶部位置
    bestFontPercent: 3.5,        // 最高分文字大小
    
    // 分数面板
    scorePanelTopPercent: 10,      // 分数面板顶部位置
    scorePanelRightPercent: 3,    // 分数面板右边距（屏幕宽度百分比）
    scorePanelWidthPercent: 20,   // 分数面板宽度
    scorePanelHeightPercent: 5,   // 分数面板高度
    scoreFontPercent: 4.5,        // 分数数字大小
    
    // 设置按钮
    settingsBtnTopPercent: 20,    // 设置按钮顶部位置
    settingsBtnLeftPercent: 3,    // 设置按钮左边距
    settingsBtnWidthPercent: 10,  // 设置按钮宽度
    settingsBtnHeightPercent: 5,  // 设置按钮高度
    settingsBtnFontPercent: 3,    // 设置按钮字体大小
    
    // 卡槽区域
    slotBottomPercent: 12,        // 卡槽底部距离屏幕底部的百分比
    slotWidthPercent: 85,         // 卡槽宽度
    slotHeightPercent: 7,         // 卡槽高度
    
    // 按钮区域
    btnBottomPercent: 5,          // 按钮底部距离屏幕底部的百分比
    btnWidthPercent: 18,          // 单个按钮宽度
    btnHeightPercent: 6,          // 单个按钮高度
    btnFontPercent: 3.5,          // 按钮字体大小
    
    // 设置面板
    panelWidthPercent: 70,        // 设置面板宽度
    panelHeightPercent: 55,       // 设置面板高度
};

// ==================== 音效配置 ====================
const CLICK_SOUND_URL = 'images/click.mp3';
const BGM1_URL = 'images/bgm1.mp3';
const BGM2_URL = 'images/bgm2.mp3';

// 图片资源
const CARD_IMAGES = {
    'drill': 'card_drill.png', 'driver': 'card_driver.png', 'goggle': 'card_goggle.png',
    'hammer': 'card_hammer.png', 'machine': 'card_machine.png', 'plier': 'card_plier.png',
    'resistor': 'card_resistor.png', 'screw': 'card_screw.png', 'vr': 'card_vr.png', 'wrench': 'card_wrench.png'
};
const CARD_KEYS = ['drill','driver','goggle','hammer','machine','plier','resistor','screw','vr','wrench'];

// 全局变量
let screenWidth, screenHeight;
let CARD_SIZE, GRID_STEP, HALF_SHIFT;
let offsetX, offsetY;  // 卡牌区域偏移
let scaleFactor = 1;

// 音效
let clickAudio = null, bgmAudio = null;
let currentBgmIndex = 1, bgmEnabled = true, sfxEnabled = true;

// 游戏状态
let gameActive = true, score = 0, slotCards = [], stackCards = [], nextCardId = 1;
let currentLevel = 1, TOTAL_LEVELS = 10, levelBestScores = new Array(10).fill(0);
let shuffleRemainingCount = 3, settingsVisible = false;
let forbiddenPositions = [];
let loadedImages = {};

// 动画
let activeAnimations = [];
let prevAnimLen = 0;

// 画布
let canvas, ctx;

// UI 布局缓存（每帧计算）
let ui = {};

// 颜色
const colors = {
    bg: '#ffffff', cardLight: '#fff7e8', cardDark: '#e8d8c0', border: '#b97f3a',
    text: '#5a2f0a', scoreBg: '#2c2b28', scoreText: '#ffeaac', slotBg: '#e7dbb6',
    titleText: '#5a3c1a', subtitleText: '#8b6942', remainText: '#4a2e0a', settingsPanel: '#fef3dd'
};

// ==================== 工具函数 ====================
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// 将百分比转换为实际像素
function pctW(percent) { return screenWidth * percent / 100; }
function pctH(percent) { return screenHeight * percent / 100; }

// ==================== 音效 ====================
function initAudio() {
    clickAudio = wx.createInnerAudioContext(); clickAudio.src = CLICK_SOUND_URL; clickAudio.volume = 0.5;
    bgmAudio = wx.createInnerAudioContext(); bgmAudio.src = BGM1_URL; bgmAudio.loop = true; bgmAudio.volume = 0.4;
    if (bgmEnabled) bgmAudio.play();
}
function playClickSound() { if (sfxEnabled && clickAudio) { clickAudio.stop(); clickAudio.play(); } }
function toggleBgm() { bgmEnabled = !bgmEnabled; bgmEnabled ? bgmAudio.play() : bgmAudio.stop(); }
function toggleSfx() { sfxEnabled = !sfxEnabled; }
function switchBgm() { currentBgmIndex = currentBgmIndex === 1 ? 2 : 1; bgmAudio.src = currentBgmIndex === 1 ? BGM1_URL : BGM2_URL; if (bgmEnabled) bgmAudio.play(); }

// ==================== 图片加载 ====================
function loadCardImages() {
    return new Promise((resolve) => {
        let loaded = 0;
        const total = CARD_KEYS.length;
        for (let key of CARD_KEYS) {
            const img = wx.createImage();
            img.src = `images/${CARD_IMAGES[key]}`;
            img.onload = () => { loadedImages[key] = img; if (++loaded === total) resolve(); };
            img.onerror = () => { loadedImages[key] = null; if (++loaded === total) resolve(); };
            loadedImages[key] = img;
        }
    });
}

// ==================== 布局计算 ====================
function updateLayout() {
    // 卡牌尺寸：基于屏幕宽度百分比，同时确保不超出区域
    let desiredSize = pctW(CONFIG.cardWidthPercent);
    // 根据行数和列数计算可用空间限制
    const maxWidthByCols = (screenWidth - 40) / CONFIG.cardCols;
    const maxHeightByRows = (pctH(CONFIG.cardAreaBottomPercent) - pctH(CONFIG.cardAreaTopPercent)) / CONFIG.cardRows;
    CARD_SIZE = Math.min(desiredSize, maxWidthByCols, maxHeightByRows);
    CARD_SIZE = Math.max(CARD_SIZE, 30); // 最小30
    GRID_STEP = CARD_SIZE;
    HALF_SHIFT = CARD_SIZE / 2;
    
    // 卡牌区域逻辑尺寸
    const logicWidth = (CONFIG.cardCols - 1) * GRID_STEP + CARD_SIZE;
    const logicHeight = (CONFIG.cardRows - 1) * GRID_STEP + CARD_SIZE;
    
    // 卡牌区域居中
    const cardAreaCenterX = screenWidth / 2;
    const cardAreaCenterY = (pctH(CONFIG.cardAreaTopPercent) + pctH(CONFIG.cardAreaBottomPercent)) / 2;
    offsetX = cardAreaCenterX - logicWidth / 2;
    offsetY = cardAreaCenterY - logicHeight / 2;
    
    // 设置卡牌坐标边界
    window.BASE_MIN_X = 0;
    window.BASE_MIN_Y = 0;
    window.BASE_MAX_X = (CONFIG.cardCols - 1) * GRID_STEP;
    window.BASE_MAX_Y = (CONFIG.cardRows - 1) * GRID_STEP;
    window.MIN_X = -CARD_SIZE/2;
    window.MAX_X = window.BASE_MAX_X + CARD_SIZE/2;
    window.MIN_Y = -CARD_SIZE/2;
    window.MAX_Y = window.BASE_MAX_Y + CARD_SIZE/2;
    
    // 缓存所有 UI 元素位置
    ui = {
        title: { y: pctH(CONFIG.titleTopPercent), fontSize: pctW(CONFIG.titleFontPercent) },
        level: { y: pctH(CONFIG.levelTopPercent), fontSize: pctW(CONFIG.levelFontPercent) },
        best: { y: pctH(CONFIG.bestTopPercent), fontSize: pctW(CONFIG.bestFontPercent) },
        scorePanel: {
            y: pctH(CONFIG.scorePanelTopPercent),
            right: pctW(CONFIG.scorePanelRightPercent),
            width: pctW(CONFIG.scorePanelWidthPercent),
            height: pctH(CONFIG.scorePanelHeightPercent),
            fontSize: pctW(CONFIG.scoreFontPercent)
        },
        settingsBtn: {
            y: pctH(CONFIG.settingsBtnTopPercent),
            left: pctW(CONFIG.settingsBtnLeftPercent),
            width: pctW(CONFIG.settingsBtnWidthPercent),
            height: pctH(CONFIG.settingsBtnHeightPercent),
            fontSize: pctW(CONFIG.settingsBtnFontPercent)
        },
        slot: {
            bottom: pctH(CONFIG.slotBottomPercent),
            width: pctW(CONFIG.slotWidthPercent),
            height: pctH(CONFIG.slotHeightPercent)
        },
        btn: {
            bottom: pctH(CONFIG.btnBottomPercent),
            width: pctW(CONFIG.btnWidthPercent),
            height: pctH(CONFIG.btnHeightPercent),
            fontSize: pctW(CONFIG.btnFontPercent)
        },
        panel: {
            width: pctW(CONFIG.panelWidthPercent),
            height: pctH(CONFIG.panelHeightPercent)
        }
    };
}

// ==================== 位置生成（与之前相同，使用新边界）====================
function generateBaseGrid() {
    let points = [];
    for (let c = 0; c < CONFIG.cardCols; c++) {
        for (let r = 0; r < CONFIG.cardRows; r++) {
            points.push({ x: c * GRID_STEP, y: r * GRID_STEP });
        }
    }
    return points;
}
function getOffsetPositionByDir(basePos, dir) {
    const dirs = [[0,-HALF_SHIFT],[0,HALF_SHIFT],[-HALF_SHIFT,0],[HALF_SHIFT,0],
                  [-HALF_SHIFT,-HALF_SHIFT],[HALF_SHIFT,-HALF_SHIFT],
                  [-HALF_SHIFT,HALF_SHIFT],[HALF_SHIFT,HALF_SHIFT]];
    let [dx, dy] = dirs[dir % 8];
    let x = basePos.x + dx, y = basePos.y + dy;
    if (x >= window.MIN_X && x <= window.MAX_X && y >= window.MIN_Y && y <= window.MAX_Y) return { x, y };
    return null;
}
function generateForbiddenPositions(level) {
    const cnt = 10 + (level - 1) * 3;
    let all = generateBaseGrid();
    for (let i = all.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    return all.slice(0, cnt);
}
function isPositionForbidden(x, y) { return forbiddenPositions.some(p => Math.abs(p.x - x) < 1 && Math.abs(p.y - y) < 1); }
function getAvailableBasePositions(layer, existing) {
    let occupied = new Set();
    for (let c of existing) if (c.layer === layer) occupied.add(`${c.x},${c.y}`);
    let all = generateBaseGrid();
    return all.filter(p => !occupied.has(`${p.x},${p.y}`) && !isPositionForbidden(p.x, p.y));
}
function getLevelConfig(level) { return { layers: 5 + (level - 1) * 2, cardsPerLayer: 18 }; }
function generateLevel(level) {
    let cfg = getLevelConfig(level);
    let cards = [], id = 1, layerDirs = [];
    for (let layer = 0; layer < cfg.layers; layer++) {
        let avail = getAvailableBasePositions(layer, cards);
        let toPlace = Math.min(cfg.cardsPerLayer, avail.length);
        for (let i = avail.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [avail[i], avail[j]] = [avail[j], avail[i]]; }
        let dir = -1;
        if (layer > 0) {
            let opts = [0,1,2,3,4,5,6,7];
            let prev = layerDirs[layer-1];
            if (prev !== -1) opts = opts.filter(d => d !== prev);
            if (opts.length === 0) opts = [0,1,2,3,4,5,6,7];
            dir = opts[Math.floor(Math.random() * opts.length)];
        }
        layerDirs.push(dir);
        for (let i = 0; i < toPlace; i++) {
            let base = avail[i];
            let final = { x: base.x, y: base.y };
            if (layer > 0 && dir !== -1) { let off = getOffsetPositionByDir(base, dir); if (off) final = off; }
            cards.push({ id: id++, x: final.x, y: final.y, layer: layer });
        }
    }
    let total = cards.length;
    if (total % 3 !== 0) {
        let need = 3 - (total % 3);
        for (let a = 0; a < need; a++) {
            let added = false;
            for (let layer = cfg.layers - 1; layer >= 0 && !added; layer--) {
                let dir = layerDirs[layer];
                let shuffled = generateBaseGrid();
                for (let i = shuffled.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
                for (let base of shuffled) {
                    if (isPositionForbidden(base.x, base.y)) continue;
                    let candidate = { x: base.x, y: base.y };
                    if (layer > 0 && dir !== -1) { let off = getOffsetPositionByDir(base, dir); if (off) candidate = off; }
                    let occupied = false;
                    for (let c of cards) if (c.layer === layer && Math.abs(c.x - candidate.x) < 1 && Math.abs(c.y - candidate.y) < 1) { occupied = true; break; }
                    if (occupied) continue;
                    let overlap = false;
                    for (let c of cards) if (c.layer !== layer) continue;
                    if (Math.abs(c.x - candidate.x) < CARD_SIZE && Math.abs(c.y - candidate.y) < CARD_SIZE) { overlap = true; break; }
                    if (!overlap) { cards.push({ id: id++, x: candidate.x, y: candidate.y, layer: layer }); added = true; break; }
                }
            }
        }
    }
    return { cards };
}
function isRectOverlap(c1, c2) { const h = CARD_SIZE/2; return !(c1.x+h <= c2.x-h || c1.x-h >= c2.x+h || c1.y+h <= c2.y-h || c1.y-h >= c2.y+h); }
function isCardCovered(card, all) { for (let u of all) if (!u.removed && u.layer > card.layer && isRectOverlap(card, u)) return true; return false; }
function updateAllClickable() { for (let c of stackCards) if (!c.removed) c.clickable = !isCardCovered(c, stackCards); }
function eliminateFromSlot() {
    let changed = false;
    while (true) {
        let map = new Map();
        for (let icon of slotCards) map.set(icon, (map.get(icon) || 0) + 1);
        let target = null;
        for (let [k, v] of map) if (v >= 3) { target = k; break; }
        if (!target) break;
        let ns = [], removed = 0;
        for (let icon of slotCards) { if (icon === target && removed < 3) { removed++; continue; } ns.push(icon); }
        slotCards = ns; score += 10; changed = true;
    }
    if (changed) checkGameEnd();
}
function checkGameEnd() {
    let remaining = stackCards.filter(c => !c.removed).length;
    if (remaining === 0 && slotCards.length === 0 && gameActive) {
        gameActive = false;
        let prev = levelBestScores[currentLevel-1];
        if (score > prev) levelBestScores[currentLevel-1] = score;
        if (currentLevel < TOTAL_LEVELS) {
            wx.showModal({ title: `🎉 第${currentLevel}关通关！`, content: `得分：${score}\n最高分：${Math.max(prev, score)}`,
                confirmText: '下一关', cancelText: '重玩', success: (res) => {
                    if (res.confirm) { currentLevel++; shuffleRemainingCount = 3; loadLevel(currentLevel); }
                    else { shuffleRemainingCount = 3; loadLevel(currentLevel); }
                }
            });
        } else {
            wx.showModal({ title: '🏆 恭喜通关全部关卡！', content: `最终得分：${score}`, showCancel: false,
                success: () => { currentLevel = 1; shuffleRemainingCount = 3; loadLevel(1); }
            });
        }
        return true;
    }
    if (slotCards.length >= 7 && gameActive) {
        let cnt = new Map(); for (let icon of slotCards) cnt.set(icon, (cnt.get(icon) || 0) + 1);
        let can = false; for (let v of cnt.values()) if (v >= 3) { can = true; break; }
        if (!can) {
            gameActive = false;
            wx.showModal({ title: '😭 游戏失败', content: `得分：${score}`, confirmText: '重玩', cancelText: '第一关',
                success: (res) => { if (res.confirm) { shuffleRemainingCount = 3; loadLevel(currentLevel); } else { currentLevel = 1; shuffleRemainingCount = 3; loadLevel(1); } }
            });
            return true;
        }
    }
    return false;
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function startCardAnimation(card, fromX, fromY, toX, toY) {
    playClickSound();
    card.isAnimating = true; card.animatedRemoved = true;
    let start = Date.now();
    activeAnimations.push({ card, fromX, fromY, toX, toY, startTime: start, scaleDuration: 200, flyDuration: 500, phase: 'scale', scale: 1 });
}
function updateAnimations() {
    let now = Date.now();
    for (let i = activeAnimations.length - 1; i >= 0; i--) {
        let a = activeAnimations[i];
        if (a.phase === 'scale') {
            let elapsed = now - a.startTime;
            if (elapsed < a.scaleDuration) {
                let t = elapsed / a.scaleDuration;
                a.scale = t < 0.5 ? 1 + 0.2 * (t * 2) : 1.1 - 0.1 * ((t - 0.5) * 2);
            } else { a.phase = 'fly'; a.flyStartTime = now; a.scale = 1; }
        }
        if (a.phase === 'fly') {
            let elapsed = now - a.flyStartTime;
            if (elapsed < a.flyDuration) {
                let p = elapsed / a.flyDuration, ep = easeOutCubic(p);
                a.currentX = a.fromX + (a.toX - a.fromX) * ep;
                a.currentY = a.fromY + (a.toY - a.fromY) * ep;
                a.rotation = ep * 0.1;
            } else {
                a.card.removed = true; slotCards.push(a.card.icon);
                delete a.card.isAnimating; delete a.card.animatedRemoved;
                activeAnimations.splice(i, 1);
            }
        }
    }
    if (activeAnimations.length !== prevAnimLen) { updateAllClickable(); eliminateFromSlot(); prevAnimLen = activeAnimations.length; }
}
function onCardClick(card) {
    if (!gameActive || !card.clickable || card.isAnimating) return;
    const slotX = (screenWidth - ui.slot.width) / 2;
    const slotY = screenHeight - ui.slot.bottom - ui.slot.height;
    const idx = slotCards.length;
    const targetX = slotX + 12 + idx * 52 + 4;
    const targetY = slotY + 10;
    const fromX = card.x - CARD_SIZE/2, fromY = card.y - CARD_SIZE/2;
    startCardAnimation(card, fromX, fromY, targetX, targetY);
}
function loadLevel(level) {
    currentLevel = level;
    forbiddenPositions = generateForbiddenPositions(level);
    let levelData = generateLevel(level);
    let positions = levelData.cards;
    let pool = [];
    for (let i = 0; i < positions.length; i++) {
        let icon = CARD_KEYS[i % CARD_KEYS.length];
        for (let j = 0; j < 3 && pool.length < positions.length; j++) pool.push(icon);
    }
    while (pool.length < positions.length) pool.push(CARD_KEYS[0]);
    pool = shuffleArray(pool);
    let newCards = [];
    for (let i = 0; i < positions.length; i++) {
        newCards.push({ id: nextCardId++, icon: pool[i], x: positions[i].x, y: positions[i].y, layer: positions[i].layer,
            clickable: true, removed: false, isAnimating: false, animatedRemoved: false });
    }
    stackCards = newCards;
    updateAllClickable();
    slotCards = [];
    score = 0;
    gameActive = true;
    activeAnimations = [];
    shuffleRemainingCount = 3;
    settingsVisible = false;
}
function resetGame() { shuffleRemainingCount = 3; loadLevel(currentLevel); }
function shuffleRemaining() {
    if (!gameActive || shuffleRemainingCount <= 0) { if (shuffleRemainingCount <= 0) wx.showToast({ title: '洗牌次数已用完', icon: 'none' }); return; }
    let active = stackCards.filter(c => !c.removed && !c.isAnimating);
    if (active.length === 0) return;
    let icons = active.map(c => c.icon);
    icons = shuffleArray(icons);
    active.forEach((c, i) => c.icon = icons[i]);
    shuffleRemainingCount--;
    wx.showToast({ title: `洗牌剩余 ${shuffleRemainingCount} 次`, icon: 'none' });
}
function toggleSettings() { settingsVisible = !settingsVisible; }
function selectLevel(lv) { if (lv >= 1 && lv <= TOTAL_LEVELS) loadLevel(lv); settingsVisible = false; }

// ==================== 绘制 ====================
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
function drawCard(ctx, card, x, y, scale = 1, alpha = 1, isAnimating = false, rotation = 0) {
    const img = loadedImages[card.icon];
    const size = CARD_SIZE * scale;
    const offset = (size - CARD_SIZE) / 2;
    ctx.save();
    if (rotation) { const cx = x + size/2, cy = y + size/2; ctx.translate(cx, cy); ctx.rotate(rotation); ctx.translate(-cx, -cy); }
    ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = isAnimating ? 8 : 2;
    ctx.globalAlpha = alpha;
    if (img && img.complete) ctx.drawImage(img, x - offset, y - offset, size, size);
    else { ctx.fillStyle = '#e8d8c0'; ctx.fillRect(x - offset, y - offset, size, size); }
    ctx.shadowBlur = 0;
    if (!card.clickable && !card.removed && !isAnimating) { ctx.fillStyle = 'rgba(120,100,80,0.3)'; roundRect(ctx, x - offset, y - offset, size, size, 8); ctx.fill(); }
    ctx.restore();
}
function renderUI() {
    ctx.clearRect(0, 0, screenWidth, screenHeight);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, screenWidth, screenHeight);
    
    // 标题
    ctx.font = `bold ${ui.title.fontSize}px "KaiTi", "华文楷书"`;
    ctx.fillStyle = colors.titleText;
    ctx.fillText('福了個哥', 20, ui.title.y);
    
    // 关卡
    ctx.font = `bold ${ui.level.fontSize}px "Segoe UI"`;
    ctx.fillStyle = colors.subtitleText;
    ctx.fillText(`第 ${currentLevel} / ${TOTAL_LEVELS} 关`, 20, ui.level.y);
    
    // 最高分
    let best = levelBestScores[currentLevel-1];
    ctx.font = `${ui.best.fontSize}px "Segoe UI"`;
    ctx.fillStyle = '#b87c3a';
    ctx.fillText(`🏆 最高 ${best}`, 20, ui.best.y);
    
    // 设置按钮
    ctx.fillStyle = '#ffdd99';
    roundRect(ctx, ui.settingsBtn.left, ui.settingsBtn.y, ui.settingsBtn.width, ui.settingsBtn.height, 16);
    ctx.fill();
    ctx.fillStyle = '#4f2d0a';
    ctx.font = `bold ${ui.settingsBtn.fontSize}px "Segoe UI"`;
    ctx.fillText('⚙️', ui.settingsBtn.left + ui.settingsBtn.width/2 - 12, ui.settingsBtn.y + ui.settingsBtn.height/2 + 6);
    
    // 分数面板
    const panelX = screenWidth - ui.scorePanel.right - ui.scorePanel.width;
    ctx.fillStyle = colors.scoreBg;
    roundRect(ctx, panelX, ui.scorePanel.y, ui.scorePanel.width, ui.scorePanel.height, 20);
    ctx.fill();
    let remain = stackCards.filter(c => !c.removed && !c.isAnimating).length;
    ctx.font = `bold ${ui.scorePanel.fontSize}px "Segoe UI"`;
    ctx.fillStyle = colors.scoreText;
    ctx.fillText(`${score}`, panelX + 12, ui.scorePanel.y + ui.scorePanel.height/2 + 8);
    ctx.font = `${ui.scorePanel.fontSize * 0.6}px "Segoe UI"`;
    ctx.fillStyle = colors.remainText;
    ctx.fillText(`剩${remain}`, panelX + 12, ui.scorePanel.y + ui.scorePanel.height - 8);
    
    // 卡牌区域
    ctx.save();
    ctx.translate(offsetX, offsetY);
    let sorted = [...stackCards].sort((a, b) => a.layer - b.layer);
    for (let c of sorted) if (!c.removed && !c.isAnimating) { let x = c.x - CARD_SIZE/2, y = c.y - CARD_SIZE/2; drawCard(ctx, c, x, y, 1, 1, false, 0); }
    for (let anim of activeAnimations) {
        let card = anim.card;
        let x, y, scale, rot;
        if (anim.phase === 'scale') { x = anim.fromX; y = anim.fromY; scale = anim.scale; rot = 0; }
        else { x = anim.currentX; y = anim.currentY; scale = 1; rot = anim.rotation || 0; }
        drawCard(ctx, card, x, y, scale, 1, true, rot);
    }
    ctx.restore();
    
    // 卡槽
    const slotX = (screenWidth - ui.slot.width) / 2;
    const slotY = screenHeight - ui.slot.bottom - ui.slot.height;
    ctx.fillStyle = colors.slotBg;
    roundRect(ctx, slotX, slotY, ui.slot.width, ui.slot.height, 20);
    ctx.fill();
    ctx.strokeStyle = '#b9975a';
    ctx.stroke();
    const cardW = (ui.slot.width - 24) / 7;
    for (let i = 0; i < 7; i++) {
        let sx = slotX + 12 + i * (cardW + 4);
        if (i < slotCards.length) {
            const icon = slotCards[i];
            const img = loadedImages[icon];
            ctx.fillStyle = '#fff3df';
            roundRect(ctx, sx, slotY + 8, cardW, ui.slot.height - 16, 8);
            ctx.fill();
            if (img && img.complete) ctx.drawImage(img, sx + 4, slotY + 10, cardW - 8, ui.slot.height - 24);
            else { ctx.font = `${cardW * 0.5}px "Segoe UI"`; ctx.fillStyle = '#5a2f0a'; ctx.fillText(icon.substring(0,2), sx+cardW/4, slotY+ui.slot.height/2+5); }
        } else {
            ctx.fillStyle = '#eeddbb';
            roundRect(ctx, sx, slotY + 8, cardW, ui.slot.height - 16, 8);
            ctx.fill();
            ctx.font = `${cardW * 0.5}px "Segoe UI"`; ctx.fillStyle = '#bba46c'; ctx.fillText('?', sx+cardW/3, slotY+ui.slot.height/2+5);
        }
    }
    
    // 按钮
    const btnY = screenHeight - ui.btn.bottom - ui.btn.height;
    const btnSpacing = (screenWidth - ui.btn.width * 2) / 3;
    ctx.fillStyle = '#ffdd99';
    roundRect(ctx, btnSpacing, btnY, ui.btn.width, ui.btn.height, 20);
    ctx.fill();
    ctx.fillStyle = '#4f2d0a';
    ctx.font = `bold ${ui.btn.fontSize}px "Segoe UI"`;
    ctx.fillText('洗牌', btnSpacing + ui.btn.width/2 - 20, btnY + ui.btn.height/2 + 8);
    ctx.font = `bold ${ui.btn.fontSize * 0.7}px "Segoe UI"`;
    ctx.fillStyle = '#b16224';
    ctx.fillText(`x${shuffleRemainingCount}`, btnSpacing + ui.btn.width - 18, btnY + ui.btn.height - 8);
    
    ctx.fillStyle = '#ffdd99';
    roundRect(ctx, btnSpacing * 2 + ui.btn.width, btnY, ui.btn.width, ui.btn.height, 20);
    ctx.fill();
    ctx.fillStyle = '#4f2d0a';
    ctx.font = `bold ${ui.btn.fontSize}px "Segoe UI"`;
    ctx.fillText('重来', btnSpacing * 2 + ui.btn.width + ui.btn.width/2 - 20, btnY + ui.btn.height/2 + 8);
    
    // 缓存按钮位置供触摸事件
    window.shuffleBtnRect = { x: btnSpacing, y: btnY, w: ui.btn.width, h: ui.btn.height };
    window.resetBtnRect = { x: btnSpacing * 2 + ui.btn.width, y: btnY, w: ui.btn.width, h: ui.btn.height };
    window.settingsBtnRect = { x: ui.settingsBtn.left, y: ui.settingsBtn.y, w: ui.settingsBtn.width, h: ui.settingsBtn.height };
    
    // 设置面板（弹窗）
    if (settingsVisible) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);
        const px = (screenWidth - ui.panel.width) / 2;
        const py = (screenHeight - ui.panel.height) / 2;
        ctx.fillStyle = colors.settingsPanel;
        roundRect(ctx, px, py, ui.panel.width, ui.panel.height, 20);
        ctx.fill();
        ctx.fillStyle = '#5a3c1a';
        ctx.font = `bold ${ui.title.fontSize * 0.7}px "KaiTi"`;
        ctx.fillText('设置', px + ui.panel.width/2 - 30, py + 40);
        ctx.beginPath(); ctx.moveTo(px + 20, py + 55); ctx.lineTo(px + ui.panel.width - 20, py + 55); ctx.stroke();
        
        // 背景音乐
        ctx.fillStyle = bgmEnabled ? '#2f6b2f' : '#aa5440';
        roundRect(ctx, px + ui.panel.width - 80, py + 75, 60, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Segoe UI"'; ctx.fillText(bgmEnabled ? 'ON' : 'OFF', px + ui.panel.width - 68, py + 96);
        ctx.fillStyle = '#4a2e0a'; ctx.font = '16px "Segoe UI"'; ctx.fillText('背景音乐', px + 30, py + 96);
        
        // 切换 BGM
        ctx.fillStyle = '#c28a4e';
        roundRect(ctx, px + ui.panel.width - 80, py + 115, 60, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(`${currentBgmIndex}`, px + ui.panel.width - 58, py + 136);
        ctx.fillStyle = '#4a2e0a'; ctx.fillText('切换BGM', px + 30, py + 136);
        
        // 点击音效
        ctx.fillStyle = sfxEnabled ? '#2f6b2f' : '#aa5440';
        roundRect(ctx, px + ui.panel.width - 80, py + 155, 60, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(sfxEnabled ? 'ON' : 'OFF', px + ui.panel.width - 68, py + 176);
        ctx.fillStyle = '#4a2e0a'; ctx.fillText('点击音效', px + 30, py + 176);
        
        ctx.beginPath(); ctx.moveTo(px + 20, py + 200); ctx.lineTo(px + ui.panel.width - 20, py + 200); ctx.stroke();
        ctx.fillStyle = '#4a2e0a'; ctx.font = 'bold 16px "Segoe UI"'; ctx.fillText('切换关卡', px + 30, py + 235);
        const btnW = 45, btnH = 30, startX = px + (ui.panel.width - 5 * btnW - 4 * 10) / 2;
        for (let i = 0; i < 5; i++) {
            let lvl = i + 1;
            let bx = startX + i * (btnW + 10);
            let isCur = (lvl === currentLevel);
            ctx.fillStyle = isCur ? '#2f6b2f' : '#ffdd99';
            roundRect(ctx, bx, py + 250, btnW, btnH, 10);
            ctx.fill();
            ctx.fillStyle = isCur ? '#fff' : '#4f2d0a';
            ctx.font = 'bold 14px "Segoe UI"';
            ctx.fillText(`${lvl}`, bx + 16, py + 271);
            if (!window.lv1) window.lv1 = [];
            window.lv1[i] = { x: bx, y: py + 250, w: btnW, h: btnH, level: lvl };
        }
        for (let i = 0; i < 5; i++) {
            let lvl = i + 6;
            let bx = startX + i * (btnW + 10);
            let isCur = (lvl === currentLevel);
            ctx.fillStyle = isCur ? '#2f6b2f' : '#ffdd99';
            roundRect(ctx, bx, py + 285, btnW, btnH, 10);
            ctx.fill();
            ctx.fillStyle = isCur ? '#fff' : '#4f2d0a';
            ctx.font = 'bold 14px "Segoe UI"';
            ctx.fillText(`${lvl}`, bx + 16, py + 306);
            if (!window.lv2) window.lv2 = [];
            window.lv2[i] = { x: bx, y: py + 285, w: btnW, h: btnH, level: lvl };
        }
        ctx.fillStyle = '#aa5440';
        roundRect(ctx, px + ui.panel.width - 45, py + 10, 30, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Segoe UI"'; ctx.fillText('✕', px + ui.panel.width - 33, py + 33);
    }
    
    if (!gameActive) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, screenWidth, screenHeight);
        ctx.font = `bold ${ui.title.fontSize}px "Segoe UI"`; ctx.fillStyle = '#fff';
        ctx.fillText('游戏结束', screenWidth/2 - 80, screenHeight/2);
    }
}

// ==================== 触摸事件 ====================
function onTouchStart(e) {
    let t = e.touches[0], x = t.clientX, y = t.clientY;
    if (settingsVisible) {
        const pw = ui.panel.width, ph = ui.panel.height;
        const px = (screenWidth - pw) / 2, py = (screenHeight - ph) / 2;
        if (x >= px + pw - 45 && x <= px + pw - 15 && y >= py + 10 && y <= py + 40) { settingsVisible = false; return; }
        if (x >= px + pw - 80 && x <= px + pw - 20 && y >= py + 75 && y <= py + 105) { toggleBgm(); return; }
        if (x >= px + pw - 80 && x <= px + pw - 20 && y >= py + 115 && y <= py + 145) { switchBgm(); return; }
        if (x >= px + pw - 80 && x <= px + pw - 20 && y >= py + 155 && y <= py + 185) { toggleSfx(); return; }
        if (window.lv1) for (let btn of window.lv1) if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) { selectLevel(btn.level); return; }
        if (window.lv2) for (let btn of window.lv2) if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) { selectLevel(btn.level); return; }
        return;
    }
    if (x >= window.settingsBtnRect.x && x <= window.settingsBtnRect.x + window.settingsBtnRect.w && y >= window.settingsBtnRect.y && y <= window.settingsBtnRect.y + window.settingsBtnRect.h) { toggleSettings(); return; }
    if (!gameActive) return;
    let cardX = x - offsetX, cardY = y - offsetY;
    let sorted = [...stackCards].filter(c => !c.removed && !c.isAnimating).sort((a, b) => b.layer - a.layer);
    for (let card of sorted) {
        let left = card.x - CARD_SIZE/2, right = card.x + CARD_SIZE/2, top = card.y - CARD_SIZE/2, bottom = card.y + CARD_SIZE/2;
        if (cardX >= left && cardX <= right && cardY >= top && cardY <= bottom) { if (card.clickable) onCardClick(card); break; }
    }
}
function onTouchEnd(e) {
    if (settingsVisible) return;
    let t = e.changedTouches[0], x = t.clientX, y = t.clientY;
    if (x >= window.shuffleBtnRect.x && x <= window.shuffleBtnRect.x + window.shuffleBtnRect.w && y >= window.shuffleBtnRect.y && y <= window.shuffleBtnRect.y + window.shuffleBtnRect.h) shuffleRemaining();
    if (x >= window.resetBtnRect.x && x <= window.resetBtnRect.x + window.resetBtnRect.w && y >= window.resetBtnRect.y && y <= window.resetBtnRect.y + window.resetBtnRect.h) resetGame();
}

// ==================== 初始化 ====================
async function init() {
    canvas = wx.createCanvas(); ctx = canvas.getContext('2d');
    let sys = wx.getSystemInfoSync();
    screenWidth = sys.screenWidth; screenHeight = sys.screenHeight;
    canvas.width = screenWidth; canvas.height = screenHeight;
    updateLayout();
    initAudio();
    await loadCardImages();
    loadLevel(1);
    wx.onTouchStart(onTouchStart);
    wx.onTouchEnd(onTouchEnd);
    function frame() { updateAnimations(); renderUI(); requestAnimationFrame(frame); }
    frame();
}
init();