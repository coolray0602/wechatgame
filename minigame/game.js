// ==================== 可調整參數（基礎值，會根據螢幕大小自動調整） ====================
const BASE_CARD_SIZE = 65;
const COLS = 6;
const ROWS = 7;

// ==================== 音效配置 ====================
const CLICK_SOUND_URL = 'images/click.mp3';
const BGM1_URL = 'images/bgm1.mp3';
const BGM2_URL = 'images/bgm2.mp3';

let clickAudio = null;
let bgmAudio = null;
let currentBgmIndex = 1;
let bgmEnabled = true;
let sfxEnabled = true;

// ==================== 洗牌次數限制 ====================
let shuffleRemainingCount = 3;

// ==================== 關卡選擇器 ====================
let settingsVisible = false;
let selectedLevel = 1;

// ==================== 禁止位置配置 ====================
let forbiddenPositions = [];

// ==================== 動態縮放變數 ====================
let CARD_SIZE, GRID_STEP, HALF_SHIFT;
let PAD_LEFT, PAD_TOP;
let SLOT_X_OFFSET, SLOT_Y_OFFSET, BTN_Y_OFFSET;

// ✅ 新增：UI 元素的動態變數
let TITLE_WIDTH, TITLE_HEIGHT, TITLE_X, TITLE_Y;
let COIN_WIDTH, COIN_HEIGHT, COIN_X, COIN_Y;
let SCORE_BG_WIDTH, SCORE_BG_HEIGHT, SCORE_BG_X, SCORE_BG_Y;
let SCORE_FONT_SIZE, SCORE_TEXT_X, SCORE_TEXT_Y;
let INFO_FONT_SIZE;
let REMAIN_TEXT_X, REMAIN_TEXT_Y;

// ✅ 新增：關卡按鈕數組
let levelButtons1 = [];
let levelButtons2 = [];

// ==================== 累積總分（跨關卡） ====================
let totalScore = 0;
function calculateDynamicSizes() {
    const sys = wx.getSystemInfoSync();
    const screenWidth = sys.screenWidth;
    const screenHeight = sys.screenHeight;

    // 根據螢幕寬度計算縮放比例
    const scaleFactor = Math.min(screenWidth / 375, screenHeight / 667) * 1.0;

    CARD_SIZE = Math.round(BASE_CARD_SIZE * scaleFactor);
    GRID_STEP = CARD_SIZE;
    HALF_SHIFT = CARD_SIZE / 2;

    PAD_LEFT = Math.round(30 * scaleFactor);
    PAD_TOP = Math.round(170 * scaleFactor);

    SLOT_X_OFFSET = Math.round(-20 * scaleFactor);
    SLOT_Y_OFFSET = Math.round(-40 * scaleFactor);
    BTN_Y_OFFSET = 0;

    // === 標題圖片動態尺寸 ===
    const BASE_TITLE_WIDTH = 528;
    const BASE_TITLE_HEIGHT = 200;
    const BASE_TITLE_X = 20;
    const BASE_TITLE_Y = 40;

    // ❌ 删除 const，改为全局变量（不加任何关键字）
    TITLE_WIDTH = Math.round(BASE_TITLE_WIDTH * scaleFactor / 3);
    TITLE_HEIGHT = Math.round(BASE_TITLE_HEIGHT * scaleFactor / 3);
    TITLE_X = Math.round(BASE_TITLE_X * scaleFactor);
    TITLE_Y = Math.round(BASE_TITLE_Y * scaleFactor);

    // === 金幣圖片動態尺寸與位置 ===
    const BASE_COIN_WIDTH = 100;
    const BASE_COIN_HEIGHT = 127;
    const coinScale = scaleFactor * 0.45;

    COIN_WIDTH = Math.round(BASE_COIN_WIDTH * coinScale);
    COIN_HEIGHT = Math.round(BASE_COIN_HEIGHT * coinScale);

    // 獲取膠囊按鈕位置資訊
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    const menuButtonRight = menuButtonInfo.right;
    const menuButtonBottom = menuButtonInfo.bottom;

    const rightEdge = screenWidth - 20;
    const topBase = menuButtonBottom + 15;

    SCORE_BG_WIDTH = Math.round(140 * scaleFactor);
    SCORE_BG_HEIGHT = Math.round(40 * scaleFactor);

    SCORE_BG_X = rightEdge - SCORE_BG_WIDTH;
    SCORE_BG_Y = topBase;

    COIN_X = SCORE_BG_X + Math.round(12 * scaleFactor);
    COIN_Y = SCORE_BG_Y + Math.round((SCORE_BG_HEIGHT - COIN_HEIGHT) / 2);

    SCORE_FONT_SIZE = Math.round(22 * scaleFactor);
    SCORE_TEXT_X = COIN_X + COIN_WIDTH + Math.round(8 * scaleFactor);
    SCORE_TEXT_Y = SCORE_BG_Y + Math.round(SCORE_BG_HEIGHT * 0.68);

    INFO_FONT_SIZE = Math.round(18 * scaleFactor);

    REMAIN_TEXT_X = COIN_X + Math.round(8 * scaleFactor);
    REMAIN_TEXT_Y = SCORE_BG_Y + Math.round(SCORE_BG_HEIGHT * 1.65);
}

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

