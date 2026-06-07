// game.js - 福了個哥（最终完整版：背景音乐 + 设置面板）

// ==================== 可调整参数 ====================
const CARD_SIZE = 65;
const GRID_STEP = CARD_SIZE;
const HALF_SHIFT = CARD_SIZE / 2;

const COLS = 5;
const ROWS = 8;

const PAD_LEFT = 20;
const PAD_TOP = 170;

const FORCED_SCALE = 1;
const OFFSET_X_ADJUST = 0;
const OFFSET_Y_ADJUST = 0;

const FIXED_LOGIC_WIDTH = 550;
const FIXED_LOGIC_HEIGHT = 750;

const SLOT_X_OFFSET = -20;
const SLOT_Y_OFFSET = -40;
const BTN_Y_OFFSET = 0;

// ==================== 音效配置 ====================
const CLICK_SOUND_URL = 'images/click.mp3';
const BGM1_URL = 'images/bgm1.mp3';
const BGM2_URL = 'images/bgm2.mp3';

let clickAudio = null;
let bgmAudio = null;
let currentBgmIndex = 1;  // 1 或 2
let bgmEnabled = true;
let sfxEnabled = true;

// ==================== 洗牌次数限制 ====================
let shuffleRemainingCount = 3;

// ==================== 关卡选择器 ====================
let settingsVisible = false;
let selectedLevel = 1;

// ==================== 禁止位置配置 ====================
let forbiddenPositions = [];

function generateForbiddenPositions(level) {
    const forbiddenCount = 10 + (level - 1) * 3;
    const allBasePositions = generateBaseGridForForbidden();
    
    for (let i = allBasePositions.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [allBasePositions[i], allBasePositions[j]] = [allBasePositions[j], allBasePositions[i]];
    }
    
    return allBasePositions.slice(0, forbiddenCount);
}

function generateBaseGridForForbidden() {
    let points = [];
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            points.push({ 
                x: BASE_MIN_X + c * GRID_STEP, 
                y: BASE_MIN_Y + r * GRID_STEP 
            });
        }
    }
    return points;
}

function isPositionForbidden(x, y) {
    for (let pos of forbiddenPositions) {
        if (Math.abs(pos.x - x) < 1 && Math.abs(pos.y - y) < 1) {
            return true;
        }
    }
    return false;
}

function getAvailableBasePositions(layer, existingCards) {
    let occupied = new Set();
    for (let c of existingCards) {
        if (c.layer === layer) occupied.add(`${c.x},${c.y}`);
    }
    return BASE_POSITIONS.filter(p => {
        if (occupied.has(`${p.x},${p.y}`)) return false;
        if (isPositionForbidden(p.x, p.y)) return false;
        return true;
    });
}

// ==================== 关卡配置 ====================
function getLevelConfig(level) {
    let layers = 5 + (level - 1) * 2;
    let cardsPerLayer = 18;
    return { layers, cardsPerLayer };
}

// ==================== 图片资源配置 ====================
const CARD_IMAGES = {
    'drill': 'card_drill.png',
    'driver': 'card_driver.png',
    'goggle': 'card_goggle.png',
    'hammer': 'card_hammer.png',
    'machine': 'card_machine.png',
    'plier': 'card_plier.png',
    'resistor': 'card_resistor.png',
    'screw': 'card_screw.png',
    'vr': 'card_vr.png',
    'wrench': 'card_wrench.png'
};

const CARD_KEYS = ['drill', 'driver', 'goggle', 'hammer', 'machine', 'plier', 'resistor', 'screw', 'vr', 'wrench'];

let loadedImages = {};

// ==================== 动画相关变量 ====================
let activeAnimations = [];

// ==================== 以下为全局变量 ====================
let canvas, ctx;
let gameActive = true;
let score = 0;
let slotCards = [];
let stackCards = [];
let nextCardId = 1;

let currentLevel = 1;
const TOTAL_LEVELS = 10;
let levelBestScores = new Array(TOTAL_LEVELS).fill(0);

let screenWidth, screenHeight;
let offsetX = 0, offsetY = 0;
let cardScale = 1;

let resetBtnRect = { x: 0, y: 0, w: 95, h: 42 };
let shuffleBtnRect = { x: 0, y: 0, w: 95, h: 42 };
let settingsBtnRect = { x: 0, y: 0, w: 80, h: 35 };

// 颜色主题
const colors = {
    bg: '#ffffff',
    cardLight: '#fff7e8',
    cardDark: '#e8d8c0',
    border: '#b97f3a',
    text: '#5a2f0a',
    scoreBg: '#2c2b28',
    scoreText: '#ffeaac',
    slotBg: '#e7dbb6',
    titleText: '#5a3c1a',
    subtitleText: '#8b6942',
    remainText: '#4a2e0a',
    settingsPanel: '#fef3dd'
};