// ==================== 關卡配置 ====================
function getLevelConfig(level) {
    let layers = 5 + (level - 1) * 2;
    let cardsPerLayer = 18;
    return { layers, cardsPerLayer };
}

// ==================== 圖片資源配置 ====================
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

// ==================== 動畫相關變數 ====================
let activeAnimations = [];

// ==================== 全域變數 ====================
let canvas, ctx;
let gameActive = true;
let currentRoundScore = 0;
let slotCards = [];
let stackCards = [];
let nextCardId = 1;

let currentLevel = 1;
const TOTAL_LEVELS = 10;

let screenWidth, screenHeight;
let offsetX = 0, offsetY = 0;
let cardScale = 1;

let resetBtnRect = { x: 0, y: 0, w: 95, h: 42 };
let shuffleBtnRect = { x: 0, y: 0, w: 95, h: 42 };
let settingsBtnRect = { x: 0, y: 0, w: 80, h: 35 };

// 顏色主題
const colors = {
    bg: '#ffffff',
    cardLight: '#fff7e8',
    cardDark: '#e8d8c0',
    border: '#b97f3a',
    text: '#5a2f0a',
    scoreBg: '#2c2b28',
    slotBg: '#e7dbb6',
    titleText: '#5a3c1a',
    subtitleText: '#8b6942',
    remainText: '#4a2e0a',
    settingsPanel: '#fef3dd',
    scoreText: '#ffeaac'
};