// ==================== 动态计算的边界 ====================
let BASE_MIN_X = 0;
let BASE_MIN_Y = 0;
let BASE_MAX_X = 0;
let BASE_MAX_Y = 0;
let MIN_X = 0;
let MAX_X = 0;
let MIN_Y = 0;
let MAX_Y = 0;
let BASE_POSITIONS = [];

// ==================== 音效初始化 ====================
function initAudio() {
    // 点击音效
    clickAudio = wx.createInnerAudioContext();
    clickAudio.src = CLICK_SOUND_URL;
    clickAudio.volume = 0.5;
    clickAudio.onError((err) => {
        console.error("点击音效加载失败:", err);
    });
    
    // 背景音乐
    bgmAudio = wx.createInnerAudioContext();
    bgmAudio.src = BGM1_URL;
    bgmAudio.loop = true;
    bgmAudio.volume = 0.4;
    bgmAudio.onError((err) => {
        console.error("背景音乐加载失败:", err);
    });
    
    if (bgmEnabled) {
        bgmAudio.play();
    }
}

function playClickSound() {
    if (sfxEnabled && clickAudio) {
        clickAudio.stop();
        clickAudio.play();
    }
}

function toggleBgm() {
    bgmEnabled = !bgmEnabled;
    if (bgmEnabled) {
        bgmAudio.play();
    } else {
        bgmAudio.stop();
    }
}

function toggleSfx() {
    sfxEnabled = !sfxEnabled;
}

function switchBgm() {
    if (currentBgmIndex === 1) {
        currentBgmIndex = 2;
        bgmAudio.src = BGM2_URL;
    } else {
        currentBgmIndex = 1;
        bgmAudio.src = BGM1_URL;
    }
    if (bgmEnabled) {
        bgmAudio.play();
    }
}

// ==================== 图片加载 ====================
function loadCardImages() {
    return new Promise((resolve) => {
        let loadedCount = 0;
        const totalImages = CARD_KEYS.length;
        
        for (let key of CARD_KEYS) {
            const img = wx.createImage();
            img.src = `images/${CARD_IMAGES[key]}`;
            img.onload = () => {
                loadedCount++;
                loadedImages[key] = img;
                if (loadedCount === totalImages) {
                    console.log(`所有卡牌图片加载完成，共 ${totalImages} 张`);
                    resolve();
                }
            };
            img.onerror = (err) => {
                console.error(`加载图片失败: images/${CARD_IMAGES[key]}`, err);
                loadedCount++;
                loadedImages[key] = null;
                if (loadedCount === totalImages) {
                    resolve();
                }
            };
        }
    });
}

// ==================== 基础网格生成 ====================
function generateBaseGrid() {
    let points = [];
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            points.push({ 
                x: BASE_MIN_X + c * GRID_STEP, 
                y: BASE_MIN_Y + r * GRID_STEP 
            });
        }
    }
    return points;
}

function getOffsetPositionByDir(basePos, dir) {
    const dirs = [
        [0, -HALF_SHIFT], [0, HALF_SHIFT],
        [-HALF_SHIFT, 0], [HALF_SHIFT, 0],
        [-HALF_SHIFT, -HALF_SHIFT], [HALF_SHIFT, -HALF_SHIFT],
        [-HALF_SHIFT, HALF_SHIFT], [HALF_SHIFT, HALF_SHIFT]
    ];
    let [dx, dy] = dirs[dir % dirs.length];
    let x = basePos.x + dx;
    let y = basePos.y + dy;
    if (x >= MIN_X && x <= MAX_X && y >= MIN_Y && y <= MAX_Y) {
        return { x, y };
    }
    return null;
}

// ==================== 重叠检测 ====================
function doesOverlap(newX, newY, layer, existingCards) {
    const newLeft = newX - CARD_SIZE/2;
    const newRight = newX + CARD_SIZE/2;
    const newTop = newY - CARD_SIZE/2;
    const newBottom = newY + CARD_SIZE/2;
    for (let c of existingCards) {
        if (c.layer !== layer) continue;
        const left = c.x - CARD_SIZE/2;
        const right = c.x + CARD_SIZE/2;
        const top = c.y - CARD_SIZE/2;
        const bottom = c.y + CARD_SIZE/2;
        if (newRight > left && newLeft < right && newBottom > top && newTop < bottom) {
            return true;
        }
    }
    return false;
}

// ==================== 关卡生成 ====================
function generateLevel(level) {
    let cfg = getLevelConfig(level);
    let cards = [];
    let id = 1;
    let layerDirs = [];

    for (let layer = 0; layer < cfg.layers; layer++) {
        let targetCount = cfg.cardsPerLayer;
        let availableBase = getAvailableBasePositions(layer, cards);
        let toPlace = Math.min(targetCount, availableBase.length);
        
        for (let i = availableBase.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [availableBase[i], availableBase[j]] = [availableBase[j], availableBase[i]];
        }

        let layerOffsetDir = -1;
        if (layer === 0) {
            layerOffsetDir = -1;
        } else {
            let availableDirs = [0, 1, 2, 3, 4, 5, 6, 7];
            let prevDir = layerDirs[layer - 1];
            if (prevDir !== -1) {
                availableDirs = availableDirs.filter(d => d !== prevDir);
            }
            if (availableDirs.length === 0) {
                availableDirs = [0, 1, 2, 3, 4, 5, 6, 7];
            }
            let randomIndex = Math.floor(Math.random() * availableDirs.length);
            layerOffsetDir = availableDirs[randomIndex];
        }
        layerDirs.push(layerOffsetDir);

        for (let i = 0; i < toPlace; i++) {
            let basePos = availableBase[i];
            let finalPos = { ...basePos };
            if (layer > 0 && layerOffsetDir !== -1) {
                let offsetPos = getOffsetPositionByDir(basePos, layerOffsetDir);
                if (offsetPos) finalPos = offsetPos;
            }
            cards.push({ id: id++, x: finalPos.x, y: finalPos.y, layer: layer });
        }
    }

    let total = cards.length;
    let remainder = total % 3;
    if (remainder !== 0) {
        let need = 3 - remainder;
        for (let attempt = 0; attempt < need; attempt++) {
            let added = false;
            for (let layer = cfg.layers - 1; layer >= 0 && !added; layer--) {
                let offsetDir = layerDirs[layer];
                let shuffledBase = [...BASE_POSITIONS];
                for (let i = shuffledBase.length - 1; i > 0; i--) {
                    let j = Math.floor(Math.random() * (i + 1));
                    [shuffledBase[i], shuffledBase[j]] = [shuffledBase[j], shuffledBase[i]];
                }
                for (let base of shuffledBase) {
                    if (isPositionForbidden(base.x, base.y)) continue;
                    
                    let candidateX = base.x;
                    let candidateY = base.y;
                    if (layer > 0 && offsetDir !== -1) {
                        let offset = getOffsetPositionByDir(base, offsetDir);
                        if (offset) {
                            candidateX = offset.x;
                            candidateY = offset.y;
                        }
                    }
                    let occupied = false;
                    for (let c of cards) {
                        if (c.layer === layer && Math.abs(c.x - candidateX) < 1 && Math.abs(c.y - candidateY) < 1) {
                            occupied = true;
                            break;
                        }
                    }
                    if (occupied) continue;
                    if (!doesOverlap(candidateX, candidateY, layer, cards)) {
                        cards.push({ id: id++, x: candidateX, y: candidateY, layer: layer });
                        added = true;
                        break;
                    }
                }
            }
        }
    }
    return { cards };
}

// ==================== 辅助函数 ====================
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateIconPool(totalCards) {
    if (totalCards % 3 !== 0) totalCards = Math.ceil(totalCards / 3) * 3;
    let pool = [];
    let idx = 0;
    while (pool.length < totalCards) {
        let icon = CARD_KEYS[idx % CARD_KEYS.length];
        for (let i = 0; i < 3 && pool.length < totalCards; i++) pool.push(icon);
        idx++;
    }
    return shuffleArray(pool);
}

// ==================== 游戏逻辑 ====================
function isRectOverlap(card1, card2) {
    const h = CARD_SIZE/2;
    const l1 = card1.x - h, r1 = card1.x + h, t1 = card1.y - h, b1 = card1.y + h;
    const l2 = card2.x - h, r2 = card2.x + h, t2 = card2.y - h, b2 = card2.y + h;
    return !(r1 <= l2 || l1 >= r2 || b1 <= t2 || t1 >= b2);
}

function isCardCovered(card, allCards) {
    const upper = allCards.filter(c => !c.removed && c.layer > card.layer);
    for (let u of upper) {
        if (isRectOverlap(card, u)) return true;
    }
    return false;
}

function updateAllCardsClickable() {
    for (let card of stackCards) {
        if (!card.removed) {
            card.clickable = !isCardCovered(card, stackCards);
        }
    }
}

function eliminateFromSlot() {
    let changed = false;
    while (true) {
        let count = new Map();
        for (let icon of slotCards) count.set(icon, (count.get(icon) || 0) + 1);
        let target = null;
        for (let [icon, cnt] of count) if (cnt >= 3) { target = icon; break; }
        if (!target) break;
        let newSlot = [], removed = 0;
        for (let icon of slotCards) {
            if (icon === target && removed < 3) { removed++; continue; }
            newSlot.push(icon);
        }
        slotCards = newSlot;
        score += 10;
        changed = true;
    }
    if (changed) {
        checkGameEnd();
    }
}