// ==================== 動態計算的邊界 ====================
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
    clickAudio = wx.createInnerAudioContext();
    clickAudio.src = CLICK_SOUND_URL;
    clickAudio.volume = 0.5;
    clickAudio.onError((err) => {
        console.error("點擊音效載入失敗:", err);
    });

    bgmAudio = wx.createInnerAudioContext();
    bgmAudio.src = BGM1_URL;
    bgmAudio.loop = true;
    bgmAudio.volume = 0.4;
    bgmAudio.onError((err) => {
        console.error("背景音樂載入失敗:", err);
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

// ==================== 圖片載入 ====================
function loadCardImages() {
    return new Promise((resolve) => {
        let loadedCount = 0;
        const totalImages = CARD_KEYS.length + 2; // +2 為標題圖片和金幣圖片

        // 載入標題圖片
        const titleImg = wx.createImage();
        titleImg.src = 'images/title.png';
        titleImg.onload = () => {
            loadedCount++;
            loadedImages['title'] = titleImg;
            if (loadedCount === totalImages) {
                console.log(`所有圖片載入完成，共 ${totalImages} 張`);
                resolve();
            }
        };
        titleImg.onerror = (err) => {
            console.error('載入標題圖片失敗:', err);
            loadedCount++;
            loadedImages['title'] = null;
            if (loadedCount === totalImages) {
                resolve();
            }
        };
        // 載入金幣圖片 (新增)
        const coinImg = wx.createImage();
        coinImg.src = 'images/coin.png';
        coinImg.onload = () => {
            loadedCount++;
            loadedImages['coin'] = coinImg;
            if (loadedCount === totalImages) resolve();
        };
        coinImg.onerror = (err) => {
            console.error('載入金幣圖片失敗:', err);
            loadedCount++;
            loadedImages['coin'] = null;
            if (loadedCount === totalImages) resolve();
        };
        // 載入卡牌圖片（原有程式碼）
        for (let key of CARD_KEYS) {
            const img = wx.createImage();
            img.src = `images/${CARD_IMAGES[key]}`;
            img.onload = () => {
                loadedCount++;
                loadedImages[key] = img;
                if (loadedCount === totalImages) {
                    console.log(`所有卡牌圖片載入完成，共 ${totalImages} 張`);
                    resolve();
                }
            };
            img.onerror = (err) => {
                console.error(`載入圖片失敗: images/${CARD_IMAGES[key]}`, err);
                loadedCount++;
                loadedImages[key] = null;
                if (loadedCount === totalImages) {
                    resolve();
                }
            };
        }
    });
}

// ==================== 基礎網格生成 ====================
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

// ==================== 重疊檢測 ====================
function doesOverlap(newX, newY, layer, existingCards) {
    const newLeft = newX - CARD_SIZE / 2;
    const newRight = newX + CARD_SIZE / 2;
    const newTop = newY - CARD_SIZE / 2;
    const newBottom = newY + CARD_SIZE / 2;
    for (let c of existingCards) {
        if (c.layer !== layer) continue;
        const left = c.x - CARD_SIZE / 2;
        const right = c.x + CARD_SIZE / 2;
        const top = c.y - CARD_SIZE / 2;
        const bottom = c.y + CARD_SIZE / 2;
        if (newRight > left && newLeft < right && newBottom > top && newTop < bottom) {
            return true;
        }
    }
    return false;
}

// ==================== 關卡生成 ====================
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

// ==================== 輔助函數 ====================
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

// ==================== 遊戲邏輯 ====================
function isRectOverlap(card1, card2) {
    const h = CARD_SIZE / 2;
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

// 當卡牌消除時增加分數（只增加當前關卡分數）
function addScore(amount) {
    currentRoundScore += amount;
}

// 獲取當前顯示的總分（當前關卡分數 + 之前關卡累積的總分）
function getDisplayScore() {
    return totalScore + currentRoundScore;
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
        addScore(10);  // 消除一組得10分（當前關卡分數）
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
        
        // ★ 將當前關卡分數累加到總分
        totalScore += currentRoundScore;
        currentRoundScore = 0;  // 重置當前關卡分數
        
        if (currentLevel < TOTAL_LEVELS) {
            wx.showModal({
                title: `🎉 第${currentLevel}關通關！`,
                content: `累積總分：${totalScore}\n下一關即將開始！`,
                confirmText: '下一關',
                cancelText: '重玩此關',
                success: (res) => {
                    if (res.confirm) {
                        currentLevel++;
                        shuffleRemainingCount = 3;
                        loadLevel(currentLevel, true);  // true 表示保留總分
                    } else {
                        shuffleRemainingCount = 3;
                        loadLevel(currentLevel, false); // false 表示重玩此關不保留本次分數
                        // 注意：重玩此關時，之前累積的 totalScore 不變，但 currentRoundScore 已歸零
                    }
                }
            });
        } else {
            // 最終通關，顯示累積總分
            wx.showModal({
                title: '🏆 恭喜通關全部關卡！',
                content: `累積總得分：${totalScore}`,
                showCancel: false,
                success: () => {
                    // 遊戲完成後可以選擇重置或回到第一關
                    totalScore = 0;
                    currentLevel = 1;
                    shuffleRemainingCount = 3;
                    loadLevel(1, false);
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
            
            // 失敗時，不保留當前關卡分數（總分不變）
            // 可選：顯示失敗提示
            wx.showModal({
                title: '😭 遊戲失敗',
                content: `累積總分：${totalScore}`,
                confirmText: '重玩此關',
                cancelText: '回到第一關',
                success: (res) => {
                    if (res.confirm) {
                        shuffleRemainingCount = 3;
                        loadLevel(currentLevel, false); // 重玩此關，不保留本次失敗的分數
                    } else {
                        totalScore = 0;  // 重置總分
                        currentLevel = 1;
                        shuffleRemainingCount = 3;
                        loadLevel(1, false);
                    }
                }
            });
            return true;
        }
    }
    return false;
}

// ==================== 動畫系統 ====================
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

    const scaleFactor = CARD_SIZE / BASE_CARD_SIZE;
    const slotX = (20 + SLOT_X_OFFSET) * scaleFactor;
    const slotY = MAX_Y - 60;

    const targetSlotIndex = slotCards.length;
    const targetX = slotX + 12 + targetSlotIndex * 52;
    const targetY = slotY;
    console.log("slotY=" + slotY + " , targetY=" + targetY + " , MAX_Y=" + MAX_Y + " , SLOT_Y_OFFSET=" + SLOT_Y_OFFSET + " , scaleFactor=" + scaleFactor);
    const fromX = card.x - CARD_SIZE / 2;
    const fromY = card.y - CARD_SIZE / 2;

    startCardAnimation(card, fromX, fromY, targetX, targetY);
}

// keepTotalScore: 是否保留總分（通關時 true，重玩關卡或切換關卡時 false 或看情況）
function loadLevel(level, keepTotalScore = false) {
    currentLevel = level;
    
    if (!keepTotalScore) {
        // 切換關卡或重玩時，如果不保留當前關卡分數，則只重置 currentRoundScore
        // totalScore 保持不變（從之前關卡累積來的）
        // 注意：這意味著如果玩家手動切換關卡，之前關卡的總分仍保留
        // 如果想要手動切換關卡時重置總分，可以將 totalScore 設為 0
        currentRoundScore = 0;
    }
    // 如果 keepTotalScore === true，表示通關後進入下一關，此時 totalScore 已經累加，currentRoundScore 已歸零
    
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
    gameActive = true;
    activeAnimations = [];
    shuffleRemainingCount = 3;

    settingsVisible = false;
}

function resetGame() {
    // 重置遊戲：重置總分和當前關卡分數
    totalScore = 0;
    currentRoundScore = 0;
    shuffleRemainingCount = 3;
    loadLevel(currentLevel, false);
}

function shuffleRemaining() {
    if (!gameActive) return;
    if (shuffleRemainingCount <= 0) {
        wx.showToast({
            title: '洗牌次數已用完',
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
        title: `洗牌剩餘 ${shuffleRemainingCount} 次`,
        icon: 'none',
        duration: 1000
    });
}

function toggleSettings() {
    settingsVisible = !settingsVisible;
}

function selectLevel(level) {
    if (level >= 1 && level <= TOTAL_LEVELS) {
        // 手動切換關卡時，重置總分和當前分數（可選，根據需求）
        // 如果想要保留總分，可以注釋掉 totalScore = 0
        totalScore = 0;
        currentRoundScore = 0;
        loadLevel(level, false);
    }
    settingsVisible = false;
}

// ==================== 繪製 ====================
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
        const centerX = x + size / 2;
        const centerY = y + size / 2;
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

    // 繪製除錯邊界
    drawDebugBounds(ctx);

    // 動態計算字體大小
    const titleFontSize = Math.max(24, Math.round(32 * (CARD_SIZE / BASE_CARD_SIZE)));
    const subtitleFontSize = Math.max(16, Math.round(20 * (CARD_SIZE / BASE_CARD_SIZE)));
    const scoreFontSize = Math.max(18, Math.round(50 * (CARD_SIZE / BASE_CARD_SIZE)));

    // 設定按鈕
    ctx.fillStyle = '#ffdd99';
    roundRect(ctx, 25, 140, 80, 35, 18);
    ctx.fill();
    ctx.fillStyle = '#4f2d0a';

    ctx.fillText('⚙️', 35, 163);
    settingsBtnRect = { x: 25, y: 140, w: 80, h: 35 };

    // 繪製卡牌
    let sorted = [...stackCards].sort((a, b) => a.layer - b.layer);
    for (let c of sorted) {
        if (c.removed) continue;
        if (c.isAnimating) continue;
        let x = c.x - CARD_SIZE / 2, y = c.y - CARD_SIZE / 2;
        drawCard(ctx, c, x, y, 1, 1, false, 0);
    }

    // 繪製卡槽
    let slotX = 20 + SLOT_X_OFFSET;
    let slotY = MAX_Y - 40 + SLOT_Y_OFFSET;
    let slotWidth = 380;
    let slotHeight = 60;

    ctx.fillStyle = colors.slotBg;
    roundRect(ctx, slotX, slotY, slotWidth, slotHeight, 28);
    ctx.fill();
    ctx.strokeStyle = '#b9975a';
    ctx.stroke();

    // 7個槽位卡片
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
                ctx.font = `22px "Segoe UI"`;
                ctx.fillStyle = '#5a2f0a';
                ctx.fillText(iconKey.substring(0, 2), sx + 15, slotY + 40);
            }
        } else {
            ctx.fillStyle = '#eeddbb';
            roundRect(ctx, sx, slotY + 8, 48, 44, 12);
            ctx.fill();
            ctx.font = `22px "Segoe UI"`;
            ctx.fillStyle = '#bba46c';
            ctx.fillText('?', sx + 18, slotY + 40);
        }
    }

    // 繪製動畫中的卡片
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

    // 按鈕
    let btnY = slotY + 72 + BTN_Y_OFFSET;
    const buttonFontSize = Math.max(14, Math.round(18 * (CARD_SIZE / BASE_CARD_SIZE)));

    ctx.fillStyle = '#ffdd99';
    roundRect(ctx, 100, btnY, 95, 42, 35);
    ctx.fill();
    ctx.fillStyle = '#4f2d0a';
    ctx.font = `bold ${buttonFontSize}px "Segoe UI"`;
    ctx.fillText('♻️ 洗牌', 115, btnY + 30);
    ctx.font = `bold ${Math.max(10, Math.round(12 * (CARD_SIZE / BASE_CARD_SIZE)))}px "Segoe UI"`;
    ctx.fillStyle = '#b16224';
    ctx.fillText(`x${shuffleRemainingCount}`, 178, btnY + 25);
    shuffleBtnRect = { x: 100, y: btnY, w: 95, h: 42 };

    ctx.fillStyle = '#ffdd99';
    roundRect(ctx, 215, btnY, 95, 42, 35);
    ctx.fill();
    ctx.fillStyle = '#4f2d0a';
    ctx.font = `bold ${buttonFontSize}px "Segoe UI"`;
    ctx.fillText('🔄 重來', 230, btnY + 30);
    resetBtnRect = { x: 215, y: btnY, w: 95, h: 42 };

    ctx.restore();
    
    // === 繪製右上角得分面板（在螢幕坐標系，不受遊戲縮放影響）===
    const coinImg = loadedImages['coin'];
    const displayScore = getDisplayScore();  // 獲取總分顯示

    // 繪製背景框
    ctx.fillStyle = colors.scoreBg;
    roundRect(ctx, SCORE_BG_X, SCORE_BG_Y, SCORE_BG_WIDTH, SCORE_BG_HEIGHT, 25);
    ctx.fill();

    // 繪製金幣圖片
    if (coinImg && coinImg.complete) {
        ctx.drawImage(coinImg, COIN_X, COIN_Y, COIN_WIDTH, COIN_HEIGHT);
    } else {
        // 備用方案
        ctx.font = `${SCORE_FONT_SIZE}px "Segoe UI"`;
        ctx.fillStyle = '#ffeaac';
        ctx.fillText('💰', COIN_X, COIN_Y + COIN_HEIGHT * 0.7);
    }

    // 繪製分數（總分）
    ctx.font = `bold ${SCORE_FONT_SIZE}px "Segoe UI"`;
    ctx.fillStyle = colors.scoreText;
    ctx.fillText(`${displayScore}`, SCORE_TEXT_X, SCORE_TEXT_Y);
    const infoFontSize = Math.max(14, Math.round(INFO_FONT_SIZE * 0.9));
    // 繪製剩餘卡片數量（可選，放在分數下方）
    let remain = stackCards.filter(c => !c.removed && !c.isAnimating).length;

    ctx.font = `${infoFontSize}px "Segoe UI"`;
    ctx.fillStyle = colors.subtitleText;
    ctx.fillText(`剩馀 ${remain}`, REMAIN_TEXT_X, REMAIN_TEXT_Y);

    // === 新增：在第幾關文字（放在剩餘卡牌下方）===
    // 動態計算關卡文字的位置和大小（基於剩餘卡牌文字的位置）
   
    const levelTextY = REMAIN_TEXT_Y + Math.round(INFO_FONT_SIZE * 1.3);
    const levelTextX = REMAIN_TEXT_X;

    ctx.fillStyle = colors.subtitleText;
    ctx.fillText(`第 ${currentLevel} / ${TOTAL_LEVELS} 關`, levelTextX, levelTextY);

    // === 繪製標題圖片（隨螢幕縮放） ===
    const titleImg = loadedImages['title'];
    if (titleImg && titleImg.complete) {
        ctx.drawImage(
            titleImg,
            TITLE_X,
            TITLE_Y,
            TITLE_WIDTH,
            TITLE_HEIGHT
        );
    } else {
        // 備用文字（也使用動態字體大小）
        const titleFontSize = Math.round(28 * (Math.min(screenWidth / 375, screenHeight / 667)));
        ctx.font = `bold ${titleFontSize}px "KaiTi", "華文楷書"`;
        ctx.fillStyle = '#5a3c1a';
        ctx.fillText('福一下哥', TITLE_X, TITLE_Y + TITLE_HEIGHT * 0.7);
    }

    // 繪製設定面板
    if (settingsVisible) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        const panelWidth = Math.min(280, screenWidth * 0.8);
        const panelHeight = Math.min(320, screenHeight * 0.6);
        const panelX = (screenWidth - panelWidth) / 2;
        const panelY = (screenHeight - panelHeight) / 2;

        ctx.fillStyle = colors.settingsPanel;
        roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 20);
        ctx.fill();

        const panelTitleSize = Math.min(22, Math.round(panelWidth * 0.08));
        ctx.fillStyle = '#5a3c1a';
        ctx.font = `bold ${panelTitleSize}px "KaiTi"`;
        ctx.fillText('設定', panelX + panelWidth * 0.4, panelY + panelHeight * 0.12);

        // 分隔線
        ctx.strokeStyle = '#d4c4a0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 20, panelY + panelHeight * 0.17);
        ctx.lineTo(panelX + panelWidth - 20, panelY + panelHeight * 0.17);
        ctx.stroke();

        const itemFontSize = Math.min(16, Math.round(panelWidth * 0.057));

        // 背景音樂開關
        ctx.fillStyle = bgmEnabled ? '#2f6b2f' : '#aa5440';
        roundRect(ctx, panelX + panelWidth * 0.72, panelY + panelHeight * 0.24, panelWidth * 0.2, panelHeight * 0.09, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
        ctx.fillText(bgmEnabled ? 'ON' : 'OFF', panelX + panelWidth * 0.77, panelY + panelHeight * 0.3);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = `${itemFontSize}px "Segoe UI"`;
        ctx.fillText('背景音樂', panelX + panelWidth * 0.1, panelY + panelHeight * 0.3);

        // 切換背景音樂按鈕
        ctx.fillStyle = '#c28a4e';
        roundRect(ctx, panelX + panelWidth * 0.72, panelY + panelHeight * 0.35, panelWidth * 0.2, panelHeight * 0.09, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
        ctx.fillText(`${currentBgmIndex}`, panelX + panelWidth * 0.8, panelY + panelHeight * 0.41);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = `${itemFontSize}px "Segoe UI"`;
        ctx.fillText('切換BGM', panelX + panelWidth * 0.1, panelY + panelHeight * 0.41);

        // 點擊音效開關
        ctx.fillStyle = sfxEnabled ? '#2f6b2f' : '#aa5440';
        roundRect(ctx, panelX + panelWidth * 0.72, panelY + panelHeight * 0.46, panelWidth * 0.2, panelHeight * 0.09, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
        ctx.fillText(sfxEnabled ? 'ON' : 'OFF', panelX + panelWidth * 0.77, panelY + panelHeight * 0.52);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = `${itemFontSize}px "Segoe UI"`;
        ctx.fillText('點擊音效', panelX + panelWidth * 0.1, panelY + panelHeight * 0.52);

        // 分隔線
        ctx.beginPath();
        ctx.moveTo(panelX + 20, panelY + panelHeight * 0.62);
        ctx.lineTo(panelX + panelWidth - 20, panelY + panelHeight * 0.62);
        ctx.stroke();

        // 關卡選擇標籤
        ctx.fillStyle = '#4a2e0a';
        ctx.font = `bold ${itemFontSize}px "Segoe UI"`;
        ctx.fillText('切換關卡', panelX + panelWidth * 0.1, panelY + panelHeight * 0.72);

        // 關卡按鈕行1 (1-5)
        const levelBtnWidth = Math.min(45, (panelWidth - 40) / 5.5);
        const levelBtnHeight = Math.min(30, panelHeight * 0.1);
        for (let i = 0; i < 5; i++) {
            const levelNum = i + 1;
            const btnX = panelX + 20 + i * (levelBtnWidth + 5);
            const btnY = panelY + panelHeight * 0.78;
            const isCurrent = (levelNum === currentLevel);
            ctx.fillStyle = isCurrent ? '#2f6b2f' : '#ffdd99';
            roundRect(ctx, btnX, btnY, levelBtnWidth, levelBtnHeight, 12);
            ctx.fill();
            ctx.fillStyle = isCurrent ? '#ffffff' : '#4f2d0a';
            ctx.font = `bold ${Math.min(14, Math.round(levelBtnHeight * 0.5))}px "Segoe UI"`;
            ctx.fillText(`${levelNum}`, btnX + levelBtnWidth * 0.35, btnY + levelBtnHeight * 0.7);
            if (!levelButtons1) levelButtons1 = [];
            levelButtons1[i] = { x: btnX, y: btnY, w: levelBtnWidth, h: levelBtnHeight, level: levelNum };
        }

        // 關卡按鈕行2 (6-10)
        for (let i = 0; i < 5; i++) {
            const levelNum = i + 6;
            const btnX = panelX + 20 + i * (levelBtnWidth + 5);
            const btnY = panelY + panelHeight * 0.89;
            const isCurrent = (levelNum === currentLevel);
            ctx.fillStyle = isCurrent ? '#2f6b2f' : '#ffdd99';
            roundRect(ctx, btnX, btnY, levelBtnWidth, levelBtnHeight, 12);
            ctx.fill();
            ctx.fillStyle = isCurrent ? '#ffffff' : '#4f2d0a';
            ctx.font = `bold ${Math.min(14, Math.round(levelBtnHeight * 0.5))}px "Segoe UI"`;
            ctx.fillText(`${levelNum}`, btnX + levelBtnWidth * 0.35, btnY + levelBtnHeight * 0.7);
            if (!levelButtons2) levelButtons2 = [];
            levelButtons2[i] = { x: btnX, y: btnY, w: levelBtnWidth, h: levelBtnHeight, level: levelNum };
        }

        // 關閉按鈕
        ctx.fillStyle = '#aa5440';
        const closeBtnSize = Math.min(30, panelWidth * 0.1);
        roundRect(ctx, panelX + panelWidth - closeBtnSize - 10, panelY + 10, closeBtnSize, closeBtnSize, closeBtnSize / 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(20, Math.round(closeBtnSize * 0.7))}px "Segoe UI"`;
        ctx.fillText('✕', panelX + panelWidth - closeBtnSize, panelY + closeBtnSize * 0.8);
    }

    if (!gameActive) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);
        ctx.font = 'bold 40px "Segoe UI"';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('遊戲結束', screenWidth / 2 - 100, screenHeight / 2);
    }
}

// ==================== 觸摸事件 ====================
function onTouchStart(e) {
    let t = e.touches[0];
    let x = (t.clientX - offsetX) / cardScale;
    let y = (t.clientY - offsetY) / cardScale;

    // 檢查設定面板內的點擊
    if (settingsVisible) {
        const panelWidth = Math.min(280, screenWidth * 0.8);
        const panelHeight = Math.min(320, screenHeight * 0.6);
        const panelX = (screenWidth - panelWidth) / 2;
        const panelY = (screenHeight - panelHeight) / 2;

        // 關閉按鈕
        const closeBtnSize = Math.min(30, panelWidth * 0.1);
        const closeX = panelX + panelWidth - closeBtnSize - 10;
        const closeY = panelY + 10;
        if (x * cardScale + offsetX >= closeX && x * cardScale + offsetX <= closeX + closeBtnSize &&
            y * cardScale + offsetY >= closeY && y * cardScale + offsetY <= closeY + closeBtnSize) {
            settingsVisible = false;
            return;
        }

        // 背景音樂開關按鈕
        const bgmBtnX = panelX + panelWidth * 0.72;
        const bgmBtnY = panelY + panelHeight * 0.24;
        const bgmBtnW = panelWidth * 0.2;
        const bgmBtnH = panelHeight * 0.09;
        if (x * cardScale + offsetX >= bgmBtnX && x * cardScale + offsetX <= bgmBtnX + bgmBtnW &&
            y * cardScale + offsetY >= bgmBtnY && y * cardScale + offsetY <= bgmBtnY + bgmBtnH) {
            toggleBgm();
            return;
        }

        // 切換BGM按鈕
        const switchBgmX = panelX + panelWidth * 0.72;
        const switchBgmY = panelY + panelHeight * 0.35;
        if (x * cardScale + offsetX >= switchBgmX && x * cardScale + offsetX <= switchBgmX + bgmBtnW &&
            y * cardScale + offsetY >= switchBgmY && y * cardScale + offsetY <= switchBgmY + bgmBtnH) {
            switchBgm();
            return;
        }

        // 點擊音效開關按鈕
        const sfxBtnX = panelX + panelWidth * 0.72;
        const sfxBtnY = panelY + panelHeight * 0.46;
        if (x * cardScale + offsetX >= sfxBtnX && x * cardScale + offsetX <= sfxBtnX + bgmBtnW &&
            y * cardScale + offsetY >= sfxBtnY && y * cardScale + offsetY <= sfxBtnY + bgmBtnH) {
            toggleSfx();
            return;
        }

        // 關卡按鈕行1
        if (levelButtons1) {
            for (let btn of levelButtons1) {
                if (x * cardScale + offsetX >= btn.x && x * cardScale + offsetX <= btn.x + btn.w &&
                    y * cardScale + offsetY >= btn.y && y * cardScale + offsetY <= btn.y + btn.h) {
                    selectLevel(btn.level);
                    return;
                }
            }
        }

        // 關卡按鈕行2
        if (levelButtons2) {
            for (let btn of levelButtons2) {
                if (x * cardScale + offsetX >= btn.x && x * cardScale + offsetX <= btn.x + btn.w &&
                    y * cardScale + offsetY >= btn.y && y * cardScale + offsetY <= btn.y + btn.h) {
                    selectLevel(btn.level);
                    return;
                }
            }
        }
        return;
    }

    // 檢查設定按鈕
    if (x >= settingsBtnRect.x && x <= settingsBtnRect.x + settingsBtnRect.w &&
        y >= settingsBtnRect.y && y <= settingsBtnRect.y + settingsBtnRect.h) {
        toggleSettings();
        return;
    }

    if (!gameActive) return;

    let sorted = [...stackCards].filter(c => !c.removed && !c.isAnimating).sort((a, b) => b.layer - a.layer);
    for (let card of sorted) {
        let left = card.x - CARD_SIZE / 2, right = card.x + CARD_SIZE / 2;
        let top = card.y - CARD_SIZE / 2, bottom = card.y + CARD_SIZE / 2;
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

    let sys = wx.getWindowInfo();
    screenWidth = sys.screenWidth;
    screenHeight = sys.screenHeight;
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // 在控制台输出尺寸信息
    console.log(`画布尺寸: ${canvas.width} x ${canvas.height}`);
    console.log(`窗口信息: 宽=${screenWidth}, 高=${screenHeight}`);

    // 計算動態尺寸
    calculateDynamicSizes();

    BASE_MIN_X = PAD_LEFT + GRID_STEP / 2;
    BASE_MIN_Y = PAD_TOP + GRID_STEP;
    BASE_MAX_X = BASE_MIN_X + (COLS - 1) * GRID_STEP;
    BASE_MAX_Y = BASE_MIN_Y + (ROWS - 1) * GRID_STEP;

    MIN_X = BASE_MIN_X - CARD_SIZE;
    MAX_X = BASE_MAX_X + CARD_SIZE;
    MIN_Y = PAD_TOP;
    MAX_Y = BASE_MAX_Y + CARD_SIZE + 100;
    console.log(`邏輯坐標範圍: X(${MIN_X} ~ ${MAX_X}), Y(${MIN_Y} ~ ${MAX_Y})`);
    BASE_POSITIONS = generateBaseGrid();

    // 自動計算縮放比例以適應螢幕
    let logicWidth = MAX_X - MIN_X;
    let logicHeight = MAX_Y;
    let scaleX = screenWidth / logicWidth;
    let scaleY = screenHeight / logicHeight;
    cardScale = Math.min(scaleX, scaleY) * 0.92;
    offsetX = (screenWidth - logicWidth * cardScale) / 2;
    offsetY = (screenHeight - logicHeight * cardScale) / 2;

    // 詳細輸出系統資訊
    console.log("========== 系統詳細資訊 ==========");
    console.log(`screenWidth: ${sys.screenWidth}px`);
    console.log(`screenHeight: ${sys.screenHeight}px`);
    console.log(`windowWidth: ${sys.windowWidth}px`);
    console.log(`windowHeight: ${sys.windowHeight}px`);
    console.log(`pixelRatio: ${sys.pixelRatio}`);
    console.log(`statusBarHeight: ${sys.statusBarHeight}px`);
    console.log(`safeArea:`, sys.safeArea);
    console.log("==================================");

    initAudio();

    loadCardImages().then(() => {
        totalScore = 0;
        currentRoundScore = 0;
        loadLevel(1, false);
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
function drawDebugBounds(ctx) {
    // BASE 範圍（基礎網格邊界）- 藍色虛線框
    ctx.strokeStyle = 'rgba(0, 100, 255, 0.6)';
    ctx.lineWidth = 1.5 / cardScale;
    ctx.setLineDash([8, 4]);

    const baseLeft = BASE_MIN_X - CARD_SIZE / 2;
    const baseTop = BASE_MIN_Y - CARD_SIZE / 2;
    const baseWidth = BASE_MAX_X - BASE_MIN_X + CARD_SIZE;
    const baseHeight = BASE_MAX_Y - BASE_MIN_Y + CARD_SIZE;

    ctx.strokeRect(baseLeft, baseTop, baseWidth, baseHeight);

    // 添加標籤
    ctx.fillStyle = 'rgba(0, 100, 255, 0.8)';
    ctx.font = `bold ${11 / cardScale}px "Segoe UI"`;
    ctx.fillText('BASE', baseLeft + 5, baseTop - 5);

    // MIN/MAX 範圍（擴展邊界）- 紅色實線框
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';
    ctx.lineWidth = 2 / cardScale;
    ctx.setLineDash([]);
    ctx.strokeRect(MIN_X, MIN_Y, MAX_X - MIN_X, MAX_Y - MIN_Y);

    // 添加標籤和坐標
    ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
    ctx.fillText('MIN/MAX', MIN_X + 5, MIN_Y - 5);

    // 四角坐標標註
    const fontSize = `${10 / cardScale}px "Segoe UI"`;
    ctx.font = fontSize;

    // 左上角
    ctx.fillText(`(${MIN_X.toFixed(0)},${MIN_Y.toFixed(0)})`, MIN_X + 5, MIN_Y + 15);
    // 右上角
    ctx.fillText(`(${MAX_X.toFixed(0)},${MIN_Y.toFixed(0)})`, MAX_X - 70, MIN_Y + 15);
    // 左下角
    ctx.fillText(`(${MIN_X.toFixed(0)},${MAX_Y.toFixed(0)})`, MIN_X + 5, MAX_Y - 5);
    // 右下角
    ctx.fillText(`(${MAX_X.toFixed(0)},${MAX_Y.toFixed(0)})`, MAX_X - 70, MAX_Y - 5);

    ctx.fillText(`CARD_SIZE: ${CARD_SIZE}px`, 500, 500);
}
init();