function checkGameEnd() {
    let remaining = stackCards.filter(c => !c.removed).length;
    if (remaining === 0 && slotCards.length === 0 && gameActive) {
        gameActive = false;
        let prevBest = levelBestScores[currentLevel - 1];
        if (score > prevBest) levelBestScores[currentLevel - 1] = score;
        if (currentLevel < TOTAL_LEVELS) {
            wx.showModal({
                title: `🎉 第${currentLevel}关通关！`,
                content: `本关得分：${score}\n最高分：${Math.max(prevBest, score)}`,
                confirmText: '下一关',
                cancelText: '重玩',
                success: (res) => {
                    if (res.confirm) { 
                        currentLevel++; 
                        shuffleRemainingCount = 3;
                        loadLevel(currentLevel); 
                    } else { 
                        shuffleRemainingCount = 3;
                        loadLevel(currentLevel); 
                    }
                }
            });
        } else {
            wx.showModal({
                title: '🏆 恭喜通关全部关卡！',
                content: `最终得分：${score}`,
                showCancel: false,
                success: () => { 
                    currentLevel = 1; 
                    shuffleRemainingCount = 3;
                    loadLevel(1); 
                }
            });
        }
        return true;
    }
    if (slotCards.length >= 7 && gameActive) {
        let can = false;
        let cnt = new Map();
        for (let icon of slotCards) cnt.set(icon, (cnt.get(icon) || 0) + 1);
        for (let v of cnt.values()) if (v >= 3) can = true;
        if (!can) {
            gameActive = false;
            wx.showModal({
                title: '😭 游戏失败',
                content: `本关得分：${score}`,
                confirmText: '重玩',
                cancelText: '第一关',
                success: (res) => {
                    if (res.confirm) {
                        shuffleRemainingCount = 3;
                        loadLevel(currentLevel);
                    } else { 
                        currentLevel = 1; 
                        shuffleRemainingCount = 3;
                        loadLevel(1); 
                    }
                }
            });
            return true;
        }
    }
    return false;
}

// ==================== 动画系统 ====================
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function startCardAnimation(card, fromX, fromY, toX, toY) {
    playClickSound();
    
    card.isAnimating = true;
    card.animatedRemoved = true;
    
    const scaleStartTime = Date.now();
    const scaleDuration = 200;
    
    const animObj = {
        card: card,
        fromX: fromX,
        fromY: fromY,
        toX: toX,
        toY: toY,
        startTime: scaleStartTime,
        scaleDuration: scaleDuration,
        flyDuration: 500,
        phase: 'scale',
        scale: 1,
        startScale: 1
    };
    
    activeAnimations.push(animObj);
}

function updateAnimations() {
    const now = Date.now();
    const completedAnimations = [];
    
    for (let i = 0; i < activeAnimations.length; i++) {
        const anim = activeAnimations[i];
        
        if (anim.phase === 'scale') {
            const elapsed = now - anim.startTime;
            if (elapsed < anim.scaleDuration) {
                let t = elapsed / anim.scaleDuration;
                if (t < 0.5) {
                    anim.scale = 1 + 0.2 * (t * 2);
                } else {
                    anim.scale = 1.1 - 0.1 * ((t - 0.5) * 2);
                }
            } else {
                anim.phase = 'fly';
                anim.flyStartTime = now;
                anim.scale = 1;
            }
        }
        
        if (anim.phase === 'fly') {
            const elapsed = now - anim.flyStartTime;
            if (elapsed < anim.flyDuration) {
                let progress = elapsed / anim.flyDuration;
                const easeProgress = easeOutCubic(progress);
                anim.currentX = anim.fromX + (anim.toX - anim.fromX) * easeProgress;
                anim.currentY = anim.fromY + (anim.toY - anim.fromY) * easeProgress;
                anim.rotation = easeProgress * 0.1;
            } else {
                completedAnimations.push(i);
                anim.card.removed = true;
                slotCards.push(anim.card.icon);
                delete anim.card.isAnimating;
                delete anim.card.animatedRemoved;
            }
        }
    }
    
    for (let i = completedAnimations.length - 1; i >= 0; i--) {
        activeAnimations.splice(completedAnimations[i], 1);
    }
    
    if (completedAnimations.length > 0) {
        updateAllCardsClickable();
        eliminateFromSlot();
        checkGameEnd();
    }
}

function onCardClick(card) {
    if (!gameActive || !card.clickable) return;
    if (card.isAnimating) return;
    
    const slotX = 20 + SLOT_X_OFFSET;
    const slotY = MAX_Y - 40 + SLOT_Y_OFFSET;
    const targetSlotIndex = slotCards.length;
    const targetX = slotX + 12 + targetSlotIndex * 52 + 4;
    const targetY = slotY + 10;
    
    const fromX = card.x - CARD_SIZE/2;
    const fromY = card.y - CARD_SIZE/2;
    
    startCardAnimation(card, fromX, fromY, targetX, targetY);
}

function loadLevel(level) {
    currentLevel = level;
    forbiddenPositions = generateForbiddenPositions(level);
    
    nextCardId = 1;
    let levelData = generateLevel(level);
    let positions = levelData.cards;
    let iconPool = generateIconPool(positions.length);
    let newCards = [];
    for (let i = 0; i < positions.length; i++) {
        newCards.push({
            id: nextCardId++,
            icon: iconPool[i % iconPool.length],
            x: positions[i].x,
            y: positions[i].y,
            layer: positions[i].layer,
            clickable: true,
            removed: false,
            isAnimating: false,
            animatedRemoved: false
        });
    }
    stackCards = newCards;
    updateAllCardsClickable();
    slotCards = [];
    score = 0;
    gameActive = true;
    activeAnimations = [];
    shuffleRemainingCount = 3;
    
    settingsVisible = false;
}

function resetGame() { 
    shuffleRemainingCount = 3;
    loadLevel(currentLevel); 
}

function shuffleRemaining() {
    if (!gameActive) return;
    if (shuffleRemainingCount <= 0) {
        wx.showToast({
            title: '洗牌次数已用完',
            icon: 'none',
            duration: 1000
        });
        return;
    }
    
    let active = stackCards.filter(c => !c.removed && !c.isAnimating);
    if (active.length === 0) return;
    
    let icons = active.map(c => c.icon);
    let shuffled = shuffleArray([...icons]);
    active.forEach((c, idx) => c.icon = shuffled[idx]);
    
    shuffleRemainingCount--;
    wx.showToast({
        title: `洗牌剩余 ${shuffleRemainingCount} 次`,
        icon: 'none',
        duration: 1000
    });
}

// 打开/关闭设置面板
function toggleSettings() {
    settingsVisible = !settingsVisible;
}

function selectLevel(level) {
    if (level >= 1 && level <= TOTAL_LEVELS) {
        loadLevel(level);
    }
    settingsVisible = false;
}

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
    
    if (rotation > 0) {
        const centerX = x + size/2;
        const centerY = y + size/2;
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        ctx.translate(-centerX, -centerY);
    }
    
    if (isAnimating) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
    } else {
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 2;
    }
    ctx.globalAlpha = alpha;
    
    if (img && img.complete) {
        ctx.drawImage(img, x - offset, y - offset, size, size);
    } else {
        ctx.fillStyle = '#e8d8c0';
        ctx.fillRect(x - offset, y - offset, size, size);
        ctx.font = `${CARD_SIZE * 0.3 * scale}px "Segoe UI"`;
        ctx.fillStyle = '#5a2f0a';
        ctx.fillText(card.icon.substring(0, 3), x - offset + 10, y - offset + size - 10);
    }
    
    ctx.shadowBlur = 0;
    
    if (!card.clickable && !card.removed && !isAnimating) {
        ctx.fillStyle = 'rgba(120, 100, 80, 0.3)';
        roundRect(ctx, x - offset, y - offset, size, size, 8);
        ctx.fill();
    }
    
    ctx.restore();
}

function renderUI() {
    ctx.clearRect(0, 0, screenWidth, screenHeight);
    
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(cardScale, cardScale);

    // 标题与信息
    ctx.font = 'bold 32px "KaiTi", "华文楷书"';
    ctx.fillStyle = colors.titleText;
    ctx.fillText('福了個哥', 25, 55);
    ctx.font = 'bold 20px "Segoe UI"';
    ctx.fillStyle = colors.subtitleText;
    ctx.fillText(`第 ${currentLevel} / ${TOTAL_LEVELS} 关`, 25, 95);
    let best = levelBestScores[currentLevel - 1];
    ctx.font = '16px "Segoe UI"';
    ctx.fillStyle = '#b87c3a';
    ctx.fillText(`🏆 最高 ${best}`, 25, 128);
    
    let remain = stackCards.filter(c => !c.removed && !c.isAnimating).length;
    ctx.fillStyle = colors.scoreBg;
    roundRect(ctx, 260, 15, 120, 50, 25);
    ctx.fill();
    ctx.font = 'bold 22px "Segoe UI"';
    ctx.fillStyle = colors.scoreText;
    ctx.fillText(`🐏 ${score}`, 272, 48);
    ctx.font = 'bold 14px "Segoe UI"';
    ctx.fillStyle = colors.remainText;
    ctx.fillText(`📦 剩余 ${remain}`, 272, 100);

    // 设置按钮
    ctx.fillStyle = '#ffdd99';
    roundRect(ctx, 25, 140, 80, 35, 18);
    ctx.fill();
    ctx.fillStyle = '#4f2d0a';
    ctx.font = 'bold 14px "Segoe UI"';
    ctx.fillText('⚙️ 设置', 35, 163);
    settingsBtnRect = { x: 25, y: 140, w: 80, h: 35 };

    // 绘制卡牌
    let sorted = [...stackCards].sort((a, b) => a.layer - b.layer);
    for (let c of sorted) {
        if (c.removed) continue;
        if (c.isAnimating) continue;
        let x = c.x - CARD_SIZE/2, y = c.y - CARD_SIZE/2;
        drawCard(ctx, c, x, y, 1, 1, false, 0);
    }
    
    // 绘制卡槽
    let slotX = 20 + SLOT_X_OFFSET;
    let slotY = MAX_Y - 40 + SLOT_Y_OFFSET;
    let slotWidth = 380;
    let slotHeight = 60;
    
    ctx.fillStyle = colors.slotBg;
    roundRect(ctx, slotX, slotY, slotWidth, slotHeight, 28);
    ctx.fill();
    ctx.strokeStyle = '#b9975a';
    ctx.stroke();
    
    // 7个槽位卡片
    for (let i = 0; i < 7; i++) {
        let sx = slotX + 12 + i * 52;
        if (i < slotCards.length) {
            const iconKey = slotCards[i];
            const img = loadedImages[iconKey];
            ctx.fillStyle = '#fff3df';
            roundRect(ctx, sx, slotY + 8, 48, 44, 12);
            ctx.fill();
            
            if (img && img.complete) {
                ctx.drawImage(img, sx + 4, slotY + 10, 40, 40);
            } else {
                ctx.font = '22px "Segoe UI"';
                ctx.fillStyle = '#5a2f0a';
                ctx.fillText(iconKey.substring(0, 2), sx + 15, slotY + 40);
            }
        } else {
            ctx.fillStyle = '#eeddbb';
            roundRect(ctx, sx, slotY + 8, 48, 44, 12);
            ctx.fill();
            ctx.font = '22px "Segoe UI"';
            ctx.fillStyle = '#bba46c';
            ctx.fillText('?', sx + 18, slotY + 40);
        }
    }
    
    // 绘制动画中的卡片
    for (let anim of activeAnimations) {
        const card = anim.card;
        let x, y, scale, rotation;
        if (anim.phase === 'scale') {
            x = anim.fromX;
            y = anim.fromY;
            scale = anim.scale;
            rotation = 0;
        } else {
            x = anim.currentX;
            y = anim.currentY;
            scale = 1;
            rotation = anim.rotation || 0;
        }
        drawCard(ctx, card, x, y, scale, 1, true, rotation);
    }

    // 按钮
    let btnY = slotY + 72 + BTN_Y_OFFSET;
    
    ctx.fillStyle = '#ffdd99';
    roundRect(ctx, 100, btnY, 95, 42, 35);
    ctx.fill();
    ctx.fillStyle = '#4f2d0a';
    ctx.font = 'bold 18px "Segoe UI"';
    ctx.fillText('♻️ 洗牌', 115, btnY + 30);
    ctx.font = 'bold 12px "Segoe UI"';
    ctx.fillStyle = '#b16224';
    ctx.fillText(`x${shuffleRemainingCount}`, 178, btnY + 25);
    shuffleBtnRect = { x: 100, y: btnY, w: 95, h: 42 };
    
    ctx.fillStyle = '#ffdd99';
    roundRect(ctx, 215, btnY, 95, 42, 35);
    ctx.fill();
    ctx.fillStyle = '#4f2d0a';
    ctx.font = 'bold 18px "Segoe UI"';
    ctx.fillText('🔄 重来', 230, btnY + 30);
    resetBtnRect = { x: 215, y: btnY, w: 95, h: 42 };

    ctx.restore();

    // 绘制设置面板
    if (settingsVisible) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);
        
        const panelWidth = 280;
        const panelHeight = 320;
        const panelX = (screenWidth - panelWidth) / 2;
        const panelY = (screenHeight - panelHeight) / 2;
        
        ctx.fillStyle = colors.settingsPanel;
        roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 20);
        ctx.fill();
        
        ctx.fillStyle = '#5a3c1a';
        ctx.font = 'bold 22px "KaiTi"';
        ctx.fillText('设置', panelX + 115, panelY + 40);
        
        // 分隔线
        ctx.strokeStyle = '#d4c4a0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 20, panelY + 55);
        ctx.lineTo(panelX + panelWidth - 20, panelY + 55);
        ctx.stroke();
        
        // 背景音乐开关
        ctx.fillStyle = bgmEnabled ? '#2f6b2f' : '#aa5440';
        roundRect(ctx, panelX + 200, panelY + 75, 60, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "Segoe UI"';
        ctx.fillText(bgmEnabled ? 'ON' : 'OFF', panelX + 218, panelY + 96);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = '16px "Segoe UI"';
        ctx.fillText('背景音乐', panelX + 30, panelY + 96);
        
        // 切换背景音乐按钮（1/2）
        ctx.fillStyle = '#c28a4e';
        roundRect(ctx, panelX + 200, panelY + 115, 60, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "Segoe UI"';
        ctx.fillText(`${currentBgmIndex}`, panelX + 228, panelY + 136);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = '16px "Segoe UI"';
        ctx.fillText('切换BGM', panelX + 30, panelY + 136);
        
        // 点击音效开关
        ctx.fillStyle = sfxEnabled ? '#2f6b2f' : '#aa5440';
        roundRect(ctx, panelX + 200, panelY + 155, 60, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "Segoe UI"';
        ctx.fillText(sfxEnabled ? 'ON' : 'OFF', panelX + 218, panelY + 176);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = '16px "Segoe UI"';
        ctx.fillText('点击音效', panelX + 30, panelY + 176);
        
        // 分隔线
        ctx.beginPath();
        ctx.moveTo(panelX + 20, panelY + 200);
        ctx.lineTo(panelX + panelWidth - 20, panelY + 200);
        ctx.stroke();
        
        // 关卡选择标签
        ctx.fillStyle = '#4a2e0a';
        ctx.font = 'bold 16px "Segoe UI"';
        ctx.fillText('切换关卡', panelX + 30, panelY + 235);
        
        // 关卡按钮行1 (1-5)
        for (let i = 0; i < 5; i++) {
            const levelNum = i + 1;
            const btnX = panelX + 20 + i * 50;
            const btnY = panelY + 250;
            const isCurrent = (levelNum === currentLevel);
            ctx.fillStyle = isCurrent ? '#2f6b2f' : '#ffdd99';
            roundRect(ctx, btnX, btnY, 45, 30, 12);
            ctx.fill();
            ctx.fillStyle = isCurrent ? '#ffffff' : '#4f2d0a';
            ctx.font = 'bold 14px "Segoe UI"';
            ctx.fillText(`${levelNum}`, btnX + 16, btnY + 21);
            if (!window.levelButtons1) window.levelButtons1 = [];
            window.levelButtons1[i] = { x: btnX, y: btnY, w: 45, h: 30, level: levelNum };
        }
        
        // 关卡按钮行2 (6-10)
        for (let i = 0; i < 5; i++) {
            const levelNum = i + 6;
            const btnX = panelX + 20 + i * 50;
            const btnY = panelY + 285;
            const isCurrent = (levelNum === currentLevel);
            ctx.fillStyle = isCurrent ? '#2f6b2f' : '#ffdd99';
            roundRect(ctx, btnX, btnY, 45, 30, 12);
            ctx.fill();
            ctx.fillStyle = isCurrent ? '#ffffff' : '#4f2d0a';
            ctx.font = 'bold 14px "Segoe UI"';
            ctx.fillText(`${levelNum}`, btnX + 16, btnY + 21);
            if (!window.levelButtons2) window.levelButtons2 = [];
            window.levelButtons2[i] = { x: btnX, y: btnY, w: 45, h: 30, level: levelNum };
        }
        
        // 关闭按钮
        ctx.fillStyle = '#aa5440';
        roundRect(ctx, panelX + panelWidth - 45, panelY + 10, 30, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Segoe UI"';
        ctx.fillText('✕', panelX + panelWidth - 33, panelY + 33);
    }

    if (!gameActive) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);
        ctx.font = 'bold 40px "Segoe UI"';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('游戏结束', screenWidth/2 - 100, screenHeight/2);
    }
}

// ==================== 触摸事件 ====================
function onTouchStart(e) {
    let t = e.touches[0];
    let x = (t.clientX - offsetX) / cardScale;
    let y = (t.clientY - offsetY) / cardScale;
    
    // 检查设置面板内的点击
    if (settingsVisible) {
        const panelX = (screenWidth - 280) / 2;
        const panelY = (screenHeight - 320) / 2;
        
        // 关闭按钮
        const closeX = panelX + 280 - 45;
        const closeY = panelY + 10;
        if (x * cardScale + offsetX >= closeX && x * cardScale + offsetX <= closeX + 30 &&
            y * cardScale + offsetY >= closeY && y * cardScale + offsetY <= closeY + 30) {
            settingsVisible = false;
            return;
        }
        
        // 背景音乐开关按钮
        const bgmBtnX = panelX + 200;
        const bgmBtnY = panelY + 75;
        if (x * cardScale + offsetX >= bgmBtnX && x * cardScale + offsetX <= bgmBtnX + 60 &&
            y * cardScale + offsetY >= bgmBtnY && y * cardScale + offsetY <= bgmBtnY + 30) {
            toggleBgm();
            return;
        }
        
        // 切换BGM按钮
        const switchBgmX = panelX + 200;
        const switchBgmY = panelY + 115;
        if (x * cardScale + offsetX >= switchBgmX && x * cardScale + offsetX <= switchBgmX + 60 &&
            y * cardScale + offsetY >= switchBgmY && y * cardScale + offsetY <= switchBgmY + 30) {
            switchBgm();
            return;
        }
        
        // 点击音效开关按钮
        const sfxBtnX = panelX + 200;
        const sfxBtnY = panelY + 155;
        if (x * cardScale + offsetX >= sfxBtnX && x * cardScale + offsetX <= sfxBtnX + 60 &&
            y * cardScale + offsetY >= sfxBtnY && y * cardScale + offsetY <= sfxBtnY + 30) {
            toggleSfx();
            return;
        }
        
        // 关卡按钮行1
        if (window.levelButtons1) {
            for (let btn of window.levelButtons1) {
                if (x * cardScale + offsetX >= btn.x && x * cardScale + offsetX <= btn.x + btn.w &&
                    y * cardScale + offsetY >= btn.y && y * cardScale + offsetY <= btn.y + btn.h) {
                    selectLevel(btn.level);
                    return;
                }
            }
        }
        
        // 关卡按钮行2
        if (window.levelButtons2) {
            for (let btn of window.levelButtons2) {
                if (x * cardScale + offsetX >= btn.x && x * cardScale + offsetX <= btn.x + btn.w &&
                    y * cardScale + offsetY >= btn.y && y * cardScale + offsetY <= btn.y + btn.h) {
                    selectLevel(btn.level);
                    return;
                }
            }
        }
        return;
    }
    
    // 检查设置按钮
    if (x >= settingsBtnRect.x && x <= settingsBtnRect.x + settingsBtnRect.w &&
        y >= settingsBtnRect.y && y <= settingsBtnRect.y + settingsBtnRect.h) {
        toggleSettings();
        return;
    }
    
    if (!gameActive) return;
    
    let sorted = [...stackCards].filter(c => !c.removed && !c.isAnimating).sort((a, b) => b.layer - a.layer);
    for (let card of sorted) {
        let left = card.x - CARD_SIZE/2, right = card.x + CARD_SIZE/2;
        let top = card.y - CARD_SIZE/2, bottom = card.y + CARD_SIZE/2;
        if (x >= left && x <= right && y >= top && y <= bottom) {
            if (card.clickable) onCardClick(card);
            break;
        }
    }
}

function onTouchEnd(e) {
    let t = e.changedTouches[0];
    let x = (t.clientX - offsetX) / cardScale;
    let y = (t.clientY - offsetY) / cardScale;
    
    if (settingsVisible) return;
    
    if (x >= shuffleBtnRect.x && x <= shuffleBtnRect.x + shuffleBtnRect.w &&
        y >= shuffleBtnRect.y && y <= shuffleBtnRect.y + shuffleBtnRect.h) {
        shuffleRemaining();
    }
    if (x >= resetBtnRect.x && x <= resetBtnRect.x + resetBtnRect.w &&
        y >= resetBtnRect.y && y <= resetBtnRect.y + resetBtnRect.h) {
        resetGame();
    }
}

// ==================== 初始化 ====================
function init() {
    canvas = wx.createCanvas();
    ctx = canvas.getContext('2d');
    let sys = wx.getSystemInfoSync();
    screenWidth = sys.screenWidth;
    screenHeight = sys.screenHeight;
    canvas.width = screenWidth;
    canvas.height = screenHeight;

    BASE_MIN_X = PAD_LEFT + GRID_STEP / 2;
    BASE_MIN_Y = PAD_TOP + GRID_STEP / 2;
    BASE_MAX_X = BASE_MIN_X + (COLS - 1) * GRID_STEP;
    BASE_MAX_Y = BASE_MIN_Y + (ROWS - 1) * GRID_STEP;
    
    MIN_X = BASE_MIN_X - CARD_SIZE;
    MAX_X = BASE_MAX_X + CARD_SIZE;
    MIN_Y = PAD_TOP;
    MAX_Y = BASE_MAX_Y + CARD_SIZE + 100;
    
    BASE_POSITIONS = generateBaseGrid();
    
    if (FORCED_SCALE > 0) {
        cardScale = FORCED_SCALE;
        let totalWidth = MAX_X;
        let totalHeight = MAX_Y;
        offsetX = (screenWidth - totalWidth * cardScale) / 2 + OFFSET_X_ADJUST;
        offsetY = (screenHeight - totalHeight * cardScale) / 2 + OFFSET_Y_ADJUST;
    } else {
        let logicWidth = FIXED_LOGIC_WIDTH > 0 ? FIXED_LOGIC_WIDTH : (MAX_X + 100);
        let logicHeight = FIXED_LOGIC_HEIGHT > 0 ? FIXED_LOGIC_HEIGHT : (MAX_Y + 120);
        let scaleX = screenWidth / logicWidth;
        let scaleY = screenHeight / logicHeight;
        cardScale = Math.min(scaleX, scaleY) * 0.92;
        offsetX = (screenWidth - logicWidth * cardScale) / 2 + OFFSET_X_ADJUST;
        offsetY = (screenHeight - logicHeight * cardScale) / 2 + OFFSET_Y_ADJUST;
    }

    console.log("========== 设备信息 ==========");
    console.log(`屏幕宽度: ${screenWidth}px`);
    console.log(`屏幕高度: ${screenHeight}px`);
    console.log(`缩放比例 cardScale: ${cardScale}`);
    console.log(`实际卡牌宽度: ${(CARD_SIZE * cardScale).toFixed(2)}px`);
    console.log("================================");

    initAudio();
    
    loadCardImages().then(() => {
        loadLevel(1);
    });
    
    wx.onTouchStart(onTouchStart);
    wx.onTouchEnd(onTouchEnd);

    function frame() {
        updateAnimations();
        renderUI();
        requestAnimationFrame(frame);
    }
    frame();
}

init();